// Artverse backend (Express + MongoDB).
//
// What is in this file:
//   - public routes: gallery, latest drops, stats, pricing, download links
//   - payment routes: Razorpay order, verify and webhook
//   - admin routes (need a login token): upload, edit category, delete, revenue, per artwork stats
//
// Environment variables are listed in .env.example.

import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import cors from "cors";
import crypto from "crypto";
import Razorpay from "razorpay";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { media, assetsToDestroy } from "./media.js";
import { istDay, visitorKeyFor, tooManyLinkRequests } from "./visitors.js";

dotenv.config();

// Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key:    process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure:     true,
});

// Razorpay
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Multer
// Files are kept in memory and sent straight to Cloudinary, nothing is saved on the server disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype === "video/mp4";
    if (isImage || isVideo) cb(null, true);
    else cb(new Error("Only images and MP4 videos are allowed"), false);
  },
});

// MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connected");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};
connectDB();

const gallerySchema = new mongoose.Schema(
  {
    imageURL:  String, // what the site shows. For images this is the watermarked preview.
    category:  String,
    mediaType: { type: String, enum: ["image", "video"], default: "image" },
    width:     Number,
    height:    Number,
    date_created: { type: Date, default: Date.now },

    // Images only. The real file is stored privately in Cloudinary and is never sent to the browser.
    // select:false keeps these out of every query unless a route asks for them on purpose.
    originalPublicId: { type: String, select: false },
    originalFormat:   { type: String, select: false },
    previewPublicId:  { type: String, select: false },
    // The old public copy of an artwork that was migrated. Only exists until the migration is finalized.
    legacyPublicId:   { type: String, select: false },
    legacyImageURL:   { type: String, select: false }, // where the artwork pointed before it was migrated
    originalProtected: { type: Boolean, default: false },
  },
  { versionKey: false }
);

// Prices live here on the server so a user can never choose their own price.
// Prices are in rupees and 0 means free. Change a price here to change what is charged.
const CATEGORIES = ["Epic", "Top", "Premium", "Live Wallpapers"];
const PRICE_MAP  = { Epic: 0, Top: 1, Premium: 0, "Live Wallpapers": 0 };
const getPriceRupees = (category) => PRICE_MAP[category] ?? 0;
// Videos are free only for now. The download route ignores prices for videos.
if (PRICE_MAP["Live Wallpapers"] > 0) console.warn("Live Wallpapers has a price, but videos cannot be sold yet.");

const downloadSchema = new mongoose.Schema(
  {
    artworkId: String,
    paymentId: { type: String, default: null }, // only set for paid downloads
    date_time: { type: Date, default: Date.now },

    // The same visitor is counted once per artwork per day (India time) for free downloads.
    // dedupeKey is "artworkId:visitorKey:day" for free downloads and "payment:<id>" for paid ones.
    // It is unique and sparse, so the older records, which do not have it, are not affected.
    day:       String,
    dedupeKey: { type: String, unique: true, sparse: true },
  },
  { versionKey: false }
);

const statsSchema = new mongoose.Schema(
  { instagramFollowers: Number },
  { versionKey: false }
);

