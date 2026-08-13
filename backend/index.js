import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true,
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for videos
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype === "video/mp4";
    if (isImage || isVideo) cb(null, true);
    else cb(new Error("Only images and MP4 videos are allowed"), false);
  },
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};
connectDB();

const gallerySchema = new mongoose.Schema(
  {
    imageURL:  String,
    category:  String,
    mediaType: { type: String, enum: ["image", "video"], default: "image" },
    width:     Number,
    height:    Number,
    date_created: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const downloadSchema = new mongoose.Schema(
  { artworkId: String, date_time: { type: Date, default: Date.now } },
  { versionKey: false }
);

const statsSchema = new mongoose.Schema(
  { instagramFollowers: Number },
  { versionKey: false }
);

const Gallery  = mongoose.model("Gallery",  gallerySchema,  "gallery");
const Download = mongoose.model("Download", downloadSchema, "download");
const Stats    = mongoose.model("Stats",    statsSchema,    "stats");


const adminSchema = new mongoose.Schema(
  { username: { type: String, required: true, unique: true }, password: String },
  { versionKey: false }
);
const Admin = mongoose.model("Admin", adminSchema, "admins");

// Checks the Authorization: Bearer <token> header on admin-only routes
const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
};

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

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

app.post("/artverse/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ error: "Invalid username or password" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ error: "Invalid username or password" });

    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/artverse/upload", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const isVideo  = req.file.mimetype === "video/mp4";
    const category = isVideo ? "Live Wallpapers" : req.body.category;

    if (!category) return res.status(400).json({ error: "Category is required" });

    const uploadToCloudinary = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "artverse", resource_type: isVideo ? "video" : "image" },
          (error, result) => { if (error) reject(error); else resolve(result); }
        );
        stream.end(req.file.buffer);
      });

    const result = await uploadToCloudinary();

    const saved = await Gallery.create({
      imageURL:  result.secure_url,
      category,
      mediaType: isVideo ? "video" : "image",
      width:     result.width,
      height:    result.height,
    });

    res.json(saved);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/artverse/download/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const saved = await Download.create({ artworkId: id });
    res.json(saved);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/artverse/stats", async (req, res) => {
  try {
    const totalPosts     = await Gallery.countDocuments();
    const totalDownloads = await Download.countDocuments();
    const statsDoc       = await Stats.findOne();
    res.json({ totalPosts, totalDownloads, instagramFollowers: statsDoc?.instagramFollowers || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch("/artverse/stats/followers", authMiddleware, async (req, res) => {
  const { instagramFollowers } = req.body;
  if (typeof instagramFollowers !== "number" || instagramFollowers < 0)
    return res.status(400).json({ error: "instagramFollowers must be a positive number" });
  try {
    const updated = await Stats.findOneAndUpdate({}, { instagramFollowers }, { new: true, upsert: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(process.env.PORT || 5000);
