import { db } from '../db';
import { users, resources, materials, customers, workSessions, gpsLogs } from '../db/schema';
import bcrypt from 'bcrypt';
import { sql } from 'drizzle-orm';

async function seedERP() {
  console.log('Seeding ERP dummy data for Margaz...');

  await db.execute(sql`TRUNCATE TABLE work_sessions, gps_logs, session_photos, customers, materials, resources, users CASCADE`);

  console.log('Insert Admin & Workers...');
  const adminHash = await bcrypt.hash('admin123', 10);
  const workerHash = await bcrypt.hash('1234', 10);

  const insertedUsers = await db.insert(users).values([
    { fullName: 'Mariusz (Szef)', usernameEmail: 'admin', passwordHash: adminHash, role: 'admin' },
    { fullName: 'Jan Kowalski (Kierowca)', usernameEmail: 'janek', passwordHash: workerHash, role: 'worker' },
    { fullName: 'Piotr Nowak (Mechanik)', usernameEmail: 'piotr_warsztat', passwordHash: workerHash, role: 'worker' },
    { fullName: 'Tomasz (Operator koparki)', usernameEmail: 'tomek_kop', passwordHash: workerHash, role: 'worker' },
  ]).returning({ id: users.id, name: users.fullName });

  console.log('Insert Resources...');
  const insertedResources = await db.insert(resources).values([
    { name: 'Wywrotka MAN (WGR 12345)', type: 'VEHICLE' },
    { name: 'Koparka CAT 320', type: 'MACHINE' },
    { name: 'Ładowarka Volvo L120', type: 'MACHINE' },
    { name: 'Warsztat Główny - Baza Margaz', type: 'STATIONARY' },
    { name: 'Pojazd Klienta (Hamulce przód)', type: 'VEHICLE' }
  ]).returning({ id: resources.id, type: resources.type, name: resources.name });

  console.log('Insert Materials...');
  const insertedMaterials = await db.insert(materials).values([
    { name: 'Piasek Płukany 0-2mm', type: 'PIASEK' },
    { name: 'Żwir 16-32mm', type: 'ZWIR' },
    { name: 'Pospółka drogowa', type: 'POSPOLKA' },
    { name: 'Tłuczeń betonowy', type: 'TLUCZEN' }
  ]).returning({ id: materials.id });

  console.log('Insert Customers...');
  const insertedCustomers = await db.insert(customers).values([
    { firstName: 'Budowa', lastName: 'Lochów (Osiedle Leśne)', defaultAddress: 'Lochów, ul. Dębowa' },
    { firstName: 'Jan', lastName: 'Kowalski - Prywatny', defaultAddress: 'Węgrów, ul. Piłsudskiego 1' },
    { firstName: 'Firma Budowlana', lastName: 'X-Bud Sokołów', defaultAddress: 'Sokołów Podlaski, Przemysłowa 5' }
  ]).returning({ id: customers.id });

  console.log('Insert Work Sessions...');
  const allUsers = await db.select().from(users);
  const allResources = await db.select().from(resources);
  const allMaterials = await db.select().from(materials);
  const allCustomers = await db.select().from(customers);

  const workerJanek = allUsers.find(u => u.fullName.includes('Jan'))!;
  const workerTomek = allUsers.find(u => u.fullName.includes('Tomasz'))!;
  const workerPiotr = allUsers.find(u => u.fullName.includes('Piotr'))!;
  
  const ladowarkaId = allResources.find(r => r.name.includes('Volvo'))!.id;
  const wywrotkaId = allResources.find(r => r.name.includes('WGR'))!.id;
  const warsztatId = allResources.find(r => r.name.includes('Baza Margaz'))!.id;

  const sandId = allMaterials[0].id; 
  const customerLochowId = allCustomers.find(c => c.lastName.includes('Lochów'))!.id;

  const sessions = await db.insert(workSessions).values([
    {
      userId: workerJanek.id,
      resourceId: wywrotkaId,
      sessionType: 'TRANSPORT',
      status: 'COMPLETED',
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 5),
      endTime: new Date(Date.now() - 1000 * 60 * 60 * 4),
      quantityTons: '15.5',
      materialId: sandId,
      customerId: customerLochowId,
      taskDescription: 'Dostawa dla Osiedla Leśnego',
    },
    {
      userId: workerJanek.id,
      resourceId: wywrotkaId,
      sessionType: 'TRANSPORT',
      status: 'IN_PROGRESS',
      startTime: new Date(Date.now() - 1000 * 60 * 30),
      quantityTons: '20.0',
      materialId: insertedMaterials[1].id,
      customerId: insertedCustomers[1].id,
      taskDescription: 'Wywóz prywatny (Węgrów)',
    },
    {
      userId: workerPiotr.id,
      resourceId: warsztatId,
      sessionType: 'WORKSHOP',
      status: 'IN_PROGRESS',
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
      taskDescription: 'Remont siłownika w wywrotce',
    },
    {
      userId: workerTomek.id,
      resourceId: ladowarkaId,
      sessionType: 'MACHINE_OP',
      status: 'IN_PROGRESS',
      startTime: new Date(Date.now() - 1000 * 60 * 60 * 1),
      taskDescription: 'Załadunek na placu Margaz',
    }
  ]).returning({ id: workSessions.id });

  console.log('Insert GPS logs...');
  await db.insert(gpsLogs).values([
    { workSessionId: sessions[1].id, latitude: '52.401', longitude: '22.015', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
    { workSessionId: sessions[1].id, latitude: '52.410', longitude: '22.000', timestamp: new Date(Date.now() - 1000 * 60 * 15) },
    { workSessionId: sessions[1].id, latitude: '52.420', longitude: '21.980', timestamp: new Date() },
  ]);

  console.log('✅ Baza Margaz (Dane Testowe ERP + floty) naładowana!');
}

seedERP().catch(console.error).then(() => process.exit(0));
