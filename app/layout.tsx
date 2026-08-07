import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GR Meta Ads - IA",
  description: "Gerador de Relatórios Meta Ads com IA",
};

function formatBuildTime(iso: string | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  const gitSha = process.env.NEXT_PUBLIC_GIT_SHA ?? "local";
  const buildTime = formatBuildTime(process.env.NEXT_PUBLIC_BUILD_TIME);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="pb-8">{children}</div>
        <footer className="fixed bottom-0 inset-x-0 z-50 py-3 text-center text-xs text-gray-500 bg-gray-100/90 backdrop-blur-sm border-t border-gray-200">
          v{version} · {gitSha} · build {buildTime}
        </footer>
      </body>
    </html>
  );
}
