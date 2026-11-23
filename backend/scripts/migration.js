// The logic of the migration. The command line scripts only wire the real database and the real
// Cloudinary into this, which also lets the tests run it against fakes.
//
// The rules that keep this safe:
//   - migrate COPIES. The old public file is never touched or deleted by migrate.
//   - the database is switched only after the new private copy and the preview are both verified
//   - if anything fails, the new files are removed and the database is left as it was
//   - the old public file is deleted only by finalize, after everything is verified again
//
// "ctx" is everything this file needs from the outside:
//   ctx.media       uploadImagePair, signedDownloadUrl, destroyAssets (same as media.js)
//   ctx.http.get    reads a URL and gives { status, contentType, body }
//   ctx.urls        unsigned() and forged() addresses for the private file
//   ctx.collection  the gallery collection
//   ctx.state       get/update, remembers every step
//   ctx.log         prints a line

import crypto from "crypto";
import { publicIdFromUrl } from "../media.js";

const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
const MAX_PREVIEW_SIDE = 1000;

const isImage = (res) => res.status === 200 && res.contentType.startsWith("image/") && res.body.length > 0;

// Checks how the private original and the preview behave from the outside.
// Returns a list of problems, an empty list means all good.
export const checkAccess = async (ctx, { publicId, format, previewUrl, expectSha256, expectBytes, strict = false }) => {
  const problems = [];

  // 1. A link signed by us must give back the real file
  const link = ctx.media.signedDownloadUrl({ publicId, format });
  const signed = await ctx.http.get(link.url);
  if (signed.status !== 200) problems.push(`the signed link gave status ${signed.status}`);
  else if (!signed.body.length) problems.push("the signed link gave an empty file");
  else {
    if (expectBytes && signed.body.length !== expectBytes) problems.push("the private copy has a different size than the original");
    if (expectSha256 && sha256(signed.body) !== expectSha256) problems.push("the private copy has a different checksum than the original");
  }

  // 2. Without a signature the private file must not be readable
  const unsigned = await ctx.http.get(ctx.urls.unsigned({ publicId, format }));
  if (unsigned.status === 200) problems.push("the private copy is PUBLIC, it can be opened without a signature");

  // 3. The preview must load as an image
  if (previewUrl) {
    const preview = await ctx.http.get(previewUrl);
    if (!isImage(preview)) problems.push(`the preview did not load as an image (status ${preview.status})`);
  }

  // Extra checks for verify-protection: expired links and made up signatures must not work either
  if (strict) {
    const expired = ctx.media.signedDownloadUrl({ publicId, format, seconds: -120 });
    if ((await ctx.http.get(expired.url)).status === 200) problems.push("an expired signed link still works");
    if ((await ctx.http.get(ctx.urls.forged({ publicId, format }))).status === 200) problems.push("a made up signature works");
  }
  return problems;
};

// The preview must not be bigger than agreed and must keep the aspect ratio
const previewShapeProblems = (preview, original) => {
  const problems = [];
  if (!preview.width || !preview.height || !original.width || !original.height) return ["Cloudinary did not report the image sizes"];
  if (Math.max(preview.width, preview.height) > MAX_PREVIEW_SIDE) problems.push(`the preview is bigger than ${MAX_PREVIEW_SIDE}px`);
  const a = preview.width / preview.height, b = original.width / original.height;
  if (Math.abs(a - b) / b > 0.02) problems.push("the preview has a different aspect ratio than the original");
  return problems;
};

// The artwork fields the migration changes, so rollback can put them back exactly
const MIGRATION_FIELDS = ["originalPublicId", "originalFormat", "previewPublicId", "legacyPublicId", "legacyImageURL"];

// Migrates one image artwork. Returns { ok, error? }.
export const migrateArtwork = async (doc, ctx) => {
  const id = String(doc._id);
  const fail = (error) => { ctx.state.update(id, { state: "failed", error }); return { ok: false, error }; };

  const legacyUrl = doc.imageURL;
  const legacyPublicId = publicIdFromUrl(legacyUrl);
  if (!legacyPublicId || !String(legacyUrl).includes("/image/upload/")) return fail("could not work out the Cloudinary file from imageURL");
  ctx.state.update(id, { state: "started", legacyUrl, legacyPublicId });

  // 1. Read the real original from its current public address
  const original = await ctx.http.get(legacyUrl);
  if (!isImage(original)) return fail(`could not read the original (status ${original.status})`);
  const checksum = sha256(original.body);
  ctx.state.update(id, { originalSha256: checksum, originalBytes: original.body.length });

  // 2. Upload the private copy and the preview. The old public file is not touched.
  let pair;
  try {
    pair = await ctx.media.uploadImagePair(original.body);
  } catch (err) {
    return fail(`upload failed: ${err.message}`);
  }
  ctx.state.update(id, { state: "uploaded", createdAssets: pair.assets });
  const cleanup = async (reason) => {
    const left = await ctx.media.destroyAssets(pair.assets);
    ctx.state.update(id, { state: "failed", error: reason, cleanupFailed: left.length ? left : undefined });
    return { ok: false, error: left.length ? `${reason} (could not remove ${left.length} new file(s), see the state file)` : reason };
  };

  // 3. Verify both new files before anything else changes
  const problems = [
    ...await checkAccess(ctx, { publicId: pair.original.publicId, format: pair.original.format, previewUrl: pair.preview.url, expectSha256: checksum, expectBytes: original.body.length }),
    ...previewShapeProblems(pair.preview, pair.original),
  ];
  if (problems.length) return cleanup(`verification failed: ${problems.join("; ")}`);

  // 4. Only now the database is switched. Downloads use the verified private copy from this moment.
  try {
    const result = await ctx.collection.updateOne(
      { _id: doc._id, originalProtected: { $ne: true } },
      { $set: {
        imageURL: pair.preview.url,
        originalPublicId: pair.original.publicId,
        originalFormat: pair.original.format,
        previewPublicId: pair.preview.publicId,
        legacyPublicId,
        legacyImageURL: legacyUrl,
        originalProtected: true,
      } }
    );
    if (result.modifiedCount !== 1) return cleanup("the artwork changed while migrating, nothing was switched");
  } catch (err) {
    return cleanup(`database update failed: ${err.message}`);
  }
  ctx.state.update(id, { state: "migrated" });
  return { ok: true };
};

