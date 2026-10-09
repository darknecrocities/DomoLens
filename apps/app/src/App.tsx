import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "./components/layout/Header";
import { DropZoneOverlay } from "./components/home/DropZoneOverlay";
import { Toaster } from "./components/ui/Toaster";
import { UpdateModal } from "./components/ui/UpdateModal";
import { HomeScreen } from "./screens/HomeScreen";
import { RecordScreen } from "./screens/RecordScreen";
import { ProjectScreen } from "./screens/ProjectScreen";
import { EditorScreen } from "./screens/EditorScreen";
import { LandingView } from "./screens/LandingView";
import { platform } from "./platform";
import { screenKey, useNav } from "./store/nav";
import { useProjects } from "./store/projects";
import { useRecorder } from "./store/recorder";
import { FloatingQuickBar } from "./components/recording/FloatingQuickBar";
import { RecordingProcessingModal } from "./components/recording/RecordingProcessingModal";
import { GlobalHudWindow } from "./components/recording/GlobalHudWindow";
import { initBackgroundAutoUpdater } from "./lib/updater";

import { useUpdateStore } from "./store/update";

export function App() {
  const isHudWindow = typeof window !== "undefined" && (window.location.search.includes("hud=true") || window.location.hash.includes("hud"));

  if (isHudWindow) {
    return <GlobalHudWindow />;
  }

  const { screen } = useNav();
  const { load, importFiles, projects } = useProjects();
  const recorderState = useRecorder((s) => s.state);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Initial load
    void load();

    // Listen for background updates
    const unbindProjects = platform.onProjectsChanged(() => {
      void load();
    });

    // Listen for file drops
    const unbindDrops = platform.listenForFileDrops({
      onEnter: () => setIsDragging(true),
      onLeave: () => setIsDragging(false),
      onDrop: (files) => {
        setIsDragging(false);
        if (files.length > 0) {
          void importFiles(files);
        }
      },
    });

    // Auto-updater background scheduler (desktop app only)
    const unbindUpdater = initBackgroundAutoUpdater();

    // Listen for QuickIcon / Menu bar actions
    const unbindMenu = platform.onMenuAction?.((action) => {
      if (action === "start_recording") {
        const rec = useRecorder.getState();
        if (rec.state === "idle") {
          void rec.startCountdown();
        }
      } else if (action === "stop_recording") {
        const rec = useRecorder.getState();
        if (rec.state === "recording" || rec.state === "paused") {
          void rec.stopRecording();
        }
      } else if (action === "toggle_pause") {
        const rec = useRecorder.getState();
        if (rec.state === "recording") {
          rec.pauseRecording();
        } else if (rec.state === "paused") {
          rec.resumeRecording();
        }
      } else if (action === "open_editor") {
        const currentProjects = useProjects.getState().projects;
        if (currentProjects.length > 0 && currentProjects[0]) {
          useNav.getState().go({ name: "editor", id: currentProjects[0].id });
        } else {
          useNav.getState().go({ name: "home" });
        }
      } else if (action === "open_home") {
        useNav.getState().go({ name: "home" });
      } else if (action === "check_updates") {
        void useUpdateStore.getState().checkForUpdates({ silent: false });
      } else if (action.startsWith("recent:")) {
        const projectId = action.slice("recent:".length);
        useNav.getState().go({ name: "editor", id: projectId });
      }
    });

    return () => {
      unbindProjects();
      unbindDrops();
      unbindUpdater();
      unbindMenu?.();
    };
  }, [load, importFiles]);

  // Sync recording status to menu bar quick icon
  useEffect(() => {
    const isRecording = recorderState === "recording" || recorderState === "paused";
    const isPaused = recorderState === "paused";
    void platform.syncTrayRecordingState?.(isRecording, isPaused);
  }, [recorderState]);

  // Sync recent projects to menu bar quick icon
  useEffect(() => {
    if (projects && projects.length > 0) {
      void platform.syncTrayRecentProjects?.(projects);
    }
  }, [projects]);

  const isBrowserLanding = !platform.isApp && screen.name === "landing";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-ink-900 text-fg">
      <Header />

      <main
        className={`flex flex-1 flex-col ${
          isBrowserLanding ? "overflow-hidden" : "overflow-y-auto pt-14"
        }`}
      >
        <AnimatePresence mode="wait">
          {screen.name === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 flex-col"
            >
              <HomeScreen />
            </motion.div>
          )}

          {screen.name === "record" && (
            <motion.div
              key="record"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 flex-col"
            >
              <RecordScreen />
            </motion.div>
          )}

          {screen.name === "project" && (
            <motion.div
              key={screenKey(screen)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 flex-col"
            >
              <ProjectScreen id={screen.id} />
            </motion.div>
          )}

          {screen.name === "editor" && (
            <motion.div
              key={screenKey(screen)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <EditorScreen id={screen.id} />
            </motion.div>
          )}

          {/* Landing View is strictly retained on browser, completely removed in native desktop app */}
          {isBrowserLanding && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <LandingView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Floating Quick Action Bar during Full-Screen Recording */}
      {(recorderState === "recording" || recorderState === "paused") && (
        <motion.div
          drag
          dragMomentum={false}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[95vw] max-w-4xl px-3 pointer-events-auto select-none shadow-2xl cursor-grab active:cursor-grabbing"
        >
          <FloatingQuickBar />
        </motion.div>
      )}

      <DropZoneOverlay isDragging={isDragging} />
      <Toaster />
      <UpdateModal />
      <RecordingProcessingModal />
    </div>
  );
}
