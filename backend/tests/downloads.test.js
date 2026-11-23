import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, adminToken, api, db, oid, clearAll, mongoose } from "./helpers.js";
import { media } from "../media.js";
import { istDay, visitorKeyFor, resetLinkLimit } from "../visitors.js";

const DAY = 24 * 60 * 60 * 1000;
let token, signedCalls;

before(async () => { await startServer(); token = await adminToken(); });
after(stopServer);
beforeEach(async () => {
  await clearAll();
  resetLinkLimit();
  signedCalls = [];
  media.signedDownloadUrl = ({ publicId, format }) => {
    signedCalls.push(publicId);
    return { url: `https://signed.example/${publicId}.${format}?sig=abc`, expiresAt: 1999999999 };
  };
});

// category: "Top" costs money, everything else is free (see PRICE_MAP in index.js)
const addArtwork = async ({ category = "Epic", mediaType = "image", protectedOriginal = true } = {}) => {
  const doc = {
    imageURL: protectedOriginal ? "https://res.cloudinary.com/democloud/image/upload/v1/artverse/previews/p1.jpg" : "https://res.cloudinary.com/democloud/image/upload/v1/artverse/old.jpg",
    category, mediaType, width: 100, height: 100, date_created: new Date(),
  };
  if (mediaType === "image" && protectedOriginal) Object.assign(doc, { originalPublicId: "artverse/originals/o1", originalFormat: "png", previewPublicId: "artverse/previews/p1", originalProtected: true });
  if (mediaType === "video") doc.imageURL = "https://res.cloudinary.com/democloud/video/upload/v1/artverse/clip.mp4";
  return String((await db().collection("gallery").insertOne(doc)).insertedId);
};

const addPayment = async (artworkId, over = {}) => {
  const n = String(Math.random()).slice(2, 8);
  const row = { razorpayOrderId: `order_${n}`, razorpayPaymentId: `pay_${n}`, artworkId, amount: 100, refundedAmount: 0, currency: "INR",
    status: "paid", downloadCounted: false, verifiedAt: new Date(), createdAt: new Date(), ...over };
  await db().collection("payments").insertOne(row);
  return row;
};

const download = (id, { ip = "10.0.0.1", ua = "Browser/1", paymentId } = {}) =>
  api(`/artverse/download/${id}`, { method: "POST", headers: { "X-Forwarded-For": ip, "User-Agent": ua }, body: paymentId ? { razorpay_payment_id: paymentId } : {} });

const rows = (filter = {}) => db().collection("download").find(filter).toArray();

describe("time and visitor helpers", () => {
  it("the counting day changes at midnight India time (18:30 UTC)", () => {
    assert.equal(istDay(new Date("2026-03-10T18:29:59Z")), "2026-03-10");
    assert.equal(istDay(new Date("2026-03-10T18:30:00Z")), "2026-03-11");
    assert.equal(istDay(new Date("2026-03-10T00:00:00Z")), "2026-03-10");
    assert.equal(istDay(new Date("2026-12-31T20:00:00Z")), "2027-01-01");
  });
  it("the visitor key depends on IP and browser, and is a hash, not the IP", () => {
    const a = visitorKeyFor({ ip: "1.2.3.4", headers: { "user-agent": "X" } });
    assert.notEqual(a, visitorKeyFor({ ip: "1.2.3.5", headers: { "user-agent": "X" } }));
    assert.notEqual(a, visitorKeyFor({ ip: "1.2.3.4", headers: { "user-agent": "Y" } }));
    assert.equal(a, visitorKeyFor({ ip: "1.2.3.4", headers: { "user-agent": "X" } }));
    assert.match(a, /^[0-9a-f]{64}$/);
  });
});

