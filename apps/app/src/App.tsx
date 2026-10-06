import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "./components/layout/Header";
import { DropZoneOverlay } from "./components/home/DropZoneOverlay";
import { Toaster } from "./components/ui/Toaster";
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
import { initBackgroundAutoUpdater } from "./lib/updater";

export function App() {
  const { screen } = useNav();
  const { load, importFiles } = useProjects();
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

    return () => {
      unbindProjects();
      unbindDrops();
      unbindUpdater();
    };
  }, [load, importFiles]);

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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[95vw] max-w-4xl px-3 pointer-events-auto select-none shadow-2xl">
          <FloatingQuickBar />
        </div>
      )}

      <DropZoneOverlay isDragging={isDragging} />
      <Toaster />
    </div>
  );
}
