import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { startServer, stopServer, adminToken, api, db, oid, clearAll, imageForm, videoForm, cloudinary } from "./helpers.js";
import { media, assetsToDestroy, publicIdFromUrl } from "../media.js";

const real = { ...media };
const uploader = { upload_stream: cloudinary.uploader.upload_stream, destroy: cloudinary.uploader.destroy };

let token;
before(async () => { await startServer(); token = await adminToken(); });
after(stopServer);
beforeEach(async () => {
  await clearAll();
  Object.assign(media, real);
  cloudinary.uploader.upload_stream = uploader.upload_stream;
  cloudinary.uploader.destroy = uploader.destroy;
});

const fakePair = (calls = []) => async () => {
  calls.push("pair");
  const assets = [
    { publicId: "artverse/originals/o1", resourceType: "image", type: "authenticated" },
    { publicId: "artverse/previews/p1", resourceType: "image", type: "upload" },
  ];
  return {
    original: { publicId: "artverse/originals/o1", format: "png", width: 2400, height: 3600 },
    preview: { publicId: "artverse/previews/p1", url: "https://res.cloudinary.com/democloud/image/upload/v1/artverse/previews/p1.jpg" },
    assets,
  };
};

describe("media.js with a fake Cloudinary SDK", () => {
  it("uploads the original as authenticated and the preview as a public 1000px watermarked file", async () => {
    const seen = [];
    cloudinary.uploader.upload_stream = (options, cb) => {
      seen.push(options);
      return { end: () => cb(null, { public_id: `${options.folder}/x`, secure_url: "https://x/y.jpg", format: "png", width: 2400, height: 3600 }) };
    };
    const out = await real.uploadImagePair(Buffer.from("x"));
    assert.equal(seen.length, 2);
    assert.equal(seen[0].type, "authenticated");
    assert.equal(seen[0].folder, "artverse/originals");
    assert.equal(seen[0].transformation, undefined, "the original must not be transformed");
    assert.equal(seen[1].type, undefined, "the preview must stay public");
    assert.equal(seen[1].folder, "artverse/previews");
    const t = cloudinary.url("demo", { transformation: seen[1].transformation });
    assert.match(t, /c_limit/); assert.match(t, /w_1000/); assert.match(t, /h_1000/);
    assert.match(t, /l_text:Arial_34_bold_letter_spacing_6:ARTVERSE/);
    assert.match(t, /fl_layer_apply\.tiled/);
    assert.equal(out.assets.length, 2);
  });

  it("removes the original again if the preview upload fails", async () => {
    const destroyed = [];
    cloudinary.uploader.upload_stream = (options, cb) => ({
      end: () => options.type === "authenticated"
        ? cb(null, { public_id: "artverse/originals/o9", format: "png", width: 10, height: 10 })
        : cb(new Error("preview failed")),
    });
    cloudinary.uploader.destroy = async (id, opts) => { destroyed.push({ id, ...opts }); return { result: "ok" }; };
    await assert.rejects(real.uploadImagePair(Buffer.from("x")), /preview failed/);
    assert.equal(destroyed.length, 1);
    assert.equal(destroyed[0].id, "artverse/originals/o9");
    assert.equal(destroyed[0].type, "authenticated");
  });

  it("destroyAssets treats 'not found' as done and reports real failures", async () => {
    cloudinary.uploader.destroy = async (id) => {
      if (id === "a") return { result: "ok" };
      if (id === "b") return { result: "not found" };
      if (id === "c") throw new Error("network down");
      return { result: "error" };
    };
    const failed = await real.destroyAssets(["a", "b", "c", "d"].map((publicId) => ({ publicId, resourceType: "image", type: "upload" })));
    assert.deepEqual(failed.map((f) => f.publicId), ["c", "d"]);
  });

  it("signs download links that expire, and the signature cannot be reused for another file", async () => {
    const { url, expiresAt } = real.signedDownloadUrl({ publicId: "artverse/originals/o1", format: "png", seconds: 300 });
    const u = new URL(url);
    assert.equal(u.pathname, "/v1_1/democloud/image/download");
    assert.equal(u.searchParams.get("type"), "authenticated");
    assert.equal(u.searchParams.get("public_id"), "artverse/originals/o1");
    const left = expiresAt - Math.floor(Date.now() / 1000);
    assert.ok(left > 290 && left <= 300);
    // Recompute the signature the way Cloudinary does (sha1 of sorted params plus the secret)
    const p = Object.fromEntries(u.searchParams);
    const { signature, api_key: _apiKey, ...signed } = p; // eslint-disable-line no-unused-vars
    const toSign = Object.keys(signed).sort().map((k) => `${k}=${signed[k]}`).join("&");
    assert.equal(signature, crypto.createHash("sha1").update(toSign + process.env.API_SECRET).digest("hex"));
    const tampered = { ...signed, public_id: "artverse/originals/other" };
    const badSig = crypto.createHash("sha1").update(Object.keys(tampered).sort().map((k) => `${k}=${tampered[k]}`).join("&") + process.env.API_SECRET).digest("hex");
    assert.notEqual(badSig, signature);
  });

  it("lists every Cloudinary file of an artwork for deletion", () => {
    assert.deepEqual(
      assetsToDestroy({ mediaType: "image", previewPublicId: "p", originalPublicId: "o", legacyPublicId: "l", imageURL: "https://x/upload/v1/p.jpg" }).map((a) => `${a.type}:${a.publicId}`),
      ["upload:p", "authenticated:o", "upload:l"]);
    assert.deepEqual(assetsToDestroy({ mediaType: "video", imageURL: "https://res.cloudinary.com/x/video/upload/v123/artverse/clip.mp4" }),
      [{ publicId: "artverse/clip", resourceType: "video", type: "upload" }]);
    assert.equal(publicIdFromUrl("not a cloudinary url"), null);
  });
});

