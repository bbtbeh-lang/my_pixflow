import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from './db.js';

async function seed() {
  await db.read();

  if (db.data.users.length > 0) {
    console.log('Users already exist — seed skipped. Delete data/db.json to reseed.');
    return;
  }

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file before seeding.');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('ADMIN_PASSWORD must be at least 10 characters.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  db.data.users.push({
    id: randomUUID(),
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: 'admin',
    lastLogin: null,
    status: 'active'
  });

  await db.write();
  console.log(`Admin user created: ${email}`);
  console.log('You can now delete ADMIN_PASSWORD from .env — it is only needed for this one-time seed.');
}

seed();
