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
} from "lucide-react";
import { useEditor } from "../../store/editor";

export function LlmSidebar() {
  const {
    isLeftSidebarOpen,
    toggleLeftSidebar,
    llmMessages,
    isLlmThinking,
    sendLlmMessage,
    executeLlmAction,
  } = useEditor();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        title="Open AI Director (LLM)"
        className="hidden md:flex h-full w-10 shrink-0 flex-col items-center justify-start border-r border-ink-800 bg-ink-950/80 py-4 hover:bg-ink-900 transition-colors"
      >
        <div className="flex size-7 items-center justify-center rounded-lg bg-white/20 text-white">
          <Sparkles className="size-4" />
        </div>
        <span className="mt-8 rotate-90 text-[11px] font-semibold uppercase tracking-wider text-fg-muted whitespace-nowrap">
          AI Assistant
        </span>
        <ChevronRight className="mt-auto size-4 text-fg-faint" />
      </button>
    );
  }

  const quickChips = [
    { label: "⚡ Auto-Plot Zooms", prompt: "Auto-plot camera zooms on all clicks and typing with 2.4s hold" },
    { label: "✨ Suggest Chapters", prompt: "Suggest video chapters and title based on recording interactions" },
    { label: "💬 Add Subtitle", prompt: "Add a stylish subtitle overlay at current playhead" },
    { label: "🎵 Add Lo-Fi Music", prompt: "Add ambient Lo-Fi background music track" },
  ];

  return (
    <aside className="flex h-full w-full md:w-72 lg:w-80 shrink-0 flex-col border-r border-ink-800 bg-ink-950/95 backdrop-blur-md z-10 select-none">
      {/* Sidebar Header */}
      <div className="flex h-12 items-center justify-between border-b border-ink-800 px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-white text-black shadow-sm">
            <Sparkles className="size-3.5 stroke-[2.5]" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-fg">AI Director</span>
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-300 border border-neutral-700">
            LLM Ready
          </span>
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
              className="rounded-md border border-ink-700/80 bg-ink-800/90 px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-white hover:bg-neutral-800 hover:text-white transition-all text-left"
            >
              {chip.label}
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
                  <span className="text-white">DomoLens AI</span>
                </>
              )}
            </div>

            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "border border-ink-800 bg-ink-900 text-fg"
              }`}
            >
              {msg.content}

              {/* Action Buttons attached to AI Message */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-ink-800/80 pt-2">
                  {msg.actions.map((act) => (
                    <button
                      key={act.actionKey}
                      type="button"
                      onClick={() => executeLlmAction(act.actionKey)}
                      className="flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-[11px] font-semibold text-white hover:bg-neutral-700 hover:border-white transition-all shadow-sm"
                    >
                      <Wand2 className="size-3" />
                      {act.label}
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
            <span className="text-[11px]">Analyzing interactions & keyframes...</span>
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
          <span>Tip: "plot zooms" automatically adds keyframes</span>
          <HelpCircle className="size-3 opacity-60" />
        </p>
      </form>
    </aside>
  );
}
