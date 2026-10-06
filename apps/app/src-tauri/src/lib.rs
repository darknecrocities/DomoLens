use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;
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

#[derive(Default)]
pub struct AppState {
    pub projects: Mutex<Vec<ProjectSummary>>,
}

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
        name,
        source: "import".to_string(),
        created_at: now,
        updated_at: now,
        duration_ms: None,
        width: None,
        height: None,
        thumbnail: None,
        media: Some(path),
    };

    let mut list = state.projects.lock().map_err(|e| e.to_string())?;
    list.retain(|p| p.id != id);
    list.push(project.clone());
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

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState {
            projects: Mutex::new(load_projects_from_disk()),
        })
        .invoke_handler(tauri::generate_handler![
            list_projects,
            import_video,
            rename_project,
            delete_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running DomoLens");
}
