import LiveMap from "@/components/Map/LiveMap";
import { db } from "@/db";
import { workSessions, users, resources, materials, companySettings, workOrders } from "@/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { getDictionary } from "@/i18n";
import { HardHat, Wrench, Truck, Activity, BarChart3, TrendingUp, Users } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const dict = getDictionary().admin.dashboard;

  const activeSessions = await db.select({
    id: workSessions.id,
    type: workSessions.sessionType,
    desc: workSessions.taskDescription,
    startTime: workSessions.startTime,
    userId: workSessions.userId,
    userName: users.fullName,
    resourceName: resources.name,
    tons: workSessions.quantityTons,
  })
    .from(workSessions)
    .leftJoin(users, eq(workSessions.userId, users.id))
    .leftJoin(resources, eq(workSessions.resourceId, resources.id))
    .where(eq(workSessions.status, "IN_PROGRESS"))
    .orderBy(desc(workSessions.startTime));

  const pendingOrders = await db.select({
    userId: workOrders.userId
  })
    .from(workOrders)
    .where(eq(workOrders.status, "PENDING"));

  const uniqueWorkersActive = new Set(activeSessions.map(s => s.userId)).size;
  const uniqueWorkersWithOrders = new Set(pendingOrders.map(o => o.userId)).size;

  const settingsList = await db.select().from(companySettings).limit(1);
  const companySSOT = settingsList[0];
  const companyCity = companySSOT?.city || "Twoim Regionie";
  const mapLat = companySSOT?.baseLatitude ? parseFloat(companySSOT.baseLatitude) : 52.401;
  const mapLng = companySSOT?.baseLongitude ? parseFloat(companySSOT.baseLongitude) : 22.015;

  // Analytics: Fetch completed sessions this month
  const monthSessions = await db.select({
      id: workSessions.id,
      tons: workSessions.quantityTons,
      resourceName: resources.name
    })
    .from(workSessions)
    .leftJoin(resources, eq(workSessions.resourceId, resources.id))
    .where(and(eq(workSessions.status, 'COMPLETED'), gte(workSessions.startTime, firstDayOfMonth)));

  const totalSessionsThisMonth = monthSessions.length;
  const totalTonsThisMonth = monthSessions.reduce((acc, curr) => acc + (curr.tons ? parseFloat(curr.tons as any) : 0), 0);
  
  const machineStats: Record<string, number> = {};
  monthSessions.forEach(s => {
    if (s.resourceName) {
      machineStats[s.resourceName] = (machineStats[s.resourceName] || 0) + 1;
    }
  });
  const topMachines = Object.entries(machineStats).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maxMachineSessions = topMachines.length > 0 ? topMachines[0][1] : 1;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2"><Activity className="w-6 h-6 text-emerald-500" /> {dict.title}</h1>
          <p className="text-zinc-500 mt-1">{dict.subtitle} {companySSOT?.companyName || "Twojej firmy"}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
         <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 shadow-sm">
             <div className="flex justify-between items-start mb-4">
               <div className="p-2.5 bg-indigo-500/10 rounded-lg">
                 <Users className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
               </div>
             </div>
             <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Pracownicy z przydzielonymi zadaniami</h3>
             <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">{uniqueWorkersWithOrders}</p>
         </div>

         <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 shadow-sm">
             <div className="flex justify-between items-start mb-4">
               <div className="p-2.5 bg-emerald-500/10 rounded-lg">
                 <Activity className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
               </div>
             </div>
             <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Pracownicy aktualnie wykonujący zadanie</h3>
             <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">{uniqueWorkersActive}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 shadow-sm">
             <div className="flex justify-between items-start mb-4">
               <div className="p-2.5 bg-blue-500/10 rounded-lg">
                 <Truck className="w-5 h-5 text-blue-500 dark:text-blue-400" />
               </div>
             </div>
             <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Bieżące transporty</h3>
             <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">{activeSessions.filter(s => s.type === 'TRANSPORT').length}</p>
         </div>

         <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 shadow-sm">
             <div className="flex justify-between items-start mb-4">
               <div className="p-2.5 bg-amber-500/10 rounded-lg">
                 <HardHat className="w-5 h-5 text-amber-500 dark:text-amber-400" />
               </div>
             </div>
             <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Maszyny w polu</h3>
             <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">{activeSessions.filter(s => s.type === 'MACHINE_OP').length}</p>
         </div>

         <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 shadow-sm">
             <div className="flex justify-between items-start mb-4">
               <div className="p-2.5 bg-rose-500/10 rounded-lg">
                 <Wrench className="w-5 h-5 text-rose-500 dark:text-rose-400" />
               </div>
             </div>
             <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Aut i sprzętu na warsztacie</h3>
             <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">{activeSessions.filter(s => s.type === 'WORKSHOP').length}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-900 dark:text-white">Tablica Aktywnego Sprzętu</h2>
            </div>
            
            <div className="p-0 overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700/50 bg-zinc-100/50 dark:bg-[#0a0a0b]/80">
                      <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Kto i gdzie</th>
                      <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Sprzęt</th>
                      <th className="px-6 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Czas uruchomienia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                    {activeSessions.map(session => (
                      <tr key={session.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-4">
                           <div className="font-medium text-zinc-900 dark:text-zinc-900 dark:text-zinc-200">{session.userName}</div>
                           <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{session.desc || 'Brak opisu z trasy'} {session.tons ? `(${session.tons}t)` : ''}</div>
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
                        <td colSpan={3} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400 text-sm">Maszyny zgaszone. Brak trwających sesji przesyłania danych.</td>
                      </tr>
                    )}
                  </tbody>
               </table>
            </div>
          </div>
        </div>

        {/* Small UI Map panel */}
        <div className="xl:col-span-1 h-[400px] xl:h-[auto] min-h-[450px]">
           <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden h-full flex flex-col relative shadow-sm">
              <div className="absolute top-0 left-0 right-0 px-5 py-4 bg-gradient-to-b from-white/90 dark:from-zinc-950/90 to-transparent z-10 pointer-events-none">
                 <h2 className="font-semibold text-zinc-900 dark:text-zinc-900 dark:text-white drop-shadow-md">{companyCity} - Radary na żywo</h2>
                 <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 drop-shadow-md">Wykryto dostawców w tym okręgu.</p>
              </div>
              <div className="flex-1 w-full relative h-full min-h-[450px]">
                 <LiveMap currentLocation={{lat: mapLat, lng: mapLng}} pathTraveled={[]} destination={null} />
              </div>
           </div>
        </div>
      </div>

      {/* Analiza i Raportowanie - Wykresy */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Podsumowanie Miesiąca */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 shadow-sm">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                 <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <h2 className="font-semibold text-zinc-900 dark:text-white">Efektywność w tym miesiącu</h2>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#f2fbfa] dark:bg-zinc-950 border border-emerald-100 dark:border-zinc-800 rounded-xl">
                 <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Zrealizowane zadania</div>
                 <div className="text-3xl font-black text-emerald-600 dark:text-emerald-500">{totalSessionsThisMonth}</div>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                 <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Przewiezione kruszywa</div>
                 <div className="text-3xl font-black text-zinc-900 dark:text-white">{totalTonsThisMonth.toFixed(1)} <span className="text-lg text-zinc-500">t</span></div>
              </div>
           </div>
        </div>

        {/* Ranking Maszyn */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6 shadow-sm">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                 <BarChart3 className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="font-semibold text-zinc-900 dark:text-white">Wykorzystanie Maszyn (Top 4)</h2>
           </div>
           
           <div className="space-y-4">
              {topMachines.length === 0 ? (
                <p className="text-zinc-500 text-sm italic">Brak danych za ten miesiąc.</p>
              ) : topMachines.map(([name, count]) => (
                <div key={name} className="flex items-center gap-4">
                   <div className="w-32 truncate text-sm font-medium text-zinc-700 dark:text-zinc-300" title={name}>{name}</div>
                   <div className="flex-1 h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${(count / maxMachineSessions) * 100}%` }}
                      />
                   </div>
                   <div className="w-8 text-right text-xs font-bold text-zinc-500">{count}</div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}



