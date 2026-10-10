use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, State};
use uuid::Uuid;




#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProjectSummary {
    pub id: String,
    pub name: String,
    pub source: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
    #[serde(rename = "durationMs")]
    pub duration_ms: Option<i64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub thumbnail: Option<String>,
    pub media: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GlobalClickPayload {
    pub x: f64,
    pub y: f64,
    pub norm_x: f64,
    pub norm_y: f64,
    pub screen_width: f64,
    pub screen_height: f64,
    pub button: String,
    pub timestamp_ms: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GlobalMouseMovePayload {
    pub x: f64,
    pub y: f64,
    pub norm_x: f64,
    pub norm_y: f64,
    pub timestamp_ms: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GlobalMouseUpPayload {
    pub x: f64,
    pub y: f64,
    pub norm_x: f64,
    pub norm_y: f64,
    pub button: String,
    pub timestamp_ms: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GlobalTypingPayload {
    pub x: f64,
    pub y: f64,
    pub norm_x: f64,
    pub norm_y: f64,
    pub timestamp_ms: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ScreenDimensions {
    pub width: f64,
    pub height: f64,
    pub scale_factor: f64,
}

#[derive(Default)]
pub struct AppState {
    pub projects: Mutex<Vec<ProjectSummary>>,
    pub is_recording: AtomicBool,
    pub is_paused: AtomicBool,
}

static RECORDING_ACTIVE: AtomicBool = AtomicBool::new(false);
static LAST_MOUSE_POS: Mutex<(f64, f64)> = Mutex::new((0.5, 0.5));
static LAST_MOVE_EMIT_MS: Mutex<i64> = Mutex::new(0);
static EVENT_TAP_PORT: Mutex<Option<usize>> = Mutex::new(None);
static CAPTURE_IN_PROGRESS: AtomicBool = AtomicBool::new(false);
static LAST_FRAME_CACHE: Mutex<Option<String>> = Mutex::new(None);
static CONSECUTIVE_CAPTURE_ERRORS: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);
static STREAM_SERVER_ACTIVE: AtomicBool = AtomicBool::new(false);
static ACTIVE_STREAM_URL: Mutex<Option<String>> = Mutex::new(None);
static STREAM_CHILD_PIDS: Mutex<Vec<u32>> = Mutex::new(Vec::new());

fn get_data_dir() -> PathBuf {
    if let Some(dirs) = directories::ProjectDirs::from("com", "domolens", "desktop") {
        let dir = dirs.data_dir().to_path_buf();
        let _ = fs::create_dir_all(&dir);
        dir
    } else if let Some(dirs) = directories::ProjectDirs::from("com", "domolens", "app") {
        let dir = dirs.data_dir().to_path_buf();
        let _ = fs::create_dir_all(&dir);
        dir
    } else {
        let dir = std::env::temp_dir().join("domolens");
        let _ = fs::create_dir_all(&dir);
        dir
    }
}

fn get_projects_file() -> PathBuf {
    get_data_dir().join("projects.json")
}

fn load_projects_from_disk() -> Vec<ProjectSummary> {
    let file = get_projects_file();
    if let Ok(data) = fs::read_to_string(file) {
        if let Ok(projects) = serde_json::from_str::<Vec<ProjectSummary>>(&data) {
            return projects;
        }
    }
    Vec::new()
}

fn save_projects_to_disk(projects: &[ProjectSummary]) {
    let file = get_projects_file();
    if let Ok(json) = serde_json::to_string_pretty(projects) {
        let _ = fs::write(file, json);
    }
}

fn build_tray_menu(
    app: &tauri::AppHandle,
    is_recording: bool,
    is_paused: bool,
    recent_projects: &[ProjectSummary],
) -> Result<Menu<tauri::Wry>, Box<dyn std::error::Error>> {
    let menu = Menu::new(app)?;

    // 1. Status header indicator
    let header_title = if is_recording {
        if is_paused {
            "⏸  DomoLens (Paused)"
        } else {
            "🔴  DomoLens (Recording...)"
        }
    } else {
        "DomoLens Studio"
    };
    let header_item = MenuItem::with_id(app, "status_info", header_title, false, None::<&str>)?;
    menu.append(&header_item)?;

    let sep1 = PredefinedMenuItem::separator(app)?;
    menu.append(&sep1)?;

    // 2. Primary Record action
    if is_recording {
        let stop_item = MenuItem::with_id(app, "stop_record", "⏹  Stop Recording", true, Some("Option+R"))?;
        menu.append(&stop_item)?;

        let pause_label = if is_paused { "▶  Resume Recording" } else { "⏸  Pause Recording" };
        let pause_item = MenuItem::with_id(app, "toggle_pause", pause_label, true, None::<&str>)?;
        menu.append(&pause_item)?;
    } else {
        let start_item = MenuItem::with_id(app, "start_record", "🔴  Start Recording", true, Some("Option+R"))?;
        menu.append(&start_item)?;
    }

    let sep2 = PredefinedMenuItem::separator(app)?;
    menu.append(&sep2)?;

    // 3. Studio / Editor
    let editor_item = MenuItem::with_id(app, "open_editor", "🎬  Open Studio Editor", true, Some("Option+E"))?;
    menu.append(&editor_item)?;

    let home_item = MenuItem::with_id(app, "open_home", "📋  All Recordings & Projects", true, None::<&str>)?;
    menu.append(&home_item)?;

    // 4. Recent Projects (up to 3)
    if !recent_projects.is_empty() {
        let sep3 = PredefinedMenuItem::separator(app)?;
        menu.append(&sep3)?;

        for proj in recent_projects.iter().take(3) {
            let label = if proj.name.len() > 24 {
                format!("  ▸ {}...", &proj.name[..21])
            } else {
                format!("  ▸ {}", proj.name)
            };
            let recent_item = MenuItem::with_id(app, format!("recent:{}", proj.id), label, true, None::<&str>)?;
            menu.append(&recent_item)?;
        }
    }

    let sep4 = PredefinedMenuItem::separator(app)?;
    menu.append(&sep4)?;

    // 5. Window & Update
    let show_win = MenuItem::with_id(app, "show_window", "🪟  Show DomoLens Window", true, None::<&str>)?;
    menu.append(&show_win)?;

    let check_updates = MenuItem::with_id(app, "check_updates", "🔄  Check for Updates...", true, None::<&str>)?;
    menu.append(&check_updates)?;

    let sep5 = PredefinedMenuItem::separator(app)?;
    menu.append(&sep5)?;

    // 6. Quit DomoLens
    let quit_item = MenuItem::with_id(app, "quit_app", "Quit DomoLens", true, Some("CmdOrControl+Q"))?;
    menu.append(&quit_item)?;

    Ok(menu)
}

fn update_tray_ui(app: &tauri::AppHandle, state: &AppState) {
    let is_rec = state.is_recording.load(Ordering::SeqCst);
    let is_paused = state.is_paused.load(Ordering::SeqCst);
    let mut projects = state.projects.lock().map(|p| p.clone()).unwrap_or_default();
    if projects.is_empty() {
        projects = load_projects_from_disk();
    }
    projects.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    if let Some(tray) = app.tray_by_id("main-tray") {
        if let Ok(menu) = build_tray_menu(app, is_rec, is_paused, &projects) {
            let _ = tray.set_menu(Some(menu));
        }

        if is_rec {
            let _ = tray.set_tooltip(Some("DomoLens - Recording in progress..."));
            if let Ok(icon) = tauri::image::Image::from_bytes(include_bytes!("../icons/tray-recording@2x.png")) {
                let _ = tray.set_icon(Some(icon));
                let _ = tray.set_icon_as_template(false);
            }
        } else {
            let _ = tray.set_tooltip(Some("DomoLens - Screen Recorder & Studio"));
            if let Ok(icon) = tauri::image::Image::from_bytes(include_bytes!("../icons/tray-mac@2x.png")) {
                let _ = tray.set_icon(Some(icon));
                #[cfg(target_os = "macos")]
                let _ = tray.set_icon_as_template(true);
            }
        }
    }
}

fn handle_tray_menu_action(app: &tauri::AppHandle, id: &str) {
    match id {
        "start_record" => {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unminimize();
                let _ = win.show();
                let _ = win.set_focus();
            }
            let _ = app.emit("domolens://menu-action", "start_recording");
        }
        "stop_record" => {
            let _ = app.emit("domolens://menu-action", "stop_recording");
        }
        "toggle_pause" => {
            let _ = app.emit("domolens://menu-action", "toggle_pause");
        }
        "open_editor" => {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unminimize();
                let _ = win.show();
                let _ = win.set_focus();
            }
            let _ = app.emit("domolens://menu-action", "open_editor");
        }
        "open_home" => {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unminimize();
                let _ = win.show();
                let _ = win.set_focus();
            }
            let _ = app.emit("domolens://menu-action", "open_home");
        }
        "show_window" => {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unminimize();
                let _ = win.show();
                let _ = win.set_focus();
            }
        }
        "check_updates" => {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unminimize();
                let _ = win.show();
                let _ = win.set_focus();
            }
            let _ = app.emit("domolens://menu-action", "check_updates");
        }
        "quit_app" => {
            app.exit(0);
        }
        other if other.starts_with("recent:") => {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unminimize();
                let _ = win.show();
                let _ = win.set_focus();
            }
            let _ = app.emit("domolens://menu-action", other);
        }
        _ => {}
    }
}

