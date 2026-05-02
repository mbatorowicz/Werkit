"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 selection:bg-zinc-800">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] p-8">
        <div className="mb-8 text-center pt-2">
          <h1 className="text-3xl font-medium text-zinc-100 tracking-tight">Werkit.</h1>
          <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
            Zaloguj się do autoryzowanego panelu<br className="max-sm:hidden"/> dowodzenia logistyki
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-400 ml-1" htmlFor="username">
              Login administratora
            </label>
            <input
              id="username"
              name="usernameEmail"
              type="text"
              required
              className="w-full bg-[#0a0a0b] border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all placeholder-zinc-700"
              placeholder="np. admin"
              defaultValue="admin"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-400 ml-1" htmlFor="password">
              Hasło
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full bg-[#0a0a0b] border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all placeholder-zinc-700"
              placeholder="••••••••"
              defaultValue="admin123"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-medium rounded-xl px-4 py-3.5 mt-2 transition-all flex justify-center items-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Rozpocznij sesję"}
          </button>
        </form>
      </div>
      
      <p className="text-zinc-600 text-xs mt-10 font-medium">
        Werkit Internal System &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}
