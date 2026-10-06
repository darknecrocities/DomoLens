use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
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
}

static RECORDING_ACTIVE: AtomicBool = AtomicBool::new(false);
static LAST_MOUSE_POS: Mutex<(f64, f64)> = Mutex::new((0.5, 0.5));
static LAST_MOVE_EMIT_MS: Mutex<i64> = Mutex::new(0);

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
        p.name = name;
        p.updated_at = chrono::Utc::now().timestamp_millis();
        let updated = p.clone();
        save_projects_to_disk(&list);
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
    Ok(())
}

#[tauri::command]
fn read_media_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| e.to_string())
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
fn start_global_input_capture() -> Result<(), String> {
    RECORDING_ACTIVE.store(true, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
fn stop_global_input_capture() -> Result<(), String> {
    RECORDING_ACTIVE.store(false, Ordering::Relaxed);
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
        })
        .setup(|app| {
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
                    if !RECORDING_ACTIVE.load(Ordering::Relaxed) {
                        return event;
                    }
                    unsafe {
                        let loc = CGEventGetLocation(event);
                        if let Ok(mut pos) = LAST_MOUSE_POS.lock() {
                            *pos = (loc.x, loc.y);
                        }
                        let now_ms = chrono::Utc::now().timestamp_millis();
                        let handle = &*(user_info as *const tauri::AppHandle);
                        let (screen_w, screen_h) = get_screen_size(handle);
                        let norm_x = (loc.x / screen_w).clamp(0.0, 1.0);
                        let norm_y = (loc.y / screen_h).clamp(0.0, 1.0);

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
                                    x: loc.x,
                                    y: loc.y,
                                    norm_x,
                                    norm_y,
                                    screen_width: screen_w,
                                    screen_height: screen_h,
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
                                        x: loc.x,
                                        y: loc.y,
                                        norm_x,
                                        norm_y,
                                        timestamp_ms: now_ms,
                                    },
                                );
                            }
                        }
                    }
                    event
                }

                std::thread::spawn(move || {
                    unsafe {
                        let mouse_mask: u64 =
                            (1 << 1) | (1 << 3) | (1 << 5) | (1 << 6) | (1 << 7) | (1 << 25);
                        let handle_box = Box::new(handle_clone);
                        let handle_ptr = Box::into_raw(handle_box);

                        let port = CGEventTapCreate(
                            1,
                            0,
                            1,
                            mouse_mask,
                            event_tap_cb,
                            handle_ptr as *mut std::ffi::c_void,
                        );
                        if !port.is_null() {
                            let source = CFMachPortCreateRunLoopSource(ptr::null_mut(), port, 0);
                            if !source.is_null() {
                                let run_loop = CFRunLoopGetCurrent();
                                CFRunLoopAddSource(run_loop, source, kCFRunLoopCommonModes);
                                CFRunLoopRun();
                            }
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
            save_recording_file,
            import_video,
            rename_project,
            delete_project,
            read_media_file,
            show_recording_hud,
            hide_recording_hud,
            set_recording_hud_mode,
            start_global_input_capture,
            stop_global_input_capture,
            get_screen_dimensions
        ])
        .run(tauri::generate_context!())
        .expect("error while running DomoLens");
}