describe("free downloads", () => {
  it("gives a signed link for a protected image and counts it, without storing the IP", async () => {
    const id = await addArtwork();
    const res = await download(id, { ip: "203.0.113.7" });
    assert.equal(res.status, 200);
    assert.equal(res.json.url, "https://signed.example/artverse/originals/o1.png?sig=abc");
    assert.equal(res.json.counted, true);
    const saved = await rows();
    assert.equal(saved.length, 1);
    assert.equal(saved[0].artworkId, id);
    assert.equal(saved[0].day, istDay());
    assert.equal(JSON.stringify(saved[0]).includes("203.0.113.7"), false, "the raw IP must not be stored");
  });

  it("the same visitor is counted once per artwork per day, but still gets a link each time", async () => {
    const id = await addArtwork();
    assert.equal((await download(id)).json.counted, true);
    const again = await download(id);
    assert.equal(again.status, 200);
    assert.ok(again.json.url);
    assert.equal(again.json.counted, false);
    assert.equal((await rows()).length, 1);
  });

  it("different visitors, and the same visitor on a different artwork, are counted separately", async () => {
    const a = await addArtwork(), b = await addArtwork();
    await download(a, { ip: "10.0.0.1" });
    await download(a, { ip: "10.0.0.2" });
    await download(a, { ip: "10.0.0.1", ua: "Other/2" });
    await download(b, { ip: "10.0.0.1" });
    assert.equal((await rows()).length, 4);
    assert.equal((await rows({ artworkId: a })).length, 3);
  });

  it("counts the same visitor again on a new day", async () => {
    const id = await addArtwork();
    const key = visitorKeyFor({ ip: "10.0.0.1", headers: { "user-agent": "Browser/1" } });
    await db().collection("download").insertOne({ artworkId: id, day: "2000-01-01", dedupeKey: `${id}:${key}:2000-01-01`, date_time: new Date() });
    const res = await download(id, { ip: "10.0.0.1", ua: "Browser/1" });
    assert.equal(res.json.counted, true);
    assert.equal((await rows()).length, 2);
  });

  it("many simultaneous requests from one visitor count only once", async () => {
    const id = await addArtwork();
    const all = await Promise.all(Array.from({ length: 12 }, () => download(id)));
    assert.ok(all.every((r) => r.status === 200));
    assert.equal(all.filter((r) => r.json.counted).length, 1);
    assert.equal((await rows()).length, 1);
  });

  it("artworks that were not migrated yet still download from their public file", async () => {
    const id = await addArtwork({ protectedOriginal: false });
    const res = await download(id);
    assert.equal(res.json.url, "https://res.cloudinary.com/democloud/image/upload/v1/artverse/old.jpg");
    assert.equal(res.json.counted, true);
    assert.deepEqual(signedCalls, []);
  });

  it("videos stay public and free, and are never signed", async () => {
    const id = await addArtwork({ category: "Live Wallpapers", mediaType: "video" });
    const res = await download(id);
    assert.match(res.json.url, /clip\.mp4$/);
    assert.equal(res.json.counted, true);
    assert.deepEqual(signedCalls, []);
  });

  it("rejects bad ids and unknown artworks", async () => {
    assert.equal((await download("nope")).status, 400);
    assert.equal((await download(String(oid()))).status, 404);
  });

  it("limits link requests per IP", async () => {
    const id = await addArtwork();
    let last;
    for (let i = 0; i < 61; i++) last = await download(id, { ip: "198.51.100.9" });
    assert.equal(last.status, 429);
    assert.equal((await download(id, { ip: "198.51.100.10" })).status, 200, "other IPs are not affected");
  });

  it("keeps the old download history and the public total", async () => {
    const id = await addArtwork();
    await db().collection("download").insertMany([
      { artworkId: id, date_time: new Date("2025-01-01") }, { artworkId: id, date_time: new Date("2025-01-02") },
      { artworkId: id, paymentId: "pay_old", date_time: new Date("2025-01-03") }, { artworkId: "gone", date_time: new Date("2025-01-04") },
    ]);
    await download(id);
    assert.equal((await rows()).length, 5);
    assert.equal((await api("/artverse/stats")).json.totalDownloads, 5);
    assert.equal((await api(`/artverse/admin/artwork-stats/${id}`, { token })).json.totalDownloads, 4);
  });
});

