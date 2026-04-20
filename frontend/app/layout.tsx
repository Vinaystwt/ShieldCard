import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import dynamic from "next/dynamic";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

const ClientProviders = dynamic(
  () => import("@/providers/ClientProviders").then((m) => m.ClientProviders),
  { ssr: false },
);

export const metadata: Metadata = {
  title: "ShieldCard — Corporate spend control. Nothing exposed.",
  description:
    "FHE-backed confidential payment policy enforcement. Amounts, limits, and decisions stay encrypted — on Arbitrum Sepolia via Fhenix CoFHE.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
