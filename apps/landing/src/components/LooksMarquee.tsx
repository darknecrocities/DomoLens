export function LooksMarquee() {
  const looks = [
    { name: "Charcoal Slate", bg: "linear-gradient(135deg, #2a2d33 0%, #16171a 100%)" },
    { name: "Warm Ember", bg: "linear-gradient(135deg, #ff7a1a 0%, #1e2024 70%)" },
    { name: "Midnight", bg: "linear-gradient(135deg, #1e2330 0%, #0f1012 100%)" },
    { name: "Sunset Mesh", bg: "linear-gradient(135deg, #ff8f3d 0%, #ff5252 50%, #2a2d33 100%)" },
    { name: "Aurora Night", bg: "linear-gradient(135deg, #1b3837 0%, #182236 100%)" },
    { name: "Studio Charcoal", bg: "#16171a" },
    { name: "Deep Obsidian", bg: "#0f1012" },
  ];

  const duplicated = [...looks, ...looks];

  return (
    <section className="relative overflow-hidden border-b-2 border-[#2a2d33] bg-[#16171a] py-16">
      <div className="mb-6 px-4 text-center sm:px-6">
        <span className="font-mono text-xs uppercase tracking-widest text-[#ff7a1a]">
          // CANVAS STYLING
        </span>
        <h3 className="mt-2 text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
          Endless Frame & Background Styles
        </h3>
      </div>

      <div className="relative flex overflow-x-hidden">
        <div className="animate-marquee flex gap-6">
          {duplicated.map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              className="flex w-64 shrink-0 flex-col overflow-hidden rounded-xl border border-[#363940] bg-[#1e2024] p-3 shadow-lift"
            >
              <div
                className="aspect-video w-full rounded-lg shadow-inner flex items-center justify-center"
                style={{ background: item.bg }}
              >
                <div className="h-10 w-16 rounded bg-[#0f1012]/80 border border-white/20 shadow-md" />
              </div>
              <span className="mt-3 font-mono text-xs font-semibold text-white">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
