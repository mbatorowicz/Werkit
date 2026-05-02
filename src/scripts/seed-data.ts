import { db } from '../db';
import { resourceCategories, resources, materials, customers } from '../db/schema';

async function seed() {
  console.log('Seeding initial data...');

  // Categories
  const catTrans = await db.insert(resourceCategories).values({ name: 'Transport' }).returning();
  const catMach = await db.insert(resourceCategories).values({ name: 'Maszyny Ciężkie' }).returning();

  // Resources (Machines)
  await db.insert(resources).values([
    { name: 'Wywrotka MAN TGS (WGM 1234)', categoryId: catTrans[0].id },
    { name: 'Scania R450 Patelnia (WGM 5678)', categoryId: catTrans[0].id },
    { name: 'Koparka Volvo EC220', categoryId: catMach[0].id },
    { name: 'Ładowarka CAT 938M', categoryId: catMach[0].id }
  ]);

  // Materials
  await db.insert(materials).values([
    { name: 'Piasek Płukany', type: 'Sypkie' },
    { name: 'Kruszywo Betonowe 0-63', type: 'Gruz' },
    { name: 'Ziemia Przesiewana', type: 'Ziemia' }
  ]);

  // Customers
  await db.insert(customers).values([
    { firstName: 'Jan', lastName: 'Kowalski', defaultAddress: 'ul. Polna 15, 05-200 Wołomin' },
    { firstName: 'Budimex', lastName: 'S.A.', defaultAddress: 'ul. Kolejowa 1, Warszawa' },
    { firstName: 'Anna', lastName: 'Nowak', defaultAddress: 'ul. Leśna 5, Radzymin' }
  ]);

  console.log('Seed completed successfully!');
}

seed().catch(console.error).then(() => process.exit(0));
