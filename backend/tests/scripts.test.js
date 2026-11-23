import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { startServer, stopServer, db, clearAll } from "./helpers.js";
import { makeCloud, sha, ORIGINAL } from "./fakeCloud.js";
import { runBackup } from "../scripts/backup-originals.js";
import { runMigrationCli } from "../scripts/migrate-originals.js";
import { runVerify } from "../scripts/verify-protection.js";
import { runStaging } from "../scripts/staging-test.js";
import { loadBackup, backupProblem, parseArgs, httpGet, fileStateStore } from "../scripts/lib.js";
import { migrateBatch } from "../scripts/migration.js";

let cloud, tmp, lines, fileServer, base;
const gallery = () => db().collection("gallery");
const log = (l) => lines.push(l);

// A tiny web server that plays the part of the public Cloudinary files
const files = new Map();
before(async () => {
  await startServer();
  fileServer = http.createServer((req, res) => {
    const f = files.get(req.url);
    if (!f) { res.statusCode = 404; return res.end("no"); }
    res.setHeader("content-type", f.type); res.end(f.bytes);
  }).listen(0);
  await new Promise((r) => fileServer.on("listening", r));
  base = `http://127.0.0.1:${fileServer.address().port}`;
});
after(async () => { fileServer.close(); await stopServer(); });
beforeEach(async () => {
  await clearAll(); files.clear(); cloud = makeCloud(); lines = [];
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "artverse-test-"));
});

const addWebArtwork = async (name, bytes, type = "image/png", extra = {}) => {
  files.set(`/${name}`, { bytes, type });
  const r = await gallery().insertOne({ imageURL: `${base}/${name}`, category: "Epic", mediaType: "image", width: 3000, height: 2000, date_created: new Date(), ...extra });
  return String(r.insertedId);
};
const backupCtx = () => ({
  collection: gallery(), countCollection: (n) => db().collection(n).countDocuments(),
  http: { get: httpGet }, media: cloud.media, log,
});

describe("backup-originals", () => {
  it("saves every file with its checksum and a complete manifest", async () => {
    const a = await addWebArtwork("a.png", ORIGINAL);
    const v = await addWebArtwork("c.mp4", Buffer.from("video bytes"), "video/mp4", { mediaType: "video", category: "Live Wallpapers" });
    await db().collection("payments").insertOne({ razorpayOrderId: "o1", artworkId: a, amount: 100, status: "paid" });
    const r = await runBackup({ out: tmp }, backupCtx());
    assert.equal(r.ok, true);
    const manifest = JSON.parse(fs.readFileSync(r.manifestPath, "utf8"));
    assert.equal(manifest.complete, true);
    assert.equal(manifest.entries.length, 2);
    assert.deepEqual(manifest.counts, { gallery: 2, download: 0, payments: 1 });
    const entry = manifest.entries.find((e) => e.id === a);
    assert.equal(entry.sha256, sha(ORIGINAL)); assert.equal(entry.bytes, ORIGINAL.length);
    const saved = fs.readFileSync(path.join(path.dirname(r.manifestPath), entry.file));
    assert.equal(sha(saved), sha(ORIGINAL), "the file on disk is identical");
    assert.ok(manifest.entries.find((e) => e.id === v).file.endsWith(".mp4"));
    assert.equal(JSON.parse(fs.readFileSync(path.join(path.dirname(r.manifestPath), "gallery.json"), "utf8")).length, 2);
  });

  it("marks the backup incomplete if any file cannot be downloaded", async () => {
    await addWebArtwork("a.png", ORIGINAL);
    await gallery().insertOne({ imageURL: `${base}/missing.png`, category: "Epic", mediaType: "image" });
    const r = await runBackup({ out: tmp }, backupCtx());
    assert.equal(r.ok, false);
    const manifest = JSON.parse(fs.readFileSync(r.manifestPath, "utf8"));
    assert.equal(manifest.complete, false); assert.equal(manifest.failed.length, 1);
    assert.throws(() => loadBackup(r.manifestPath), /did not finish/);
  });

  it("rejects a file that is not an image, such as an error page", async () => {
    await addWebArtwork("a.png", Buffer.from("<html>error</html>"), "text/html");
    assert.equal((await runBackup({ out: tmp }, backupCtx())).ok, false);
  });

  it("backs up an already protected artwork through a signed link", async () => {
    cloud.assets.set("authenticated:artverse/originals/o9", { bytes: ORIGINAL, contentType: "image/png", format: "png" });
    await gallery().insertOne({ imageURL: "https://res.fake/image/upload/previews/p9.jpg", category: "Epic", mediaType: "image", originalProtected: true, originalPublicId: "artverse/originals/o9", originalFormat: "png" });
    const ctx = { ...backupCtx(), http: { get: cloud.http.get } };
    const r = await runBackup({ out: tmp }, ctx);
    assert.equal(r.ok, true);
    assert.equal(JSON.parse(fs.readFileSync(r.manifestPath, "utf8")).entries[0].sha256, sha(ORIGINAL));
  });
});