fn setup_tray_icon(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle();
    let initial_projects = load_projects_from_disk();
    let menu = build_tray_menu(&handle, false, false, &initial_projects)?;
    let icon_bytes = include_bytes!("../icons/tray-mac@2x.png");
    let icon = tauri::image::Image::from_bytes(icon_bytes)?;

    let mut builder = TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .menu(&menu)
        .tooltip("DomoLens - Screen Recorder & Studio")
        .show_menu_on_left_click(true);

    #[cfg(target_os = "macos")]
    {
        builder = builder.icon_as_template(true);
    }

    let _tray = builder
        .on_menu_event(|app, event| {
            handle_tray_menu_action(app, event.id().as_ref());
        })
        .on_tray_icon_event(|_tray, event| {
            if let TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, button_state: tauri::tray::MouseButtonState::Up, .. } = event {
                #[cfg(not(target_os = "macos"))]
                {
                    let app = _tray.app_handle();
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.unminimize();
                        let _ = win.show();
                        let _ = win.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}


fn get_full_project_file(id: &str) -> PathBuf {
    let dir = get_data_dir().join("projects");
    let _ = fs::create_dir_all(&dir);
    dir.join(format!("{}.json", id))
}

#[tauri::command]
fn save_full_project(id: String, project_json: String) -> Result<(), String> {
    let file = get_full_project_file(&id);
    fs::write(file, project_json).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_full_project(id: String) -> Result<Option<String>, String> {
    let file = get_full_project_file(&id);
    if file.exists() {
        let content = fs::read_to_string(file).map_err(|e| e.to_string())?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

fn get_screen_size(app_handle: &tauri::AppHandle) -> (f64, f64) {
    if let Ok(Some(monitor)) = app_handle.primary_monitor() {
        let scale = monitor.scale_factor();
        let size = monitor.size();
        #[cfg(target_os = "macos")]
        {
            let w = size.width as f64 / scale;
            let h = size.height as f64 / scale;
            (w.max(1.0), h.max(1.0))
        }
        #[cfg(not(target_os = "macos"))]
        {
            (size.width as f64, size.height as f64)
        }
    } else {
        (1920.0, 1080.0)
    }
}

#[cfg(unix)]
fn kill_pid(pid: u32) {
    unsafe {
        libc::kill(pid as i32, libc::SIGTERM);
    }
    for _ in 0..5 {
        std::thread::sleep(std::time::Duration::from_millis(40));
        let is_alive = unsafe { libc::kill(pid as i32, 0) == 0 };
        if !is_alive {
            return;
        }
    }
    unsafe {
        libc::kill(pid as i32, libc::SIGKILL);
    }
}

#[cfg(not(unix))]
fn kill_pid(pid: u32) {
    let _ = std::process::Command::new("taskkill")
        .args(&["/F", "/PID", &pid.to_string()])
        .output();
}

/// Ensures only a single instance of DomoLens runs at any time.
/// If an existing instance is running, terminates it immediately so the new instance takes over.
fn ensure_single_instance_and_replace_previous() {
    let my_pid = std::process::id();
    let pid_file = get_data_dir().join("domolens.pid");

    if let Ok(content) = fs::read_to_string(&pid_file) {
        if let Ok(old_pid) = content.trim().parse::<u32>() {
            if old_pid != my_pid {
                kill_pid(old_pid);
            }
        }
    }

    #[cfg(unix)]
    {
        for proc_name in &["domolens", "DomoLens"] {
            if let Ok(output) = std::process::Command::new("pgrep").arg("-x").arg(proc_name).output() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    if let Ok(pid) = line.trim().parse::<u32>() {
                        if pid != my_pid {
                            kill_pid(pid);
                        }
                    }
                }
            }
        }
    }

    #[cfg(windows)]
    {
        let _ = std::process::Command::new("taskkill")
            .args(&["/F", "/FI", &format!("PID ne {}", my_pid), "/IM", "domolens.exe"])
            .output();
    }

    let _ = fs::write(&pid_file, my_pid.to_string());
}

#[tauri::command]
fn list_projects(state: State<'_, AppState>) -> Result<Vec<ProjectSummary>, String> {
    let mut list = state.projects.lock().map_err(|e| e.to_string())?;
    if list.is_empty() {
        *list = load_projects_from_disk();
    }
    list.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(list.clone())
}

#[tauri::command]
fn save_project(
    project: ProjectSummary,
    state: State<'_, AppState>,
) -> Result<ProjectSummary, String> {
    let mut list = state.projects.lock().map_err(|e| e.to_string())?;
    list.retain(|p| p.id != project.id && p.name != project.name);
    list.insert(0, project.clone());
    save_projects_to_disk(&list);
    Ok(project)
}

#[tauri::command]
fn save_recording_file(
    id: String,
    data: Vec<u8>,
    ext: String,
) -> Result<String, String> {
    let rec_dir = get_data_dir().join("recordings");
    let _ = fs::create_dir_all(&rec_dir);
    let safe_ext = if ext.is_empty() { "mp4".to_string() } else { ext };
    let file_path = rec_dir.join(format!("{}.{}", id, safe_ext));
    fs::write(&file_path, data).map_err(|e| e.to_string())?;
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn get_default_downloads_dir() -> Result<String, String> {
    if let Some(user_dirs) = directories::UserDirs::new() {
        if let Some(download_dir) = user_dirs.download_dir() {
            return Ok(download_dir.to_string_lossy().to_string());
        }
    }
    let fallback = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map(|h| PathBuf::from(h).join("Downloads"))
        .unwrap_or_else(|_| PathBuf::from("."));
    Ok(fallback.to_string_lossy().to_string())
}

#[tauri::command]
fn get_default_export_path(filename: String) -> Result<String, String> {
    let download_dir = if let Some(user_dirs) = directories::UserDirs::new() {
        user_dirs.download_dir().map(|p| p.to_path_buf())
    } else {
        None
    };

    let base_dir = download_dir.unwrap_or_else(|| {
        std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .map(|h| PathBuf::from(h).join("Downloads"))
            .unwrap_or_else(|_| PathBuf::from("."))
    });

    let _ = fs::create_dir_all(&base_dir);
    let full_path = base_dir.join(filename);
    Ok(full_path.to_string_lossy().to_string())
}

fn find_ffmpeg() -> Option<PathBuf> {
    if let Ok(output) = std::process::Command::new("ffmpeg").arg("-version").output() {
        if output.status.success() {
            return Some(PathBuf::from("ffmpeg"));
        }
    }
    for p in &[
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
        "/usr/bin/ffmpeg",
    ] {
        let path = PathBuf::from(p);
        if path.exists() {
            return Some(path);
        }
    }
    #[cfg(target_os = "windows")]
    {
        for p in &[
            "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
            "C:\\ffmpeg\\bin\\ffmpeg.exe",
        ] {
            let path = PathBuf::from(p);
            if path.exists() {
                return Some(path);
            }
        }
    }
    None
}

#[tauri::command]
fn save_exported_video(
    destination_path: String,
    data: Vec<u8>,
) -> Result<String, String> {
    if data.is_empty() {
        return Err("Export failed: video data is empty (0 bytes)".to_string());
    }

    let path = PathBuf::from(&destination_path);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let lower_dest = destination_path.to_lowercase();
    let is_mov = lower_dest.ends_with(".mov");
    let is_mp4 = lower_dest.ends_with(".mp4");

    let is_webm_data = data.len() >= 4 && data[0] == 0x1A && data[1] == 0x45 && data[2] == 0xDF && data[3] == 0xA3;
    let is_mp4_data = data.len() >= 8 && &data[4..8] == b"ftyp";

    if let Some(ffmpeg_bin) = find_ffmpeg() {
        if is_webm_data && (is_mp4 || is_mov) {
            let temp_in = get_data_dir().join(format!("temp_export_in_{}.webm", Uuid::new_v4()));
            let _ = fs::write(&temp_in, &data);

            let mut cmd = std::process::Command::new(&ffmpeg_bin);
            cmd.arg("-y")
                .arg("-i")
                .arg(&temp_in)
                .arg("-c:v")
                .arg("libx264")
                .arg("-pix_fmt")
                .arg("yuv420p")
                .arg("-preset")
                .arg("fast")
                .arg("-c:a")
                .arg("aac")
                .arg("-b:a")
                .arg("192k");

            if is_mp4 {
                cmd.arg("-movflags").arg("+faststart");
            }

            cmd.arg(&path);

            let res = cmd.output();
            let _ = fs::remove_file(&temp_in);

            if let Ok(output) = res {
                if output.status.success() && path.exists() {
                    return Ok(destination_path);
                }
            }
        } else if is_mp4_data && is_mov {
            let temp_in = get_data_dir().join(format!("temp_export_in_{}.mp4", Uuid::new_v4()));
            let _ = fs::write(&temp_in, &data);

            let mut cmd = std::process::Command::new(&ffmpeg_bin);
            cmd.arg("-y")
                .arg("-i")
                .arg(&temp_in)
                .arg("-c:v")
                .arg("copy")
                .arg("-c:a")
                .arg("copy")
                .arg(&path);

            let res = cmd.output();
            let _ = fs::remove_file(&temp_in);

            if let Ok(output) = res {
                if output.status.success() && path.exists() {
                    return Ok(destination_path);
                }
            }
        }
    }

    fs::write(&path, data).map_err(|e| format!("Failed to write video file to {}: {}", destination_path, e))?;
    Ok(destination_path)
}

#[tauri::command]
fn export_source_video_file(
    source_path: String,
    destination_path: String,
) -> Result<String, String> {
    let src = PathBuf::from(&source_path);
    if !src.exists() {
        return Err(format!("Source video file not found at: {}", source_path));
    }
    let dest = PathBuf::from(&destination_path);
    if let Some(parent) = dest.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let lower_dest = destination_path.to_lowercase();
    let is_mov = lower_dest.ends_with(".mov");
    let is_mp4 = lower_dest.ends_with(".mp4");

    if let Some(ffmpeg_bin) = find_ffmpeg() {
        if is_mov {
            let mut cmd = std::process::Command::new(&ffmpeg_bin);
            cmd.arg("-y")
                .arg("-i")
                .arg(&src)
                .arg("-c:v")
                .arg("copy")
                .arg("-c:a")
                .arg("copy")
                .arg(&dest);

            if let Ok(output) = cmd.output() {
                if output.status.success() && dest.exists() {
                    return Ok(destination_path);
                }
            }
        } else if is_mp4 {
            let mut cmd = std::process::Command::new(&ffmpeg_bin);
            cmd.arg("-y")
                .arg("-i")
                .arg(&src)
                .arg("-c:v")
                .arg("copy")
                .arg("-c:a")
                .arg("copy")
                .arg("-movflags")
                .arg("+faststart")
                .arg(&dest);

            if let Ok(output) = cmd.output() {
                if output.status.success() && dest.exists() {
                    return Ok(destination_path);
                }
            }
        }
    }

    fs::copy(&src, &dest).map_err(|e| format!("Failed to export video to {}: {}", destination_path, e))?;
    Ok(destination_path)
}

#[tauri::command]
fn show_item_in_folder(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer")
            .args([&format!("/select,\"{}\"", path)])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        if let Some(parent) = p.parent() {
            let _ = std::process::Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn import_video(
    path: String,
    state: State<'_, AppState>,
) -> Result<ProjectSummary, String> {
    let source_path = Path::new(&path);
    if !source_path.exists() {
        return Err("Source video file does not exist".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let name = source_path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "Imported video".to_string());

    let now = chrono::Utc::now().timestamp_millis();

    let project = ProjectSummary {
        id: id.clone(),
        name: name.clone(),
        source: "import".to_string(),
        created_at: now,
        updated_at: now,
        duration_ms: None,
        width: None,
        height: None,
        thumbnail: None,
        media: Some(path.clone()),
    };

    let mut list = state.projects.lock().map_err(|e| e.to_string())?;
    list.retain(|p| p.media.as_deref() != Some(&path) && p.name != name);
    list.insert(0, project.clone());
    save_projects_to_disk(&list);

    Ok(project)
}

#[tauri::command]
fn rename_project(
    id: String,
    name: String,
    state: State<'_, AppState>,
) -> Result<ProjectSummary, String> {
    let mut list = state.projects.lock().map_err(|e| e.to_string())?;
    if let Some(p) = list.iter_mut().find(|p| p.id == id) {
        p.name = name.clone();
        p.updated_at = chrono::Utc::now().timestamp_millis();
        let updated = p.clone();
        save_projects_to_disk(&list);

        let full_file = get_full_project_file(&id);
        if full_file.exists() {
            if let Ok(mut json_val) = fs::read_to_string(&full_file).and_then(|s| {
                serde_json::from_str::<serde_json::Value>(&s).map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
            }) {
                if let Some(summary_val) = json_val.get_mut("summary") {
                    summary_val["name"] = serde_json::Value::String(name);
                    summary_val["updatedAt"] = serde_json::Value::Number(serde_json::Number::from(updated.updated_at));
                }
                if let Ok(serialized) = serde_json::to_string_pretty(&json_val) {
                    let _ = fs::write(&full_file, serialized);
                }
            }
        }

        Ok(updated)
    } else {
        Err("Project not found".to_string())
    }
}

#[tauri::command]
fn delete_project(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut list = state.projects.lock().map_err(|e| e.to_string())?;
    list.retain(|p| p.id != id);
    save_projects_to_disk(&list);

    let full_file = get_full_project_file(&id);
    if full_file.exists() {
        let _ = fs::remove_file(full_file);
    }

    Ok(())
}

#[tauri::command]
fn read_media_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| e.to_string())
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AdbDeviceInfo {
    pub serial: String,
    pub state: String,
    pub model: String,
    pub product: String,
    pub width: u32,
    pub height: u32,
    pub is_wireless: bool,
}

fn find_adb_binary() -> Option<PathBuf> {
    if let Ok(output) = std::process::Command::new("adb").arg("version").output() {
        if output.status.success() {
            return Some(PathBuf::from("adb"));
        }
    }

    let home = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")).unwrap_or_default();
    let candidates = vec![
        PathBuf::from(&home).join("Library/Android/sdk/platform-tools/adb"),
        PathBuf::from("/opt/homebrew/bin/adb"),
        PathBuf::from("/usr/local/bin/adb"),
        PathBuf::from("/usr/bin/adb"),
        PathBuf::from(&home).join("AppData/Local/Android/Sdk/platform-tools/adb.exe"),
    ];

    for c in candidates {
        if c.exists() {
            return Some(c);
        }
    }
    None
}

#[tauri::command]
fn get_adb_devices() -> Result<Vec<AdbDeviceInfo>, String> {
    let adb_path = match find_adb_binary() {
        Some(p) => p,
        None => return Ok(Vec::new()),
    };

    let output = std::process::Command::new(&adb_path)
        .arg("devices")
        .arg("-l")
        .output()
        .map_err(|e| format!("Failed to run adb: {}", e))?;

    if !output.status.success() {
        return Ok(Vec::new());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut raw_devices = Vec::new();

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("List of devices") || trimmed.starts_with("* daemon") {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() < 2 {
            continue;
        }

        let serial = parts[0].to_string();
        let state = parts[1].to_string();

        // Strictly ignore dead or offline devices
        if state == "offline" {
            continue;
        }

        let is_wireless = serial.contains(':')
            || serial.contains("._tcp")
            || serial.contains("._adb")
            || serial.starts_with("adb-")
            || serial.contains("tls");

        let mut model = if is_wireless { "Wireless Android Device".to_string() } else { "Android Phone".to_string() };
        let mut product = "Android".to_string();

        for part in &parts[2..] {
            if let Some(m) = part.strip_prefix("model:") {
                model = m.replace('_', " ");
            } else if let Some(p) = part.strip_prefix("product:") {
                product = p.to_string();
            }
        }

        let mut width = 1080;
        let mut height = 2400;

        if state == "device" {
            if let Ok(wm_out) = std::process::Command::new(&adb_path)
                .args(["-s", &serial, "shell", "wm", "size"])
                .output()
            {
                let wm_str = String::from_utf8_lossy(&wm_out.stdout);
                for wline in wm_str.lines() {
                    if let Some(pos) = wline.find(':') {
                        let size_part = wline[pos + 1..].trim();
                        let dims: Vec<&str> = size_part.split('x').collect();
                        if dims.len() == 2 {
                            if let (Ok(w), Ok(h)) = (dims[0].trim().parse::<u32>(), dims[1].trim().parse::<u32>()) {
                                width = w;
                                height = h;
                            }
                        }
                    }
                }
            }

            if let Ok(brand_out) = std::process::Command::new(&adb_path)
                .args(["-s", &serial, "shell", "getprop", "ro.product.brand"])
                .output()
            {
                let brand = String::from_utf8_lossy(&brand_out.stdout).trim().to_string();
                if !brand.is_empty() && !model.to_lowercase().contains(&brand.to_lowercase()) {
                    model = format!("{} {}", brand, model);
                }
            }
        }

        raw_devices.push(AdbDeviceInfo {
            serial,
            state,
            model,
            product,
            width,
            height,
            is_wireless,
        });
    }

    // Prioritize: authorized online devices first, and direct USB cable before wireless
    raw_devices.sort_by(|a, b| {
        let a_score = (if a.state == "device" { 10 } else { 0 }) + (if !a.is_wireless { 5 } else { 0 });
        let b_score = (if b.state == "device" { 10 } else { 0 }) + (if !b.is_wireless { 5 } else { 0 });
        b_score.cmp(&a_score)
    });

    // Deduplicate: if multiple connections exist for the same physical phone, keep the highest priority
    let mut devices: Vec<AdbDeviceInfo> = Vec::new();
    for dev in raw_devices {
        let is_dup = devices.iter().any(|existing| {
            existing.model == dev.model && existing.width == dev.width && existing.height == dev.height
        });
        if !is_dup {
            devices.push(dev);
        }
    }

    Ok(devices)
}

#[tauri::command]
fn connect_wireless_adb(address: String) -> Result<String, String> {
    let adb_path = find_adb_binary().ok_or_else(|| "ADB not found. Please install Android Platform Tools.".to_string())?;

    let output = std::process::Command::new(&adb_path)
        .arg("connect")
        .arg(&address)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let combined = format!("{}\n{}", stdout, stderr);

    if combined.to_lowercase().contains("connected") || combined.to_lowercase().contains("already") {
        Ok(combined.trim().to_string())
    } else {
        Err(combined.trim().to_string())
    }
}

#[tauri::command]
fn pair_wireless_adb(address: String, code: String) -> Result<String, String> {
    let adb_path = find_adb_binary().ok_or_else(|| "ADB not found. Please install Android Platform Tools.".to_string())?;

    let output = std::process::Command::new(&adb_path)
        .arg("pair")
        .arg(&address)
        .arg(&code)
        .output()
        .map_err(|e| e.to_string())?;

    let combined = format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    let lower = combined.to_lowercase();
    if lower.contains("successfully") || lower.contains("already") {
        Ok(combined.trim().to_string())
    } else {
        Err(combined.trim().to_string())
    }
}

#[tauri::command]
fn restart_adb_server() -> Result<String, String> {
    let adb_path = find_adb_binary().ok_or_else(|| "ADB not found".to_string())?;
    let _ = std::process::Command::new(&adb_path).arg("kill-server").output();
    let _ = std::process::Command::new(&adb_path).arg("start-server").output();
    let _ = std::process::Command::new(&adb_path).arg("devices").output();
    Ok("ADB server restarted".to_string())
}

#[tauri::command]
fn capture_device_frame(serial: String) -> Result<String, String> {
    // If a capture is already executing, return the cached previous frame immediately!
    // This strictly prevents subprocess stacking and keeps CPU low.
    if CAPTURE_IN_PROGRESS.compare_exchange(false, true, std::sync::atomic::Ordering::SeqCst, std::sync::atomic::Ordering::SeqCst).is_err() {
        if let Ok(guard) = LAST_FRAME_CACHE.lock() {
            if let Some(ref cached) = *guard {
                return Ok(cached.clone());
            }
        }
        return Err("Busy".to_string());
    }

    struct CaptureGuard;
    impl Drop for CaptureGuard {
        fn drop(&mut self) {
            CAPTURE_IN_PROGRESS.store(false, std::sync::atomic::Ordering::SeqCst);
        }
    }
    let _guard = CaptureGuard;

    let adb_path = find_adb_binary().ok_or_else(|| "ADB not found".to_string())?;

    let output = std::process::Command::new(&adb_path)
        .args(["-s", &serial, "exec-out", "screencap", "-p"])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() || output.stdout.is_empty() {
        let err_count = CONSECUTIVE_CAPTURE_ERRORS.fetch_add(1, std::sync::atomic::Ordering::SeqCst) + 1;
        if err_count <= 2 {
            if let Ok(guard) = LAST_FRAME_CACHE.lock() {
                if let Some(ref cached) = *guard {
                    return Ok(cached.clone());
                }
            }
        }
        if let Ok(mut guard) = LAST_FRAME_CACHE.lock() {
            *guard = None;
        }
        return Err("Device connection lost or offline".to_string());
    }

    CONSECUTIVE_CAPTURE_ERRORS.store(0, std::sync::atomic::Ordering::SeqCst);

    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&output.stdout);
    let data_url = format!("data:image/png;base64,{}", b64);

    if let Ok(mut guard) = LAST_FRAME_CACHE.lock() {
        *guard = Some(data_url.clone());
    }

    Ok(data_url)
}

#[tauri::command]
fn send_device_tap(serial: String, x: u32, y: u32) -> Result<(), String> {
    let adb_path = find_adb_binary().ok_or_else(|| "ADB not found".to_string())?;

    let _ = std::process::Command::new(&adb_path)
        .args(["-s", &serial, "shell", "input", "tap", &x.to_string(), &y.to_string()])
        .spawn();

    Ok(())
}

#[tauri::command]
fn keep_device_alive(serial: String) -> Result<(), String> {
    if let Some(adb_path) = find_adb_binary() {
        let _ = std::process::Command::new(&adb_path)
            .args(["-s", &serial, "shell", "input", "keyevent", "224"])
            .spawn();
    }
    Ok(())
}

fn find_ffmpeg_binary() -> Option<PathBuf> {
    if let Ok(p) = std::env::var("FFMPEG_PATH") {
        let pb = PathBuf::from(p);
        if pb.exists() {
            return Some(pb);
        }
    }
    let candidates = [
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
        "/usr/bin/ffmpeg",
    ];
    for c in &candidates {
        let pb = PathBuf::from(c);
        if pb.exists() {
            return Some(pb);
        }
    }
    if let Ok(out) = std::process::Command::new("which").arg("ffmpeg").output() {
        if out.status.success() {
            let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !s.is_empty() {
                return Some(PathBuf::from(s));
            }
        }
    }
    None
}

#[tauri::command]
fn stop_mobile_stream() -> Result<(), String> {
    STREAM_SERVER_ACTIVE.store(false, Ordering::SeqCst);
    if let Ok(mut url_guard) = ACTIVE_STREAM_URL.lock() {
        *url_guard = None;
    }
    if let Ok(mut pids) = STREAM_CHILD_PIDS.lock() {
        for pid in pids.drain(..) {
            #[cfg(unix)]
            unsafe {
                libc::kill(pid as i32, libc::SIGKILL);
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn start_mobile_stream(serial: String, width: Option<u32>, height: Option<u32>) -> Result<String, String> {
    let _ = stop_mobile_stream();

    let adb_path = find_adb_binary().ok_or_else(|| "ADB binary not found".to_string())?;
    let ffmpeg_path = find_ffmpeg_binary().ok_or_else(|| "FFmpeg not found. Please install FFmpeg (brew install ffmpeg)".to_string())?;

    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Failed to bind stream listener: {}", e))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let stream_url = format!("http://127.0.0.1:{}/live.mjpg", port);

    if let Ok(mut url_guard) = ACTIVE_STREAM_URL.lock() {
        *url_guard = Some(stream_url.clone());
    }
    STREAM_SERVER_ACTIVE.store(true, Ordering::SeqCst);

    let _ = listener.set_nonblocking(true);

    let (target_w, target_h) = match (width, height) {
        (Some(w), Some(h)) if w > 0 && h > 0 => {
            if w > 720 {
                let scaled_h = ((h as f64 / w as f64) * 720.0).round() as u32;
                (720, (scaled_h / 2) * 2)
            } else {
                ((w / 2) * 2, (h / 2) * 2)
            }
        }
        _ => (720, 1560),
    };
    let size_arg = format!("{}x{}", target_w, target_h);

    // Automatically enable native touch visualization on the mobile screen
    let _ = std::process::Command::new(&adb_path)
        .args(["-s", &serial, "shell", "settings", "put", "system", "show_touches", "1"])
        .status();

    let serial_clone = serial.clone();
    let adb_clone = adb_path.clone();
    let ffmpeg_clone = ffmpeg_path.clone();

    std::thread::spawn(move || {
        while STREAM_SERVER_ACTIVE.load(Ordering::SeqCst) {
            match listener.accept() {
                Ok((mut socket, _)) => {
                    let serial_sub = serial_clone.clone();
                    let adb_sub = adb_clone.clone();
                    let ffmpeg_sub = ffmpeg_clone.clone();
                    let size_sub = size_arg.clone();

                    std::thread::spawn(move || {
                        let mut req_buf = [0u8; 1024];
                        let _ = socket.read(&mut req_buf);

                        let header = "HTTP/1.1 200 OK\r\nContent-Type: multipart/x-mixed-replace; boundary=ffmpeg\r\nCache-Control: no-cache, no-store, must-revalidate\r\nPragma: no-cache\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n";
                        if socket.write_all(header.as_bytes()).is_err() {
                            return;
                        }

                        while STREAM_SERVER_ACTIVE.load(Ordering::SeqCst) {
                            let adb_child = match std::process::Command::new(&adb_sub)
                                .args([
                                    "-s", &serial_sub,
                                    "exec-out",
                                    "screenrecord",
                                    "--output-format=h264",
                                    "--size", &size_sub,
                                    "--bit-rate", "4000000",
                                    "--time-limit", "180",
                                    "-"
                                ])
                                .stdout(std::process::Stdio::piped())
                                .stderr(std::process::Stdio::null())
                                .spawn()
                            {
                                Ok(c) => c,
                                Err(e) => {
                                    eprintln!("[mobile_stream] Failed to spawn adb screenrecord: {}", e);
                                    break;
                                }
                            };

                            let adb_pid = adb_child.id();
                            let adb_stdout = match adb_child.stdout {
                                Some(s) => s,
                                None => break,
                            };

                            if let Ok(mut pids) = STREAM_CHILD_PIDS.lock() {
                                pids.push(adb_pid);
                            }

                            let mut ffmpeg_child = match std::process::Command::new(&ffmpeg_sub)
                                .args([
                                    "-f", "h264",
                                    "-i", "pipe:0",
                                    "-vf", "format=yuvj420p",
                                    "-c:v", "mjpeg",
                                    "-q:v", "4",
                                    "-f", "mpjpeg",
                                    "-"
                                ])
                                .stdin(adb_stdout)
                                .stdout(std::process::Stdio::piped())
                                .stderr(std::process::Stdio::null())
                                .spawn()
                            {
                                Ok(c) => c,
                                Err(e) => {
                                    eprintln!("[mobile_stream] Failed to spawn ffmpeg: {}", e);
                                    #[cfg(unix)]
                                    unsafe {
                                        libc::kill(adb_pid as i32, libc::SIGKILL);
                                    }
                                    break;
                                }
                            };

                            let ffmpeg_pid = ffmpeg_child.id();
                            if let Ok(mut pids) = STREAM_CHILD_PIDS.lock() {
                                pids.push(ffmpeg_pid);
                            }

                            let mut socket_disconnected = false;
                            if let Some(mut ffmpeg_out) = ffmpeg_child.stdout.take() {
                                let mut buf = [0u8; 8192];
                                while STREAM_SERVER_ACTIVE.load(Ordering::SeqCst) {
                                    match ffmpeg_out.read(&mut buf) {
                                        Ok(0) => break,
                                        Ok(n) => {
                                            if socket.write_all(&buf[..n]).is_err() {
                                                socket_disconnected = true;
                                                break;
                                            }
                                        }
                                        Err(_) => break,
                                    }
                                }
                            }

                            #[cfg(unix)]
                            unsafe {
                                libc::kill(adb_pid as i32, libc::SIGKILL);
                                libc::kill(ffmpeg_pid as i32, libc::SIGKILL);
                            }

                            if socket_disconnected || !STREAM_SERVER_ACTIVE.load(Ordering::SeqCst) {
                                break;
                            }
                        }
                    });
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
                Err(_) => {
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
            }
        }
    });

    Ok(stream_url)
}

#[tauri::command]
fn get_mobile_stream_url() -> Result<Option<String>, String> {
    if let Ok(guard) = ACTIVE_STREAM_URL.lock() {
        Ok(guard.clone())
    } else {
        Ok(None)
    }
}


#[tauri::command]
fn show_recording_hud(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(main_win) = app_handle.get_webview_window("main") {
        let _ = main_win.minimize();
    }
    if let Some(hud_win) = app_handle.get_webview_window("hud") {
        if let Ok(Some(monitor)) = app_handle.primary_monitor() {
            let scale = monitor.scale_factor();
            let size = monitor.size();
            let screen_w = size.width as f64 / scale;
            let screen_h = size.height as f64 / scale;
            let hud_w = 560.0;
            let hud_h = 76.0;
            let x = ((screen_w - hud_w) / 2.0).max(0.0);
            let y = (screen_h - hud_h - 36.0).max(0.0);
            let _ = hud_win.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }));
        }
        let _ = hud_win.set_always_on_top(true);
        #[cfg(target_os = "macos")]
        {
            let _ = hud_win.set_visible_on_all_workspaces(true);
        }
        let _ = hud_win.show();
        let _ = hud_win.set_focus();
    }
    Ok(())
}

#[tauri::command]
fn hide_recording_hud(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(hud_win) = app_handle.get_webview_window("hud") {
        let _ = hud_win.hide();
    }
    if let Some(main_win) = app_handle.get_webview_window("main") {
        let _ = main_win.unminimize();
        let _ = main_win.show();
        let _ = main_win.set_focus();
    }
    Ok(())
}

#[tauri::command]
fn set_recording_hud_mode(app_handle: tauri::AppHandle, floating: bool) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.set_always_on_top(floating);
    }
    Ok(())
}

#[tauri::command]
fn drag_window(window: tauri::Window) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

#[tauri::command]
fn check_accessibility_permission() -> bool {
    #[cfg(target_os = "macos")]
    {
        extern "C" {
            fn AXIsProcessTrusted() -> bool;
        }
        unsafe { AXIsProcessTrusted() }
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}

#[tauri::command]
fn request_accessibility_permission() -> bool {
    #[cfg(target_os = "macos")]
    {
        extern "C" {
            fn AXIsProcessTrustedWithOptions(options: *const std::ffi::c_void) -> bool;
            static kAXTrustedCheckOptionPrompt: *const std::ffi::c_void;
            fn CFDictionaryCreate(
                allocator: *mut std::ffi::c_void,
                keys: *const *const std::ffi::c_void,
                values: *const *const std::ffi::c_void,
                num_values: isize,
                key_callbacks: *const std::ffi::c_void,
                value_callbacks: *const std::ffi::c_void,
            ) -> *mut std::ffi::c_void;
            static kCFBooleanTrue: *const std::ffi::c_void;
            fn CFRelease(cf: *mut std::ffi::c_void);
        }
        unsafe {
            let key = kAXTrustedCheckOptionPrompt;
            let val = kCFBooleanTrue;
            let dict = CFDictionaryCreate(
                std::ptr::null_mut(),
                &key,
                &val,
                1,
                std::ptr::null(),
                std::ptr::null(),
            );
            let res = AXIsProcessTrustedWithOptions(dict);
            if !dict.is_null() {
                CFRelease(dict);
            }
            res
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}

#[tauri::command]
fn start_global_input_capture(app_handle: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let _ = request_accessibility_permission();
    }
    RECORDING_ACTIVE.store(true, Ordering::Relaxed);
    state.is_recording.store(true, Ordering::SeqCst);
    state.is_paused.store(false, Ordering::SeqCst);
    update_tray_ui(&app_handle, &state);
    Ok(())
}

#[tauri::command]
fn stop_global_input_capture(app_handle: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    RECORDING_ACTIVE.store(false, Ordering::Relaxed);
    state.is_recording.store(false, Ordering::SeqCst);
    state.is_paused.store(false, Ordering::SeqCst);
    update_tray_ui(&app_handle, &state);
    Ok(())
}

#[tauri::command]
fn sync_tray_recording_state(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    is_recording: bool,
    is_paused: bool,
) -> Result<(), String> {
    state.is_recording.store(is_recording, Ordering::SeqCst);
    state.is_paused.store(is_paused, Ordering::SeqCst);
    update_tray_ui(&app_handle, &state);
    Ok(())
}

#[tauri::command]
fn sync_tray_recent_projects(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    projects: Vec<ProjectSummary>,
) -> Result<(), String> {
    if let Ok(mut list) = state.projects.lock() {
        *list = projects;
    }
    update_tray_ui(&app_handle, &state);
    Ok(())
}

#[tauri::command]
fn get_screen_dimensions(app_handle: tauri::AppHandle) -> Result<ScreenDimensions, String> {
    if let Ok(Some(monitor)) = app_handle.primary_monitor() {
        let scale = monitor.scale_factor();
        let size = monitor.size();
        Ok(ScreenDimensions {
            width: size.width as f64,
            height: size.height as f64,
            scale_factor: scale,
        })
    } else {
        Ok(ScreenDimensions {
            width: 1920.0,
            height: 1080.0,
            scale_factor: 1.0,
        })
    }
}

pub fn run() {
    ensure_single_instance_and_replace_previous();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState {
            projects: Mutex::new(load_projects_from_disk()),
            is_recording: AtomicBool::new(false),
            is_paused: AtomicBool::new(false),
        })
        .setup(|app| {
            if let Err(e) = setup_tray_icon(app) {
                eprintln!("Warning: Failed to setup tray icon: {e}");
            }
            let handle_clone = app.handle().clone();

            #[cfg(target_os = "macos")]
            {
                use std::ptr;

                #[repr(C)]
                #[derive(Copy, Clone, Debug)]
                struct CGPoint {
                    x: f64,
                    y: f64,
                }

                extern "C" {
                    fn CGEventTapCreate(
                        tap: u32,
                        place: u32,
                        options: u32,
                        events_of_interest: u64,
                        callback: extern "C" fn(
                            proxy: *mut std::ffi::c_void,
                            event_type: u32,
                            event: *mut std::ffi::c_void,
                            user_info: *mut std::ffi::c_void,
                        ) -> *mut std::ffi::c_void,
                        user_info: *mut std::ffi::c_void,
                    ) -> *mut std::ffi::c_void;
                    fn CGEventGetLocation(event: *mut std::ffi::c_void) -> CGPoint;
                    fn CGEventTapEnable(tap: *mut std::ffi::c_void, enable: bool);
                    fn CGEventCreate(source: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
                    fn CFRelease(cf: *mut std::ffi::c_void);
                    fn CFMachPortCreateRunLoopSource(
                        allocator: *mut std::ffi::c_void,
                        port: *mut std::ffi::c_void,
                        order: isize,
                    ) -> *mut std::ffi::c_void;
                    fn CFRunLoopAddSource(
                        rl: *mut std::ffi::c_void,
                        source: *mut std::ffi::c_void,
                        mode: *mut std::ffi::c_void,
                    );
                    fn CFRunLoopGetCurrent() -> *mut std::ffi::c_void;
                    fn CFRunLoopRun();
                    static kCFRunLoopCommonModes: *mut std::ffi::c_void;
                }

                extern "C" fn event_tap_cb(
                    _proxy: *mut std::ffi::c_void,
                    event_type: u32,
                    event: *mut std::ffi::c_void,
                    user_info: *mut std::ffi::c_void,
                ) -> *mut std::ffi::c_void {
                    if event_type == 14 || event_type == 0xFFFFFFFE || event_type == 0xFFFFFFFF {
                        if let Ok(guard) = EVENT_TAP_PORT.lock() {
                            if let Some(port_addr) = *guard {
                                unsafe {
                                    CGEventTapEnable(port_addr as *mut std::ffi::c_void, true);
                                }
                            }
                        }
                        return event;
                    }
                    if !RECORDING_ACTIVE.load(Ordering::Relaxed) {
                        return event;
                    }
                    unsafe {
                        let is_mouse_event = matches!(event_type, 1..=7 | 25..=27);
                        let (loc_x, loc_y) = if is_mouse_event {
                            let loc = CGEventGetLocation(event);
                            if let Ok(mut pos) = LAST_MOUSE_POS.lock() {
                                *pos = (loc.x, loc.y);
                            }
                            (loc.x, loc.y)
                        } else {
                            let mut px = 0.0;
                            let mut py = 0.0;
                            if let Ok(pos) = LAST_MOUSE_POS.lock() {
                                px = pos.0;
                                py = pos.1;
                            }
                            if px == 0.0 && py == 0.0 {
                                let dummy = CGEventCreate(ptr::null_mut());
                                if !dummy.is_null() {
                                    let live = CGEventGetLocation(dummy);
                                    CFRelease(dummy);
                                    if live.x > 0.0 || live.y > 0.0 {
                                        px = live.x;
                                        py = live.y;
                                        if let Ok(mut pos) = LAST_MOUSE_POS.lock() {
                                            *pos = (px, py);
                                        }
                                    }
                                }
                            }
                            (px, py)
                        };

                        let now_ms = chrono::Utc::now().timestamp_millis();
                        let handle = &*(user_info as *const tauri::AppHandle);
                        let (screen_w, screen_h) = get_screen_size(handle);
                        let norm_x = (loc_x / screen_w).clamp(0.0, 1.0);
                        let norm_y = (loc_y / screen_h).clamp(0.0, 1.0);

                        if event_type == 1 || event_type == 3 || event_type == 25 {
                            let btn = if event_type == 3 {
                                "right"
                            } else if event_type == 25 {
                                "middle"
                            } else {
                                "left"
                            };
                            let _ = handle.emit(
                                "global-click",
                                GlobalClickPayload {
                                    x: loc_x,
                                    y: loc_y,
                                    norm_x,
                                    norm_y,
                                    screen_width: screen_w,
                                    screen_height: screen_h,
                                    button: btn.to_string(),
                                    timestamp_ms: now_ms,
                                },
                            );
                        } else if event_type == 2 || event_type == 4 || event_type == 26 {
                            let btn = if event_type == 4 {
                                "right"
                            } else if event_type == 26 {
                                "middle"
                            } else {
                                "left"
                            };
                            let _ = handle.emit(
                                "global-mouse-up",
                                GlobalMouseUpPayload {
                                    x: loc_x,
                                    y: loc_y,
                                    norm_x,
                                    norm_y,
                                    button: btn.to_string(),
                                    timestamp_ms: now_ms,
                                },
                            );
                        } else if event_type == 5 || event_type == 6 || event_type == 7 {
                            let should_emit = if let Ok(mut last_emit) = LAST_MOVE_EMIT_MS.lock() {
                                if now_ms - *last_emit >= 25 {
                                    *last_emit = now_ms;
                                    true
                                } else {
                                    false
                                }
                            } else {
                                false
                            };

                            if should_emit {
                                let _ = handle.emit(
                                    "global-mouse-move",
                                    GlobalMouseMovePayload {
                                        x: loc_x,
                                        y: loc_y,
                                        norm_x,
                                        norm_y,
                                        timestamp_ms: now_ms,
                                    },
                                );
                            }
                        } else if event_type == 10 {
                            let _ = handle.emit(
                                "global-typing",
                                GlobalTypingPayload {
                                    x: loc_x,
                                    y: loc_y,
                                    norm_x,
                                    norm_y,
                                    timestamp_ms: now_ms,
                                },
                            );
                        }
                    }
                    event
                }

                std::thread::spawn(move || {
                    unsafe {
                        let input_mask: u64 =
                            (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6) | (1 << 7) | (1 << 10) | (1 << 25) | (1 << 26);
                        let handle_box = Box::new(handle_clone);
                        let handle_ptr = Box::into_raw(handle_box);

                        loop {
                            let mut port = CGEventTapCreate(
                                0, // kCGHIDEventTap
                                0, // kCGHeadInsertEventTap
                                1, // kCGEventTapOptionListenOnly
                                input_mask,
                                event_tap_cb,
                                handle_ptr as *mut std::ffi::c_void,
                            );
                            if port.is_null() {
                                port = CGEventTapCreate(
                                    1, // kCGSessionEventTap
                                    0,
                                    1,
                                    input_mask,
                                    event_tap_cb,
                                    handle_ptr as *mut std::ffi::c_void,
                                );
                            }
                            if !port.is_null() {
                                if let Ok(mut guard) = EVENT_TAP_PORT.lock() {
                                    *guard = Some(port as usize);
                                }
                                let source = CFMachPortCreateRunLoopSource(ptr::null_mut(), port, 0);
                                if !source.is_null() {
                                    let run_loop = CFRunLoopGetCurrent();
                                    CFRunLoopAddSource(run_loop, source, kCFRunLoopCommonModes);
                                    CFRunLoopRun();
                                }
                                break;
                            }
                            // Sleep 1500ms and retry until accessibility permissions are granted
                            std::thread::sleep(std::time::Duration::from_millis(1500));
                        }
                    }
                });
            }

            #[cfg(not(target_os = "macos"))]
            {
                std::thread::spawn(move || {
                    let _ = rdev::listen(move |event| {
                        if !RECORDING_ACTIVE.load(Ordering::Relaxed) {
                            return;
                        }
                        let now_ms = chrono::Utc::now().timestamp_millis();
                        match event.event_type {
                            rdev::EventType::MouseMove { x, y } => {
                                if let Ok(mut pos) = LAST_MOUSE_POS.lock() {
                                    *pos = (x, y);
                                }
                                let should_emit = if let Ok(mut last_emit) = LAST_MOVE_EMIT_MS.lock() {
                                    if now_ms - *last_emit >= 25 {
                                        *last_emit = now_ms;
                                        true
                                    } else {
                                        false
                                    }
                                } else {
                                    false
                                };

                                if should_emit {
                                    let (screen_w, screen_h) = get_screen_size(&handle_clone);
                                    let norm_x = (x / screen_w).clamp(0.0, 1.0);
                                    let norm_y = (y / screen_h).clamp(0.0, 1.0);
                                    let _ = handle_clone.emit(
                                        "global-mouse-move",
                                        GlobalMouseMovePayload {
                                            x,
                                            y,
                                            norm_x,
                                            norm_y,
                                            timestamp_ms: now_ms,
                                        },
                                    );
                                }
                            }
                            rdev::EventType::ButtonPress(button) => {
                                let (x, y) = LAST_MOUSE_POS.lock().map(|p| *p).unwrap_or((0.5, 0.5));
                                let (screen_w, screen_h) = get_screen_size(&handle_clone);
                                let norm_x = (x / screen_w).clamp(0.0, 1.0);
                                let norm_y = (y / screen_h).clamp(0.0, 1.0);
                                let btn_str = match button {
                                    rdev::Button::Left => "left",
                                    rdev::Button::Right => "right",
                                    rdev::Button::Middle => "middle",
                                    _ => "left",
                                };
                                let _ = handle_clone.emit(
                                    "global-click",
                                    GlobalClickPayload {
                                        x,
                                        y,
                                        norm_x,
                                        norm_y,
                                        screen_width: screen_w,
                                        screen_height: screen_h,
                                        button: btn_str.to_string(),
                                        timestamp_ms: now_ms,
                                    },
                                );
                            }
                            rdev::EventType::KeyPress(_) => {
                                let (x, y) = LAST_MOUSE_POS.lock().map(|p| *p).unwrap_or((0.5, 0.5));
                                let (screen_w, screen_h) = get_screen_size(&handle_clone);
                                let norm_x = (x / screen_w).clamp(0.0, 1.0);
                                let norm_y = (y / screen_h).clamp(0.0, 1.0);
                                let _ = handle_clone.emit(
                                    "global-typing",
                                    GlobalTypingPayload {
                                        x,
                                        y,
                                        norm_x,
                                        norm_y,
                                        timestamp_ms: now_ms,
                                    },
                                );
                            }
                            _ => {}
                        }
                    });
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_projects,
            save_project,
            save_full_project,
            load_full_project,
            save_recording_file,
            import_video,
            rename_project,
            delete_project,
            read_media_file,
            show_recording_hud,
            hide_recording_hud,
            set_recording_hud_mode,
            drag_window,
            start_global_input_capture,
            stop_global_input_capture,
            check_accessibility_permission,
            request_accessibility_permission,
            get_screen_dimensions,
            get_default_downloads_dir,
            get_default_export_path,
            save_exported_video,
            export_source_video_file,
            show_item_in_folder,
            sync_tray_recording_state,
            sync_tray_recent_projects,
            get_adb_devices,
            connect_wireless_adb,
            pair_wireless_adb,
            restart_adb_server,
            capture_device_frame,
            send_device_tap,
            keep_device_alive,
            start_mobile_stream,
            stop_mobile_stream,
            get_mobile_stream_url
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    #[cfg(target_os = "macos")]
                    {
                        let _ = window.hide();
                        api.prevent_close();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running DomoLens");
}
