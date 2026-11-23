// A real end to end check against your Cloudinary account, using a separate test folder.
// It does not touch the database or any real artwork.
//
// Usage:   MEDIA_FOLDER=artverse-test node scripts/staging-test.js [--keep]
//
// It uploads a sample image the way the website does, then checks that:
//   - the preview is public, about 1000px and has the same aspect ratio
//   - the original is private: only a signed link works, and a link without a signature,
//     a made up signature and an expired link all fail
//   - the file from the signed link is byte for byte the file that was uploaded
// It also prints three watermark samples to look at, and what Cloudinary sends in its download
// headers (this decides if the browser can save the file directly or has to use the fallback).
// Everything it uploaded is deleted at the end, unless you pass --keep.

import zlib from "zlib";
import { pathToFileURL } from "url";
import { parseArgs, setupCloudinary, httpGet, sha256, unsignedUrlFor, forgedUrlFor, cloudinary } from "./lib.js";
import { checkAccess } from "./migration.js";
import { media, previewTransformation } from "../media.js";

// Makes a plain PNG with a gradient, so no sample file is needed
const makePng = (width, height) => {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * (width * 3 + 1) + 1 + x * 3;
    raw[i] = (x * 255 / width) | 0; raw[i + 1] = (y * 255 / height) | 0; raw[i + 2] = 140;
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};

export const runStaging = async (args, ctx) => {
  const results = [];
  const check = (name, pass, detail = "") => { results.push({ name, pass }); ctx.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`); };
  const toDelete = [];

  const png = makePng(2400, 1600); // wider than 1000px so the shrinking can be seen
  ctx.log(`Uploading a ${png.length} byte sample image into ${process.env.MEDIA_FOLDER}/ ...`);
  const pair = await ctx.media.uploadImagePair(png);
  toDelete.push(...pair.assets);

  check("preview is about 1000px on the longest side", Math.max(pair.preview.width, pair.preview.height) <= 1000, `${pair.preview.width}x${pair.preview.height}`);
  check("preview keeps the aspect ratio", Math.abs(pair.preview.width / pair.preview.height - 1.5) < 0.02);

  const problems = await checkAccess(ctx, { publicId: pair.original.publicId, format: pair.original.format, previewUrl: pair.preview.url, expectSha256: sha256(png), expectBytes: png.length, strict: true });
  check("signed link returns the exact original file (same checksum)", !problems.some((p) => /signed link|checksum|different size/.test(p)), problems.join("; "));
  check("the original cannot be opened without a signature", !problems.some((p) => /PUBLIC/.test(p)));
  check("a made up signature does not work", !problems.some((p) => /made up/.test(p)));
  check("an expired signed link does not work", !problems.some((p) => /expired/.test(p)));
  check("the preview loads as an image", !problems.some((p) => /preview/.test(p)));

  // Download headers, to know how the browser will behave
  const link = ctx.media.signedDownloadUrl({ publicId: pair.original.publicId, format: pair.original.format });
  const probe = await ctx.http.get(link.url, { Origin: "http://localhost:5173" });
  ctx.log("");
  ctx.log("What Cloudinary sends for a signed download link:");
  ctx.log(`  access-control-allow-origin: ${probe.headers.get("access-control-allow-origin") || "(none)"}`);
  ctx.log(`  content-disposition:         ${probe.headers.get("content-disposition") || "(none)"}`);
  ctx.log(`  content-type:                ${probe.headers.get("content-type") || "(none)"}`);
  ctx.log(probe.headers.get("access-control-allow-origin")
    ? "  -> the browser can read the file and save it with the name we choose"
    : "  -> the browser cannot read it from the page, so the site will use the fallback: it clicks the link and the browser downloads it");

  // Watermark samples to look at
  ctx.log("");
  ctx.log("Watermark samples (open these in a browser and pick one, then set WATERMARK_STYLE in .env):");
  for (const style of ["tiled", "center", "corner"]) {
    const sample = await ctx.uploadSample(png, style);
    toDelete.push({ publicId: sample.public_id, resourceType: "image", type: "upload" });
    ctx.log(`  ${style.padEnd(7)} ${sample.secure_url}`);
  }

  if (args.keep) ctx.log("\n--keep given, so the test files stay in Cloudinary. Delete the folder yourself when done.");
  else {
    if (!args["no-wait"]) { ctx.log("\nPress Ctrl+C now if you want to look at the samples first. Cleaning up in 60 seconds..."); await new Promise((r) => setTimeout(r, 60000)); }
    const failed = await ctx.media.destroyAssets(toDelete);
    const gone = await ctx.http.get(link.url);
    check("test files were deleted", failed.length === 0 && gone.status !== 200, failed.length ? `${failed.length} not deleted` : "");
  }
  const failedChecks = results.filter((r) => !r.pass).length;
  ctx.log(failedChecks ? `\n${failedChecks} check(s) FAILED. Do not migrate yet.` : "\nAll checks passed.");
  return { ok: failedChecks === 0, results };
};

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  if (!process.env.MEDIA_FOLDER || process.env.MEDIA_FOLDER === "artverse") {
    console.error('Set MEDIA_FOLDER to a test folder, for example: MEDIA_FOLDER=artverse-test node scripts/staging-test.js');
    process.exit(1);
  }
  setupCloudinary();
  const result = await runStaging(parseArgs(), {
    media, http: { get: httpGet }, urls: { unsigned: unsignedUrlFor, forged: forgedUrlFor }, log: console.log,
    uploadSample: (buffer, style) => new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: `${process.env.MEDIA_FOLDER}/samples`, resource_type: "image", transformation: previewTransformation(style) },
        (err, res) => (err ? reject(err) : resolve(res))
      ).end(buffer);
    }),
  });
  process.exit(result.ok ? 0 : 1);
}
