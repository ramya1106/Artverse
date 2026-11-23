import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, api, db, clearAll } from "./helpers.js";
import { media } from "../media.js";
import { resetLinkLimit } from "../visitors.js";
import { migrateBatch, migrateArtwork, finalizeArtwork, rollbackArtwork, checkAccess } from "../scripts/migration.js";

import { makeCloud, sha, ORIGINAL } from "./fakeCloud.js";

let cloud, state, lines;
const ctxFor = () => ({ media: cloud.media, http: cloud.http, urls: cloud.urls, collection: db().collection("gallery"), log: (l) => lines.push(l),
  state: { get: (id) => state[id], update: (id, p) => { state[id] = { ...(state[id] || {}), ...p }; } } });
const gallery = () => db().collection("gallery");

const addLegacy = async (name = "old1", extra = {}) => {
  const url = cloud.addPublic(`artverse/${name}`);
  const r = await gallery().insertOne({ imageURL: url, category: "Epic", mediaType: "image", width: 3000, height: 2000, date_created: new Date(), ...extra });
  return gallery().findOne({ _id: r.insertedId });
};
const keys = () => [...cloud.assets.keys()].sort();

before(async () => { await startServer(); });
after(stopServer);
beforeEach(async () => { await clearAll(); cloud = makeCloud(); state = {}; lines = []; resetLinkLimit(); });