// Runs migrate for the artworks that still need it. Stops at the first failure unless keepGoing.
export const migrateBatch = async ({ docs, ctx, apply, backupProblem, keepGoing = false }) => {
  const summary = { planned: 0, migrated: 0, failed: 0, skipped: 0 };
  for (const doc of docs) {
    const id = String(doc._id);
    if (doc.mediaType === "video" || doc.originalProtected) { summary.skipped++; continue; }
    summary.planned++;
    if (!apply) { ctx.log(`would migrate ${id} (${doc.category}) ${doc.imageURL}`); continue; }

    const missing = backupProblem(id);
    if (missing) { ctx.log(`STOP ${id}: ${missing}`); summary.failed++; break; }

    const result = await migrateArtwork(doc, ctx);
    if (result.ok) { summary.migrated++; ctx.log(`migrated ${id}`); }
    else { summary.failed++; ctx.log(`FAILED ${id}: ${result.error}`); if (!keepGoing) break; }
  }
  return summary;
};

// Deletes the old public copy of ONE migrated artwork, after checking everything again.
// expect comes from the backup, so the check is against what was saved before the migration.
export const finalizeArtwork = async (doc, ctx, expect) => {
  const id = String(doc._id);
  if (!doc.originalProtected || !doc.legacyPublicId) return { ok: false, skipped: true, error: "not migrated, or already finalized" };
  if (!expect?.sha256) return { ok: false, error: "no checksum from the backup" };

  const problems = await checkAccess(ctx, {
    publicId: doc.originalPublicId, format: doc.originalFormat, previewUrl: doc.imageURL,
    expectSha256: expect.sha256, expectBytes: expect.bytes,
  });
  if (problems.length) return { ok: false, error: `not deleted, verification failed: ${problems.join("; ")}` };

  const failed = await ctx.media.destroyAssets([{ publicId: doc.legacyPublicId, resourceType: "image", type: "upload" }]);
  if (failed.length) return { ok: false, error: `the old public copy could not be deleted: ${failed[0].reason}` };

  await ctx.collection.updateOne({ _id: doc._id }, { $unset: { legacyPublicId: "", legacyImageURL: "" } });
  ctx.state.update(id, { state: "finalized" });

  // Cloudinary's cache can keep serving the old address for a while, so this is a warning only
  const stillThere = await ctx.http.get(doc.legacyImageURL);
  return { ok: true, warning: stillThere.status === 200 ? "the old address still answers, probably cached by the CDN. Check again later." : undefined };
};

// Puts one migrated (not finalized) artwork back exactly as it was
export const rollbackArtwork = async (doc, ctx) => {
  const id = String(doc._id);
  if (!doc.originalProtected || !doc.legacyPublicId || !doc.legacyImageURL) return { ok: false, skipped: true, error: "not migrated, or already finalized" };

  // The old public file must still be there, otherwise rolling back would break the artwork
  const legacy = await ctx.http.get(doc.legacyImageURL);
  if (!isImage(legacy)) return { ok: false, error: "the old public file is not available, restore it from the backup files instead" };

  // Database first, so the site is right at every moment, then remove the new files
  await ctx.collection.updateOne(
    { _id: doc._id },
    { $set: { imageURL: doc.legacyImageURL, originalProtected: false }, $unset: Object.fromEntries(MIGRATION_FIELDS.map((f) => [f, ""])) }
  );
  const failed = await ctx.media.destroyAssets([
    { publicId: doc.previewPublicId, resourceType: "image", type: "upload" },
    { publicId: doc.originalPublicId, resourceType: "image", type: "authenticated" },
  ]);
  ctx.state.update(id, { state: "rolled back", cleanupFailed: failed.length ? failed : undefined });
  return { ok: true, warning: failed.length ? `could not remove ${failed.length} new file(s)` : undefined };
};
