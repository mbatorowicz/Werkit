import { User as UserIcon, Shield, LogOut } from "lucide-react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import Link from "next/link";

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

export default async function ProfilePage() {
  const userId = await getUserId();
  if (!userId) return <div>Brak dostępu</div>;

  const userQuery = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userQuery[0];

  return (
    <div className="py-6 pb-20">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-8">Twój Profil</h1>
      
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-3xl p-6 flex flex-col items-center mb-6 shadow-inner">
         <div className="w-24 h-24 bg-[#f2fbfa] dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center mb-4">
            <UserIcon className="w-10 h-10 text-zinc-500" />
         </div>
         <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-900 dark:text-white mb-1">{user?.fullName}</h2>
         <div className="flex items-center gap-2 px-3 py-1 bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full">
            <Shield className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              {user?.role === 'admin' ? 'Administrator' : 'Pracownik'}
            </span>
         </div>
      </div>

      <div className="space-y-4">
         <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 flex justify-between items-center">
            <span className="text-zinc-500 text-sm font-medium">Login Systemowy:</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-mono bg-[#f2fbfa] dark:bg-zinc-950 px-3 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
              {user?.usernameEmail}
            </span>
         </div>

         <Link href="/api/auth/logout" prefetch={false} className="w-full flex items-center justify-center gap-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500/10 hover:text-red-400 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 transition-colors group mt-8">
            <LogOut className="w-5 h-5 group-hover:text-red-400 transition-colors" />
            <span className="font-bold">Wyloguj z systemu</span>
         </Link>
      </div>
    </div>
  );
}


