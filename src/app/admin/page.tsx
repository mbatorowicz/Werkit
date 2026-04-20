import LiveMap from "@/components/Map/LiveMap";
import { db } from "@/db";
import { workSessions, users, resources, materials } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { HardHat, Wrench, Truck, ArrowRight } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const activeSessions = await db.select({
    id: workSessions.id,
    type: workSessions.sessionType,
    desc: workSessions.taskDescription,
    startTime: workSessions.startTime,
    userName: users.fullName,
    resourceName: resources.name,
    tons: workSessions.quantityTons,
  })
    .from(workSessions)
    .leftJoin(users, eq(workSessions.userId, users.id))
    .leftJoin(resources, eq(workSessions.resourceId, resources.id))
    .where(eq(workSessions.status, "IN_PROGRESS"))
    .orderBy(desc(workSessions.startTime));

  const completedToday = await db.select()
    .from(workSessions)
    .where(eq(workSessions.status, "COMPLETED"));

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Dzień dobry, Szefie 👋</h1>
          <p className="text-zinc-500 mt-1">Oto podsumowanie działalności i sprzętu Margaz w tym momencie.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
             <div className="flex justify-between items-start mb-4">
               <div className="p-2.5 bg-blue-500/10 rounded-xl">
                 <Truck className="w-5 h-5 text-blue-400" />
               </div>
             </div>
             <h3 className="text-zinc-400 text-sm font-medium">Bieżące transporty</h3>
             <p className="text-3xl font-bold text-white mt-1">{activeSessions.filter(s => s.type === 'TRANSPORT').length}</p>
         </div>

         <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
             <div className="flex justify-between items-start mb-4">
               <div className="p-2.5 bg-amber-500/10 rounded-xl">
                 <HardHat className="w-5 h-5 text-amber-400" />
               </div>
             </div>
             <h3 className="text-zinc-400 text-sm font-medium">Maszyny w polu</h3>
             <p className="text-3xl font-bold text-white mt-1">{activeSessions.filter(s => s.type === 'MACHINE_OP').length}</p>
         </div>

         <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
             <div className="flex justify-between items-start mb-4">
               <div className="p-2.5 bg-rose-500/10 rounded-xl">
                 <Wrench className="w-5 h-5 text-rose-400" />
               </div>
             </div>
             <h3 className="text-zinc-400 text-sm font-medium">Aut i sprzętu na warsztacie</h3>
             <p className="text-3xl font-bold text-white mt-1">{activeSessions.filter(s => s.type === 'WORKSHOP').length}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-950/50">
              <h2 className="font-semibold text-white">Tablica Aktywnego Sprzętu</h2>
            </div>
            
            <div className="p-0 overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-zinc-800/50 bg-[#0a0a0b]/80">
                      <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Kto i gdzie</th>
                      <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sprzęt</th>
                      <th className="px-6 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Czas uruchomienia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {activeSessions.map(session => (
                      <tr key={session.id} className="hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-4">
                           <div className="font-medium text-zinc-200">{session.userName}</div>
                           <div className="text-xs text-zinc-500 mt-1">{session.desc || 'Brak opisu z trasy'} {session.tons ? `(${session.tons}t)` : ''}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-amber-500 font-medium">
                          {session.resourceName}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-400">
                          {session.startTime?.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                    {activeSessions.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-zinc-500 text-sm">Maszyny zgaszone. Brak trwających sesji przesyłania danych.</td>
                      </tr>
                    )}
                  </tbody>
               </table>
            </div>
          </div>
        </div>

        {/* Small UI Map panel */}
        <div className="xl:col-span-1 h-[400px] xl:h-[auto] min-h-[450px]">
           <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden h-full flex flex-col relative shadow-sm">
              <div className="absolute top-0 left-0 right-0 px-5 py-4 bg-gradient-to-b from-zinc-950/90 to-transparent z-10 pointer-events-none">
                 <h2 className="font-semibold text-white drop-shadow-md">Węgrów na żywo - Radary GPS</h2>
                 <p className="text-xs text-zinc-400 mt-1 drop-shadow-md">Wykryto dostawców na terenie Łochowa.</p>
              </div>
              <div className="flex-1 w-full relative h-full min-h-[450px]">
                 <LiveMap />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