// One document per Razorpay order. Money is stored in paise (100 paise = 1 rupee).
// Status meanings:
//   created            order made but not paid yet (not counted in revenue)
//   paid               signature verified and payment captured
//   partially_refunded paid, but refundedAmount is less than amount
//   refunded           fully refunded
//   failed             payment failed (not counted in revenue)
const paymentSchema = new mongoose.Schema(
  {
    razorpayOrderId:   { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true },
    artworkId:         { type: String, required: true, index: true },
    amount:            { type: Number, required: true },
    refundedAmount:    { type: Number, default: 0 },
    currency:          { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["created", "paid", "partially_refunded", "refunded", "failed"],
      default: "created",
      index: true,
    },
    downloadCounted: { type: Boolean, default: false }, // one paid download is counted per payment
    verifiedAt:      Date,
    createdAt:       { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const Gallery  = mongoose.model("Gallery",  gallerySchema,  "gallery");
const Download = mongoose.model("Download", downloadSchema, "download");
const Stats    = mongoose.model("Stats",    statsSchema,    "stats");
const Payment  = mongoose.model("Payment",  paymentSchema,  "payments");

// Refunded payments stay in the revenue query because we subtract refundedAmount from the total.
const REVENUE_STATUSES = ["paid", "partially_refunded", "refunded"];
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// The Cloudinary ids are internal, so they are removed before an artwork is sent to the browser.
const INTERNAL_FIELDS = ["originalPublicId", "originalFormat", "previewPublicId", "legacyPublicId", "legacyImageURL"];
const toPublic = (doc) => {
  const obj = doc.toObject();
  INTERNAL_FIELDS.forEach((field) => delete obj[field]);
  return obj;
};

// Videos can only be Live Wallpapers and images can never be. Returns an error text or null.
const mediaCategoryError = (isVideo, category) => {
  if (isVideo && category !== "Live Wallpapers") return "Videos must stay in Live Wallpapers";
  if (!isVideo && category === "Live Wallpapers") return "Only videos can be Live Wallpapers";
  return null;
};

// Express
const app = express();

// Behind a hosting proxy or load balancer every request seems to come from the proxy's IP.
// Set TRUST_PROXY to the number of proxies in front of the server (usually 1) so req.ip is the
// visitor's real address. The login lockout and the download counting both rely on it.
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
else if (process.env.NODE_ENV === "production")
  console.warn("TRUST_PROXY is not set. If this server is behind a proxy, all visitors will look the same.");
// The raw body is saved because the Razorpay webhook signature is checked against the exact bytes.
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
// Set CLIENT_ORIGIN to the real website URL when deploying.
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));

// Admin auth
// Login details come from .env (ADMIN_USERNAME and ADMIN_PASSWORD_HASH).
// Make the hash with: node scripts/hash-password.js "your-password"

// timingSafeEqual stops attackers from guessing a value by measuring how long the check takes.
// It throws if the lengths are different, so the length is compared first.
const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

// Simple brute force guard: 5 failed logins per 15 minutes for each IP.
// It lives in memory, so it resets when the server restarts.
const loginFails = new Map();
const LOGIN_WINDOW = 15 * 60 * 1000;
const isLockedOut = (ip) => {
  const rec = loginFails.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.first > LOGIN_WINDOW) { loginFails.delete(ip); return false; }
  return rec.count >= 5;
};
const recordFail = (ip) => {
  const rec = loginFails.get(ip);
  if (!rec || Date.now() - rec.first > LOGIN_WINDOW) loginFails.set(ip, { count: 1, first: Date.now() });
  else rec.count += 1;
};

app.post("/artverse/admin/login", async (req, res) => {
  const { username, password } = req.body || {};
  const ip = req.ip;

  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH || !process.env.JWT_SECRET)
    return res.status(500).json({ error: "Admin login is not configured on the server" });
  if (isLockedOut(ip))
    return res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
  if (typeof username !== "string" || typeof password !== "string")
    return res.status(400).json({ error: "Username and password are required" });

  // Both checks always run, so the response time does not show which one was wrong.
  const userOk = safeEqual(username, process.env.ADMIN_USERNAME);
  const passOk = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!userOk || !passOk) {
    recordFail(ip);
    return res.status(401).json({ error: "Invalid credentials" });
  }

  loginFails.delete(ip);
  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "8h" });
  res.json({ token });
});

const requireAdmin = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== "admin") throw new Error("not admin");
    next();
  } catch {
    res.status(401).json({ error: "Session expired. Please log in again." });
  }
};

app.get("/artverse/admin/me", requireAdmin, (req, res) => res.json({ ok: true }));

