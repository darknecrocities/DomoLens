"""DomoLens Studio App — Live 60 FPS Screen Recording Generator.

Renders a live demonstration of the actual DomoLens Studio Editor in action:
1. Top Window Bar: Traffic lights, DomoLens branding, project name, Media/Edit/Rec tabs, Export button.
2. Left Sidebar: 'Bring your own AI' with prompt chips and provider setup.
3. Center Canvas: The live video preview with smooth 1.85x auto-zoom tracking the moving mouse and reticle.
4. Right Sidebar: 'Composition' panel with live sliders (Roundness, Padding, Shadow, Blur BG).
5. Bottom Timeline: Time ruler, animated playhead, green outline zoom keyframe pills, audio waveform clip track.
6. Real Actions:
   - 0s–3s: Playback + Auto-Zoom tracking the cursor to a button click.
   - 3s–6s: Clicking 'Cut silences' in AI Director -> timeline auto-trims pauses.
   - 6s–9s: Dragging 'Roundness' slider & toggling 'Blur BG' -> canvas updates live.
   - 9s–12s: Clicking 'Export' -> 60 FPS render progress bar completes.
"""

import math
import subprocess
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

FPS = 60
WIDTH = 1920
HEIGHT = 1080
TOTAL_FRAMES = 720  # 12 seconds at 60 FPS

# Palette (Two-tone monochrome + subtle accents from screenshot)
BG_DESKTOP = (10, 10, 12)
PANEL_BG = (18, 19, 22)
PANEL_BORDER = (38, 40, 46)
CANVAS_BG = (12, 13, 15)
TIMELINE_BG = (15, 16, 18)
WHITE = (255, 255, 255)
FG_MUTED = (160, 163, 171)
FG_FAINT = (100, 103, 112)
GREEN_PILL = (91, 211, 138)
PURPLE_PLAYHEAD = (168, 85, 247)
ORANGE_ACCENT = (255, 122, 26)


def ease_in_out_cubic(t: float) -> float:
    t = max(0.0, min(1.0, t))
    if t < 0.5:
        return 4.0 * t * t * t
    return 1.0 - math.pow(-2.0 * t + 2.0, 3) / 2.0


