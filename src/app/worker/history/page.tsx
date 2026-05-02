import { Clock, MapPin, CheckCircle2 } from "lucide-react";
import { db } from "@/db";
import { workSessions, materials, customers } from "@/db/schema";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-fallback');

async function getUserId() {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload.userId as number;
  } catch {
    return null;
  }
}

export default async function HistoryPage() {
  const userId = await getUserId();
  if (!userId) return <div>Brak dostępu</div>;

  const sessions = await db.select({
    id: workSessions.id,
    sessionType: workSessions.sessionType,
    startTime: workSessions.startTime,
    endTime: workSessions.endTime,
    taskDescription: workSessions.taskDescription,
    materialName: materials.name,
    customerLastName: customers.lastName
  })
  .from(workSessions)
  .leftJoin(materials, eq(workSessions.materialId, materials.id))
  .leftJoin(customers, eq(workSessions.customerId, customers.id))
  .where(and(eq(workSessions.userId, userId), eq(workSessions.status, 'COMPLETED')))
  .orderBy(desc(workSessions.endTime))
  .limit(20);

  return (
    <div className="py-6 pb-20">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Historia Pracy</h1>
      
      {sessions.length === 0 ? (
         <div className="text-center p-8 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
           <p className="text-zinc-500 text-sm">Nie masz jeszcze żadnych zakończonych sesji.</p>
         </div>
      ) : (
         <div className="space-y-4">
           {sessions.map(s => (
              <div key={s.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                 <div className="flex items-center gap-2 mb-3">
                   <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                   <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
                     Zakończono
                   </span>
                   <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-auto">
                     {s.endTime?.toLocaleDateString('pl-PL')}
                   </span>
                 </div>
                 <div className="font-semibold text-zinc-900 dark:text-white mb-1">
                    {s.sessionType === 'TRANSPORT' ? 'Transport Kruszyw' : s.sessionType === 'MACHINE_OP' ? 'Praca Sprzętem' : 'Warsztat'}
                 </div>
                 <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    {s.startTime.toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit'})} - {s.endTime?.toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit'})}
                 </div>
                 {s.sessionType === 'TRANSPORT' ? (
                   <div className="flex flex-wrap gap-2 text-xs">
                      <span className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 px-2 py-1 rounded text-zinc-700 dark:text-zinc-300">
                        {s.materialName || 'Brak kruszywa'}
                      </span>
                      <span className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 px-2 py-1 rounded text-zinc-700 dark:text-zinc-300">
                        Klient: {s.customerLastName || 'Brak'}
                      </span>
                   </div>
                 ) : (
                   <div className="text-sm text-zinc-500 dark:text-zinc-400 bg-[#f2fbfa] dark:bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                     {s.taskDescription || 'Brak opisu prac'}
                   </div>
                 )}
              </div>
           ))}
         </div>
      )}
    </div>
  );
}



