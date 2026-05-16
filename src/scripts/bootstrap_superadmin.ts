/**
 * Jednorazowe utworzenie konta superadmina platformy (company_id = NULL).
 * Użycie: SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... npm run db:bootstrap-superadmin
 * (wartości można też ustawić w `.env.local`)
 */
import { loadEnvConfig } from '@next/env';
import { db } from '@/db';
import { users } from '@/db/schema';
import { hashPassword } from '@/lib/passwordCrypto';
import { sql } from 'drizzle-orm';

loadEnvConfig(process.cwd());

async function main() {
  const email = (process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD || '';
  const fullName = (process.env.SUPERADMIN_NAME || 'Superadmin Werkit').trim();

  if (!email || !password) {
    console.error('Ustaw SUPERADMIN_EMAIL i SUPERADMIN_PASSWORD w środowisku.');
    process.exit(1);
  }

  const existing = await db
    .select()
    .from(users)
    .where(sql`lower(${users.usernameEmail}) = ${email}`)
    .limit(1);

  if (existing[0]) {
    if (existing[0].role === 'superadmin') {
      console.log(`Superadmin już istnieje: ${email} (id=${existing[0].id})`);
      return;
    }
    console.error(`Użytkownik ${email} istnieje z rolą ${existing[0].role}. Przerwij ręcznie lub użyj innego e-maila.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password, 10);
  const [row] = await db
    .insert(users)
    .values({
      companyId: null,
      fullName,
      usernameEmail: email,
      passwordHash,
      role: 'superadmin',
      isActive: true,
      canCreateOwnOrders: false,
      canEditRoute: false,
    })
    .returning({ id: users.id });

  console.log(`Utworzono superadmina id=${row.id}, login=${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
