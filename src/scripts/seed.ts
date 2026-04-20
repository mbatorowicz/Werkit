import { db } from '../db';
import { users } from '../db/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding admin user...');
  const usernameEmail = 'admin';
  const existing = await db.select().from(users).where(eq(users.usernameEmail, usernameEmail));
  
  if (existing.length === 0) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await db.insert(users).values({
      fullName: 'Mariusz Batorowicz (Szef)',
      usernameEmail,
      passwordHash,
      role: 'admin',
      isActive: true,
    });
    console.log('✅ Admin user created! Login: admin / Hasło: admin123');
  } else {
    console.log('✅ Admin user already exists (admin)');
  }
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
}).then(() => process.exit(0));