describe("migrate (copy and verify, never delete)", () => {
  it("copies the original privately, makes the preview, switches the database, and deletes nothing", async () => {
    const doc = await addLegacy();
    const sum = await migrateBatch({ docs: [doc], ctx: ctxFor(), apply: true, backupProblem: () => null });
    assert.deepEqual(sum, { planned: 1, migrated: 1, failed: 0, skipped: 0 });
    const after = await gallery().findOne({ _id: doc._id });
    assert.equal(after.originalProtected, true);
    assert.match(after.imageURL, /previews\/p1\.jpg$/);
    assert.equal(after.originalPublicId, "artverse/originals/o1");
    assert.equal(after.legacyPublicId, "artverse/old1");
    assert.equal(after.legacyImageURL, doc.imageURL);
    assert.equal(after.category, "Epic"); assert.equal(after.width, 3000);
    assert.deepEqual(cloud.log.destroyed, [], "migrate must never delete anything");
    assert.ok(cloud.assets.has("upload:artverse/old1"), "the old public file is still there");
    assert.equal(state[String(doc._id)].state, "migrated");
    assert.equal(state[String(doc._id)].originalSha256, sha(ORIGINAL));
  });

  it("a dry run changes nothing", async () => {
    const doc = await addLegacy();
    const before = keys();
    const sum = await migrateBatch({ docs: [doc], ctx: ctxFor(), apply: false, backupProblem: () => null });
    assert.equal(sum.planned, 1); assert.equal(sum.migrated, 0);
    assert.equal(cloud.log.uploads, 0);
    assert.deepEqual(keys(), before);
    assert.equal((await gallery().findOne({ _id: doc._id })).originalProtected, undefined);
  });

  it("refuses to touch an artwork that is not in the backup", async () => {
    const doc = await addLegacy();
    const sum = await migrateBatch({ docs: [doc], ctx: ctxFor(), apply: true, backupProblem: () => "this artwork is not in the backup" });
    assert.equal(sum.failed, 1);
    assert.equal(cloud.log.uploads, 0);
    assert.equal((await gallery().findOne({ _id: doc._id })).originalProtected, undefined);
  });

  it("skips videos and artworks that are already migrated", async () => {
    const video = await addLegacy("clip", { mediaType: "video" });
    const done = await addLegacy("done", { originalProtected: true });
    const sum = await migrateBatch({ docs: [video, done], ctx: ctxFor(), apply: true, backupProblem: () => null });
    assert.deepEqual(sum, { planned: 0, migrated: 0, failed: 0, skipped: 2 });
    assert.equal(cloud.log.uploads, 0);
  });

  it("running it again does nothing new", async () => {
    const doc = await addLegacy();
    await migrateBatch({ docs: [doc], ctx: ctxFor(), apply: true, backupProblem: () => null });
    const docs = await gallery().find({}).toArray();
    const again = await migrateBatch({ docs, ctx: ctxFor(), apply: true, backupProblem: () => null });
    assert.equal(again.migrated, 0); assert.equal(again.skipped, 1);
    assert.equal(cloud.log.uploads, 1);
  });

  const failureCase = (title, setup, expectText) => it(title, async () => {
    const doc = await addLegacy();
    const snapshot = JSON.stringify(await gallery().findOne({ _id: doc._id }));
    const assetsBefore = keys();
    setup();
    const sum = await migrateBatch({ docs: [doc], ctx: ctxFor(), apply: true, backupProblem: () => null });
    assert.equal(sum.migrated, 0); assert.equal(sum.failed, 1);
    assert.match(lines.join("\n"), expectText);
    assert.equal(JSON.stringify(await gallery().findOne({ _id: doc._id })), snapshot, "the artwork must be exactly as before");
    assert.deepEqual(keys(), assetsBefore, "no new file may be left behind and the old one must still be there");
    assert.equal(state[String(doc._id)].state, "failed");
  });

  failureCase("preview upload fails: nothing changes", () => { cloud.opt.failPreview = true; }, /preview upload failed/);
  failureCase("private copy is corrupted: new files are removed, database untouched", () => { cloud.opt.corruptPrivate = true; }, /different (size|checksum)/);
  failureCase("private copy turns out to be PUBLIC: caught and removed", () => { cloud.opt.privateIsPublic = true; }, /PUBLIC/);
  failureCase("preview is bigger than 1000px: caught and removed", () => { cloud.opt.previewTooBig = true; }, /bigger than 1000px/);
  failureCase("preview is not an image: caught and removed", () => { cloud.opt.noPreviewImage = true; }, /preview did not load as an image/);

  it("the original cannot be read: nothing is uploaded", async () => {
    const doc = await addLegacy();
    cloud.assets.delete("upload:artverse/old1");
    const sum = await migrateBatch({ docs: [doc], ctx: ctxFor(), apply: true, backupProblem: () => null });
    assert.equal(sum.failed, 1); assert.equal(cloud.log.uploads, 0);
  });

  it("the database update fails: new files are removed", async () => {
    const doc = await addLegacy();
    const ctx = ctxFor();
    ctx.collection = { updateOne: async () => { throw new Error("db write failed"); } };
    const before = keys();
    const result = await migrateArtwork(doc, ctx);
    assert.equal(result.ok, false); assert.match(result.error, /database update failed/);
    assert.deepEqual(keys(), before);
  });

  it("the artwork changed while migrating: switched nothing, new files removed", async () => {
    const doc = await addLegacy();
    const ctx = ctxFor();
    const real = ctx.collection;
    ctx.collection = { updateOne: async (f, u) => { await real.updateOne({ _id: doc._id }, { $set: { originalProtected: true } }); return real.updateOne(f, u); } };
    const before = keys();
    const result = await migrateArtwork(doc, ctx);
    assert.equal(result.ok, false);
    assert.deepEqual(keys(), before.concat(), "no new files left");
  });

  it("if cleaning up also fails, it says so instead of hiding it", async () => {
    const doc = await addLegacy();
    cloud.opt.corruptPrivate = true; cloud.opt.destroyFails.add("artverse/originals/o1");
    const sum = await migrateBatch({ docs: [doc], ctx: ctxFor(), apply: true, backupProblem: () => null });
    assert.equal(sum.failed, 1);
    assert.match(lines.join("\n"), /could not remove 1 new file/);
    assert.ok(state[String(doc._id)].cleanupFailed.length === 1);
  });

  it("stops at the first failure, or carries on with keepGoing", async () => {
    const a = await addLegacy("a1"), b = await addLegacy("b1");
    cloud.opt.corruptPrivate = true;
    assert.equal((await migrateBatch({ docs: [a, b], ctx: ctxFor(), apply: true, backupProblem: () => null })).failed, 1);
    assert.equal(cloud.log.uploads, 1);
    assert.equal((await migrateBatch({ docs: [a, b], ctx: ctxFor(), apply: true, backupProblem: () => null, keepGoing: true })).failed, 2);
  });
});

