import { useState } from "react";
import { KeyRound, ShieldCheck, Sparkles } from "lucide-react";

export function AiTerminalSection() {
  const [fakeKey] = useState("AIzaSyD-sample-gemini-key-8371928472");

  return (
    <section className="relative border-b-2 border-[#2a2d33] bg-[#0f1012] px-4 py-24 sm:px-6 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-[#ff7a1a]">
          <span>// OPTIONAL AI</span>
        </div>
        <h2 className="mt-4 text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
          Bring your own key. Totally optional.
        </h2>
        <p className="mt-3 text-base text-[#a0a3ab] sm:text-lg">
          Add a key to unlock captions and title ideas. Everything else works without it.
        </p>

        {/* Terminal Card */}
        <div className="mt-12 overflow-hidden border-2 border-[#363940] bg-[#16171a] shadow-[10px_10px_0px_0px_#ff7a1a]">
          <div className="flex items-center justify-between border-b border-[#2a2d33] bg-[#1e2024] px-4 py-3 text-xs font-mono text-[#a0a3ab]">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-[#ff6b6b]" />
              <span className="size-3 rounded-full bg-[#ffd3b0]" />
              <span className="size-3 rounded-full bg-[#5bd38a]" />
              <span className="ml-2 font-bold text-white">KEY_STORAGE.CONF</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#5bd38a]">
              <ShieldCheck className="size-4" />
              <span>STORED ON DEVICE ONLY</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#2a2d33] bg-[#0f1012] p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#2a2d33] text-[#ff7a1a]">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <span className="block text-xs font-mono uppercase tracking-wider text-[#a0a3ab]">
                    Google Gemini / OpenAI
                  </span>
                  <span className="font-mono text-sm text-white">{fakeKey}</span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded bg-[#5bd38a]/10 px-2.5 py-1 font-mono text-xs font-bold text-[#5bd38a]">
                ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#2a2d33] bg-[#1e2024]/60 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Sparkles className="size-4 text-[#ff7a1a]" />
                  <span>Smart Chapter Markers</span>
                </div>
                <p className="mt-1 text-xs text-[#a0a3ab] leading-relaxed">
                  Automatically generates timestamped chapters based on what happens on screen.
                </p>
              </div>

              <div className="rounded-xl border border-[#2a2d33] bg-[#1e2024]/60 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Sparkles className="size-4 text-[#ff7a1a]" />
                  <span>Instant Title Ideas</span>
                </div>
                <p className="mt-1 text-xs text-[#a0a3ab] leading-relaxed">
                  Suggests clear, punchy demo titles tailored for Slack, YouTube, and documentation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
