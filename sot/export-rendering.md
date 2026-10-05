# Export and Rendering Specification

## 1. Export Architecture

DomoLens exports high-fidelity video files and lightweight animations via its render pipeline (`apps/app/src/components/editor/ExportModal.tsx` and `engine/src/domolens_engine/api.py`).

```text
[User Triggers "Export"]
           |
           v
[Configuration: Resolution, Format, Frame Rate]
           |
           v
[Export Request Dispatched to Local Engine Sidecar]
  `POST /export/render`
  - Source file path
  - Target resolution (720p, 1080p, 4K, GIF)
  - Ordered Zoom Blocks (startTimeMs, endTimeMs, targetX, targetY, scale)
  - Looks configuration (padding, radius, shadow, background preset)
           |
           v
[Engine Render Job Execution]
  - Multi-pass FFmpeg rendering
  - Camera interpolation and frame cropping
  - Background composite and padding overlay
  - Audio stream multiplexing
           |
           v
[Progress Polling Loop: GET /export/status/{job_id}]
           |
           v
[Export Complete -> Saved to Local Disk]
```

## 2. Export Resolution Matrix

| Profile | Dimensions | Frame Rate | Codec | Target Bitrate | Ideal Use Case |
| --- | --- | --- | --- | --- | --- |
| 1080p Full HD | 1920 x 1080 | 60 fps | H.264 (libx264) | 10 - 14 Mbps | YouTube, product demos, docs (Recommended) |
| 720p Fast | 1280 x 720 | 30 fps | H.264 (libx264) | 4 - 6 Mbps | Slack, Discord, rapid email sharing |
| 4K Ultra HD | 3840 x 2160 | 60 fps | H.264 / HEVC | 28 - 40 Mbps | High-DPI displays, keynote presentations |
| Animated GIF | Scaled (800w) | 15 fps | GIF (2-Pass Palette) | Variable | GitHub pull requests, READMEs, bug reports |

## 3. Render Job Lifecycle and API Schema

### 3.1 Job Submission
- Endpoint: `POST /export/render`
- Request Payload:
  ```json
  {
    "source_path": "/Users/name/Movies/recording.mp4",
    "resolution": "1080p",
    "zoom_blocks": [
      {
        "startTimeMs": 1400,
        "endTimeMs": 3800,
        "targetX": 0.42,
        "targetY": 0.68,
        "scale": 1.85
      }
    ]
  }
  ```
- Response:
  ```json
  {
    "job_id": "render_1",
    "status": "queued"
  }
  ```

### 3.2 Status Polling
- Endpoint: `GET /export/status/{job_id}`
- Response:
  ```json
  {
    "job_id": "render_1",
    "status": "rendering",
    "progress": 68.5,
    "output_path": null
  }
  ```
- Final Response (`status: "done"`):
  ```json
  {
    "job_id": "render_1",
    "status": "done",
    "progress": 100.0,
    "output_path": "/path/to/exported_video_1080p.mp4"
  }
  ```

## 4. GIF 2-Pass Optimization Recipe

To guarantee small file sizes with rich color fidelity in animated GIFs, DomoLens utilizes FFmpeg's two-pass palette generator:

```bash
# Pass 1: Generate optimal 256-color palette
ffmpeg -i input.mp4 -vf "fps=15,scale=800:-1:flags=lanczos,palettegen" -y palette.png

# Pass 2: Render GIF using custom palette
ffmpeg -i input.mp4 -i palette.png -lavfi "fps=15,scale=800:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3" -y output.gif
```