describe("the site after a migration", () => {
  it("shows the preview, hides every private field, and hands out the private copy only through the download route", async () => {
    const doc = await addLegacy();
    await migrateBatch({ docs: [doc], ctx: ctxFor(), apply: true, backupProblem: () => null });
    const list = await api("/artverse/gallery");
    const body = JSON.stringify(list.json);
    assert.match(list.json[0].imageURL, /previews\/p1\.jpg$/);
    for (const secret of ["originals/o1", "artverse/old1", "legacy", "originalPublicId", "previewPublicId"]) assert.equal(body.includes(secret), false, secret);

    media.signedDownloadUrl = cloud.media.signedDownloadUrl;
    const dl = await api(`/artverse/download/${doc._id}`, { method: "POST", body: {} });
    assert.equal(dl.status, 200);
    const file = await cloud.http.get(dl.json.url);
    assert.equal(sha(file.body), sha(ORIGINAL), "the visitor gets the real original");
    assert.equal(dl.json.url.includes("preview"), false);
  });

  it("deleting a migrated artwork removes the preview, the private copy and the old public copy", async () => {
    const doc = await addLegacy();
    await migrateBatch({ docs: [doc], ctx: ctxFor(), apply: true, backupProblem: () => null });
    media.destroyAssets = cloud.media.destroyAssets;
    const res = await api(`/artverse/admin/gallery/${doc._id}`, { method: "DELETE", token: await (await import("./helpers.js")).adminToken() });
    assert.equal(res.status, 200);
    await new Promise((r) => setTimeout(r, 50));
    assert.deepEqual(keys(), []);
  });
});

describe("finalize (the only step that deletes the old public file)", () => {
  const migrated = async () => {
    const doc = await addLegacy();
    await migrateBatch({ docs: [doc], ctx: ctxFor(), apply: true, backupProblem: () => null });
    return gallery().findOne({ _id: doc._id });
  };
  const expectOk = { sha256: sha(ORIGINAL), bytes: ORIGINAL.length };

  it("deletes the old public copy only after the private copy and the preview verify against the backup", async () => {
    const doc = await migrated();
    const r = await finalizeArtwork(doc, ctxFor(), expectOk);
    assert.equal(r.ok, true);
    assert.ok(!cloud.assets.has("upload:artverse/old1"));
    assert.ok(cloud.assets.has("authenticated:artverse/originals/o1") && cloud.assets.has("upload:artverse/previews/p1"));
    const after = await gallery().findOne({ _id: doc._id });
    assert.equal(after.legacyPublicId, undefined); assert.equal(after.legacyImageURL, undefined);
    assert.equal(after.originalProtected, true);
  });

  it("deletes nothing if the private copy no longer matches the backup checksum", async () => {
    const doc = await migrated();
    const r = await finalizeArtwork(doc, ctxFor(), { sha256: sha(Buffer.from("something else")), bytes: 5 });
    assert.equal(r.ok, false);
    assert.ok(cloud.assets.has("upload:artverse/old1"));
    assert.deepEqual(cloud.log.destroyed, []);
  });

  it("deletes nothing if the private copy is missing, the preview is broken, or the file went public", async () => {
    for (const breakIt of [
      () => cloud.assets.delete("authenticated:artverse/originals/o1"),
      () => cloud.assets.delete("upload:artverse/previews/p1"),
      () => { cloud.opt.privateIsPublic = true; },
    ]) {
      await clearAll(); cloud = makeCloud(); state = {};
      const doc = await migrated();
      breakIt();
      const r = await finalizeArtwork(doc, ctxFor(), expectOk);
      assert.equal(r.ok, false);
      assert.ok(cloud.assets.has("upload:artverse/old1"), "the old copy must survive");
      assert.deepEqual(cloud.log.destroyed, []);
    }
  });

  it("needs a backup checksum, and skips artworks that are not migrated", async () => {
    const doc = await migrated();
    assert.equal((await finalizeArtwork(doc, ctxFor(), undefined)).ok, false);
    const plain = await addLegacy("plain");
    assert.equal((await finalizeArtwork(plain, ctxFor(), expectOk)).skipped, true);
    assert.ok(cloud.assets.has("upload:artverse/plain"));
  });

  it("if the old copy cannot be deleted, the database keeps the information needed to try again", async () => {
    const doc = await migrated();
    cloud.opt.destroyFails.add("artverse/old1");
    const r = await finalizeArtwork(doc, ctxFor(), expectOk);
    assert.equal(r.ok, false);
    assert.equal((await gallery().findOne({ _id: doc._id })).legacyPublicId, "artverse/old1");
  });
});

