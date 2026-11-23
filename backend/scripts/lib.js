// Shared helpers for the maintenance scripts (backup, migrate, verify, staging test).
// These scripts talk to the real database and the real Cloudinary account from .env.

import crypto from "crypto";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

export const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

// Very small argument reader: --apply, --limit 3, --id abc
export const parseArgs = (argv = process.argv.slice(2)) => {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) args[key] = true;
    else { args[key] = next; i++; }
  }
  return args;
};

export const setupCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key:    process.env.API_KEY,
    api_secret: process.env.API_SECRET,
    secure:     true,
  });
};

export const connectDb = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  return mongoose.connection.db;
};

export const databaseName = () => (process.env.MONGO_URI || "").split("?")[0].split("/").pop();

// Plain HTTP reads used to download files and to check what a URL gives back
export const httpGet = async (url, headers = {}) => {
  const res = await fetch(url, { headers, redirect: "follow" });
  const body = Buffer.from(await res.arrayBuffer());
  return { status: res.status, contentType: res.headers.get("content-type") || "", headers: res.headers, body };
};

// The address an UNSIGNED visitor would try for a private file
export const unsignedUrlFor = ({ publicId, format }) =>
  cloudinary.url(publicId, { type: "upload", resource_type: "image", format, secure: true });

// A made up signature on the private delivery path. It must never work.
export const forgedUrlFor = ({ publicId, format }) =>
  `https://res.cloudinary.com/${process.env.CLOUD_NAME}/image/authenticated/s--AAAAAAAA--/${publicId}.${format}`;

// Reads a backup manifest and refuses it if it is incomplete or too old
export const loadBackup = (manifestPath, { maxAgeHours = 72 } = {}) => {
  if (!manifestPath || manifestPath === true) throw new Error("--backup <path to manifest.json> is required. Run backup-originals.js first.");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!manifest.complete) throw new Error("This backup did not finish (complete is false). Run it again.");
  const ageHours = (Date.now() - new Date(manifest.createdAt).getTime()) / 3600000;
  if (ageHours > maxAgeHours) throw new Error(`This backup is ${Math.round(ageHours)} hours old. Take a fresh one (limit ${maxAgeHours} hours).`);
  const dir = path.dirname(manifestPath);
  const entries = new Map(manifest.entries.map((e) => [e.id, { ...e, filePath: path.join(dir, e.file) }]));
  return { manifest, entries, dir };
};

// The backup must really contain this artwork: listed, and the file is on disk with the right size
export const backupProblem = (entries, id) => {
  const e = entries.get(id);
  if (!e) return "this artwork is not in the backup";
  if (!fs.existsSync(e.filePath)) return "the backup file is missing from disk";
  if (fs.statSync(e.filePath).size !== e.bytes) return "the backup file size does not match the manifest";
  return null;
};

// Remembers what the migration did for every artwork, written to disk after every step so an
// interrupted run can be understood and rolled back.
export const fileStateStore = (file) => {
  const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const save = () => fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return {
    get: (id) => data[id],
    update: (id, patch) => { data[id] = { ...(data[id] || {}), ...patch, updatedAt: new Date().toISOString() }; save(); },
    all: () => data,
  };
};

export const closeDb = () => mongoose.disconnect();
export { cloudinary };
