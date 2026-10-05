import { AnimatePresence, motion } from "framer-motion";
import {
  AppWindow,
  ArrowLeft,
  CheckCircle2,
  Globe,
  Mic,
  MicOff,
  Monitor,
  Pause,
  Play,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import { formatDuration } from "@domolens/core";
import { copy } from "../copy/en";
import { Button } from "../components/ui/Button";
import { FloatingQuickBar } from "../components/recording/FloatingQuickBar";
import { useNav } from "../store/nav";
import { useRecorder, type RecordingSource } from "../store/recorder";

export function RecordScreen() {
  const { back } = useNav();
  const {
    state,
    countdown,
    source,
    micEnabled,
    systemAudioEnabled,
    elapsedMs,
    clicks,
    setSource,
    toggleMic,
    toggleSystemAudio,
    startCountdown,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  } = useRecorder();

  const sources: Array<{ id: RecordingSource; label: string; desc: string; icon: typeof Monitor }> = [
    {
      id: "screen",
      label: copy.record.sourceScreen,
      desc: copy.record.sourceScreenDesc,
      icon: Monitor,
    },
    {
      id: "window",
      label: copy.record.sourceWindow,
      desc: copy.record.sourceWindowDesc,
      icon: AppWindow,
    },
    {
      id: "tab",
      label: copy.record.sourceTab,
      desc: copy.record.sourceTabDesc,
      icon: Globe,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 pb-safe px-safe">
      {/* 0. Screen Share Requesting Prompt */}
      <AnimatePresence mode="wait">
        {state === "requesting_share" && (
          <motion.div
            key="requesting_share"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex w-full max-w-md flex-col items-center rounded-3xl border border-ink-700 bg-ink-800/90 p-8 text-center shadow-lift backdrop-blur-md"
          >
            <div className="flex size-16 items-center justify-center rounded-2xl bg-white text-black mb-4 animate-pulse">
              <Monitor className="size-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Select Screen or Window</h2>
            <p className="mt-2 text-xs text-fg-muted leading-relaxed">
              Please choose which screen, application window, or browser tab to share. The recording and video will not begin until your screen is shared.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={cancelRecording}
              className="mt-6"
            >
              Cancel
            </Button>
          </motion.div>
        )}

        {/* 1. Countdown Mode */}
        {state === "countdown" && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="flex flex-col items-center text-center"
          >
            <div className="flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full border border-ink-600 bg-ink-900/80 text-xs text-white">
              <span className="size-2 rounded-full bg-white animate-pulse" />
              <span>Screen Shared & Ready</span>
            </div>

            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              className="flex size-36 items-center justify-center rounded-full border-4 border-white bg-ink-800 text-6xl font-extrabold text-white shadow-lift"
            >
              {countdown}
            </motion.div>
            <p className="mt-6 text-lg font-medium text-fg-muted">{copy.record.countdownReady}</p>
          </motion.div>
        )}

        {/* 2. Active Recording Mode with Floating QuickBar */}
        {(state === "recording" || state === "paused") && (
          <div className="flex flex-col items-center w-full">
            <motion.div
              key="recording"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              data-recorder-ui="true"
              className="flex w-full max-w-lg flex-col items-center rounded-3xl border border-ink-700 bg-ink-800/90 p-8 text-center shadow-lift backdrop-blur-md mb-24"
            >
              {/* Status Header */}
              <div className="flex items-center gap-2 rounded-full border border-ink-600 bg-ink-900/80 px-4 py-1.5 text-xs font-semibold">
                <span
                  className={`size-2.5 rounded-full ${
                    state === "recording" ? "bg-white animate-pulse" : "bg-neutral-400"
                  }`}
                />
                <span className="text-fg">
                  {state === "recording" ? copy.record.recordingIndicator : copy.record.pausedIndicator}
                </span>
              </div>

              {/* Time Display */}
              <div className="mt-6 text-5xl font-mono font-bold tracking-tight text-fg tabular">
                {formatDuration(elapsedMs)}
              </div>

              <p className="mt-2 text-sm text-fg-muted font-mono">
                {clicks.length === 1 ? "1 click logged" : `${clicks.length} clicks logged`}
              </p>

              {/* Live Tip */}
              <div className="mt-6 rounded-xl border border-ink-700 bg-ink-900/60 p-3 text-xs leading-relaxed text-fg-faint">
                {copy.record.clickHint}
              </div>

              {/* Action Bar */}
              <div className="mt-8 flex w-full flex-wrap items-center justify-center gap-3">
                {state === "recording" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Pause className="size-4" />}
                    onClick={pauseRecording}
                  >
                    {copy.record.pauseBtn}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Play className="size-4" />}
                    onClick={resumeRecording}
                  >
                    {copy.record.resumeBtn}
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  icon={<CheckCircle2 className="size-4 text-ink-950" />}
                  onClick={() => void stopRecording()}
                >
                  {copy.record.finishBtn}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelRecording}
                >
                  {copy.record.discardBtn}
                </Button>
              </div>
            </motion.div>

            {/* Floating QuickBar Overlay */}
            <div className="fixed bottom-6 inset-x-0 mx-auto w-full max-w-4xl px-4 z-50 pointer-events-auto">
              <FloatingQuickBar />
            </div>
          </div>
        )}

        {/* 3. Idle / Configuration Mode */}
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex w-full flex-col"
          >
            <div className="mb-8 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowLeft className="size-4" />}
                onClick={back}
              >
                {copy.record.back}
              </Button>
              <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
                {copy.record.title}
              </h1>
              <div className="w-16" />
            </div>

            {/* Source Selection Cards */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-semibold text-fg">
                {copy.record.sourceTitle}
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {sources.map((s) => {
                  const Icon = s.icon;
                  const selected = source === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSource(s.id)}
                      className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                        selected
                          ? "border-white bg-white/10 shadow-sm"
                          : "border-ink-700 bg-ink-800 hover:border-ink-600 hover:bg-ink-700/60"
                      }`}
                    >
                      <div
                        className={`mb-3 flex size-10 items-center justify-center rounded-xl ${
                          selected ? "bg-white text-black" : "bg-ink-700 text-fg-muted"
                        }`}
                      >
                        <Icon className="size-5" />
                      </div>
                      <span className="text-base font-semibold text-fg">{s.label}</span>
                      <span className="mt-1 text-xs text-fg-muted leading-relaxed">{s.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio Options */}
            <div className="mb-8 rounded-2xl border border-ink-700 bg-ink-800 p-4">
              <span className="mb-3 block text-sm font-semibold text-fg">
                {copy.record.audioTitle}
              </span>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`flex flex-1 items-center justify-between rounded-xl border p-3.5 transition-all ${
                    micEnabled
                      ? "border-white bg-ink-700/80 text-fg"
                      : "border-ink-700 bg-ink-900/60 text-fg-faint"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {micEnabled ? (
                      <Mic className="size-5 text-white" />
                    ) : (
                      <MicOff className="size-5 text-fg-faint" />
                    )}
                    <span className="text-sm font-medium">{copy.record.micLabel}</span>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    {micEnabled ? "On" : "Off"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={toggleSystemAudio}
                  className={`flex flex-1 items-center justify-between rounded-xl border p-3.5 transition-all ${
                    systemAudioEnabled
                      ? "border-white bg-ink-700/80 text-fg"
                      : "border-ink-700 bg-ink-900/60 text-fg-faint"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {systemAudioEnabled ? (
                      <Volume2 className="size-5 text-white" />
                    ) : (
                      <VolumeX className="size-5 text-fg-faint" />
                    )}
                    <span className="text-sm font-medium">{copy.record.systemAudioLabel}</span>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    {systemAudioEnabled ? "On" : "Off"}
                  </span>
                </button>
              </div>
            </div>

            {/* Start Button */}
            <div className="flex justify-center">
              <Button
                variant="primary"
                size="xl"
                icon={<Video className="size-6 text-ink-950" />}
                onClick={startCountdown}
                className="w-full sm:w-auto sm:px-16"
              >
                {copy.record.startBtn}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