describe("backup checks used before changing anything", () => {
  const makeBackup = async () => {
    const id = await addWebArtwork("a.png", ORIGINAL);
    const r = await runBackup({ out: tmp }, backupCtx());
    return { id, manifestPath: r.manifestPath };
  };
  it("accepts a fresh complete backup that holds the artwork", async () => {
    const { id, manifestPath } = await makeBackup();
    const b = loadBackup(manifestPath);
    assert.equal(backupProblem(b.entries, id), null);
  });
  it("refuses an old backup", async () => {
    const { manifestPath } = await makeBackup();
    const m = JSON.parse(fs.readFileSync(manifestPath, "utf8")); m.createdAt = new Date(Date.now() - 100 * 3600000).toISOString();
    fs.writeFileSync(manifestPath, JSON.stringify(m));
    assert.throws(() => loadBackup(manifestPath), /hours old/);
  });
  it("notices a missing artwork, a deleted file and a changed file", async () => {
    const { id, manifestPath } = await makeBackup();
    const b = loadBackup(manifestPath);
    assert.match(backupProblem(b.entries, "not-in-backup"), /not in the backup/);
    const file = b.entries.get(id).filePath;
    fs.writeFileSync(file, "short"); assert.match(backupProblem(b.entries, id), /size does not match/);
    fs.unlinkSync(file); assert.match(backupProblem(b.entries, id), /missing from disk/);
  });
  it("needs a manifest path", () => { assert.throws(() => loadBackup(undefined), /--backup/); });
  it("reads arguments", () => {
    assert.deepEqual(parseArgs(["--apply", "--limit", "3", "--id", "abc", "--confirm-delete"]), { apply: true, limit: "3", id: "abc", "confirm-delete": true });
  });
  it("the state file is written after every step", () => {
    const f = path.join(tmp, "state.json");
    const s = fileStateStore(f); s.update("a", { state: "started" }); s.update("a", { state: "migrated" });
    assert.equal(JSON.parse(fs.readFileSync(f, "utf8")).a.state, "migrated");
    assert.equal(fileStateStore(f).get("a").state, "migrated", "survives a restart");
  });
});

