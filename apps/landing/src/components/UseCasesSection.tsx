import { motion } from "framer-motion";
import { Check, Code2, Eye, Film, Rocket, Share2, Sparkles } from "lucide-react";

export function UseCasesSection() {
  const useCases = [
    {
      title: "Product Hunt & Launch Day",
      subtitle: "Stop the scroll immediately",
      desc: "Hook viewers in the first 2 seconds. Silky zooms on your killer feature make your launch video look like an Apple product intro.",
      tag: "LAUNCH READY",
      icon: Rocket,
    },
    {
      title: "Twitter / X & LinkedIn Teasers",
      subtitle: "Agency quality on a founder budget",
      desc: "Post high-energy product snippets that get retweets and engagement. Studio backdrops make your UI pop in social feeds.",
      tag: "SOCIAL FEEDS",
      icon: Share2,
    },
    {
      title: "Documentation & Tutorials",
      subtitle: "Show, don't tell",
      desc: "Guide users through complex workflows. Zooms highlight the exact button to click so users never submit support tickets.",
      tag: "CUSTOMER SUCCESS",
      icon: Code2,
    },
    {
      title: "Async Sales & Loom Replacements",
      subtitle: "Close deals faster",
      desc: "Send high-polish 90-second product walkthroughs to prospects. Crisp typography and camera motion build immediate trust.",
      tag: "SALES & PITCH",
      icon: Eye,
    },
    {
      title: "Weekly Shipping Changelogs",
      subtitle: "Build in public effortlessly",
      desc: "Show off new features every week in under 2 minutes of recording. Keep your community hyped without burning out on editing.",
      tag: "BUILD IN PUBLIC",
      icon: Sparkles,
    },
    {
      title: "Investor Updates & Pitch Decks",
      subtitle: "Live working proof",
      desc: "Embed silky product demos in your updates. Proves your traction and execution with undeniable real-app fidelity.",
      tag: "INVESTOR UPDATES",
      icon: Film,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
      whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="relative border-b border-neutral-800 bg-neutral-950 px-4 py-24 sm:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <div className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          // Where Creators Use DomoLens
        </div>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
          Built For Anyone Who Ships Products.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400 leading-relaxed">
          From solo indie hackers to developer relations teams, see how creators replace hours in video editors with one-click screen recordings.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((uc, idx) => {
            const Icon = uc.icon;
            return (
              <div
                key={idx}
                className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 flex flex-col justify-between transition-all hover:border-neutral-500 hover:bg-neutral-900/90 shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-neutral-800 text-white border border-neutral-700">
                      <Icon className="size-5" />
                    </div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded">
                      {uc.tag}
                    </span>
                  </div>

                  <h3 className="mt-5 text-base font-bold uppercase text-white">
                    {uc.title}
                  </h3>
                  <span className="block font-mono text-[11px] text-neutral-400 mt-0.5">
                    {uc.subtitle}
                  </span>
                  <p className="mt-2.5 text-xs text-neutral-400 leading-relaxed">
                    {uc.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between font-mono text-[11px] text-neutral-400">
                  <span>Zero Editing Needed</span>
                  <Check className="size-3.5 text-white" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
