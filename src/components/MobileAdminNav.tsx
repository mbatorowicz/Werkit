"use client";
import { useState } from "react";
import { Menu, X, Map, Users, Package, Activity, LogOut, Wrench, HardHat, Settings } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

import { usePathname } from "next/navigation";

export function MobileAdminNav({ companyName, version, dict }: { companyName: string; version: string; dict: any }) {
  const [isOpen, setIsOpen] = useState(false);

  const pathname = usePathname();
  const closeMenu = () => setIsOpen(false);

  const links = [
    { href: "/admin", icon: Activity, label: dict.dashboard.title },
    { type: "section", label: dict.sidebar.fleetAndPeople },
    { href: "/admin/workers", icon: Users, label: dict.workers.title },
    { href: "/admin/machines", icon: Wrench, label: dict.machines.fleetTitle },
    { type: "section", label: dict.sidebar.logistics },
    { href: "/admin/orders", icon: Map, label: dict.orders.title },
    { href: "/admin/materials", icon: HardHat, label: dict.materials.title },
    { href: "/admin/customers", icon: Package, label: dict.customers.title },
    { type: "section", label: dict.sidebar.system },
    { href: "/admin/settings", icon: Settings, label: dict.sidebar.companySettings }
  ];

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="p-2 -mr-2 text-zinc-600 dark:text-zinc-400 focus:outline-none">
        <Menu className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMenu}></div>
          <div className="relative w-72 max-w-[80vw] h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700 flex flex-col animate-in slide-in-from-left duration-200">
             <div className="h-[72px] flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800">
               <div>
                 <div className="flex items-center gap-2">
                   <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 tracking-tighter">WERKIT</h1>
                   <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">v{version}</span>
                 </div>
                 <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold tracking-widest uppercase mt-0.5 truncate max-w-[200px]">{companyName}</p>
               </div>
               <button onClick={closeMenu} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><X className="w-5 h-5"/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1.5 custom-scrollbar">
               {links.map((link, idx) => {
                 if (link.type === "section") {
                   return (
                     <div key={idx} className="pt-4 pb-2 px-3">
                       <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">{link.label}</p>
                     </div>
                   );
                 }

                 const Icon = link.icon!;
                 const isActive = pathname === link.href;
                 const isSettings = link.href === "/admin/settings";
                 const shouldHighlight = isActive && !isSettings;

                 return (
                   <Link 
                     key={link.href}
                     onClick={closeMenu}
                     href={link.href!}
                     className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${
                       shouldHighlight
                         ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white" 
                         : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800/50"
                     }`}
                   >
                     <Icon className={`w-4 h-4 ${shouldHighlight ? "text-zinc-900 dark:text-white" : "text-zinc-500"}`} />
                     <span>{link.label}</span>
                   </Link>
                 );
               })}
             </div>

             <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
               <ThemeToggle />
               <a href="/api/auth/logout" className="flex-1 flex items-center gap-3 px-3 py-2.5 text-zinc-500 dark:text-zinc-400 hover:text-red-500 rounded-lg transition-all font-medium text-sm ml-2">
                 <LogOut className="w-4 h-4" />
                 <span>Wyloguj</span>
               </a>
             </div>
          </div>
        </div>
      )}
    </>
  )
}