// Gallery routes
app.get("/artverse/gallery", async (req, res) => {
  try {
    const gallery = await Gallery.find().sort({ date_created: -1 });
    res.json(gallery);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/artverse/gallery/:category", async (req, res) => {
  const { category } = req.params;
  try {
    const gallery = await Gallery.find({ category }).sort({ date_created: -1 });
    res.json(gallery);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/artverse/latest", async (req, res) => {
  try {
    const gallery = await Gallery.find().sort({ date_created: -1 }).limit(6);
    res.json(gallery);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Upload
app.post("/artverse/upload", requireAdmin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const isVideo  = req.file.mimetype === "video/mp4";
    // Videos always go to Live Wallpapers, the admin only picks a category for images.
    const category = isVideo ? "Live Wallpapers" : req.body.category;

    if (!category) return res.status(400).json({ error: "Category is required" });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: "Invalid category" });
    const ruleError = mediaCategoryError(isVideo, category);
    if (ruleError) return res.status(400).json({ error: ruleError });

    // Videos stay public and keep the old behaviour.
    if (isVideo) {
      const result = await media.uploadVideo(req.file.buffer);
      const saved = await Gallery.create({
        imageURL: result.secure_url,
        category,
        mediaType: "video",
        width:  result.width,
        height: result.height,
      });
      return res.json(toPublic(saved));
    }

    // Images: private original plus a public watermarked preview
    const { original, preview, assets } = await media.uploadImagePair(req.file.buffer);
    try {
      const saved = await Gallery.create({
        imageURL: preview.url,
        category,
        mediaType: "image",
        // The preview keeps the same aspect ratio, so the original's size is fine for the layout
        width:  original.width,
        height: original.height,
        originalPublicId: original.publicId,
        originalFormat:   original.format,
        previewPublicId:  preview.publicId,
        originalProtected: true,
      });
      res.json(toPublic(saved));
    } catch (err) {
      // The files are already in Cloudinary, so remove them or they would be left behind with no artwork
      const failed = await media.destroyAssets(assets);
      if (failed.length) console.error("Cleanup after failed upload did not finish:", failed);
      throw err;
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Download links
//
// This is the only way to get an original file, the browser never sees its real address.
// The route works out what the visitor is allowed to have, counts the download and answers with
// a link that stops working after a few minutes.
//
//   Free artwork:  anyone gets a link. It counts once per visitor per artwork per day.
//   Paid artwork:  needs a verified payment for this artwork (checked here every time, the
//                  browser's word is never enough). The payment can ask for a fresh link as
//                  often as needed for 30 days without paying again, but it counts only once.
//   Videos:        public and free for now, they keep the file they already have.

const REDOWNLOAD_DAYS = 30;

// The link to give back for an artwork. Protected images get a signed, expiring link. Videos and
// artworks that were not migrated yet still have a public file, so that is used.
const linkFor = (artwork) => {
  if (artwork.originalProtected && artwork.originalPublicId)
    return media.signedDownloadUrl({ publicId: artwork.originalPublicId, format: artwork.originalFormat });
  return { url: artwork.imageURL, expiresAt: null };
};

app.post("/artverse/download/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid artwork id" });
  if (tooManyLinkRequests(req.ip))
    return res.status(429).json({ error: "Too many download requests. Please wait a few minutes." });

  try {
    const artwork = await Gallery.findById(id).select("+originalPublicId +originalFormat");
    if (!artwork) return res.status(404).json({ error: "Artwork not found" });

    const isVideo = artwork.mediaType === "video";
    const isPaid  = !isVideo && getPriceRupees(artwork.category) > 0;

    if (!isPaid) {
      // Making the link does not call Cloudinary (it is signed here), so it cannot fail halfway
      // and leave a download counted without a link.
      const link = linkFor(artwork);
      const day = istDay();
      let counted = true;
      try {
        await Download.create({ artworkId: id, day, dedupeKey: `${id}:${visitorKeyFor(req)}:${day}` });
      } catch (err) {
        if (err.code !== 11000) throw err; // 11000 = same visitor, same artwork, same day
        counted = false;
      }
      return res.json({ ...link, counted });
    }

    const { razorpay_payment_id } = req.body || {};
    if (typeof razorpay_payment_id !== "string" || !razorpay_payment_id)
      return res.status(402).json({ error: "Payment required for this artwork" });

    // The payment is looked up in our own database on every request. It must belong to this
    // artwork and must not be refunded.
    const payment = await Payment.findOne({
      razorpayPaymentId: razorpay_payment_id,
      artworkId: id,
      status: { $in: ["paid", "partially_refunded"] },
    });
    if (!payment) return res.status(402).json({ error: "No verified payment found for this download" });

    const paidAt = payment.verifiedAt || payment.createdAt;
    if (Date.now() - paidAt.getTime() > REDOWNLOAD_DAYS * 24 * 60 * 60 * 1000)
      return res.status(403).json({ error: `Downloads are available for ${REDOWNLOAD_DAYS} days after payment` });

    const link = linkFor(artwork);

    // The first link for a payment is counted, later ones for the same payment are not.
    // The unique dedupeKey is what guarantees this, so even many requests at the same moment
    // can only create one row (the others get the duplicate error 11000).
    // downloadCounted is also checked so payments counted before this change are not counted twice.
    let counted = false;
    if (!payment.downloadCounted) {
      try {
        await Download.create({ artworkId: id, paymentId: razorpay_payment_id, dedupeKey: `payment:${razorpay_payment_id}` });
        counted = true;
        await Payment.updateOne({ _id: payment._id }, { downloadCounted: true });
      } catch (err) {
        if (err.code !== 11000) throw err;
      }
    }
    res.json({ ...link, counted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// The frontend uses this only to show the price. The real amount is always set again in the order route.
app.get("/artverse/pricing", (req, res) => res.json(PRICE_MAP));

// Stats
app.get("/artverse/stats", async (req, res) => {
  try {
    const totalPosts     = await Gallery.countDocuments();
    const totalDownloads = await Download.countDocuments();
    const statsDoc       = await Stats.findOne();
    res.json({ totalPosts, totalDownloads, instagramFollowers: statsDoc?.instagramFollowers || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch("/artverse/stats/followers", requireAdmin, async (req, res) => {
  const { instagramFollowers } = req.body;
  if (typeof instagramFollowers !== "number" || instagramFollowers < 0)
    return res.status(400).json({ error: "instagramFollowers must be a positive number" });
  try {
    const updated = await Stats.findOneAndUpdate({}, { instagramFollowers }, { new: true, upsert: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Razorpay: create order
//
// POST /artverse/payment/order
// Body: { artworkId }. No amount is accepted from the client, the server works out the price.
// Returns: { id, amount, currency, key }

app.post("/artverse/payment/order", async (req, res) => {
  const { artworkId } = req.body || {};
  if (!artworkId || !isValidId(artworkId))
    return res.status(400).json({ error: "A valid artworkId is required" });

  try {
    const artwork = await Gallery.findById(artworkId);
    if (!artwork) return res.status(404).json({ error: "Artwork not found" });

    const priceRupees = getPriceRupees(artwork.category);
    if (priceRupees <= 0) return res.status(400).json({ error: "This artwork is free" });
    const amount = Math.round(priceRupees * 100); // Razorpay wants paise

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt:  `av_${String(artworkId).slice(-12)}_${Date.now()}`, // Razorpay allows 40 characters at most
      notes:    { artworkId: String(artworkId) },
    });

    await Payment.create({
      razorpayOrderId: order.id,
      artworkId:       String(artworkId),
      amount:          order.amount,
      currency:        order.currency,
      status:          "created",
    });

    res.json({ id: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error("Razorpay order creation error:", err);
    res.status(500).json({ error: err.message || "Payment order creation failed" });
  }
});

// Razorpay: verify payment
//
// Steps:
// 1. Check the signature (order id + payment id) using our secret key.
// 2. Ask Razorpay for the payment and confirm the order, the amount and that it is captured.
// 3. Mark our Payment record as paid. Calling this twice never counts the payment twice.

app.post("/artverse/payment/verify", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return res.status(400).json({ error: "Missing payment verification fields" });

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (!safeEqual(expected, razorpay_signature))
    return res.status(400).json({ error: "Invalid payment signature" });

  try {
    const record = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!record) return res.status(404).json({ error: "Unknown order" });

    // Already verified (retry or double click), so just say success again.
    if (record.razorpayPaymentId === razorpay_payment_id && record.status !== "created" && record.status !== "failed")
      return res.json({ success: true, paymentId: razorpay_payment_id });

    let rp = await razorpay.payments.fetch(razorpay_payment_id);
    // The amount is compared with what we saved, so a cheaper payment can't unlock a dearer artwork.
    if (rp.order_id !== razorpay_order_id || rp.amount !== record.amount)
      return res.status(400).json({ error: "Payment does not match the order" });

    if (rp.status === "authorized") {
      rp = await razorpay.payments.capture(razorpay_payment_id, record.amount, record.currency);
    }
    if (rp.status !== "captured")
      return res.status(400).json({ error: `Payment not completed (status: ${rp.status})` });

    const updated = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id, status: { $in: ["created", "failed"] } },
      {
        razorpayPaymentId: razorpay_payment_id,
        status:            "paid",
        verifiedAt:        new Date(),
        refundedAmount:    rp.amount_refunded || 0,
      },
      { new: true }
    );
    // If another request saved it first the update finds nothing, but the payment is already recorded.
    if (!updated && !(await Payment.exists({ razorpayPaymentId: razorpay_payment_id })))
      return res.status(409).json({ error: "Could not record payment" });

    res.json({ success: true, paymentId: razorpay_payment_id });
  } catch (err) {
    console.error("Razorpay verify error:", err);
    res.status(500).json({ error: err.message || "Payment verification failed" });
  }
});

// Refund handling
// Works out the status and refunded amount from what Razorpay says.
const statusFromRazorpay = (rp, localAmount) => {
  const refunded = rp.amount_refunded || 0;
  if (refunded >= localAmount) return { status: "refunded", refundedAmount: localAmount };
  if (refunded > 0)            return { status: "partially_refunded", refundedAmount: refunded };
  return { status: "paid", refundedAmount: 0 };
};

// Saves the refund state only when something actually changed.
const applyRefundState = async (local, rp) => {
  const next = statusFromRazorpay(rp, local.amount);
  if (next.status !== local.status || next.refundedAmount !== local.refundedAmount)
    await Payment.updateOne({ _id: local._id }, next);
};

// Refreshes one payment from Razorpay (used by the webhook).
const syncPayment = async (paymentId) => {
  const local = await Payment.findOne({ razorpayPaymentId: paymentId });
  if (!local || !REVENUE_STATUSES.includes(local.status)) return;
  await applyRefundState(local, await razorpay.payments.fetch(paymentId));
};

// Checks refunds for all our open payments. It runs when the admin dashboard loads, so refunds
// show up even if the webhook is not set up. Throttled to once every 30 seconds to avoid
// hitting the Razorpay API on every refresh.
let lastRefundSync = 0;
const syncRefunds = async () => {
  if (Date.now() - lastRefundSync < 30_000) return;
  lastRefundSync = Date.now();

  const open = await Payment.find({ status: { $in: ["paid", "partially_refunded"] } });
  if (!open.length) return;
  const byPaymentId = new Map(open.map((p) => [p.razorpayPaymentId, p]));

  // One list call from the oldest open payment is cheaper than fetching every payment one by one.
  const from = Math.floor(Math.min(...open.map((p) => (p.verifiedAt || p.createdAt).getTime())) / 1000) - 60;

  for (let skip = 0; ; skip += 100) {
    const page  = await razorpay.payments.all({ from, count: 100, skip });
    const items = page.items || [];
    for (const rp of items) {
      const local = byPaymentId.get(rp.id);
      if (local) await applyRefundState(local, rp);
    }
    if (items.length < 100) break;
  }
};

// POST /artverse/payment/webhook
// Set this up in the Razorpay dashboard under Webhooks, with the events payment.captured,
// payment.failed, refund.created and refund.processed. The secret goes in RAZORPAY_WEBHOOK_SECRET.
app.post("/artverse/payment/webhook", async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ error: "Webhook not configured" });

  const signature = req.headers["x-razorpay-signature"];
  const expected  = crypto.createHmac("sha256", secret).update(req.rawBody || "").digest("hex");
  if (!signature || !safeEqual(expected, signature))
    return res.status(400).json({ error: "Invalid webhook signature" });

  try {
    const { event, payload } = req.body;
    const paymentId = payload?.payment?.entity?.id || payload?.refund?.entity?.payment_id;
    if (paymentId) {
      if (event === "payment.failed") {
        const orderId = payload.payment.entity.order_id;
        await Payment.updateOne({ razorpayOrderId: orderId, status: "created" }, { status: "failed" });
      } else if (["payment.captured", "refund.created", "refund.processed", "refund.speed_changed"].includes(event)) {
        await syncPayment(paymentId);
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: revenue (net of refunds)
app.get("/artverse/admin/revenue", requireAdmin, async (req, res) => {
  try {
    // If Razorpay can't be reached we still show the numbers we have.
    try { await syncRefunds(); } catch (e) { console.error("Refund sync failed:", e.message); }

    const [row] = await Payment.aggregate([
      { $match: { status: { $in: REVENUE_STATUSES }, razorpayPaymentId: { $ne: null } } },
      { $group: { _id: null, gross: { $sum: "$amount" }, refunded: { $sum: "$refundedAmount" }, count: { $sum: 1 } } },
    ]);
    const gross = row?.gross || 0, refunded = row?.refunded || 0;
    // Sent in rupees. Net revenue is what was paid minus what was refunded.
    res.json({
      net: (gross - refunded) / 100,
      gross: gross / 100,
      refunded: refunded / 100,
      successfulPayments: row?.count || 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: per-artwork stats
app.get("/artverse/admin/artwork-stats/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid artwork id" });
  try {
    const [totalPurchases, totalDownloads] = await Promise.all([
      Payment.countDocuments({ artworkId: id, status: { $in: ["paid", "partially_refunded"] } }),
      Download.countDocuments({ artworkId: id }),
    ]);
    res.json({ totalPurchases, totalDownloads });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: edit category / delete artwork
app.patch("/artverse/admin/gallery/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { category } = req.body || {};
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid artwork id" });
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: "Invalid category" });
  try {
    const artwork = await Gallery.findById(id);
    if (!artwork) return res.status(404).json({ error: "Artwork not found" });

    const ruleError = mediaCategoryError(artwork.mediaType === "video", category);
    if (ruleError) return res.status(400).json({ error: ruleError });

    artwork.category = category;
    await artwork.save();
    res.json(toPublic(artwork));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Payment and download records are kept on purpose when an artwork is deleted, so revenue stays correct.
app.delete("/artverse/admin/gallery/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid artwork id" });
  try {
    // The Cloudinary ids are hidden by default, so they are asked for here on purpose
    const artwork = await Gallery.findById(id).select("+originalPublicId +previewPublicId +legacyPublicId");
    if (!artwork) return res.status(404).json({ error: "Artwork not found" });
    await artwork.deleteOne();

    // Not awaited on purpose. The artwork is already gone from the database, so a failed cleanup
    // should not make the admin's delete look like it failed. Failures are logged instead.
    media.destroyAssets(assetsToDestroy(artwork)).then((failed) => {
      if (failed.length) console.error("Cloudinary cleanup did not finish:", failed);
    });
    res.json({ deleted: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Start server
// The server is exported only so the tests can shut it down
export const server = app.listen(process.env.PORT || 8080, () => console.log("Server running"));
