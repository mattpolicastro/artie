// artie desktop backend.
//
// Serves generated applet HTML over a custom `artie://localhost/applet/<id>`
// scheme (so the applet gets a stable, persistent origin for localStorage), and
// persists a small library of dropped applets so they're remembered across
// launches. HTML generation itself lives in the frontend (the shared JS engine).
use std::collections::HashMap;
use std::fs;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{http, Manager, State};

#[derive(Default)]
struct Staged(Mutex<HashMap<String, String>>);

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Applet {
    id: String,
    name: String,
    path: String,
    last_opened: i64,
}

fn library_file(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("library.json"))
}

fn read_library(app: &tauri::AppHandle) -> Vec<Applet> {
    match library_file(app).and_then(|p| fs::read_to_string(p).map_err(|e| e.to_string())) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

fn write_library(app: &tauri::AppHandle, items: &[Applet]) -> Result<(), String> {
    let path = library_file(app)?;
    let json = serde_json::to_string_pretty(items).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

/// Read a dropped applet's source from disk (drag-drop gives us the OS path).
#[tauri::command]
fn read_source(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("{path}: {e}"))
}

fn state_file(app: &tauri::AppHandle, id: &str) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("state");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(format!("{id}.json")))
}

/// Persistent per-applet key/value state, seeded into the applet on launch.
#[tauri::command]
fn state_get(app: tauri::AppHandle, id: String) -> String {
    state_file(&app, &id)
        .and_then(|p| fs::read_to_string(p).map_err(|e| e.to_string()))
        .unwrap_or_else(|_| "{}".to_string())
}

#[tauri::command]
fn state_set(app: tauri::AppHandle, id: String, json: String) -> Result<(), String> {
    let path = state_file(&app, &id)?;
    fs::write(path, json).map_err(|e| e.to_string())
}

fn remove_state(app: &tauri::AppHandle, id: &str) {
    if let Ok(p) = state_file(app, id) {
        let _ = fs::remove_file(p);
    }
}

/// Hold generated HTML in memory, keyed by applet id, for the `artie://` handler.
#[tauri::command]
fn stage_applet(staged: State<Staged>, id: String, html: String) {
    staged.0.lock().unwrap().insert(id, html);
}

#[tauri::command]
fn list_applets(app: tauri::AppHandle) -> Vec<Applet> {
    let mut items = read_library(&app);
    items.sort_by(|a, b| b.last_opened.cmp(&a.last_opened));
    items
}

/// Upsert a library entry (keyed by id) and persist.
#[tauri::command]
fn remember_applet(app: tauri::AppHandle, entry: Applet) -> Result<(), String> {
    let mut items = read_library(&app);
    items.retain(|a| a.id != entry.id);
    items.push(entry);
    write_library(&app, &items)
}

#[tauri::command]
fn forget_applet(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut items = read_library(&app);
    items.retain(|a| a.id != id);
    remove_state(&app, &id);
    write_library(&app, &items)
}

#[tauri::command]
fn clear_library(app: tauri::AppHandle) -> Result<(), String> {
    for a in read_library(&app) {
        remove_state(&app, &a.id);
    }
    write_library(&app, &[])
}

/// Open the app-data folder (library.json lives here) in Finder.
#[tauri::command]
fn reveal_data_dir(app: tauri::AppHandle) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::process::Command::new("open")
        .arg(&dir)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Staged::default())
        .register_uri_scheme_protocol("artie", |ctx, request| {
            let not_found = || {
                http::Response::builder()
                    .status(http::StatusCode::NOT_FOUND)
                    .body(Vec::new())
                    .unwrap()
            };
            // artie://localhost/applet/<id>
            let path = request.uri().path();
            let id = match path.strip_prefix("/applet/") {
                Some(id) if !id.is_empty() => id.to_string(),
                _ => return not_found(),
            };
            let staged = ctx.app_handle().state::<Staged>();
            let guard = staged.0.lock().unwrap();
            match guard.get(&id) {
                Some(html) => http::Response::builder()
                    .status(http::StatusCode::OK)
                    .header(http::header::CONTENT_TYPE, "text/html")
                    .body(html.clone().into_bytes())
                    .unwrap(),
                None => not_found(),
            }
        })
        .invoke_handler(tauri::generate_handler![
            read_source,
            stage_applet,
            list_applets,
            remember_applet,
            forget_applet,
            clear_library,
            reveal_data_dir,
            state_get,
            state_set
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