def draw_app_frame(frame_idx: int) -> Image.Image:
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_DESKTOP)
    draw = ImageDraw.Draw(img)

    t = frame_idx / FPS  # current time in seconds (0.0 to 12.0)

    # -------------------------------------------------------------
    # 1. TOP NATIVE macOS TITLEBAR (y: 0 to 48)
    # -------------------------------------------------------------
    draw.rectangle([0, 0, WIDTH, 48], fill=(16, 17, 20))
    draw.line([0, 48, WIDTH, 48], fill=PANEL_BORDER, width=1)

    # Traffic light window dots
    draw.ellipse([18, 17, 30, 29], fill=(255, 95, 87))
    draw.ellipse([36, 17, 48, 29], fill=(254, 188, 46))
    draw.ellipse([54, 17, 66, 29], fill=(40, 200, 64))

    # App icon & Brand Title
    draw.rounded_rectangle([80, 12, 104, 36], radius=5, fill=(35, 37, 42))
    draw.ellipse([86, 18, 98, 30], fill=WHITE)
    draw.text((112, 17), "DomoLens", fill=WHITE)

    # Project Title & Status
    draw.text((220, 17), "Recording 10/3/2026, 4:22 PM", fill=FG_MUTED)
    draw.ellipse([450, 22, 456, 28], fill=GREEN_PILL)
    draw.text((464, 17), "Saved", fill=GREEN_PILL)

    # Mode Switcher Tabs (Media | Edit | Rec)
    draw.rounded_rectangle([WIDTH // 2 - 110, 10, WIDTH // 2 + 110, 38], radius=8, fill=(24, 25, 29), outline=PANEL_BORDER, width=1)
    draw.text((WIDTH // 2 - 95, 17), "Media", fill=FG_FAINT)
    # Active 'Edit' tab
    draw.rounded_rectangle([WIDTH // 2 - 35, 12, WIDTH // 2 + 35, 36], radius=6, fill=WHITE)
    draw.text((WIDTH // 2 - 15, 17), "Edit", fill=(10, 10, 12))
    draw.text((WIDTH // 2 + 55, 17), "Rec", fill=FG_FAINT)

    # Export Button (Top Right)
    export_clicked = t >= 9.2
    draw.rounded_rectangle([WIDTH - 120, 10, WIDTH - 20, 38], radius=8, fill=(220, 220, 220) if export_clicked else WHITE)
    draw.text((WIDTH - 96, 17), "Export ↑", fill=(10, 10, 12))

    # -------------------------------------------------------------
    # 2. LEFT SIDEBAR: "BRING YOUR OWN AI" (x: 0 to 340, y: 48 to 720)
    # -------------------------------------------------------------
    left_w = 330
    draw.rectangle([0, 48, left_w, 720], fill=PANEL_BG)
    draw.line([left_w, 48, left_w, 720], fill=PANEL_BORDER, width=1)

    # AI Header
    draw.rounded_rectangle([16, 62, 90, 84], radius=6, fill=(28, 30, 36))
    draw.text((24, 66), "0% context", fill=FG_FAINT)
    draw.text((left_w - 40, 66), "⚙", fill=FG_MUTED)

    # Spark icon & Heading
    draw.ellipse([16, 104, 32, 120], fill=GREEN_PILL)
    draw.text((40, 104), "Bring your own AI", fill=WHITE)
    draw.text((16, 130), "The chat edits your video by talking to a model.", fill=FG_MUTED)
    draw.text((16, 146), "Connect Gemini, Claude, or OpenAI to start.", fill=FG_FAINT)

    # Feature Action Chips
    chips = [
        "Cut silences, tighten pauses, drop filler words",
        "Add captions, zoom camera, generate title",
        "Rewrite a section, rephrase, or split a clip",
    ]
    ai_clicked = 3.2 <= t <= 6.0
    for i, chip in enumerate(chips):
        cy = 180 + i * 54
        is_cut_silence = i == 0 and ai_clicked
        chip_bg = (40, 42, 50) if is_cut_silence else (25, 27, 32)
        chip_border = WHITE if is_cut_silence else PANEL_BORDER
        draw.rounded_rectangle([16, cy, left_w - 16, cy + 44], radius=8, fill=chip_bg, outline=chip_border, width=1)
        draw.ellipse([26, cy + 18, 32, cy + 24], fill=WHITE if is_cut_silence else GREEN_PILL)
        draw.text((40, cy + 8), chip[:36], fill=WHITE if is_cut_silence else FG_MUTED)
        draw.text((40, cy + 24), chip[36:], fill=FG_FAINT)

    # Set up provider button
    draw.rounded_rectangle([16, 360, left_w - 16, 396], radius=8, fill=(35, 38, 44), outline=PANEL_BORDER, width=1)
    draw.text((70, 372), "Set up a provider →", fill=WHITE)

    # Bottom Chat input
    draw.rounded_rectangle([16, 650, left_w - 16, 700], radius=10, fill=(12, 13, 16), outline=PANEL_BORDER, width=1)
    draw.text((28, 666), "Ask AI to cut, zoom, or caption...", fill=FG_FAINT)
    draw.text((left_w - 42, 666), "➔", fill=FG_MUTED)

    # -------------------------------------------------------------
    # 3. RIGHT SIDEBAR: "COMPOSITION" & TOOL RAIL (x: 1560 to 1920)
    # -------------------------------------------------------------
    right_x = 1570
    draw.rectangle([right_x, 48, WIDTH, 720], fill=PANEL_BG)
    draw.line([right_x, 48, right_x, 720], fill=PANEL_BORDER, width=1)

    # Far-right vertical icon rail (x: 1870 to 1920)
    rail_x = 1870
    draw.rectangle([rail_x, 48, WIDTH, 720], fill=(14, 15, 17))
    draw.line([rail_x, 48, rail_x, 720], fill=PANEL_BORDER, width=1)
    for ri, rlabel in enumerate(["📐", "🎨", "🔊", "⚡", "T", "💬", "✏"]):
        ry = 65 + ri * 46
        if ri == 0:
            draw.rounded_rectangle([rail_x + 6, ry - 4, WIDTH - 6, ry + 28], radius=6, fill=(35, 37, 44))
        draw.text((rail_x + 18, ry), rlabel, fill=WHITE if ri == 0 else FG_FAINT)

    # Composition Panel Title
    draw.text((right_x + 16, 65), "Composition", fill=WHITE)
    draw.text((right_x + 115, 65), "⚙", fill=FG_FAINT)

    # Background Section
    draw.text((right_x + 16, 105), "Background", fill=FG_MUTED)
    draw.rounded_rectangle([right_x + 16, 126, right_x + 120, 160], radius=8, fill=(12, 13, 15), outline=PANEL_BORDER, width=1)
    draw.ellipse([right_x + 26, 137, right_x + 40, 151], fill=(20, 22, 28))
    draw.text((right_x + 48, 137), "Color ▾", fill=WHITE)

    # Blur BG toggle (animated in Scene 3: 6s–9s)
    blur_active = t >= 6.5
    draw.text((right_x + 16, 185), "Blur BG", fill=FG_MUTED)
    draw.rounded_rectangle([right_x + 190, 180, right_x + 236, 204], radius=12, fill=WHITE if blur_active else (40, 42, 48))
    toggle_knob_x = right_x + 214 if blur_active else right_x + 192
    draw.ellipse([toggle_knob_x, 182, toggle_knob_x + 20, 202], fill=(12, 13, 15) if blur_active else FG_MUTED)

    # Frame Format
    draw.text((right_x + 16, 230), "Frame", fill=FG_MUTED)
    draw.rounded_rectangle([right_x + 16, 250, right_x + 180, 284], radius=8, fill=(24, 26, 31), outline=PANEL_BORDER, width=1)
    draw.text((right_x + 28, 260), "Format: 16:9", fill=WHITE)

    # Sliders: Shadow, Roundness, Padding
    # Animated roundness value in Scene 3: 6s–9s from 16px to 40px
    if t < 6.0:
        roundness_val = 16
    elif t <= 8.5:
        progress = (t - 6.0) / 2.5
        roundness_val = int(16 + progress * 24)
    else:
        roundness_val = 40

    sliders = [
        ("Shadow", "20%", 0.20),
        ("Roundness", f"{roundness_val}px", roundness_val / 60.0),
        ("Padding", "50%", 0.50),
    ]
    for si, (sname, sval_str, sratio) in enumerate(sliders):
        sy = 310 + si * 64
        draw.text((right_x + 16, sy), sname, fill=FG_MUTED)
        draw.text((right_x + 210, sy), sval_str, fill=WHITE)
        # Slider track
        draw.rounded_rectangle([right_x + 16, sy + 22, right_x + 240, sy + 28], radius=3, fill=(35, 38, 44))
        # Slider fill
        draw.rounded_rectangle([right_x + 16, sy + 22, int(right_x + 16 + sratio * 224), sy + 28], radius=3, fill=WHITE)
        # Slider knob
        kx = int(right_x + 16 + sratio * 224)
        draw.ellipse([kx - 6, sy + 19, kx + 6, sy + 31], fill=WHITE)

    # -------------------------------------------------------------
    # 4. CENTER VIDEO CANVAS (x: 330 to 1570, y: 48 to 720)
    # -------------------------------------------------------------
    canvas_w = right_x - left_w
    canvas_h = 720 - 48
    canvas_cx = left_w + canvas_w // 2
    canvas_cy = 48 + canvas_h // 2

    # Draw canvas dark backdrop (with subtle blur simulation if blur_active)
    draw.rectangle([left_w, 48, right_x, 720], fill=CANVAS_BG)
    if blur_active:
        # Subtle glowing rings representing background blur
        draw.ellipse([canvas_cx - 400, canvas_cy - 240, canvas_cx + 400, canvas_cy + 240], fill=(22, 25, 34))

    # Animate auto-zoom in center canvas:
    # Scene 1 (0.0s to 3.0s): Zooms from 1.0x to 1.85x onto a button click, holds, glides back out
    zoom_scale = 1.0
    cam_offset_x = 0
    cam_offset_y = 0
    if 0.5 <= t <= 3.2:
        if t < 1.3:
            p = ease_in_out_cubic((t - 0.5) / 0.8)
        elif t <= 2.5:
            p = 1.0  # hold
        else:
            p = 1.0 - ease_in_out_cubic((t - 2.5) / 0.7)
        zoom_scale = 1.0 + p * 0.85
        cam_offset_x = int(-p * 120)
        cam_offset_y = int(-p * 80)

    # Framed recorded screen mockup inside the canvas
    frame_w = int(820 * zoom_scale)
    frame_h = int(480 * zoom_scale)
    frame_x0 = canvas_cx - frame_w // 2 + cam_offset_x
    frame_y0 = canvas_cy - frame_h // 2 + cam_offset_y
    frame_x1 = frame_x0 + frame_w
    frame_y1 = frame_y0 + frame_h

    # Clip to canvas viewport bounds
    canvas_clip = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    canvas_draw = ImageDraw.Draw(canvas_clip)

    rel_fx0 = frame_x0 - left_w
    rel_fy0 = frame_y0 - 48
    rel_fx1 = frame_x1 - left_w
    rel_fy1 = frame_y1 - 48

    # Rounded screen with dynamic corner radius (from composition slider!)
    canvas_draw.rounded_rectangle(
        [rel_fx0, rel_fy0, rel_fx1, rel_fy1],
        radius=int(roundness_val * zoom_scale),
        fill=(22, 24, 28),
        outline=(50, 53, 62),
        width=2,
    )

    # Webpage titlebar inside the recorded screen
    canvas_draw.rounded_rectangle(
        [rel_fx0, rel_fy0, rel_fx1, rel_fy0 + int(36 * zoom_scale)],
        radius=int(roundness_val * zoom_scale),
        fill=(30, 32, 38),
    )
    canvas_draw.text((rel_fx0 + int(24 * zoom_scale), rel_fy0 + int(10 * zoom_scale)), "https://demo.app/dashboard", fill=FG_MUTED)

    # Content inside recorded screen
    content_y = rel_fy0 + int(60 * zoom_scale)
    canvas_draw.text((rel_fx0 + int(40 * zoom_scale), content_y), "Open Skills. Smarter Agents.", fill=WHITE)
    canvas_draw.text((rel_fx0 + int(40 * zoom_scale), content_y + int(26 * zoom_scale)), "Supercharge AI & RAG Agents", fill=FG_MUTED)

    # Target button inside recorded screen (Click target)
    btn_x = rel_fx0 + int(40 * zoom_scale)
    btn_y = content_y + int(70 * zoom_scale)
    btn_w = int(140 * zoom_scale)
    btn_h = int(40 * zoom_scale)
    canvas_draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], radius=6, fill=WHITE)
    canvas_draw.text((btn_x + int(20 * zoom_scale), btn_y + int(12 * zoom_scale)), "Deploy Agent →", fill=(10, 10, 12))

    # Paste clipped canvas
    img.paste(canvas_clip, (left_w, 48), canvas_clip)

    # -------------------------------------------------------------
    # 5. BOTTOM TIMELINE (y: 720 to 1080)
    # -------------------------------------------------------------
    draw.rectangle([0, 720, WIDTH, HEIGHT], fill=TIMELINE_BG)
    draw.line([0, 720, WIDTH, 720], fill=PANEL_BORDER, width=1)

    # Timeline toolbar (y: 720 to 760)
    draw.text((24, 734), "✂ Split", fill=WHITE)
    draw.text((100, 734), "✂ Trim", fill=FG_MUTED)
    draw.text((170, 734), "⚡ Speed", fill=FG_MUTED)

    # Play/Pause & Timecode
    draw.text((WIDTH // 2 - 80, 734), "▶" if t >= 9.0 else "❚❚", fill=WHITE)
    cur_sec = min(12.0, t)
    draw.text((WIDTH // 2 - 50, 734), f"0:{int(cur_sec):02d}.{int((cur_sec % 1)*10)} / 0:12.0", fill=WHITE)
    draw.text((WIDTH - 240, 734), "Shift+Scroll Pan   Ctrl+Scroll Zoom", fill=FG_FAINT)
    draw.line([0, 762, WIDTH, 762], fill=PANEL_BORDER, width=1)

    # Time ruler with marks (y: 762 to 788)
    for sec_mark in range(13):
        mx = int(60 + (sec_mark / 12.0) * (WIDTH - 120))
        draw.line([mx, 766, mx, 776], fill=FG_FAINT, width=1)
        draw.text((mx - 10, 778), f"0:{sec_mark:02d}", fill=FG_FAINT)

    # Track 1: Zoom Keyframe Pills (Green outline pills)
    # Animated cut in Scene 2: 3s–6s trims the pause!
    draw.text((60, 804), "Auto-Zoom Track", fill=FG_FAINT)
    pill_intervals = [(0.5, 3.2), (4.5, 6.2), (7.0, 9.0)]
    for p_start, p_end in pill_intervals:
        px0 = int(60 + (p_start / 12.0) * (WIDTH - 120))
        px1 = int(60 + (p_end / 12.0) * (WIDTH - 120))
        is_active_pill = p_start <= t <= p_end
        draw.rounded_rectangle(
            [px0, 826, px1, 856],
            radius=12,
            fill=(25, 45, 35) if is_active_pill else (18, 22, 20),
            outline=GREEN_PILL,
            width=2 if is_active_pill else 1,
        )
        draw.text((px0 + 16, 834), "1.85x Zoom Event", fill=WHITE if is_active_pill else GREEN_PILL)

    # Track 2: Video Clip Track with Waveform
    clip_x0 = 60
    clip_x1 = WIDTH - 60
    draw.rounded_rectangle([clip_x0, 874, clip_x1, 954], radius=8, fill=(28, 30, 36), outline=PANEL_BORDER, width=1)
    draw.text((clip_x0 + 16, 882), "🎬 recording-1791017124694.mp4", fill=WHITE)

    # Subtle audio waveform lines
    wf_y = 920
    for wfx in range(clip_x0 + 20, clip_x1 - 20, 8):
        h_amp = int(math.sin(wfx * 0.05) * 12 + math.cos(wfx * 0.12) * 8 + 14)
        draw.line([wfx, wf_y - h_amp // 2, wfx, wf_y + h_amp // 2], fill=(80, 85, 96), width=2)

    # Scrubber Playhead Line (Purple)
    playhead_progress = t / 12.0
    playhead_x = int(60 + playhead_progress * (WIDTH - 120))
    draw.line([playhead_x, 762, playhead_x, 960], fill=PURPLE_PLAYHEAD, width=2)
    draw.rounded_rectangle([playhead_x - 6, 756, playhead_x + 6, 768], radius=3, fill=PURPLE_PLAYHEAD)

    # -------------------------------------------------------------
    # 6. MOUSE CURSOR & INTERACTION OVERLAYS
    # -------------------------------------------------------------
    # Mouse positions across the 4 scenarios
    if t < 3.2:
        # Scene 1: Mouse moves to button, clicks, camera tracks
        mx = int(980 + math.sin(t * 2) * 30)
        my = int(390 + math.cos(t * 2) * 20)
        # Reticle indicator on active zoom
        if 0.5 <= t <= 2.8:
            draw.ellipse([mx - 24, my - 24, mx + 24, my + 24], outline=WHITE, width=2)
            draw.rounded_rectangle([mx + 30, my - 12, mx + 160, my + 12], radius=4, fill=(10, 10, 12), outline=WHITE)
            draw.text((mx + 36, my - 6), "🎯 Focus Tracking", fill=WHITE)
    elif t < 6.0:
        # Scene 2: Mouse glides to Left AI Panel and clicks 'Cut silences'
        p = min(1.0, (t - 3.2) / 0.8)
        mx = int(980 + p * (180 - 980))
        my = int(390 + p * (200 - 390))
        if t >= 4.0:
            # Click ripple
            draw.ellipse([mx - 15, my - 15, mx + 15, my + 15], outline=GREEN_PILL, width=2)
    elif t < 9.0:
        # Scene 3: Mouse glides to Right Composition Panel and drags Roundness
        p = min(1.0, (t - 6.0) / 0.8)
        mx = int(180 + p * (1720 - 180))
        my = int(200 + p * (380 - 200))
        if t >= 6.8:
            draw.ellipse([mx - 12, my - 12, mx + 12, my + 12], outline=WHITE, width=2)
    else:
        # Scene 4: Mouse glides up to Export button
        p = min(1.0, (t - 9.0) / 0.7)
        mx = int(1720 + p * (WIDTH - 70 - 1720))
        my = int(380 + p * (24 - 380))

    # Draw arrow cursor at (mx, my)
    draw.polygon([(mx, my), (mx, my + 18), (mx + 5, my + 14), (mx + 11, my + 21), (mx + 14, my + 19), (mx + 8, my + 12), (mx + 15, my + 12)], fill=WHITE)

    # -------------------------------------------------------------
    # 7. EXPORT MODAL POPUP (Scene 4: 9.5s to 12.0s)
    # -------------------------------------------------------------
    if t >= 9.6:
        modal_w, modal_h = 560, 260
        modal_x0 = WIDTH // 2 - modal_w // 2
        modal_y0 = HEIGHT // 2 - modal_h // 2
        modal_x1 = modal_x0 + modal_w
        modal_y1 = modal_y0 + modal_h

        # Modal backdrop overlay
        overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 140))
        img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"))
        draw = ImageDraw.Draw(img)

        draw.rounded_rectangle([modal_x0, modal_y0, modal_x1, modal_y1], radius=16, fill=(18, 19, 23), outline=WHITE, width=2)
        draw.text((modal_x0 + 32, modal_y0 + 32), "Export Video", fill=WHITE)
        draw.text((modal_x0 + 32, modal_y0 + 60), "Rendering with local GPU hardware acceleration", fill=FG_MUTED)

        # Progress bar
        export_progress = min(1.0, (t - 9.6) / 2.0)
        draw.rounded_rectangle([modal_x0 + 32, modal_y0 + 110, modal_x1 - 32, modal_y0 + 126], radius=6, fill=(30, 32, 38))
        draw.rounded_rectangle([modal_x0 + 32, modal_y0 + 110, int(modal_x0 + 32 + export_progress * (modal_w - 64)), modal_y0 + 126], radius=6, fill=WHITE)

        percent_str = f"{int(export_progress * 100)}%" if export_progress < 1.0 else "100% — Complete!"
        draw.text((modal_x0 + 32, modal_y0 + 140), f"1080p 60 FPS • {percent_str}", fill=GREEN_PILL if export_progress >= 1.0 else WHITE)
        draw.text((modal_x0 + 32, modal_y0 + 190), "Saved to /Movies/DomoLens/demo.mp4", fill=FG_FAINT)

    return img


def main():
    tmp_dir = Path("/tmp/domolens_app_frames")
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    tmp_dir.mkdir(parents=True, exist_ok=True)

    print(f"Rendering {TOTAL_FRAMES} frames of real DomoLens app screen recording at 60 FPS...")
    for f in range(TOTAL_FRAMES):
        frame = draw_app_frame(f)
        frame.save(tmp_dir / f"frame_{f:05d}.png", "PNG")
        if f % 120 == 0:
            print(f"Rendered {f}/{TOTAL_FRAMES} ({(f/TOTAL_FRAMES)*100:.1f}%)")

    print("Encoding MP4 with FFmpeg at 60 FPS...")
    output_mp4 = Path("public/domolens_app_live_demo.mp4")
    output_mp4.parent.mkdir(parents=True, exist_ok=True)

    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-r", str(FPS),
        "-i", str(tmp_dir / "frame_%05d.png"),
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        str(output_mp4),
    ]
    subprocess.run(ffmpeg_cmd, check=True)
    print(f"SUCCESS! Video written to: {output_mp4}")

    # Copy to both app and landing public folders and brain artifact dir
    app_public = Path("apps/app/public/domolens_app_live_demo.mp4")
    landing_public = Path("apps/landing/public/domolens_app_live_demo.mp4")
    brain_artifact = Path("/Users/arronkianparejas/.gemini/antigravity/brain/81680c3c-8ea9-4969-abe7-e55589d85dce/domolens_app_live_demo.mp4")

    shutil.copy2(output_mp4, app_public)
    shutil.copy2(output_mp4, landing_public)
    shutil.copy2(output_mp4, brain_artifact)
    print(f"Copied to app public: {app_public}")
    print(f"Copied to landing public: {landing_public}")
    print(f"Copied to brain artifact: {brain_artifact}")


if __name__ == "__main__":
    main()