describe("migrate-originals command", () => {
  let ctx;
  const setup = async (n = 3) => {
    // The public originals live in the pretend cloud, the backup is taken from the web server
    const ids = [];
    for (let i = 1; i <= n; i++) {
      const url = cloud.addPublic(`artverse/old${i}`);
      files.set(`/old${i}.png`, { bytes: ORIGINAL, type: "image/png" });
      const r = await gallery().insertOne({ imageURL: url, category: "Epic", mediaType: "image", width: 3000, height: 2000, date_created: new Date(Date.now() + i) });
      ids.push(String(r.insertedId));
    }
    // backup straight from the pretend cloud, as the real script does from Cloudinary
    const b = await runBackup({ out: tmp }, { ...backupCtx(), http: { get: cloud.http.get } });
    assert.equal(b.ok, true);
    ctx = { media: cloud.media, http: cloud.http, urls: cloud.urls, collection: gallery(), log, state: fileStateStore(path.join(tmp, "state.json")) };
    return { ids, manifestPath: b.manifestPath };
  };
  const protectedCount = () => gallery().countDocuments({ originalProtected: true });

  it("does nothing without --apply", async () => {
    const { manifestPath } = await setup();
    const before = [...cloud.assets.keys()].length;
    const r = await runMigrationCli({ backup: manifestPath }, ctx);
    assert.equal(r.summary.planned, 3); assert.equal(await protectedCount(), 0); assert.equal(cloud.assets.size, before);
    assert.match(lines.join("\n"), /Nothing was changed/);
  });

  it("refuses to apply without a backup", async () => {
    await setup();
    await assert.rejects(runMigrationCli({ apply: true }, ctx), /--backup/);
    assert.equal(await protectedCount(), 0);
  });

  it("migrates only --limit artworks, oldest first, then continues with the rest", async () => {
    const { manifestPath } = await setup();
    await runMigrationCli({ apply: true, backup: manifestPath, limit: "2" }, ctx);
    assert.equal(await protectedCount(), 2);
    assert.equal((await gallery().find({ originalProtected: true }).toArray()).every((d) => d.legacyPublicId), true);
    await runMigrationCli({ apply: true, backup: manifestPath }, ctx);
    assert.equal(await protectedCount(), 3);
    assert.deepEqual(cloud.log.destroyed, [], "nothing deleted while migrating");
  });

  it("migrates a single artwork with --id", async () => {
    const { ids, manifestPath } = await setup();
    await runMigrationCli({ apply: true, backup: manifestPath, id: ids[1] }, ctx);
    assert.equal(await protectedCount(), 1);
    assert.equal((await gallery().findOne({ originalProtected: true }))._id.toString(), ids[1]);
  });

  it("stops when an artwork is not in the backup", async () => {
    const { manifestPath } = await setup(2);
    const url = cloud.addPublic("artverse/newer");
    await gallery().insertOne({ imageURL: url, category: "Epic", mediaType: "image", width: 3000, height: 2000, date_created: new Date(Date.now() + 99999) });
    const r = await runMigrationCli({ apply: true, backup: manifestPath }, ctx);
    assert.equal(r.ok, false);
    assert.equal(await protectedCount(), 2, "the two backed up artworks were migrated, the new one was not");
    assert.match(lines.join("\n"), /not in the backup/);
  });

  it("finalize needs --confirm-delete, and deletes nothing in a dry run", async () => {
    const { manifestPath } = await setup(1);
    await runMigrationCli({ apply: true, backup: manifestPath }, ctx);
    await assert.rejects(runMigrationCli({ finalize: true, apply: true, backup: manifestPath }, ctx), /--confirm-delete/);
    await runMigrationCli({ finalize: true, backup: manifestPath }, ctx);
    assert.deepEqual(cloud.log.destroyed, []);
    assert.ok(cloud.assets.has("upload:artverse/old1"));
  });

  it("finalize deletes the old public copies only after verifying against the backup checksum", async () => {
    const { ids, manifestPath } = await setup(2);
    await runMigrationCli({ apply: true, backup: manifestPath }, ctx);
    // damage the private copy of the first artwork after migrating
    const target = (await gallery().find({}).toArray()).find((d) => String(d._id) === ids[0]);
    cloud.assets.get(`authenticated:${target.originalPublicId}`).bytes = Buffer.from("damaged");
    const r = await runMigrationCli({ finalize: true, apply: true, "confirm-delete": true, backup: manifestPath }, ctx);
    assert.equal(r.ok, false);
    assert.ok(cloud.assets.has("upload:artverse/old1"), "the damaged one keeps its old public copy");
    assert.match(lines.join("\n"), /checksum/);
      });

  it("finalize deletes the old public files for good when everything checks out", async () => {
    const { manifestPath } = await setup(2);
    await runMigrationCli({ apply: true, backup: manifestPath }, ctx);
    const r = await runMigrationCli({ finalize: true, apply: true, "confirm-delete": true, backup: manifestPath }, ctx);
    assert.equal(r.ok, true); assert.equal(r.summary.done, 2);
    assert.ok(!cloud.assets.has("upload:artverse/old1") && !cloud.assets.has("upload:artverse/old2"));
    assert.equal(await gallery().countDocuments({ legacyPublicId: { $exists: true } }), 0);
    assert.equal(await protectedCount(), 2);
  });

  it("rollback puts everything back", async () => {
    const { manifestPath } = await setup(2);
    await runMigrationCli({ apply: true, backup: manifestPath }, ctx);
    const r = await runMigrationCli({ rollback: true, apply: true, backup: manifestPath }, ctx);
    assert.equal(r.summary.done, 2);
    assert.equal(await protectedCount(), 0);
    assert.deepEqual([...cloud.assets.keys()].sort(), ["upload:artverse/old1", "upload:artverse/old2"]);
  });

  it("payments and download history are never touched by any step", async () => {
    const { ids, manifestPath } = await setup(1);
    await db().collection("payments").insertOne({ razorpayOrderId: "o1", razorpayPaymentId: "p1", artworkId: ids[0], amount: 100, status: "paid" });
    await db().collection("download").insertMany([{ artworkId: ids[0] }, { artworkId: ids[0], paymentId: "p1" }]);
    await runMigrationCli({ apply: true, backup: manifestPath }, ctx);
    await runMigrationCli({ finalize: true, apply: true, "confirm-delete": true, backup: manifestPath }, ctx);
    await runMigrationCli({ rollback: true, apply: true, backup: manifestPath }, ctx);
    assert.equal(await db().collection("payments").countDocuments(), 1);
    assert.equal(await db().collection("download").countDocuments(), 2);
  });
});

