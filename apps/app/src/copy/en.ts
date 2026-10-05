/**
 * Every word the app shows lives here.
 *
 * Writing rules: short, simple, friendly. No jargon.
 * Talk like you're helping a friend who has never edited a video.
 */

export const copy = {
  appName: "DomoLens",

  home: {
    title: "Ready when you are.",
    subtitle: "Record your screen. We'll zoom in on every click for you.",
    newRecording: "New recording",
    openVideo: "Open a video",
    projectsTitle: "Your projects",
    projectsCount: (n: number) => (n === 1 ? "1 project" : `${n} projects`),
    emptyTitle: "No projects yet",
    emptyBody: "Your recordings will show up here.",
    emptyHintDesktop: "Tip: drop a video anywhere in this window.",
    emptyHintTouch: "Tip: tap “Open a video” to bring one in.",
    loading: "Loading your projects…",
  },

  project: {
    open: "Open",
    rename: "Rename",
    delete: "Delete",
    moreActions: (name: string) => `More options for ${name}`,
    openLabel: (name: string) => `Open ${name}`,
    gettingReady: "Getting it ready…",
    renameTitle: "Rename project",
    renameLabel: "Name",
    save: "Save",
    cancel: "Cancel",
    deleteTitle: "Delete this project?",
    deleteBody: (name: string) => `“${name}” will be gone for good. This can't be undone.`,
    deleteConfirm: "Delete",
    deleted: "Project deleted.",
    renamed: "Name saved.",
    back: "Back",
    editorSoon: "Editing tools are on the way. For now you can watch your video here.",
  },

  record: {
    title: "New recording",
    sourceTitle: "What do you want to record?",
    sourceScreen: "Entire screen",
    sourceScreenDesc: "Record everything you see.",
    sourceWindow: "Single window",
    sourceWindowDesc: "Pick one app window.",
    sourceTab: "Browser tab",
    sourceTabDesc: "Record one active tab.",
    audioTitle: "Audio",
    micLabel: "Microphone",
    systemAudioLabel: "Computer sound",
    startBtn: "Start recording",
    pauseBtn: "Pause",
    resumeBtn: "Resume",
    finishBtn: "Finish recording",
    discardBtn: "Cancel",
    recordingIndicator: "Recording",
    pausedIndicator: "Paused",
    clickHint: "Click around like usual. DomoLens watches your clicks to zoom in later.",
    back: "Back home",
    countdownReady: "Get ready…",
  },

  editor: {
    title: "Video Editor",
    backToHome: "Projects",
    play: "Play",
    pause: "Pause",
    split: "Split (S)",
    delete: "Delete",
    undo: "Undo (⌘Z)",
    redo: "Redo (⌘⇧Z)",
    zoomInTimeline: "Zoom timeline in",
    zoomOutTimeline: "Zoom timeline out",
    autoZoomTrack: "Auto zoom",
    videoTrack: "Video clips",
    zoomStrength: "Zoom strength",
    zoomBlockActive: "Zoomed in",
    zoomBlockInactive: "Zoom off",
    editZoom: "Edit zoom block",
    looksTab: "Looks",
    timelineTab: "Timeline",
    exportBtn: "Export video",
    settingsBtn: "Settings",
  },

  looks: {
    title: "Frame & Background",
    background: "Canvas background",
    padding: "Padding around video",
    corners: "Rounded corners",
    shadow: "Drop shadow",
    cursor: "Mouse pointer",
    ripples: "Show click ripples",
    ripplesDesc: "Draw an expanding circle when you click.",
  },

  export: {
    title: "Save your video",
    desc: "Pick your quality and export. It's ready in moments.",
    resolution: "Quality",
    res1080p: "1080p Full HD (Recommended)",
    res720p: "720p Fast",
    res4k: "4K Ultra HD",
    resGif: "Animated GIF",
    rendering: "Rendering your video…",
    progress: (p: number) => `${Math.round(p)}% finished`,
    downloadBtn: "Save video",
    cancelBtn: "Cancel export",
    done: "Your video has been saved!",
  },

  settings: {
    title: "Settings & AI",
    aiTitle: "Smart captions & titles",
    aiNotice: "Add a key to unlock captions and title ideas. Everything else works without it.",
    apiKeyLabel: "Gemini or OpenAI API key",
    apiKeyPlaceholder: "Paste your API key here…",
    saveKey: "Save key",
    removeKey: "Remove key",
    keySaved: "API key saved safely.",
  },

  drop: {
    title: "Drop your video",
    body: "We'll make a new project from it.",
    wrongType: "That file won't work. Try a video like MP4 or MOV.",
    onlyOne: "We'll start with the first video you dropped.",
  },

  import: {
    working: "Bringing in your video…",
    done: "Your video is ready.",
    pickerTitle: "Choose a video",
    pickerFilter: "Videos",
  },

  errors: {
    generic: "Something went wrong. Try again.",
    loadProjects: "We couldn't load your projects. Try again.",
    importFailed: "We couldn't open that video. Try another one.",
    saveFailed: "We couldn't save that. Try again.",
    deleteFailed: "We couldn't delete that. Try again.",
    tryAgain: "Try again",
  },

  a11y: {
    dismiss: "Close",
    home: "Go to home",
  },
} as const;
