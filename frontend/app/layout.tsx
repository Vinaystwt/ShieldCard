import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import dynamic from "next/dynamic";
import "./globals.css";

const ClientProviders = dynamic(
  () => import("@/providers/ClientProviders").then((m) => m.ClientProviders),
  { ssr: false },
);

export const metadata: Metadata = {
  title: "ShieldCard — Corporate spend control. Nothing exposed.",
  description:
    "FHE-backed confidential payment policy enforcement. Amounts, limits, and decisions stay encrypted — on Arbitrum Sepolia via Fhenix CoFHE.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/* Recover from stale chunk 404s by hard-reloading once */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  var _orig = window.__webpack_require__;
  window.addEventListener('error', function(e){
    var src = e && e.filename ? e.filename : '';
    if(src.indexOf('/_next/static/chunks/') !== -1 && !sessionStorage.getItem('__chunk_reload')){
      sessionStorage.setItem('__chunk_reload','1');
      window.location.reload(true);
    }
  }, true);
})();
`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
