// Downloads every artwork file to disk and writes a manifest with sizes and checksums.
// A MongoDB dump does not contain the image files, so this is the only copy of them outside Cloudinary.
//
// Usage:   node scripts/backup-originals.js [--out backups]
// Makes:   backups/originals-<date>/manifest.json, gallery.json and files/<artworkId>.<ext>
//
// The migration refuses to run unless it is given a manifest from this script that finished.

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { sha256, parseArgs, setupCloudinary, connectDb, httpGet, closeDb } from "./lib.js";
import { media } from "../media.js";

const EXTENSIONS = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "video/mp4": "mp4" };

export const runBackup = async (args, ctx) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(args.out || "backups", `originals-${stamp}`);
  fs.mkdirSync(path.join(dir, "files"), { recursive: true });

  const docs = await ctx.collection.find({}).toArray();
  fs.writeFileSync(path.join(dir, "gallery.json"), JSON.stringify(docs, null, 2));
  ctx.log(`Backing up ${docs.length} artworks into ${dir}`);

  const entries = [], failed = [];
  const backupOne = async (doc) => {
    const id = String(doc._id);
    try {
      // Protected originals are read with a signed link, everything else from its public address
      const url = doc.originalProtected && doc.originalPublicId
        ? ctx.media.signedDownloadUrl({ publicId: doc.originalPublicId, format: doc.originalFormat }).url
        : doc.imageURL;
      const res = await ctx.http.get(url);
      if (res.status !== 200 || !res.body.length) throw new Error(`status ${res.status}`);
      const kind = doc.mediaType === "video" ? "video/" : "image/";
      const type = res.contentType.split(";")[0];
      if (!type.startsWith(kind) && !type.startsWith("application/octet-stream")) throw new Error(`unexpected content type ${type}`);
      const ext = EXTENSIONS[type] || doc.originalFormat || path.extname(new URL(url).pathname).slice(1) || "bin";
      const file = path.join("files", `${id}.${ext}`);
      fs.writeFileSync(path.join(dir, file), res.body);
      entries.push({ id, mediaType: doc.mediaType || "image", category: doc.category, imageURL: doc.imageURL, file, bytes: res.body.length, sha256: sha256(res.body) });
    } catch (err) {
      failed.push({ id, imageURL: doc.imageURL, error: err.message });
      ctx.log(`FAILED ${id}: ${err.message}`);
    }
  };

  // A few at a time, so a big gallery does not take forever
  const queue = [...docs];
  await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await backupOne(queue.shift()); }));

  const counts = {};
  for (const name of ["gallery", "download", "payments"]) counts[name] = await ctx.countCollection(name);
  const manifest = { createdAt: new Date().toISOString(), complete: failed.length === 0 && entries.length === docs.length, counts, entries, failed };
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  ctx.log(`Saved ${entries.length} of ${docs.length} files. ${failed.length ? `${failed.length} FAILED, the backup is NOT complete.` : "Backup complete."}`);
  ctx.log(`Manifest: ${path.join(dir, "manifest.json")}`);
  return { ok: manifest.complete, manifestPath: path.join(dir, "manifest.json") };
};

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  setupCloudinary();
  const db = await connectDb();
  const result = await runBackup(parseArgs(), {
    collection: db.collection("gallery"),
    countCollection: (name) => db.collection(name).countDocuments(),
    http: { get: httpGet },
    media,
    log: console.log,
  });
  await closeDb();
  process.exit(result.ok ? 0 : 1);
}