describe("verify-protection command", () => {
  it("reports protected, not migrated and bypassed artworks, and fails when there is a bypass", async () => {
    const url = cloud.addPublic("artverse/legacy");
    await gallery().insertOne({ imageURL: url, category: "Epic", mediaType: "image", width: 3000, height: 2000, date_created: new Date() });
    const migrated = cloud.addPublic("artverse/toMigrate");
    await gallery().insertOne({ imageURL: migrated, category: "Epic", mediaType: "image", width: 3000, height: 2000, date_created: new Date(Date.now() + 1) });
    const ctx = { media: cloud.media, http: cloud.http, urls: cloud.urls, collection: gallery(), log, state: { get() {}, update() {} } };
    const docs = await gallery().find({ imageURL: migrated }).toArray();
    await migrateBatch({ docs, ctx, apply: true, backupProblem: () => null });

    let r = await runVerify({}, ctx);
    assert.equal(r.ok, true);
    assert.deepEqual(r.counts, { ok: 1, unprotected: 1, warnings: 1, bypasses: 0 });
    assert.match(lines.join("\n"), /NOT PROTECTED/); assert.match(lines.join("\n"), /old public copy still exists/);

    cloud.opt.privateIsPublic = true;
    r = await runVerify({}, ctx);
    assert.equal(r.ok, false); assert.equal(r.counts.bypasses, 1);
    assert.match(lines.join("\n"), /BYPASS/);
  });
});

describe("staging-test command", () => {
  it("the sample image generator makes a real PNG", async () => {
    // the generator is inside the script, so it is exercised through a run and checked on the way
    const seen = [];
    const ctx = { media: { ...cloud.media, uploadImagePair: async (buf) => { seen.push(buf); return cloud.media.uploadImagePair(buf); } },
      http: cloud.http, urls: cloud.urls, log, uploadSample: async () => ({ public_id: "artverse-test/samples/s1", secure_url: "https://res.fake/image/upload/artverse-test/samples/s1.jpg" }) };
    const r = await runStaging({ "no-wait": true }, ctx);
    assert.equal(r.ok, true, lines.join("\n"));
    const png = seen[0];
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(png.readUInt32BE(16), 2400); assert.equal(png.readUInt32BE(20), 1600);
    assert.match(lines.join("\n"), /All checks passed/);
    assert.equal(cloud.assets.size, 0, "everything it uploaded was deleted");
  });
  it("fails loudly when the original turns out to be public", async () => {
    cloud.opt.privateIsPublic = true;
    const ctx = { media: cloud.media, http: cloud.http, urls: cloud.urls, log, uploadSample: async () => ({ public_id: "x", secure_url: "https://res.fake/image/upload/x.jpg" }) };
    const r = await runStaging({ "no-wait": true }, ctx);
    assert.equal(r.ok, false);
    assert.match(lines.join("\n"), /FAIL {2}the original cannot be opened without a signature/);
  });
});
