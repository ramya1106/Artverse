// Everything that talks to Cloudinary lives in this file.
//
// How images are stored:
//   - the ORIGINAL is uploaded as type "authenticated", so Cloudinary will not serve it
//     unless the link is signed by our server
//   - a PREVIEW is uploaded as a normal public file. It is shrunk to about 1000px and has the
//     ARTVERSE watermark baked in, so the site only ever shows the preview
// Videos (Live Wallpapers) are not protected for now. They stay public like before.
//
// The cloudinary.config() call is in index.js.

import { v2 as cloudinary } from "cloudinary";

// All files go into this Cloudinary folder. The staging test sets MEDIA_FOLDER=artverse-test so
// test files never mix with the real ones.
const ROOT_FOLDER = process.env.MEDIA_FOLDER || "artverse";

const WATERMARK_TEXT = "ARTVERSE";
const PREVIEW_SIZE   = 1000;        // longest side of the preview in pixels
export const DOWNLOAD_LINK_SECONDS = 300; // a download link works for 5 minutes

// Watermark looks. Change WATERMARK_STYLE in .env to try another one: tiled, center or corner.
const textLayer = (size, spacing) => ({
  overlay: { font_family: "Arial", font_size: size, font_weight: "bold", letter_spacing: spacing, text: WATERMARK_TEXT },
});

const WATERMARK_STYLES = {
  tiled:  [textLayer(34, 6),  { color: "white", opacity: 22, angle: -30 }, { flags: ["layer_apply", "tiled"] }],
  center: [textLayer(90, 14), { color: "white", opacity: 30, angle: -30 }, { flags: "layer_apply", gravity: "center" }],
  corner: [textLayer(40, 6),  { color: "white", opacity: 55 }, { flags: "layer_apply", gravity: "south_east", x: 24, y: 24 }],
};

// "limit" only shrinks big images, it never makes a small one bigger, and keeps the aspect ratio.
// This is an incoming transformation, so Cloudinary stores the shrunk and watermarked file itself.
export const previewTransformation = (style = process.env.WATERMARK_STYLE || "tiled") => [
  { width: PREVIEW_SIZE, height: PREVIEW_SIZE, crop: "limit", quality: "auto" },
  ...(WATERMARK_STYLES[style] || WATERMARK_STYLES.tiled),
];

const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error); else resolve(result);
    });
    stream.end(buffer);
  });

// Cloudinary needs the public id to delete a file, and for old artworks we only stored the URL.
// "https://res.cloudinary.com/x/image/upload/v123/artverse/abc.jpg" gives "artverse/abc"
export const publicIdFromUrl = (url) => {
  const m = String(url).match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/);
  return m ? decodeURIComponent(m[1]) : null;
};

// Every Cloudinary file that belongs to one artwork, so a delete can remove all of them.
export const assetsToDestroy = (artwork) => {
  const list = [];
  if (artwork.previewPublicId)  list.push({ publicId: artwork.previewPublicId,  resourceType: "image", type: "upload" });
  if (artwork.originalPublicId) list.push({ publicId: artwork.originalPublicId, resourceType: "image", type: "authenticated" });
  // The old public copy is kept until the migration is finalized
  if (artwork.legacyPublicId)   list.push({ publicId: artwork.legacyPublicId,   resourceType: "image", type: "upload" });
  // Videos and artworks that were never migrated only have the public file the URL points to
  if (!artwork.previewPublicId && !artwork.originalPublicId) {
    const publicId = publicIdFromUrl(artwork.imageURL);
    if (publicId) list.push({ publicId, resourceType: artwork.mediaType === "video" ? "video" : "image", type: "upload" });
  }
  return list;
};

// Deletes the files and never throws. It returns the ones that could not be deleted, so the
// caller can log them. "not found" counts as deleted because that is what we wanted.
const destroyAssets = async (assets) => {
  const results = await Promise.allSettled(
    assets.map((a) =>
      cloudinary.uploader.destroy(a.publicId, { resource_type: a.resourceType, type: a.type, invalidate: true })
    )
  );
  const failed = [];
  results.forEach((r, i) => {
    const ok = r.status === "fulfilled" && ["ok", "not found"].includes(r.value?.result);
    if (!ok) failed.push({ ...assets[i], reason: r.reason?.message || r.value?.result });
  });
  return failed;
};

// Uploads the private original and the public preview. If the second upload fails, the first one
// is removed again, so a failed upload never leaves a stray original behind.
const uploadImagePair = async (buffer) => {
  const original = await uploadBuffer(buffer, {
    folder: `${ROOT_FOLDER}/originals`, resource_type: "image", type: "authenticated",
  });
  const originalAsset = { publicId: original.public_id, resourceType: "image", type: "authenticated" };

  let preview;
  try {
    preview = await uploadBuffer(buffer, {
      folder: `${ROOT_FOLDER}/previews`, resource_type: "image", transformation: previewTransformation(),
    });
  } catch (err) {
    await destroyAssets([originalAsset]);
    throw err;
  }
  const previewAsset = { publicId: preview.public_id, resourceType: "image", type: "upload" };

  return {
    original: { publicId: original.public_id, format: original.format, width: original.width, height: original.height },
    preview:  { publicId: preview.public_id, url: preview.secure_url, width: preview.width, height: preview.height },
    assets:   [originalAsset, previewAsset],
  };
};

// Videos keep the old behaviour: one public file.
const uploadVideo = (buffer) => uploadBuffer(buffer, { folder: ROOT_FOLDER, resource_type: "video" });

// A link to the private original that stops working after a few minutes. It is signed with our
// API secret on this server, so no request to Cloudinary is needed to make it.
const signedDownloadUrl = ({ publicId, format, seconds = DOWNLOAD_LINK_SECONDS }) => {
  const expiresAt = Math.floor(Date.now() / 1000) + seconds;
  const url = cloudinary.utils.private_download_url(publicId, format, {
    resource_type: "image",
    type: "authenticated",
    attachment: true,
    expires_at: expiresAt,
  });
  return { url, expiresAt };
};

// Kept as one plain object so the tests can swap the functions for fakes.
export const media = { uploadImagePair, uploadVideo, signedDownloadUrl, destroyAssets };