describe("upload route", () => {
  it("saves an image with the preview as imageURL and hides the private ids", async () => {
    const calls = [];
    media.uploadImagePair = fakePair(calls);
    const res = await api("/artverse/upload", { method: "POST", token, form: imageForm("Premium") });
    assert.equal(res.status, 200);
    assert.deepEqual(calls, ["pair"]);
    assert.match(res.json.imageURL, /previews\/p1\.jpg$/);
    assert.equal(res.json.category, "Premium");
    assert.equal(res.json.width, 2400); assert.equal(res.json.height, 3600);
    assert.equal(res.json.originalProtected, true);
    for (const f of ["originalPublicId", "originalFormat", "previewPublicId", "legacyPublicId"]) assert.equal(res.json[f], undefined, f);

    const row = await db().collection("gallery").findOne({});
    assert.equal(row.originalPublicId, "artverse/originals/o1");
    assert.equal(row.originalFormat, "png");
    assert.equal(row.previewPublicId, "artverse/previews/p1");
    assert.equal(row.imageURL, res.json.imageURL);
  });

  it("never sends the private ids from any public route or the category edit", async () => {
    media.uploadImagePair = fakePair();
    const up = await api("/artverse/upload", { method: "POST", token, form: imageForm("Epic") });
    for (const path of ["/artverse/gallery", "/artverse/gallery/Epic", "/artverse/latest"]) {
      const r = await api(path);
      assert.equal(r.json.length, 1, path);
      assert.equal(JSON.stringify(r.json).includes("originals/o1"), false, path);
      assert.equal(r.json[0].originalPublicId, undefined, path);
    }
    const patched = await api(`/artverse/admin/gallery/${up.json._id}`, { method: "PATCH", token, body: { category: "Top" } });
    assert.equal(patched.status, 200);
    assert.equal(patched.json.category, "Top");
    assert.equal(JSON.stringify(patched.json).includes("originals/o1"), false);
    const row = await db().collection("gallery").findOne({});
    assert.equal(row.originalPublicId, "artverse/originals/o1", "editing the category must not lose the private ids");
  });

  it("removes both files and saves nothing if the database save fails", async () => {
    const destroyed = [];
    media.uploadImagePair = async () => ({ ...(await fakePair()()), original: { publicId: "o", format: "png", width: "not a number", height: 1 } });
    media.destroyAssets = async (assets) => { destroyed.push(...assets); return []; };
    const res = await api("/artverse/upload", { method: "POST", token, form: imageForm() });
    assert.equal(res.status, 500);
    assert.deepEqual(destroyed.map((a) => `${a.type}:${a.publicId}`), ["authenticated:artverse/originals/o1", "upload:artverse/previews/p1"]);
    assert.equal(await db().collection("gallery").countDocuments(), 0);
  });

  it("returns an error and saves nothing if the Cloudinary upload fails", async () => {
    media.uploadImagePair = async () => { throw new Error("cloudinary down"); };
    const res = await api("/artverse/upload", { method: "POST", token, form: imageForm() });
    assert.equal(res.status, 500);
    assert.equal(await db().collection("gallery").countDocuments(), 0);
  });

  it("keeps videos public and unchanged", async () => {
    const calls = [];
    media.uploadImagePair = async () => { calls.push("pair"); };
    media.uploadVideo = async () => ({ secure_url: "https://res.cloudinary.com/democloud/video/upload/v1/artverse/clip.mp4", width: 720, height: 1280 });
    const res = await api("/artverse/upload", { method: "POST", token, form: videoForm() });
    assert.equal(res.status, 200);
    assert.deepEqual(calls, []);
    assert.equal(res.json.category, "Live Wallpapers");
    assert.equal(res.json.mediaType, "video");
    assert.match(res.json.imageURL, /clip\.mp4$/);
    assert.equal(res.json.originalProtected, false);
  });

  it("rejects unauthenticated uploads and invalid categories", async () => {
    media.uploadImagePair = fakePair();
    assert.equal((await api("/artverse/upload", { method: "POST", form: imageForm() })).status, 401);
    assert.equal((await api("/artverse/upload", { method: "POST", token, form: imageForm("Nope") })).status, 400);
    assert.equal((await api("/artverse/upload", { method: "POST", token, form: imageForm("Live Wallpapers") })).status, 400);
    assert.equal(await db().collection("gallery").countDocuments(), 0);
  });
});