describe("paid downloads", () => {
  it("gives no link without a payment id", async () => {
    const id = await addArtwork({ category: "Top" });
    assert.equal((await download(id)).status, 402);
    assert.equal((await rows()).length, 0);
    assert.deepEqual(signedCalls, []);
  });

  it("gives no link for an unknown payment id, a payment for another artwork, or an unpaid, failed or refunded payment", async () => {
    const id = await addArtwork({ category: "Top" }), other = await addArtwork({ category: "Top" });
    const ok = await addPayment(other);
    const created = await addPayment(id, { status: "created", razorpayPaymentId: undefined });
    const failed = await addPayment(id, { status: "failed" });
    const refunded = await addPayment(id, { status: "refunded", refundedAmount: 100 });
    for (const paymentId of ["pay_made_up", ok.razorpayPaymentId, failed.razorpayPaymentId, refunded.razorpayPaymentId])
      assert.equal((await download(id, { paymentId })).status, 402, paymentId);
    assert.equal((await download(id, { paymentId: created.razorpayOrderId })).status, 402);
    assert.equal((await rows()).length, 0);
    assert.deepEqual(signedCalls, [], "no link must be signed for any of these");
  });

  it("only accepts a payment id as plain text, not as an object that could match everything", async () => {
    const id = await addArtwork({ category: "Top" });
    await addPayment(id);
    const res = await api(`/artverse/download/${id}`, { method: "POST", body: { razorpay_payment_id: { $ne: null } } });
    assert.equal(res.status, 402);
  });

  it("gives a link after a verified payment and counts it once", async () => {
    const id = await addArtwork({ category: "Top" });
    const pay = await addPayment(id);
    const res = await download(id, { paymentId: pay.razorpayPaymentId });
    assert.equal(res.status, 200);
    assert.match(res.json.url, /^https:\/\/signed\.example\/artverse\/originals\/o1\.png/);
    assert.equal(res.json.counted, true);
    const saved = await rows();
    assert.equal(saved.length, 1);
    assert.equal(saved[0].paymentId, pay.razorpayPaymentId);
    assert.equal((await db().collection("payments").findOne({ razorpayPaymentId: pay.razorpayPaymentId })).downloadCounted, true);
  });

  it("a fresh link can be requested again without paying again, and is not counted again", async () => {
    const id = await addArtwork({ category: "Top" });
    const pay = await addPayment(id);
    await download(id, { paymentId: pay.razorpayPaymentId });
    const again = await download(id, { paymentId: pay.razorpayPaymentId, ip: "10.9.9.9" });
    assert.equal(again.status, 200);
    assert.ok(again.json.url);
    assert.equal(again.json.counted, false);
    assert.equal((await rows()).length, 1);
    assert.equal(await db().collection("payments").countDocuments(), 1, "no new payment or order is created");
  });

  it("a payment that was counted before this change is not counted again", async () => {
    const id = await addArtwork({ category: "Top" });
    const pay = await addPayment(id, { downloadCounted: true });
    await db().collection("download").insertOne({ artworkId: id, paymentId: pay.razorpayPaymentId, date_time: new Date("2025-01-01") });
    const res = await download(id, { paymentId: pay.razorpayPaymentId });
    assert.equal(res.status, 200);
    assert.equal(res.json.counted, false);
    assert.equal((await rows()).length, 1);
  });

  it("a download that failed before the first link can still be retried (counted only after a link was made)", async () => {
    const id = await addArtwork({ category: "Top" });
    const pay = await addPayment(id);
    const Download = mongoose.models.Download, original = Download.create;
    Download.create = async () => { throw new Error("db down"); };
    const failed = await download(id, { paymentId: pay.razorpayPaymentId });
    Download.create = original;
    assert.equal(failed.status, 500);
    assert.equal((await db().collection("payments").findOne({ razorpayPaymentId: pay.razorpayPaymentId })).downloadCounted, false, "nothing was counted");
    const retry = await download(id, { paymentId: pay.razorpayPaymentId });
    assert.equal(retry.status, 200);
    assert.equal(retry.json.counted, true);
    assert.equal((await rows()).length, 1);
  });

  it("simultaneous requests for one payment count once", async () => {
    const id = await addArtwork({ category: "Top" });
    const pay = await addPayment(id);
    const all = await Promise.all(Array.from({ length: 8 }, (_, i) => download(id, { paymentId: pay.razorpayPaymentId, ip: `10.1.1.${i}` })));
    assert.ok(all.every((r) => r.status === 200));
    assert.equal(all.filter((r) => r.json.counted).length, 1);
    assert.equal((await rows()).length, 1);
  });

  it("partly refunded payments can still download, fully refunded ones cannot", async () => {
    const id = await addArtwork({ category: "Top" });
    const part = await addPayment(id, { status: "partially_refunded", refundedAmount: 50 });
    assert.equal((await download(id, { paymentId: part.razorpayPaymentId })).status, 200);
    await db().collection("payments").updateOne({ razorpayPaymentId: part.razorpayPaymentId }, { $set: { status: "refunded", refundedAmount: 100 } });
    assert.equal((await download(id, { paymentId: part.razorpayPaymentId })).status, 402, "a refund that arrives later stops new links");
  });

  it("allows a fresh link for 30 days after payment and not after", async () => {
    const id = await addArtwork({ category: "Top" });
    const recent = await addPayment(id, { verifiedAt: new Date(Date.now() - 29 * DAY) });
    const old = await addPayment(id, { verifiedAt: new Date(Date.now() - 31 * DAY) });
    assert.equal((await download(id, { paymentId: recent.razorpayPaymentId })).status, 200);
    const late = await download(id, { paymentId: old.razorpayPaymentId });
    assert.equal(late.status, 403);
    assert.match(late.json.error, /30 days/);
  });

  it("works for a paid artwork that was not migrated yet", async () => {
    const id = await addArtwork({ category: "Top", protectedOriginal: false });
    const pay = await addPayment(id);
    const res = await download(id, { paymentId: pay.razorpayPaymentId });
    assert.equal(res.json.url, "https://res.cloudinary.com/democloud/image/upload/v1/artverse/old.jpg");
  });

  it("the admin purchase and download numbers keep working", async () => {
    const id = await addArtwork({ category: "Top" });
    const pay = await addPayment(id);
    await download(id, { paymentId: pay.razorpayPaymentId });
    await download(id, { paymentId: pay.razorpayPaymentId });
    const stats = await api(`/artverse/admin/artwork-stats/${id}`, { token });
    assert.deepEqual(stats.json, { totalPurchases: 1, totalDownloads: 1 });
  });
});

describe("bypass attempts", () => {
  it("the public preview URL is the only address the site ever receives for a protected image", async () => {
    const id = await addArtwork({ category: "Top" });
    for (const path of ["/artverse/gallery", "/artverse/gallery/Top", "/artverse/latest"]) {
      const body = JSON.stringify((await api(path)).json);
      assert.ok(body.includes("previews/p1.jpg"), path);
      assert.equal(body.includes("originals"), false, path);
    }
    const denied = await download(id);
    assert.equal(JSON.stringify(denied.json).includes("originals"), false);
  });

  it("the payment routes and the revenue are not touched by downloads", async () => {
    const id = await addArtwork({ category: "Top" });
    const pay = await addPayment(id, { amount: 100 });
    await download(id, { paymentId: pay.razorpayPaymentId });
    const rev = await api("/artverse/admin/revenue", { token });
    assert.equal(rev.json.net, 1);
    // successfulPayments is not checked: the test database (FerretDB) returns 0 for {$sum: 1}.
    // That code is unchanged and works on real MongoDB.
    assert.equal(await db().collection("payments").countDocuments(), 1);
  });
});
