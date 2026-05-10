import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

import { JWT_SECRET } from '@/lib/auth';
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

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const userId = await getUserId();
  if (!userId) return <div>Brak dostępu</div>;

  const { WorkerSessionService } = await import('@/services/WorkerSessionService');
  const sessions = await WorkerSessionService.getCompletedSessions(userId);

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
              <Link href={`/worker/history/${s.id}`} key={s.id} className="block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:border-emerald-500 transition-colors cursor-pointer group shadow-sm hover:shadow-md">
                 <div className="flex items-center gap-2 mb-3">
                   <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                   <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
                     Zakończono
                   </span>
                   <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-auto group-hover:text-emerald-600 transition-colors">
                     {s.endTime?.toLocaleDateString('pl-PL')}
                   </span>
                 </div>
                 <div className="font-semibold text-zinc-900 dark:text-white mb-1 group-hover:text-emerald-500 transition-colors">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{s.categoryName || 'Brak Kategorii'}</div>
                 </div>
                 <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    <span>{s.startTime.toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit'})} - {s.endTime?.toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit'})}</span>
                    {s.endTime && (
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium px-1.5 rounded">
                         {Math.floor((s.endTime.getTime() - s.startTime.getTime()) / 3600000)}h {Math.floor(((s.endTime.getTime() - s.startTime.getTime()) % 3600000) / 60000)}m
                      </span>
                    )}
                 </div>
                  {s.materialName && (
                    <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      Materiał: <span className="font-medium text-zinc-900 dark:text-zinc-200">{s.materialName}</span> {s.quantityTons && `(${s.quantityTons}t)`}
                    </div>
                  )}
                  {s.customerLastName && (
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      Klient: <span className="font-medium text-zinc-900 dark:text-zinc-200">{s.customerLastName}</span>
                    </div>
                  )}
                 {s.taskDescription && (
                   <div className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 bg-[#f2fbfa] dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                     {s.taskDescription}
                   </div>
                 )}
              </Link>
           ))}
         </div>
      )}
    </div>
  );
}



