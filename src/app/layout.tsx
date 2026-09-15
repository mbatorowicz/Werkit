import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CapacitorBackButton } from "@/components/CapacitorBackButton";
import { AppDialogProvider } from "@/components/AppDialogProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { LocaleProvider } from "@/components/LocaleProvider";
import { getServerLocale } from "@/lib/localeCookies.server";
import { getDictionary } from "@/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

/** Kanoniczny origin dla metadanych (OG, manifest) — Vercel lub jawna zmienna środowiskowa. */
const metadataBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export async function generateMetadata(): Promise<Metadata> {
  const app = getDictionary(await getServerLocale()).common.app;
  return {
    metadataBase: new URL(metadataBaseUrl),
    title: app.name,
    description: app.description,
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: app.name,
    },
    icons: {
      apple: "/icons/apple-touch-icon.png",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LocaleProvider locale={locale}>
            <AppDialogProvider>
              <CapacitorBackButton />
              <ServiceWorkerRegister />
              {children}
            </AppDialogProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
