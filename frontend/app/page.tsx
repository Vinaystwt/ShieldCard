import dynamic from "next/dynamic";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ThreeActStrip } from "@/components/landing/ThreeActStrip";
import { ArchitectureSection } from "@/components/landing/ArchitectureSection";
import { CtaStrip } from "@/components/landing/CtaStrip";
import { WordMark } from "@/components/brand/WordMark";
import { TopBar } from "@/components/shell/TopBar";

const LiveStats = dynamic(
  () => import("@/components/landing/LiveStats").then((m) => m.LiveStats),
  { ssr: false },
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base">
      <TopBar />
      <HeroSection />
      <LiveStats />
      <ProblemSection />
      <div id="how-it-works">
        <HowItWorks />
      </div>
      <ThreeActStrip />
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
            Built on Fhenix CoFHE · Arbitrum Sepolia · Confidential compute, public accountability
          </p>
        </div>
      </footer>
    </div>
  );
}