describe("rollback", () => {
  it("restores the artwork exactly as it was and removes only the new files", async () => {
    const doc = await addLegacy();
    const snapshot = JSON.stringify(doc);
    const assetsBefore = keys();
    await migrateBatch({ docs: [doc], ctx: ctxFor(), apply: true, backupProblem: () => null });
    const migratedDoc = await gallery().findOne({ _id: doc._id });
    const r = await rollbackArtwork(migratedDoc, ctxFor());
    assert.equal(r.ok, true);
    const restored = await gallery().findOne({ _id: doc._id });
    // originalProtected comes back as false instead of missing, everything else is identical
    const { originalProtected, ...rest } = restored;
    assert.equal(originalProtected, false);
    const { ...orig } = JSON.parse(snapshot);
    assert.equal(JSON.stringify({ ...rest, _id: String(rest._id), date_created: rest.date_created.toISOString() }), JSON.stringify({ ...orig }));
    assert.deepEqual(keys(), assetsBefore);
  });

  it("refuses once the old public file is gone", async () => {
    const doc = await addLegacy();
    await migrateBatch({ docs: [doc], ctx: ctxFor(), apply: true, backupProblem: () => null });
    let m = await gallery().findOne({ _id: doc._id });
    await finalizeArtwork(m, ctxFor(), { sha256: sha(ORIGINAL), bytes: ORIGINAL.length });
    m = await gallery().findOne({ _id: doc._id });
    const r = await rollbackArtwork(m, ctxFor());
    assert.equal(r.ok, false);
    assert.equal((await gallery().findOne({ _id: doc._id })).originalProtected, true, "nothing is changed");
  });
});

describe("verify-protection checks", () => {
  it("passes for a correctly protected file", async () => {
    const doc = await addLegacy();
    await migrateBatch({ docs: [doc], ctx: ctxFor(), apply: true, backupProblem: () => null });
    const m = await gallery().findOne({ _id: doc._id });
    assert.deepEqual(await checkAccess(ctxFor(), { publicId: m.originalPublicId, format: m.originalFormat, previewUrl: m.imageURL, strict: true }), []);
  });
  it("reports a bypass: public file, links that never expire", async () => {
    const doc = await addLegacy();
    await migrateBatch({ docs: [doc], ctx: ctxFor(), apply: true, backupProblem: () => null });
    const m = await gallery().findOne({ _id: doc._id });
    cloud.opt.privateIsPublic = true; cloud.opt.expiredStillWorks = true;
    const problems = (await checkAccess(ctxFor(), { publicId: m.originalPublicId, format: m.originalFormat, previewUrl: m.imageURL, strict: true })).join("|");
    assert.match(problems, /PUBLIC/); assert.match(problems, /expired signed link still works/);
  });
});
