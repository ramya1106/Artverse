// Small helpers for counting free downloads without a login.

import crypto from "crypto";

// A visitor has no login, so they are recognised by a hash of their IP and browser. Only the hash
// is saved, never the IP. It is not perfect: people on the same network look like one visitor,
// and someone using many IPs looks like many.
export const visitorKeyFor = (req) =>
  crypto
    .createHmac("sha256", process.env.VISITOR_HASH_SECRET || process.env.JWT_SECRET || "")
    .update(`${req.ip}|${req.headers["user-agent"] || ""}`)
    .digest("hex");

// The day for the counting starts at midnight in India (UTC+5:30), as the artist asked.
// India has no daylight saving, so adding a fixed 5 hours 30 minutes is always correct.
export const istDay = (date = new Date()) =>
  new Date(date.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);

// Simple in memory limit on link requests per IP. It only stops scripts hammering the route.
// A whole college sharing one IP should never hit it.
const LINK_LIMIT = { max: 60, windowMs: 10 * 60 * 1000 };
const linkHits = new Map();

export const tooManyLinkRequests = (ip) => {
  const now = Date.now();
  const rec = linkHits.get(ip);
  if (!rec || now - rec.first > LINK_LIMIT.windowMs) {
    linkHits.set(ip, { count: 1, first: now });
    return false;
  }
  rec.count += 1;
  return rec.count > LINK_LIMIT.max;
};

// Forget old IPs so the map does not grow forever. unref() lets the program exit normally.
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of linkHits) if (now - rec.first > LINK_LIMIT.windowMs) linkHits.delete(ip);
}, LINK_LIMIT.windowMs).unref();

// Only for the tests
export const resetLinkLimit = () => linkHits.clear();
