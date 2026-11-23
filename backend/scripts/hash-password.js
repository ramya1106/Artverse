// Makes the bcrypt hash for ADMIN_PASSWORD_HASH in .env.
// Usage: node scripts/hash-password.js "your-password"
import bcrypt from "bcryptjs";

const pw = process.argv[2];
if (!pw || pw.length < 8) {
  console.error('Usage: node scripts/hash-password.js "your-password" (at least 8 characters)');
  process.exit(1);
}
// Single quotes are needed in .env because the hash contains $ characters.
console.log(`ADMIN_PASSWORD_HASH='${bcrypt.hashSync(pw, 12)}'`);
