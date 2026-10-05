# Plain-Language Guidelines

## 1. Content Philosophy

DomoLens is designed to be accessible to creators, engineers, educators, and product designers alike. A core design principle is the elimination of technical jargon and engineering-centric terminology in all user-facing interfaces.

The software speaks with clarity, warmth, and brevity.

## 2. Jargon Elimination Dictionary

The following table serves as the authoritative translation standard across all DomoLens components:

| Technical / Engineering Jargon | DomoLens Plain-Language Standard | Context |
| --- | --- | --- |
| Ingest media / Import asset | Open a video | Main navigation and file picker action |
| Initialize capture session | New recording | Primary screen capture initiation |
| Media ingestion completed | Your video is ready | Toast notification upon file load |
| Ingesting media stream... | Bringing in your video... | Loading indicator during file read |
| Null records / Empty dataset | No projects yet. Your recordings will show up here. | Projects grid empty state |
| Drag-and-drop binary files | Drop a video anywhere in this window | File drop zone prompt |
| Unsupported MIME type 415 | That file won't work. Try a video like MP4 or MOV. | File format validation error |
| Multiple files in payload | We'll start with the first video you dropped | Multi-file drop resolution |
| Confirm entity deletion | “{name}” will be gone for good. This can't be undone. | Delete confirmation modal |
| Spatio-temporal cluster engine | We'll zoom in on every click for you | Home hero value proposition |
| Configure LLM API credentials | Bring your own key | Settings panel header |
| API key authentication status | Add a key to unlock captions and title ideas. Everything else works without it. | AI configuration description |
| Split media slice at playhead | Split | Timeline clip cut action |
| Transcode resolution profile | Quality | Export modal resolution picker |

## 3. Copywriting Rules for Interface Text

### Rule 1: Use Clear, Active Verbs
State what the user or app is doing directly.
- Avoid: "Video recording initialization in progress."
- Use: "Getting ready..."

### Rule 2: Explicit Consequences for Destructive Actions
When an action removes data, clearly explain the final outcome without using abstract database jargon.
- Avoid: "Record deletion will be committed permanently."
- Use: "This can't be undone."

### Rule 3: Actionable Error Messages
Errors must describe what happened in everyday words and immediately offer a path forward.
- Avoid: "Error 400: Camera capture constraints unsatisfied."
- Use: "We couldn't reach your camera or screen. Check your permissions and try again."

## 4. Central String Repository

All application strings are centrally declared in `apps/app/src/copy/en.ts`. Components must import from this module rather than hardcoding inline strings, ensuring translation consistency and effortless internationalization audits.
