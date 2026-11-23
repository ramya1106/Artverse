// Checks, from the outside, that originals cannot be reached without our signed link.
// It only reads. Run it after migrating and again after finalizing.
//
// Usage:   node scripts/verify-protection.js [--id <artworkId>]
//
// For every image it checks that: a signed link gives the file, the same file without a signature
// does not work, a made up signature does not work, an expired link does not work, and the
// preview loads. Artworks that are not migrated yet are reported as not protected.
// Exit code 1 means a way around the protection was found.

import { pathToFileURL } from "url";
import mongoose from "mongoose";
import { parseArgs, setupCloudinary, connectDb, httpGet, closeDb, unsignedUrlFor, forgedUrlFor } from "./lib.js";
import { checkAccess } from "./migration.js";
import { media } from "../media.js";

export const runVerify = async (args, ctx) => {
  const filter = args.id ? { _id: new mongoose.Types.ObjectId(String(args.id)) } : {};
  const docs = await ctx.collection.find({ ...filter, mediaType: { $ne: "video" } }).toArray();
  let bypasses = 0, unprotected = 0, warnings = 0, ok = 0;

  for (const doc of docs) {
    const id = String(doc._id);
    if (!doc.originalProtected) { unprotected++; ctx.log(`NOT PROTECTED  ${id}  the original is still a public file`); continue; }
    const problems = await checkAccess(ctx, { publicId: doc.originalPublicId, format: doc.originalFormat, previewUrl: doc.imageURL, strict: true });
    if (doc.legacyImageURL) {
      const old = await ctx.http.get(doc.legacyImageURL);
      if (old.status === 200) { warnings++; ctx.log(`WARNING        ${id}  the old public copy still exists (finalize not done yet)`); }
    }
    if (problems.length) { bypasses++; ctx.log(`BYPASS         ${id}  ${problems.join("; ")}`); } else ok++;
  }
  ctx.log(`Checked ${docs.length} image(s): ${ok} protected, ${unprotected} not migrated, ${warnings} still have an old public copy, ${bypasses} with a problem.`);
  return { ok: bypasses === 0, counts: { ok, unprotected, warnings, bypasses } };
};

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  setupCloudinary();
  const db = await connectDb();
  const result = await runVerify(parseArgs(), {
    media, http: { get: httpGet }, urls: { unsigned: unsignedUrlFor, forged: forgedUrlFor },
    collection: db.collection("gallery"), log: console.log,
  });
  await closeDb();
  process.exit(result.ok ? 0 : 1);
}
