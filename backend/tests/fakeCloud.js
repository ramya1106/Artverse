// A small pretend Cloudinary for the tests. It keeps files in memory and answers the way
// Cloudinary should, and every kind of failure can be switched on through cloud.opt.

import crypto from "node:crypto";

export const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
export const ORIGINAL = Buffer.from("these are the real original image bytes ".repeat(50));

// A small pretend Cloudinary. It keeps files in memory and answers the way Cloudinary should,
// and every kind of failure can be switched on to see what the migration does.
export const makeCloud = () => {
  const assets = new Map(); // "type:publicId" -> file
  const log = { destroyed: [], uploads: 0 };
  const opt = { failPreview: false, corruptPrivate: false, privateIsPublic: false, previewTooBig: false, expiredStillWorks: false, noPreviewImage: false, destroyFails: new Set() };
  let n = 0;
  const file = (bytes, contentType = "image/png", format = "png") => ({ bytes, contentType, format });
  const res = (status, f) => ({ status, contentType: f?.contentType || "", body: f?.bytes || Buffer.alloc(0), headers: new Headers() });

  const cloud = {
    assets, log, opt,
    addPublic: (publicId, bytes = ORIGINAL) => { assets.set(`upload:${publicId}`, file(bytes)); return `https://res.fake/image/upload/v1/${publicId}.png`; },
    media: {
      uploadImagePair: async (buf) => {
        log.uploads++; n++;
        const o = `artverse/originals/o${n}`, p = `artverse/previews/p${n}`;
        if (opt.failPreview) throw new Error("preview upload failed"); // the real function removes the original itself
        assets.set(`authenticated:${o}`, file(opt.corruptPrivate ? Buffer.from("corrupt") : buf));
        assets.set(`upload:${p}`, opt.noPreviewImage ? file(Buffer.from("<html>"), "text/html") : file(Buffer.from("preview bytes"), "image/jpeg", "jpg"));
        return {
          original: { publicId: o, format: "png", width: 3000, height: 2000 },
          preview: { publicId: p, url: `https://res.fake/image/upload/${p}.jpg`, width: opt.previewTooBig ? 1600 : 1000, height: opt.previewTooBig ? 1067 : 667 },
          assets: [{ publicId: o, resourceType: "image", type: "authenticated" }, { publicId: p, resourceType: "image", type: "upload" }],
        };
      },
      signedDownloadUrl: ({ publicId, seconds = 300 }) => ({ url: `https://api.fake/download?public_id=${encodeURIComponent(publicId)}&exp=${Date.now() / 1000 + seconds}`, expiresAt: Math.floor(Date.now() / 1000 + seconds) }),
      destroyAssets: async (list) => {
        const failed = [];
        for (const a of list) {
          if (opt.destroyFails.has(a.publicId)) { failed.push({ ...a, reason: "boom" }); continue; }
          assets.delete(`${a.type}:${a.publicId}`); log.destroyed.push(`${a.type}:${a.publicId}`);
        }
        return failed;
      },
    },
    http: {
      get: async (url) => {
        const u = new URL(url);
        if (u.host === "api.fake") {
          const a = assets.get(`authenticated:${u.searchParams.get("public_id")}`);
          if (!a) return res(404);
          if (Number(u.searchParams.get("exp")) < Date.now() / 1000 && !opt.expiredStillWorks) return res(401);
          return res(200, a);
        }
        if (u.pathname.startsWith("/image/upload/")) {
          const id = u.pathname.slice("/image/upload/".length).replace(/^v\d+\//, "").replace(/\.[a-z]+$/, "");
          const a = assets.get(`upload:${id}`) || (opt.privateIsPublic ? assets.get(`authenticated:${id}`) : undefined);
          return a ? res(200, a) : res(404);
        }
        return res(401); // forged signatures and anything else
      },
    },
    urls: {
      unsigned: ({ publicId, format }) => `https://res.fake/image/upload/${publicId}.${format}`,
      forged: ({ publicId, format }) => `https://res.fake/image/authenticated/s--AAAAAAAA--/${publicId}.${format}`,
    },
  };
  return cloud;
};

