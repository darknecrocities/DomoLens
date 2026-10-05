"""DomoLens 60 FPS Smooth Auto-Zoom Video Sample Generator.

Demonstrates:
1. Screen recording on Computer Desktop with Click -> Camera zooms in tracking mouse -> Holds 2.4s -> Glides back to full screen.
2. Screen recording on Computer Desktop with Typing -> Camera zooms into text input -> Holds 2.4s -> Glides back to full screen.
3. Screen recording on Android Mobile Phone with Touch -> Camera zooms into touch target -> Holds 2.4s -> Glides back to full screen.
4. Keyframe timeline at the bottom showing keyframe diamond nodes (◆), zoom blocks, and interaction markers synchronized with the playhead in real time.
"""

import math
import subprocess
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

FPS = 60
WIDTH = 1920
HEIGHT = 1080
TOTAL_FRAMES = 720  # 12.0 seconds at 60 FPS

# Colors
INK_950 = (15, 16, 18)
INK_900 = (22, 23, 26)
INK_800 = (30, 32, 36)
INK_700 = (42, 45, 51)
INK_600 = (54, 57, 64)
FG = (242, 242, 243)
FG_MUTED = (160, 163, 171)
FG_FAINT = (107, 111, 120)
ORANGE = (255, 122, 26)
ORANGE_LIGHT = (255, 178, 122)
WHITE = (255, 255, 255)
CYAN = (6, 182, 212)
PURPLE = (168, 85, 247)
GREEN = (91, 211, 138)


def ease_in_out_cubic(t: float) -> float:
    t = max(0.0, min(1.0, t))
    if t < 0.5:
        return 4.0 * t * t * t
    else:
        return 1.0 - math.pow(-2.0 * t + 2.0, 3) / 2.0


def draw_desktop_content(draw: ImageDraw.ImageDraw, w: int, h: int, typed_text: str = ""):
    # Desktop window frame
    draw.rectangle([0, 0, w, h], fill=INK_900)
    # Window titlebar
    draw.rectangle([0, 0, w, 44], fill=INK_800)
    draw.ellipse([16, 15, 28, 27], fill=(255, 95, 87))
    draw.ellipse([34, 15, 46, 27], fill=(254, 188, 46))
    draw.ellipse([52, 15, 64, 27], fill=(40, 200, 64))
    draw.text((80, 14), "DomoLens Studio — Auto-Zoom Analytics", fill=FG_MUTED)

    # Sidebar
    draw.rectangle([0, 44, 220, h], fill=INK_800)
    for i, label in enumerate(["Studio Workspace", "Recordings", "Keyframes", "Settings"]):
        y = 64 + i * 42
        fill_bg = INK_700 if i == 0 else INK_800
        draw.rounded_rectangle([12, y, 208, y + 34], radius=8, fill=fill_bg)
        draw.text((28, y + 8), label, fill=FG if i == 0 else FG_MUTED)

    # Header and Search/Input Field (Typing target)
    draw.text((250, 64), "Interactive Workflow", fill=FG)
    draw.text((250, 90), "Screen recording with automatic mouse & typing tracking", fill=FG_FAINT)

    # Text Input field at (250, 130) -> typing target
    input_x0, input_y0, input_x1, input_y1 = 250, 125, 650, 175
    draw.rounded_rectangle([input_x0, input_y0, input_x1, input_y1], radius=8, fill=INK_950, outline=ORANGE if typed_text else INK_600, width=2 if typed_text else 1)
    placeholder = typed_text if typed_text else "Click here or type to search..."
    text_color = FG if typed_text else FG_FAINT
    draw.text((input_x0 + 16, input_y0 + 16), placeholder, fill=text_color)
    if typed_text:
        # Blinking cursor
        draw.line([input_x0 + 16 + len(typed_text) * 8 + 4, input_y0 + 12, input_x0 + 16 + len(typed_text) * 8 + 4, input_y1 - 12], fill=ORANGE, width=2)

    # Stats cards
    for j, (title, val) in enumerate([("Total Clicks", "42 Events"), ("Keyframes", "16 Plotted"), ("Latency", "0ms Lag")]):
        cx = 700 + j * 220
        draw.rounded_rectangle([cx, 125, cx + 200, 175], radius=8, fill=INK_800, outline=INK_700, width=1)
        draw.text((cx + 14, 133), title, fill=FG_MUTED)
        draw.text((cx + 14, 151), val, fill=GREEN if "0ms" in val else FG)

    # Button target (Click target) at (820, 240)
    btn_x0, btn_y0, btn_x1, btn_y1 = 820, 230, 1040, 290
    draw.rounded_rectangle([btn_x0, btn_y0, btn_x1, btn_y1], radius=10, fill=ORANGE)
    draw.text((btn_x0 + 36, btn_y0 + 20), "⚡ Publish Video", fill=INK_950)

    # Secondary action buttons
    draw.rounded_rectangle([250, 230, 420, 290], radius=10, fill=INK_800, outline=INK_600, width=1)
    draw.text((280, 250), "Import Clips", fill=FG)

    draw.rounded_rectangle([440, 230, 610, 290], radius=10, fill=INK_800, outline=INK_600, width=1)
    draw.text((470, 250), "Export GIF", fill=FG)

    # Data rows table
    draw.rounded_rectangle([250, 320, w - 30, h - 30], radius=12, fill=INK_800, outline=INK_700, width=1)
    for r in range(4):
        ry = 340 + r * 45
        draw.line([270, ry + 38, w - 50, ry + 38], fill=INK_700, width=1)
        draw.text((290, ry + 10), f"Auto-Zoom Recording Sequence #{r+1}", fill=FG)
        draw.text((700, ry + 10), "1080p 60 FPS", fill=FG_MUTED)
        draw.text((950, ry + 10), "Synced to Keyframes", fill=GREEN)


