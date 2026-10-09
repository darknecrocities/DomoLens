import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  ChevronLeft,
  ChevronRight,
  Zap,
  HelpCircle,
  Wand2,
  Bookmark,
  Crosshair,
  MessageSquare,
  Volume2,
  Cpu,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  X,
  Check,
  Terminal,
} from "lucide-react";
import { useEditor } from "../../store/editor";
import { LlmMessageContent } from "./LlmMessageContent";
import { CAPABLE_OLLAMA_MODELS } from "../../lib/ollama";

export function LlmSidebar() {
  const isLeftSidebarOpen = useEditor((s) => s.isLeftSidebarOpen);
  const toggleLeftSidebar = useEditor((s) => s.toggleLeftSidebar);
  const llmMessages = useEditor((s) => s.llmMessages);
  const isLlmThinking = useEditor((s) => s.isLlmThinking);
  const sendLlmMessage = useEditor((s) => s.sendLlmMessage);
  const executeLlmAction = useEditor((s) => s.executeLlmAction);
  const answerLlmQuestion = useEditor((s) => s.answerLlmQuestion);

  // Ollama Store State
  const ollamaStatus = useEditor((s) => s.ollamaStatus);
  const ollamaModels = useEditor((s) => s.ollamaModels);
  const selectedOllamaModel = useEditor((s) => s.selectedOllamaModel);
  const ollamaEndpoint = useEditor((s) => s.ollamaEndpoint);
  const checkOllamaStatus = useEditor((s) => s.checkOllamaStatus);
  const setSelectedOllamaModel = useEditor((s) => s.setSelectedOllamaModel);

  const [input, setInput] = useState("");
  const [isOllamaDrawerOpen, setIsOllamaDrawerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Automatically check Ollama on mount
  useEffect(() => {
    void checkOllamaStatus();
  }, [checkOllamaStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [llmMessages, isLlmThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLlmThinking) return;
    const text = input;
    setInput("");
    void sendLlmMessage(text);
  };

  if (!isLeftSidebarOpen) {
    return (
      <button
        type="button"
        onClick={toggleLeftSidebar}
        title="Open AI Director (Ollama LLM)"
        className="hidden md:flex h-full w-10 shrink-0 flex-col items-center justify-start border-r border-ink-800 bg-ink-950/80 py-4 hover:bg-ink-900 transition-colors"
      >
        <div className="flex size-7 items-center justify-center rounded-lg bg-white/20 text-white">
          <Sparkles className="size-4" />
        </div>
        <span className="mt-8 rotate-90 text-[11px] font-semibold uppercase tracking-wider text-fg-muted whitespace-nowrap">
          AI Director
        </span>
        <ChevronRight className="mt-auto size-4 text-fg-faint" />
      </button>
    );
  }

  const quickChips = [
    {
      label: "What is my App?",
      prompt: "Analyze my recorded video and validate what kind of app this is",
      icon: <HelpCircle className="size-3 text-white shrink-0" />,
    },
    {
      label: "AI Recommendations",
      prompt: "Audit this video and give me recommendations to improve it",
      icon: <Sparkles className="size-3 text-white shrink-0" />,
    },
    {
      label: "Describe Video",
      prompt: "Describe my video timeline and captured interactions",
      icon: <HelpCircle className="size-3 text-white shrink-0" />,
    },
    {
      label: "Auto-Plot Zooms",
      prompt: "Auto-plot camera zooms on all clicks and typing with 2.4s hold",
      icon: <Wand2 className="size-3 text-white shrink-0" />,
    },
    {
      label: "3D Frame Tilt",
      prompt: "Apply a modern 3D frame tilt for Keynote polish",
      icon: <Crosshair className="size-3 text-white shrink-0" />,
    },
    {
      label: "Studio Obsidian",
      prompt: "Change canvas backdrop to Studio Obsidian",
      icon: <Bookmark className="size-3 text-white shrink-0" />,
    },
    {
      label: "Add Subtitle",
      prompt: "Add a compact subtitle overlay at current playhead",
      icon: <MessageSquare className="size-3 text-white shrink-0" />,
    },
    {
      label: "Apply Auto AFX",
      prompt: "Synchronize tactile click bops and mechanical typing sound effects",
      icon: <Volume2 className="size-3 text-white shrink-0" />,
    },
  ];

  return (
    <aside className="flex h-full w-full md:w-80 lg:w-88 shrink-0 flex-col border-r border-ink-800 bg-ink-950/95 backdrop-blur-md z-10 select-none">
      {/* Sidebar Header */}
      <div className="flex h-12 items-center justify-between border-b border-ink-800 px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-white text-black shadow-sm">
            <Sparkles className="size-3.5 stroke-[2.5]" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-fg">AI Director</span>

          {/* Ollama Status Pill & Toggle */}
          <button
            type="button"
            onClick={() => setIsOllamaDrawerOpen((o) => !o)}
            title="Configure Ollama Local LLM"
            className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium border transition-colors cursor-pointer ${
              ollamaStatus === "connected"
                ? "bg-emerald-950/60 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/60"
                : ollamaStatus === "connecting"
                ? "bg-amber-950/60 border-amber-700/80 text-amber-300 animate-pulse"
                : "bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                ollamaStatus === "connected"
                  ? "bg-emerald-400"
                  : ollamaStatus === "connecting"
                  ? "bg-amber-400"
                  : "bg-red-400"
              }`}
            />
            <span className="max-w-[85px] truncate">
              {ollamaStatus === "connected"
                ? selectedOllamaModel || "Ollama Ready"
                : ollamaStatus === "connecting"
                ? "Checking..."
                : "Connect Ollama"}
            </span>
            <ChevronDown className="size-2.5 opacity-70" />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleLeftSidebar}
          className="rounded p-1 text-fg-muted hover:bg-ink-800 hover:text-fg transition-colors"
          title="Collapse AI Panel"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>

      {/* Ollama Model & Setup Drawer */}
      {isOllamaDrawerOpen && (
        <div className="border-b border-ink-800 bg-ink-900/90 p-3 text-xs flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-white text-[11px]">
              <Cpu className="size-3.5 text-indigo-400" />
              Ollama Local LLM Configuration
            </span>
            <button
              type="button"
              onClick={() => setIsOllamaDrawerOpen(false)}
              className="text-fg-faint hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {ollamaStatus === "connected" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-fg-muted">
                <span>Active Model:</span>
                <button
                  type="button"
                  onClick={() => void checkOllamaStatus()}
                  className="flex items-center gap-1 text-[10px] text-emerald-400 hover:underline"
                >
                  <RefreshCw className="size-2.5" />
                  Refresh ({ollamaModels.length})
                </button>
              </div>

              <select
                value={selectedOllamaModel}
                onChange={(e) => setSelectedOllamaModel(e.target.value)}
                className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white"
              >
                {ollamaModels.map((m) => {
                  const isCapable = CAPABLE_OLLAMA_MODELS.some((cap) => {
                    const prefix = cap.name.split(":")[0] ?? "";
                    return prefix ? m.toLowerCase().startsWith(prefix) : false;
                  });
                  return (
                    <option key={m} value={m}>
                      {m} {isCapable ? "⚡ (Capable for Editing)" : ""}
                    </option>
                  );
                })}
              </select>

              <div className="rounded-lg bg-emerald-950/30 border border-emerald-800/40 p-2 text-[10px] text-emerald-300/90 flex items-center gap-1.5">
                <Check className="size-3 text-emerald-400 shrink-0" />
                <span>Ollama active at {ollamaEndpoint}. Live AI edits enabled.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="rounded-lg bg-amber-950/30 border border-amber-800/50 p-2 text-[11px] text-amber-200/90 space-y-1">
                <p className="font-semibold text-amber-300">Ollama is not responding at {ollamaEndpoint}</p>
                <p className="text-[10px] text-amber-200/70">
                  DomoLens runs 100% locally on your machine. Start Ollama to enable real local LLM video editing.
                </p>
              </div>

              {/* Step 1: Install Ollama if missing */}
              <div className="rounded-lg bg-ink-950 p-2 border border-ink-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-white">1. Download Ollama</span>
                  <a
                    href="https://ollama.com/download"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] text-indigo-400 hover:underline"
                  >
                    <span>ollama.com</span>
                    <ExternalLink className="size-2.5" />
                  </a>
                </div>
                <p className="text-[10px] text-fg-faint">
                  On macOS, you can also install via Homebrew: <code className="text-neutral-300">brew install ollama</code>
                </p>
              </div>

              {/* Step 2: Run Ollama Command */}
              <div className="rounded-lg bg-ink-950 p-2 border border-ink-800 space-y-1.5">
                <span className="font-medium text-white text-[11px] flex items-center gap-1">
                  <Terminal className="size-3 text-neutral-400" />
                  2. Start Ollama Server
                </span>
                <div className="flex items-center justify-between rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-neutral-300">
                  <span>ollama serve</span>
                  <span className="text-[9px] text-fg-faint">or npm run ollama:start</span>
                </div>
              </div>

              {/* Check Connection Action Button */}
              <button
                type="button"
                onClick={() => void checkOllamaStatus()}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                <RefreshCw className="size-3" />
                <span>Check & Connect to Ollama</span>
              </button>

              <p className="text-[10px] text-fg-faint text-center">
                *Fallback: Built-in deterministic AI Director handles edits offline if Ollama is not running.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick Prompt Chips */}
      <div className="border-b border-ink-800/80 bg-ink-900/50 p-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-faint flex items-center gap-1">
            <Zap className="size-3 text-white" />
            Quick AI Actions
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              disabled={isLlmThinking}
              onClick={() => void sendLlmMessage(chip.prompt)}
              className="flex items-center gap-1.5 rounded-md border border-ink-700/80 bg-ink-800/90 px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-white hover:bg-neutral-800 hover:text-white transition-all text-left"
            >
              {chip.icon}
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Conversation Stream */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 text-xs">
        {llmMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1.5 ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-fg-faint">
              {msg.role === "user" ? (
                <>
                  <span>You</span>
                  <User className="size-3" />
                </>
              ) : (
                <>
                  <Bot className="size-3 text-white" />
                  <span className="text-white font-medium">
                    {ollamaStatus === "connected" ? `DomoLens (${selectedOllamaModel})` : "DomoLens AI"}
                  </span>
                </>
              )}
            </div>

            <div
              className={`max-w-[92%] rounded-xl px-3 py-2 leading-relaxed ${
                msg.role === "user"
                  ? "bg-white text-black font-medium shadow-sm whitespace-pre-wrap"
                  : "border border-ink-800 bg-ink-900/95 text-fg shadow-sm"
              }`}
            >
              {msg.role === "user" ? (
                msg.content
              ) : (
                <LlmMessageContent content={msg.content} />
              )}

              {/* Interactive Validation Questions attached to AI Message */}
              {msg.questions && msg.questions.length > 0 && (
                <div className="mt-2.5 space-y-2 border-t border-ink-800/80 pt-2">
                  {msg.questions.map((q) => (
                    <div
                      key={q.id}
                      className="rounded-lg bg-ink-950/70 p-2 border border-ink-800/90 space-y-1.5"
                    >
                      <div className="text-[11px] font-medium text-neutral-300 flex items-center gap-1.5">
                        <HelpCircle className="size-3 text-indigo-400 shrink-0" />
                        <span>{q.prompt}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {q.options.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={isLlmThinking}
                            onClick={() => void answerLlmQuestion(q.id, opt.value)}
                            className="px-2 py-1 rounded-md text-[11px] font-medium bg-neutral-800 border border-neutral-700 text-white hover:bg-white hover:text-black hover:border-white transition-all shadow-sm active:scale-95 cursor-pointer"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons attached to AI Message */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-ink-800/80 pt-2">
                  {msg.actions.map((act) => (
                    <button
                      key={act.actionKey}
                      type="button"
                      onClick={() => executeLlmAction(act.actionKey)}
                      className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white hover:text-black hover:border-white transition-all shadow-sm cursor-pointer active:scale-95"
                    >
                      <Wand2 className="size-3 shrink-0" />
                      <span>{act.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLlmThinking && (
          <div className="flex items-center gap-2 rounded-xl border border-ink-800 bg-ink-900 px-3 py-2 text-fg-muted">
            <div className="flex items-center gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-white" />
            </div>
            <span className="text-[11px]">
              {ollamaStatus === "connected"
                ? `Running local inference with ${selectedOllamaModel}...`
                : "Analyzing interactions & keyframes..."}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer Form */}
      <form onSubmit={handleSubmit} className="border-t border-ink-800 bg-ink-900/60 p-2.5">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI Director or type command..."
            disabled={isLlmThinking}
            className="w-full rounded-xl border border-ink-700 bg-ink-950 px-3 py-2 pr-9 text-xs text-fg placeholder:text-fg-faint focus:border-white focus:outline-none focus:ring-1 focus:ring-white"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLlmThinking}
            className="absolute right-1.5 flex size-6 items-center justify-center rounded-lg bg-white text-black disabled:opacity-40 disabled:hover:bg-white hover:bg-neutral-200 transition-colors"
          >
            <Send className="size-3" />
          </button>
        </div>
        <p className="mt-1.5 flex items-center justify-between text-[10px] text-fg-faint px-1">
          <span>Tip: Ask "what is my app?" to get custom styling</span>
          <HelpCircle className="size-3 opacity-60" />
        </p>
      </form>
    </aside>
  );
}
