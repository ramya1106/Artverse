// Moves the existing artworks to the protected setup: private original plus watermarked preview.
//
// Always start with a backup:   node scripts/backup-originals.js
// Then, in this order:
//   1. Look first (changes nothing):  node scripts/migrate-originals.js --backup <manifest> --limit 3
//   2. Migrate a few:                 node scripts/migrate-originals.js --backup <manifest> --limit 3 --apply
//   3. Check the site, then the rest: node scripts/migrate-originals.js --backup <manifest> --apply
//   4. Check protection:              node scripts/verify-protection.js
//   5. Finally delete the old public copies (cannot be undone, only the backup remains):
//                                     node scripts/migrate-originals.js --backup <manifest> --finalize --apply --confirm-delete
//
// Other options: --id <artworkId> (one artwork), --keep-going (do not stop at the first failure),
//   --rollback --apply (undo a migration that was not finalized yet).
//
// Nothing changes without --apply. Migrate never deletes anything. Only --finalize deletes, and
// only after everything is verified again.

import path from "path";
import { pathToFileURL } from "url";
import mongoose from "mongoose";
import { parseArgs, setupCloudinary, connectDb, httpGet, closeDb, loadBackup, backupProblem, fileStateStore, unsignedUrlFor, forgedUrlFor, databaseName } from "./lib.js";
import { migrateBatch, finalizeArtwork, rollbackArtwork } from "./migration.js";
import { media } from "../media.js";

const applyLimit = (docs, limit) => (limit ? docs.slice(0, Number(limit)) : docs);

export const runMigrationCli = async (args, ctx, loadBackupFn = loadBackup) => {
  const apply = !!args.apply;
  const filter = args.id ? { _id: new mongoose.Types.ObjectId(String(args.id)) } : {};
  const all = await ctx.collection.find(filter).sort({ date_created: 1 }).toArray();

  // The backup is needed for anything that changes things. A dry run only mentions it.
  let backup = null;
  if (apply || args.backup) backup = loadBackupFn(args.backup);
  const problemFor = (id) => (backup ? backupProblem(backup.entries, id) : "no backup given");

  if (args.rollback) {
    const docs = applyLimit(all.filter((d) => d.originalProtected && d.legacyPublicId), args.limit);
    const summary = { done: 0, failed: 0 };
    for (const doc of docs) {
      if (!apply) { ctx.log(`would roll back ${doc._id}`); continue; }
      const r = await rollbackArtwork(doc, ctx);
      ctx.log(r.ok ? `rolled back ${doc._id}${r.warning ? ` (${r.warning})` : ""}` : `FAILED ${doc._id}: ${r.error}`);
      r.ok ? summary.done++ : summary.failed++;
      if (!r.ok && !args["keep-going"]) break;
    }
    return { ok: summary.failed === 0, summary };
  }

  if (args.finalize) {
    if (apply && !args["confirm-delete"]) throw new Error("--finalize --apply deletes the old public files for good. Add --confirm-delete if you are sure.");
    const docs = applyLimit(all.filter((d) => d.originalProtected && d.legacyPublicId), args.limit);
    const summary = { done: 0, failed: 0 };
    for (const doc of docs) {
      const id = String(doc._id);
      if (!apply) { ctx.log(`would finalize ${id}`); continue; }
      const missing = problemFor(id);
      if (missing) { ctx.log(`STOP ${id}: ${missing}`); summary.failed++; break; }
      const entry = backup.entries.get(id);
      const r = await finalizeArtwork(doc, ctx, { sha256: entry.sha256, bytes: entry.bytes });
      ctx.log(r.ok ? `finalized ${id}${r.warning ? ` (warning: ${r.warning})` : ""}` : `FAILED ${id}: ${r.error}`);
      r.ok ? summary.done++ : summary.failed++;
      if (!r.ok && !args["keep-going"]) break;
    }
    return { ok: summary.failed === 0, summary };
  }

  const docs = applyLimit(all.filter((d) => d.mediaType !== "video" && !d.originalProtected), args.limit);
  const summary = await migrateBatch({ docs, ctx, apply, backupProblem: problemFor, keepGoing: !!args["keep-going"] });
  if (!apply) ctx.log(`Dry run: ${summary.planned} artwork(s) would be migrated. Nothing was changed. Add --apply to do it.`);
  return { ok: summary.failed === 0, summary };
};

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  setupCloudinary();
  const args = parseArgs();
  const db = await connectDb();
  console.log(`Database: ${databaseName()}   Cloudinary: ${process.env.CLOUD_NAME}   ${args.apply ? "APPLYING CHANGES" : "dry run"}`);
  let stateFile = path.join("backups", "migration-state.json");
  if (args.backup && args.backup !== true) stateFile = path.join(path.dirname(args.backup), "migration-state.json");
  const state = fileStateStore(stateFile);
  const ctx = {
    media, http: { get: httpGet }, urls: { unsigned: unsignedUrlFor, forged: forgedUrlFor },
    collection: db.collection("gallery"), state, log: console.log,
  };
  try {
    const result = await runMigrationCli(args, ctx);
    console.log(JSON.stringify(result.summary));
    await closeDb();
    process.exit(result.ok ? 0 : 1);
  } catch (err) {
    console.error(`Stopped: ${err.message}`);
    await closeDb();
    process.exit(1);
  }
}
