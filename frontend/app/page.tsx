import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ArchitectureSection } from "@/components/landing/ArchitectureSection";
import { CtaStrip } from "@/components/landing/CtaStrip";
import { WordMark } from "@/components/brand/WordMark";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base">
      {/* Minimal landing nav */}
      <nav
        className="sticky top-0 z-50 w-full"
        style={{
          background: "rgba(10, 10, 12, 0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-dim)",
        }}
      >
        <div className="mx-auto max-w-[1280px] px-6 h-14 flex items-center justify-between">
          <WordMark size="sm" />
          <div className="flex items-center gap-6">
            <Link
              href="#how-it-works"
              className="text-[13px] transition-colors"
              style={{ color: "var(--color-muted)" }}
            >
              How it works
            </Link>
            <Link
              href="/observer"
              className="text-[13px] transition-colors"
              style={{ color: "var(--color-muted)" }}
            >
              Observer view
            </Link>
            <Link
              href="/app"
              className="text-[13px] font-semibold px-4 py-1.5 rounded-md transition-all duration-150 hover:brightness-110"
              style={{
                background: "rgba(200,131,63,0.10)",
                border: "1px solid var(--copper-border-dim)",
                color: "var(--color-copper)",
              }}
            >
              Enter App
            </Link>
          </div>
        </div>
      </nav>

      <HeroSection />
      <ProblemSection />
      <div id="how-it-works">
        <HowItWorks />
      </div>
      <ArchitectureSection />
      <CtaStrip />

      {/* Footer */}
      <footer
        className="py-8 px-6"
        style={{ borderTop: "1px solid var(--border-dim)" }}
      >
        <div className="mx-auto max-w-[1280px] flex items-center justify-between">
          <WordMark size="sm" />
          <p className="text-[12px] text-subtle">
            Built on Fhenix CoFHE · Arbitrum Sepolia · Fhenix Buildathon · Wave 3 upgrade
          </p>
        </div>
      </footer>
    </div>
  );
}