describe("delete route", () => {
  const seedHistory = async (artworkId) => {
    await db().collection("download").insertMany([{ artworkId: String(artworkId), date_time: new Date() }, { artworkId: String(artworkId), paymentId: "pay_1", date_time: new Date() }]);
    await db().collection("payments").insertOne({ razorpayOrderId: "order_1", razorpayPaymentId: "pay_1", artworkId: String(artworkId), amount: 100, status: "paid", refundedAmount: 0, verifiedAt: new Date(), createdAt: new Date() });
  };

  it("deletes the preview and the private original, and keeps payment and download history", async () => {
    media.uploadImagePair = fakePair();
    const up = await api("/artverse/upload", { method: "POST", token, form: imageForm() });
    await seedHistory(up.json._id);
    let destroyed;
    media.destroyAssets = async (a) => { destroyed = a; return []; };
    const res = await api(`/artverse/admin/gallery/${up.json._id}`, { method: "DELETE", token });
    assert.equal(res.status, 200);
    assert.deepEqual(destroyed.map((a) => `${a.type}:${a.publicId}`), ["upload:artverse/previews/p1", "authenticated:artverse/originals/o1"]);
    assert.equal(await db().collection("gallery").countDocuments(), 0);
    assert.equal(await db().collection("download").countDocuments(), 2);
    assert.equal(await db().collection("payments").countDocuments(), 1);
  });

  it("still deletes old artworks that only have a public URL, and videos", async () => {
    const legacy = await db().collection("gallery").insertOne({ imageURL: "https://res.cloudinary.com/democloud/image/upload/v1/artverse/old.jpg", category: "Epic", mediaType: "image" });
    const video = await db().collection("gallery").insertOne({ imageURL: "https://res.cloudinary.com/democloud/video/upload/v1/artverse/clip.mp4", category: "Live Wallpapers", mediaType: "video" });
    const seen = [];
    media.destroyAssets = async (a) => { seen.push(...a); return []; };
    assert.equal((await api(`/artverse/admin/gallery/${legacy.insertedId}`, { method: "DELETE", token })).status, 200);
    assert.equal((await api(`/artverse/admin/gallery/${video.insertedId}`, { method: "DELETE", token })).status, 200);
    assert.deepEqual(seen, [
      { publicId: "artverse/old", resourceType: "image", type: "upload" },
      { publicId: "artverse/clip", resourceType: "video", type: "upload" },
    ]);
  });

  it("also removes the old public copy of a half migrated artwork", async () => {
    const row = await db().collection("gallery").insertOne({ imageURL: "https://x/upload/v1/artverse/previews/p.jpg", category: "Epic", mediaType: "image",
      previewPublicId: "artverse/previews/p", originalPublicId: "artverse/protected/o", legacyPublicId: "artverse/old" });
    let seen;
    media.destroyAssets = async (a) => { seen = a; return []; };
    await api(`/artverse/admin/gallery/${row.insertedId}`, { method: "DELETE", token });
    assert.deepEqual(seen.map((a) => `${a.type}:${a.publicId}`), ["upload:artverse/previews/p", "authenticated:artverse/protected/o", "upload:artverse/old"]);
  });

  it("requires an admin token and a real id", async () => {
    assert.equal((await api(`/artverse/admin/gallery/${oid()}`, { method: "DELETE" })).status, 401);
    assert.equal((await api(`/artverse/admin/gallery/${oid()}`, { method: "DELETE", token })).status, 404);
    assert.equal((await api(`/artverse/admin/gallery/not-an-id`, { method: "DELETE", token })).status, 400);
  });
});

describe("old artworks without the new fields", () => {
  it("still show up in the gallery", async () => {
    await db().collection("gallery").insertOne({ imageURL: "https://x/upload/v1/artverse/old.jpg", category: "Epic", mediaType: "image", width: 10, height: 20, date_created: new Date() });
    const r = await api("/artverse/gallery");
    assert.equal(r.json.length, 1);
    assert.equal(r.json[0].originalProtected, false);
  });
});
