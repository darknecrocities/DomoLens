import { motion } from "framer-motion";
import { Check, Code2, Eye, Film, Rocket, Share2, Sparkles } from "lucide-react";

export function UseCasesSection() {
  const useCases = [
    {
      title: "Product Hunt & Launch Day",
      subtitle: "Stop the scroll immediately",
      desc: "Hook viewers in the first 2 seconds. Silky zooms on your killer feature make your launch video look like an Apple product intro.",
      icon: Rocket,
      idx: "01",
    },
    {
      title: "Twitter / X & LinkedIn Teasers",
      subtitle: "Agency quality on a founder budget",
      desc: "Post high-energy product snippets that get retweets and engagement. Studio backdrops make your UI pop in social feeds.",
      icon: Share2,
      idx: "02",
    },
    {
      title: "Documentation & Tutorials",
      subtitle: "Show, don't tell",
      desc: "Guide users through complex workflows. Zooms highlight the exact button to click so users never submit support tickets.",
      icon: Code2,
      idx: "03",
    },
    {
      title: "Async Sales & Loom Replacements",
      subtitle: "Close deals faster",
      desc: "Send high-polish 90-second product walkthroughs to prospects. Crisp typography and camera motion build immediate trust.",
      icon: Eye,
      idx: "04",
    },
    {
      title: "Weekly Shipping Changelogs",
      subtitle: "Build in public effortlessly",
      desc: "Show off new features every week in under 2 minutes of recording. Keep your community hyped without burning out on editing.",
      icon: Sparkles,
      idx: "05",
    },
    {
      title: "Investor Updates & Pitch Decks",
      subtitle: "Live working proof",
      desc: "Embed silky product demos in your updates. Proves your traction and execution with undeniable real-app fidelity.",
      icon: Film,
      idx: "06",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
      whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="relative border-b border-white/[0.08] bg-black px-4 py-24 sm:px-6 lg:px-12"
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

        {/* 3D Origami Cascade Grid */}
        <div
          style={{ perspective: 1000 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {useCases.map((uc, i) => {
            const Icon = uc.icon;
            return (
              <motion.div
                key={uc.title}
                initial={{ opacity: 0, y: 30, rotateX: 15 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
                className="rounded-2xl border border-white/[0.08] bg-neutral-950/70 backdrop-blur-xl p-6 flex flex-col justify-between transition-colors hover:border-white/20 shadow-xl group cursor-default"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-white/[0.06] text-white border border-white/[0.08] group-hover:bg-white/[0.12] transition-colors">
                      <Icon className="size-5" />
                    </div>
                    <span className="font-mono text-xs font-semibold text-neutral-400">
                      /{uc.idx}
                    </span>
                  </div>

                  <h3 className="mt-5 text-base font-bold uppercase text-white tracking-tight">
                    {uc.title}
                  </h3>
                  <span className="block font-mono text-xs text-neutral-400 mt-1">
                    {uc.subtitle}
                  </span>
                  <p className="mt-3 text-xs text-neutral-400 leading-relaxed">
                    {uc.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between font-mono text-[11px] text-neutral-400">
                  <span>Zero Editing Needed</span>
                  <Check className="size-3.5 text-white" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