def draw_mobile_content(draw: ImageDraw.ImageDraw, mw: int, mh: int):
    # Android Mobile screen
    draw.rectangle([0, 0, mw, mh], fill=INK_900)
    draw.text((20, 12), "09:41", fill=FG)
    draw.text((mw - 75, 12), "5G  92%", fill=FG)

    # App Header
    draw.text((20, 48), "DomoLens", fill=ORANGE)
    draw.text((20, 72), "Android Screen Recorder", fill=FG)

    # Mobile Record Card / Button (Tap target at mw/2, 220)
    target_y0, target_y1 = 120, 280
    draw.rounded_rectangle([16, target_y0, mw - 16, target_y1], radius=18, fill=INK_800, outline=ORANGE, width=2)
    draw.ellipse([mw // 2 - 32, target_y0 + 30, mw // 2 + 32, target_y0 + 94], fill=ORANGE)
    draw.text((mw // 2 - 12, target_y0 + 52), "REC", fill=INK_950)
    draw.text((mw // 2 - 64, target_y0 + 110), "Tap to Auto-Record & Zoom", fill=FG)

    # Mobile clips list
    draw.text((20, 310), "Saved Takes", fill=FG_MUTED)
    for k in range(3):
        ky = 336 + k * 72
        draw.rounded_rectangle([16, ky, mw - 16, ky + 62], radius=12, fill=INK_800, outline=INK_700, width=1)
        draw.rounded_rectangle([26, ky + 10, 76, ky + 52], radius=6, fill=INK_700)
        draw.text((90, ky + 12), f"Mobile Take #{k+1}", fill=FG)
        draw.text((90, ky + 34), "0:45 • 60 FPS Android", fill=FG_MUTED)


def draw_bottom_timeline(draw: ImageDraw.ImageDraw, current_t: float, total_t: float):
    # Timeline background container (y = 860 to 1070)
    tl_x0, tl_y0, tl_x1, tl_y1 = 40, 850, WIDTH - 40, 1060
    draw.rounded_rectangle([tl_x0, tl_y0, tl_x1, tl_y1], radius=14, fill=INK_900, outline=INK_700, width=1)

    # Top toolbar of timeline
    draw.line([tl_x0, tl_y0 + 36, tl_x1, tl_y0 + 36], fill=INK_800, width=1)
    time_str = f"{int(current_t):02d}:{int((current_t % 1) * 100):02d} / 12:00"
    draw.text((tl_x0 + 16, tl_y0 + 10), f"▶ {time_str}", fill=FG)

    # Toolbar action buttons
    draw.text((tl_x0 + 180, tl_y0 + 10), "◆ +Keyframe", fill=ORANGE)
    draw.text((tl_x0 + 290, tl_y0 + 10), "✂ Split (S)", fill=FG_MUTED)
    draw.text((tl_x0 + 380, tl_y0 + 10), "T +Text", fill=PURPLE)
    draw.text((tl_x0 + 460, tl_y0 + 10), "🎵 +Music", fill=GREEN)
    draw.text((tl_x0 + 560, tl_y0 + 10), "⚡ Auto-Plot (Clicks & Typing)", fill=ORANGE_LIGHT)

    # Track area coordinates
    track_x0 = tl_x0 + 14
    track_x1 = tl_x1 - 14
    track_w = track_x1 - track_x0

    def t_to_x(sec: float) -> int:
        return int(track_x0 + (sec / total_t) * track_w)

    # Track 1: KEYFRAMES TRACK (Diamond nodes ◆)
    kf_y = tl_y0 + 48
    draw.rounded_rectangle([track_x0, kf_y, track_x1, kf_y + 24], radius=6, fill=INK_950)
    draw.text((track_x0 + 6, kf_y + 4), "KEYFRAMES", fill=FG_FAINT)

    # Plotted keyframes:
    # Iteration 1 (Click zoom): 0.8s (start), 1.2s (peak), 3.4s (hold), 4.0s (return)
    # Iteration 2 (Typing zoom): 4.6s (start), 5.0s (peak), 7.2s (hold), 8.0s (return)
    # Iteration 3 (Mobile zoom): 8.6s (start), 9.0s (peak), 11.2s (hold), 12.0s (return)
    all_keyframes = [0.8, 1.2, 3.4, 4.0, 4.6, 5.0, 7.2, 8.0, 8.6, 9.0, 11.2, 12.0]
    for kf_t in all_keyframes:
        kx = t_to_x(kf_t)
        ky = kf_y + 12
        # Draw diamond node
        draw.polygon([(kx, ky - 5), (kx + 5, ky), (kx, ky + 5), (kx - 5, ky)], fill=ORANGE, outline=WHITE)

    # Track 2: ZOOM BLOCKS TRACK
    zb_y = tl_y0 + 78
    draw.rounded_rectangle([track_x0, zb_y, track_x1, zb_y + 28], radius=6, fill=INK_950)
    draw.text((track_x0 + 6, zb_y + 6), "ZOOM BLOCKS", fill=FG_FAINT)

    zoom_spans = [
        (0.8, 4.0, "1.85x Zoom — Button Click (Hold 2.4s)"),
        (4.6, 8.0, "1.90x Zoom — Typing Input (Hold 2.4s)"),
        (8.6, 12.0, "1.85x Zoom — Android Touch (Hold 2.4s)"),
    ]
    for z_s, z_e, z_lbl in zoom_spans:
        bx0 = t_to_x(z_s)
        bx1 = t_to_x(z_e)
        draw.rounded_rectangle([bx0, zb_y + 2, bx1, zb_y + 26], radius=5, fill=(255, 122, 26, 80), outline=ORANGE, width=1)
        draw.text((bx0 + 8, zb_y + 6), z_lbl, fill=ORANGE_LIGHT)

    # Track 3: CLIPS TRACK
    cl_y = tl_y0 + 112
    draw.rounded_rectangle([track_x0, cl_y, track_x1, cl_y + 26], radius=6, fill=INK_950)
    draw.rounded_rectangle([t_to_x(0.0), cl_y + 2, t_to_x(8.0), cl_y + 24], radius=5, fill=INK_700, outline=INK_600)
    draw.text((t_to_x(0.0) + 12, cl_y + 5), "Desktop Screen Recording.webm", fill=FG)

    draw.rounded_rectangle([t_to_x(8.0), cl_y + 2, t_to_x(12.0), cl_y + 24], radius=5, fill=INK_700, outline=INK_600)
    draw.text((t_to_x(8.0) + 12, cl_y + 5), "Android Phone Capture.webm", fill=FG)

    # Track 4: INTERACTION EVENTS (Orange for Clicks, Cyan for Typing)
    ev_y = tl_y0 + 144
    draw.line([track_x0, ev_y + 5, track_x1, ev_y + 5], fill=INK_800, width=1)
    draw.text((track_x0 + 6, ev_y), "EVENTS", fill=FG_FAINT)
    # Clicks at 0.8s, 8.6s
    for c_t in [0.8, 8.6]:
        cx = t_to_x(c_t)
        draw.ellipse([cx - 4, ev_y + 1, cx + 4, ev_y + 9], fill=ORANGE)
    # Typing at 4.6s
    tx = t_to_x(4.6)
    draw.ellipse([tx - 4, ev_y + 1, tx + 4, ev_y + 9], fill=CYAN)

    # Playhead Scrubber line
    ph_x = t_to_x(current_t)
    draw.line([ph_x, tl_y0 + 36, ph_x, tl_y1 - 4], fill=ORANGE, width=2)
    # Playhead head marker
    draw.polygon([(ph_x - 6, tl_y0 + 36), (ph_x + 6, tl_y0 + 36), (ph_x, tl_y0 + 44)], fill=ORANGE)


def render_all_frames():
    output_dir = Path("/tmp/domolens_frames_v2")
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Pre-rendering base virtual canvases...")
    desktop_w, desktop_h = 1380, 700
    mobile_w, mobile_h = 420, 700

    print(f"Rendering {TOTAL_FRAMES} frames at {FPS} FPS (12.0s duration)...")

    for frame_idx in range(TOTAL_FRAMES):
        t = frame_idx / FPS  # 0.0 to 12.0
        img = Image.new("RGB", (WIDTH, HEIGHT), INK_950)
        draw = ImageDraw.Draw(img)

        # Background canvas styling
        for y_bg in range(0, HEIGHT, 20):
            grad_r = int(18 + 8 * (y_bg / HEIGHT))
            grad_g = int(20 + 8 * (y_bg / HEIGHT))
            grad_b = int(24 + 8 * (y_bg / HEIGHT))
            draw.rectangle([0, y_bg, WIDTH, y_bg + 20], fill=(grad_r, grad_g, grad_b))

        # === STAGE 1: DESKTOP BUTTON CLICK (0.0s - 4.0s) ===
        if t < 4.0:
            target_x, target_y = 930, 260  # "Publish Video" button center
            scale = 1.0
            zoom_x, zoom_y = desktop_w // 2, desktop_h // 2
            is_zoomed = False

            if 0.8 <= t < 1.2:
                # 400ms lead-in zoom
                prog = ease_in_out_cubic((t - 0.8) / 0.4)
                scale = 1.0 + 0.85 * prog
                zoom_x = (desktop_w // 2) + (target_x - desktop_w // 2) * prog
                zoom_y = (desktop_h // 2) + (target_y - desktop_h // 2) * prog
                is_zoomed = True
                cur_x, cur_y = int(zoom_x), int(zoom_y)
            elif 1.2 <= t < 3.4:
                # 2.2s steady hold at peak zoom: mouse moves and camera dynamically tracks it!
                scale = 1.85
                track_offset_x = int(45 * math.sin((t - 1.2) * 2.8))
                track_offset_y = int(14 * math.cos((t - 1.2) * 2.8))
                cur_x = target_x + track_offset_x
                cur_y = target_y + track_offset_y
                zoom_x, zoom_y = cur_x, cur_y
                is_zoomed = True
            elif 3.4 <= t < 4.0:
                # 600ms lead-out return to full screen 1.0x
                prog = ease_in_out_cubic((t - 3.4) / 0.6)
                scale = 1.85 - 0.85 * prog
                zoom_x = target_x + (desktop_w // 2 - target_x) * prog
                zoom_y = target_y + (desktop_h // 2 - target_y) * prog
                cur_x, cur_y = int(zoom_x), int(zoom_y)
                is_zoomed = True

            # Render desktop surface
            d_surf = Image.new("RGB", (desktop_w, desktop_h), INK_900)
            draw_desktop_content(ImageDraw.Draw(d_surf), desktop_w, desktop_h)

            view_w = int(desktop_w / scale)
            view_h = int(desktop_h / scale)
            crop_x0 = max(0, min(desktop_w - view_w, int(zoom_x - view_w / 2)))
            crop_y0 = max(0, min(desktop_h - view_h, int(zoom_y - view_h / 2)))

            cropped = d_surf.crop((crop_x0, crop_y0, crop_x0 + view_w, crop_y0 + view_h))
            rendered = cropped.resize((desktop_w, desktop_h), Image.Resampling.BILINEAR)

            paste_x, paste_y = 270, 100
            # Frame shadow
            draw.rounded_rectangle([paste_x - 6, paste_y - 6, paste_x + desktop_w + 6, paste_y + desktop_h + 6], radius=16, fill=(5, 5, 7))
            img.paste(rendered, (paste_x, paste_y))

            # Mouse cursor animation before click
            if t < 0.8:
                cm = ease_in_out_cubic(min(1.0, t / 0.7))
                cur_x = int(450 + (target_x - 450) * cm)
                cur_y = int(450 + (target_y - 450) * cm)

            scr_cx = int(paste_x + (cur_x - crop_x0) * (desktop_w / view_w))
            scr_cy = int(paste_y + (cur_y - crop_y0) * (desktop_h / view_h))

            # Click ripple on button
            if 0.8 <= t < 1.6:
                rip_t = (t - 0.8) / 0.8
                rip_r = int(rip_t * 50 * scale)
                draw.ellipse([scr_cx - rip_r, scr_cy - rip_r, scr_cx + rip_r, scr_cy + rip_r], outline=ORANGE, width=3)

            # Draw cursor pointer and focus tracking reticle
            if is_zoomed:
                draw.ellipse([scr_cx - 16, scr_cy - 16, scr_cx + 16, scr_cy + 16], outline=ORANGE_LIGHT, width=2)
            draw.polygon([(scr_cx, scr_cy), (scr_cx + 14, scr_cy + 14), (scr_cx + 5, scr_cy + 19)], fill=WHITE, outline=INK_950)

            # Badge with Live Tracking readout
            draw.rounded_rectangle([50, 36, 880, 80], radius=10, fill=INK_800, outline=ORANGE, width=2)
            draw.text((68, 48), "💻 COMPUTER DESKTOP — BUTTON CLICK (CAMERA ACTIVELY TRACKING MOUSE)", fill=ORANGE)
            if is_zoomed:
                draw.rounded_rectangle([1660, 36, 1870, 80], radius=10, fill=ORANGE)
                draw.text((1675, 48), f"🎯 {scale:.2f}x TRACKING", fill=INK_950)

        # === STAGE 2: DESKTOP TYPING ACTION (4.0s - 8.0s) ===
        elif t < 8.0:
            target_x, target_y = 420, 150  # Search Input target
            scale = 1.0
            zoom_x, zoom_y = desktop_w // 2, desktop_h // 2
            is_zoomed = False

            t_type = t - 4.0
            full_text = "DomoLens Screen AI"
            # Type characters progressively between 4.6s and 6.6s
            if t >= 4.6:
                chars_shown = min(len(full_text), int((t - 4.6) * 7))
                typed_str = full_text[:chars_shown]
            else:
                typed_str = ""

            # As characters are typed, the camera tracks the typing insertion cursor
            typing_offset_x = min(140, len(typed_str) * 8)
            current_target_x = target_x + typing_offset_x

            if 4.6 <= t < 5.0:
                prog = ease_in_out_cubic((t - 4.6) / 0.4)
                scale = 1.0 + 0.90 * prog
                zoom_x = (desktop_w // 2) + (target_x - desktop_w // 2) * prog
                zoom_y = (desktop_h // 2) + (target_y - desktop_h // 2) * prog
                is_zoomed = True
            elif 5.0 <= t < 7.2:
                # 2.2s steady hold at 1.90x tracking typing cursor
                scale = 1.90
                zoom_x = current_target_x
                zoom_y = target_y
                is_zoomed = True
            elif 7.2 <= t < 8.0:
                # 800ms lead-out return to full screen 1.0x
                prog = ease_in_out_cubic((t - 7.2) / 0.8)
                scale = 1.90 - 0.90 * prog
                zoom_x = current_target_x + (desktop_w // 2 - current_target_x) * prog
                zoom_y = target_y + (desktop_h // 2 - target_y) * prog
                is_zoomed = True

            d_surf = Image.new("RGB", (desktop_w, desktop_h), INK_900)
            draw_desktop_content(ImageDraw.Draw(d_surf), desktop_w, desktop_h, typed_text=typed_str)

            view_w = int(desktop_w / scale)
            view_h = int(desktop_h / scale)
            crop_x0 = max(0, min(desktop_w - view_w, int(zoom_x - view_w / 2)))
            crop_y0 = max(0, min(desktop_h - view_h, int(zoom_y - view_h / 2)))

            cropped = d_surf.crop((crop_x0, crop_y0, crop_x0 + view_w, crop_y0 + view_h))
            rendered = cropped.resize((desktop_w, desktop_h), Image.Resampling.BILINEAR)

            paste_x, paste_y = 270, 100
            draw.rounded_rectangle([paste_x - 6, paste_y - 6, paste_x + desktop_w + 6, paste_y + desktop_h + 6], radius=16, fill=(5, 5, 7))
            img.paste(rendered, (paste_x, paste_y))

            # Mouse cursor tracks typing line
            scr_cx = int(paste_x + (current_target_x - crop_x0) * (desktop_w / view_w))
            scr_cy = int(paste_y + (target_y - crop_y0) * (desktop_h / view_h))
            if is_zoomed:
                draw.ellipse([scr_cx - 16, scr_cy - 16, scr_cx + 16, scr_cy + 16], outline=CYAN, width=2)
            draw.polygon([(scr_cx, scr_cy), (scr_cx + 14, scr_cy + 14), (scr_cx + 5, scr_cy + 19)], fill=WHITE, outline=INK_950)

            # Badge
            draw.rounded_rectangle([50, 36, 880, 80], radius=10, fill=INK_800, outline=CYAN, width=2)
            draw.text((68, 48), "⌨️ COMPUTER DESKTOP — TYPING AUTO-ZOOM (TRACKING TEXT INSERTION)", fill=CYAN)
            if is_zoomed:
                draw.rounded_rectangle([1660, 36, 1870, 80], radius=10, fill=CYAN)
                draw.text((1675, 48), f"🎯 {scale:.2f}x TRACKING", fill=INK_950)

        # === STAGE 3: ANDROID MOBILE PHONE DEMO (8.0s - 12.0s) ===
        else:
            target_x, target_y = mobile_w // 2, 200  # Mobile Record target
            scale = 1.0
            zoom_x, zoom_y = mobile_w // 2, mobile_h // 2
            is_zoomed = False

            if 8.6 <= t < 9.0:
                # 400ms lead-in zoom
                prog = ease_in_out_cubic((t - 8.6) / 0.4)
                scale = 1.0 + 0.85 * prog
                zoom_x = (mobile_w // 2) + (target_x - mobile_w // 2) * prog
                zoom_y = (mobile_h // 2) + (target_y - mobile_h // 2) * prog
                is_zoomed = True
            elif 9.0 <= t < 11.2:
                # 2.2s steady hold at 1.85x with subtle organic touch tracking
                scale = 1.85
                mobile_track_x = int(20 * math.sin((t - 9.0) * 2.2))
                zoom_x = target_x + mobile_track_x
                zoom_y = target_y
                is_zoomed = True
            elif 11.2 <= t < 12.0:
                # 800ms lead-out return to full screen 1.0x
                prog = ease_in_out_cubic((t - 11.2) / 0.8)
                scale = 1.85 - 0.85 * prog
                zoom_x = target_x + (mobile_w // 2 - target_x) * prog
                zoom_y = target_y + (mobile_h // 2 - target_y) * prog
                is_zoomed = True

            m_surf = Image.new("RGB", (mobile_w, mobile_h), INK_900)
            draw_mobile_content(ImageDraw.Draw(m_surf), mobile_w, mobile_h)

            view_w = int(mobile_w / scale)
            view_h = int(mobile_h / scale)
            crop_x0 = max(0, min(mobile_w - view_w, int(zoom_x - view_w / 2)))
            crop_y0 = max(0, min(mobile_h - view_h, int(zoom_y - view_h / 2)))

            cropped = m_surf.crop((crop_x0, crop_y0, crop_x0 + view_w, crop_y0 + view_h))
            rendered = cropped.resize((mobile_w, mobile_h), Image.Resampling.BILINEAR)

            phone_x = (WIDTH - mobile_w) // 2
            phone_y = 100
            # Phone bevel
            draw.rounded_rectangle([phone_x - 12, phone_y - 12, phone_x + mobile_w + 12, phone_y + mobile_h + 12], radius=28, fill=(10, 10, 12), outline=INK_600, width=3)
            img.paste(rendered, (phone_x, phone_y))

            scr_tx = int(phone_x + (target_x - crop_x0) * (mobile_w / view_w))
            scr_ty = int(phone_y + (target_y - crop_y0) * (mobile_h / view_h))

            # Touch ripple at t >= 8.6s
            if 8.6 <= t < 9.4:
                rip_t = (t - 8.6) / 0.8
                rip_r = int(rip_t * 50 * scale)
                draw.ellipse([scr_tx - rip_r, scr_ty - rip_r, scr_tx + rip_r, scr_ty + rip_r], outline=ORANGE, width=3)

            # Touch indicator dot
            if t >= 8.5:
                draw.ellipse([scr_tx - 10, scr_ty - 10, scr_tx + 10, scr_ty + 10], fill=ORANGE_LIGHT, outline=WHITE, width=2)

            # Badge
            draw.rounded_rectangle([50, 36, 820, 80], radius=10, fill=INK_800, outline=ORANGE, width=2)
            draw.text((68, 48), "📱 ANDROID MOBILE PHONE — TOUCH TAP AUTO-ZOOM (HOLD 2.4S)", fill=ORANGE)
            if is_zoomed:
                draw.rounded_rectangle([1700, 36, 1870, 80], radius=10, fill=ORANGE)
                draw.text((1725, 48), f"{scale:.2f}x ZOOM", fill=INK_950)

        # Draw the synchronized bottom keyframe timeline across all frames!
        draw_bottom_timeline(draw, t, 12.0)

        # Save frame
        frame_path = output_dir / f"frame_{frame_idx:05d}.png"
        img.save(frame_path, "PNG")

        if frame_idx % 120 == 0:
            print(f"Rendered frame {frame_idx}/{TOTAL_FRAMES} ({frame_idx/TOTAL_FRAMES*100:.1f}%)")

    print("All 720 frames rendered! Encoding MP4 with FFmpeg at 60 FPS...")
    mp4_path = Path("/Users/arronkianparejas/domolens/public/domolens_smooth_autozoom_demo.mp4")
    mp4_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "/opt/homebrew/bin/ffmpeg",
        "-y",
        "-framerate", str(FPS),
        "-i", str(output_dir / "frame_%05d.png"),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "18",
        str(mp4_path),
    ]
    subprocess.run(cmd, check=True)
    print(f"SUCCESS! Video written to: {mp4_path}")

    # Copy to brain artifacts directory so user can view/download
    brain_artifact = Path("/Users/arronkianparejas/.gemini/antigravity/brain/81680c3c-8ea9-4969-abe7-e55589d85dce/domolens_smooth_autozoom_demo.mp4")
    shutil.copyfile(mp4_path, brain_artifact)
    print(f"Copied to brain artifact directory: {brain_artifact}")


if __name__ == "__main__":
    render_all_frames()
