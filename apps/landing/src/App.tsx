import { Download } from "lucide-react";
import { HeroSection } from "./components/HeroSection";
import { PainVsGainSection } from "./components/PainVsGainSection";
import { ShowcaseSimulatorSection } from "./components/ShowcaseSimulatorSection";
import { TypingFocusSection } from "./components/TypingFocusSection";
import { FeaturesCarousel } from "./components/FeaturesCarousel";
import { UseCasesSection } from "./components/UseCasesSection";
import { HowItWorksSection } from "./components/HowItWorksSection";
import { BeforeAfterSlider } from "./components/BeforeAfterSlider";
import { WorksEverywhere } from "./components/WorksEverywhere";
import { FinalCtaFooter } from "./components/FinalCtaFooter";

export function App() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {/* Top Floating Apple-Style Liquid Glassmorphic Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex h-14 items-center justify-between border-b border-white/[0.08] bg-black/25 px-4 sm:px-8 backdrop-blur-2xl backdrop-saturate-200 shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_0_0_rgba(255,255,255,0.12)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent">
        <a href="#" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <img src="/domolens.png" alt="DomoLens" className="size-7 object-contain rounded" />
          <span className="font-mono text-base font-bold tracking-tight text-white uppercase">
            DomoLens
          </span>
        </a>

        {/* Apple-Style Glass Pill Navigation */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-1 rounded-full border border-white/[0.12] bg-white/[0.05] p-1 backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
            <a
              href="#features"
              className="rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider text-neutral-300 hover:text-white hover:bg-white/[0.12] transition-all"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider text-neutral-300 hover:text-white hover:bg-white/[0.12] transition-all"
            >
              How it works
            </a>
          </div>

          <a
            href="#download"
            className="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 font-mono text-xs font-bold uppercase text-black hover:bg-neutral-100 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.22)]"
          >
            <Download className="size-3.5" />
            <span>Download App</span>
          </a>
        </div>
      </nav>

      {/* Marketing Sections */}
      <main>
        {/* Section 1: Hero & Native Architecture Showcase with Scroll Fade Out / Video Fade In */}
        <HeroSection />

        {/* Section 2: Pain vs Solution (Why Spend 3 Hours Keyframing?) */}
        <PainVsGainSection />

        {/* Section 3: Interactive Showcase Simulator (Pick How You Want To Show It) */}
        <ShowcaseSimulatorSection />

        {/* Section 4: Live Product Showcase Engine */}
        <TypingFocusSection />

        {/* Section 5: Continuous Feature Cards Carousel (Non-stop) */}
        <FeaturesCarousel />

        {/* Section 6: Real-World Use Cases (Built For Anyone Who Ships Products) */}
        <UseCasesSection />

        {/* Section 7: Four-Step Workflow & Before/After Comparison */}
        <HowItWorksSection />
        <BeforeAfterSlider />

        {/* Section 8: Brand Belt (Logo + Text only) & Architectural Matrix */}
        <WorksEverywhere />

        {/* Section 9: Direct Multi-Platform Downloads & Deployment */}
        <FinalCtaFooter />
      </main>
    </div>
  );
}
