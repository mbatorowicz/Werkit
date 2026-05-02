"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const usernameEmail = formData.get("usernameEmail");
    const password = formData.get("password");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameEmail, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.refresh();
        router.push(data.user?.role === 'admin' ? "/admin" : "/worker");
      } else {
        setError(data.error || "Wystąpił błąd krytyczny");
      }
    } catch (err) {
      setError("Brak połączenia z Vercel API. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2fbfa] dark:bg-zinc-900 flex flex-col justify-center items-center p-4 selection:bg-zinc-800 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] p-8">
        <div className="mb-8 text-center pt-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 tracking-tighter">WERKIT</h1>
            <span className="text-[11px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold mt-1">v{APP_VERSION}</span>
          </div>
          <h2 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 tracking-tight">System Logowania</h2>
          <p className="text-zinc-500 mt-1 text-sm">
            Panel dowodzenia i logistyki
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 ml-1" htmlFor="username">
              Login administratora
            </label>
            <input
              id="username"
              name="usernameEmail"
              type="text"
              required
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all placeholder-zinc-700"
              placeholder="np. admin"
              defaultValue="admin"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 ml-1" htmlFor="password">
              Hasło
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all placeholder-zinc-700"
              placeholder="••••••••"
              defaultValue="admin123"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white dark:bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 font-medium rounded-lg px-4 py-3.5 mt-2 transition-all flex justify-center items-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Rozpocznij sesję"}
          </button>
        </form>
      </div>
      
      <p className="text-zinc-600 text-xs mt-10 font-medium">
        &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}

