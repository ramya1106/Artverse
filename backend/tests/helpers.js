// Shared setup for the backend tests.
//
// These tests start the real server and use a real database, so they REFUSE to run unless
// MONGO_URI points to a database whose name ends with "_test". Never point them at live data.
//
// Run with:  MONGO_URI="mongodb://127.0.0.1:27017/artverse_test" npm test
//
// Cloudinary and Razorpay are never called. Cloudinary is replaced by fakes.

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

const dbName = (process.env.MONGO_URI || "").split("?")[0].split("/").pop();
if (!dbName.endsWith("_test")) {
  console.error('Refusing to run: MONGO_URI must point to a database whose name ends with "_test".');
  process.exit(1);
}

export const PORT = 8123;
export const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = "test-password-123";

Object.assign(process.env, {
  PORT: String(PORT),
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD_HASH: bcrypt.hashSync(PASSWORD, 4),
  JWT_SECRET: "test-jwt-secret",
  RAZORPAY_KEY_ID: "rzp_test_x",
  RAZORPAY_KEY_SECRET: "test-razorpay-secret",
  CLOUD_NAME: "democloud",
  API_KEY: "123456",
  API_SECRET: "test-cloudinary-secret",
  CLIENT_ORIGIN: "http://localhost:5173",
  TRUST_PROXY: "1", // lets the tests pretend to be different visitors with X-Forwarded-For
});

// Start the real server once for the whole test run
export const startServer = async () => {
  await import("../index.js");
  for (let i = 0; i < 60; i++) {
    if (mongoose.connection.readyState === 1) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  // The server builds its indexes in the background, wait until they exist
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
};

// Close the server and the database connection so the test run can finish
export const stopServer = async () => {
  const { server } = await import("../index.js");
  await new Promise((resolve) => server.close(resolve));
  server.closeAllConnections?.();
  await mongoose.disconnect();
};

export const adminToken = async () => {
  const res = await fetch(`${BASE}/artverse/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: PASSWORD }),
  });
  return (await res.json()).token;
};

export const db = () => mongoose.connection.db;
export const oid = () => new mongoose.Types.ObjectId();
export { mongoose, cloudinary };

export const clearAll = async () => {
  for (const name of ["gallery", "download", "payments", "stats"]) await db().collection(name).deleteMany({});
};

export const api = async (path, { method = "GET", token, body, form, headers = {} } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
};

export const imageForm = (category = "Epic") => {
  const form = new FormData();
  form.append("image", new Blob([Buffer.from("fake image bytes")], { type: "image/png" }), "a.png");
  form.append("category", category);
  return form;
};
export const videoForm = () => {
  const form = new FormData();
  form.append("image", new Blob([Buffer.from("fake video bytes")], { type: "video/mp4" }), "a.mp4");
  return form;
};
