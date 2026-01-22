use crate::models::Sidecar;
use std::path::PathBuf;

#[derive(Debug, thiserror::Error)]
pub enum FileError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Invalid path: {0}")]
    InvalidPath(String),
}

impl serde::Serialize for FileError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

fn get_sidecar_path(md_path: &str) -> Result<PathBuf, FileError> {
    let path = PathBuf::from(md_path);
    
    // Ensure it's a .md file
    if path.extension().and_then(|e| e.to_str()) != Some("md") {
        return Err(FileError::InvalidPath("File must have .md extension".to_string()));
    }
    
    // Change extension to .writing.json
    let mut sidecar_path = path.clone();
    sidecar_path.set_extension("writing.json");
    
    Ok(sidecar_path)
}

#[tauri::command]
pub async fn read_document(path: String) -> Result<String, FileError> {
    let content = tokio::fs::read_to_string(&path).await?;
    Ok(content)
}

#[tauri::command]
pub async fn write_document(path: String, content: String) -> Result<(), FileError> {
    // Write to temp file first, then rename for atomic write
    let temp_path = format!("{}.tmp", path);
    tokio::fs::write(&temp_path, &content).await?;
    tokio::fs::rename(&temp_path, &path).await?;
    Ok(())
}

#[tauri::command]
pub async fn read_sidecar(md_path: String) -> Result<Sidecar, FileError> {
    let sidecar_path = get_sidecar_path(&md_path)?;
    
    if !sidecar_path.exists() {
        // Create new sidecar if it doesn't exist
        let sidecar = Sidecar::new();
        let json = serde_json::to_string_pretty(&sidecar)?;
        tokio::fs::write(&sidecar_path, json).await?;
        return Ok(sidecar);
    }
    
    let content = tokio::fs::read_to_string(&sidecar_path).await?;
    let sidecar: Sidecar = serde_json::from_str(&content)?;
    Ok(sidecar)
}

#[tauri::command]
pub async fn write_sidecar(md_path: String, sidecar: Sidecar) -> Result<(), FileError> {
    let sidecar_path = get_sidecar_path(&md_path)?;
    let json = serde_json::to_string_pretty(&sidecar)?;
    
    // Atomic write: temp file then rename
    let temp_path = format!("{}.tmp", sidecar_path.display());
    tokio::fs::write(&temp_path, &json).await?;
    tokio::fs::rename(&temp_path, &sidecar_path).await?;
    
    Ok(())
}

#[tauri::command]
pub fn file_exists(path: String) -> bool {
    PathBuf::from(path).exists()
}

#[tauri::command]
pub fn get_sidecar_path_for_document(md_path: String) -> Result<String, FileError> {
    let path = get_sidecar_path(&md_path)?;
    Ok(path.to_string_lossy().to_string())
}
