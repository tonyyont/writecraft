use keyring::Entry;
use std::sync::Mutex;
use std::collections::HashMap;

const SERVICE_NAME: &str = "writecraft";
const ACCOUNT_NAME: &str = "claude-api-key";

// Fallback in-memory storage when keychain fails
static FALLBACK_STORAGE: std::sync::LazyLock<Mutex<HashMap<String, String>>> =
    std::sync::LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, thiserror::Error)]
pub enum KeychainError {
    #[error("Keychain error: {0}")]
    Keyring(String),
}

impl serde::Serialize for KeychainError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

fn get_entry() -> Result<Entry, KeychainError> {
    Entry::new(SERVICE_NAME, ACCOUNT_NAME)
        .map_err(|e| KeychainError::Keyring(e.to_string()))
}

fn fallback_key() -> String {
    format!("{}:{}", SERVICE_NAME, ACCOUNT_NAME)
}

#[tauri::command]
pub fn get_api_key() -> Result<Option<String>, KeychainError> {
    // Try keychain first
    if let Ok(entry) = get_entry() {
        match entry.get_password() {
            Ok(password) => return Ok(Some(password)),
            Err(keyring::Error::NoEntry) => {}
            Err(e) => {
                eprintln!("Keychain get error: {}", e);
            }
        }
    }

    // Fall back to in-memory storage
    let storage = FALLBACK_STORAGE.lock().unwrap();
    Ok(storage.get(&fallback_key()).cloned())
}

#[tauri::command]
pub fn set_api_key(key: String) -> Result<(), KeychainError> {
    // Try keychain first
    if let Ok(entry) = get_entry() {
        match entry.set_password(&key) {
            Ok(()) => {
                // Also store in fallback for this session
                let mut storage = FALLBACK_STORAGE.lock().unwrap();
                storage.insert(fallback_key(), key);
                return Ok(());
            }
            Err(e) => {
                eprintln!("Keychain set error: {}, using fallback", e);
            }
        }
    }

    // Fall back to in-memory storage
    let mut storage = FALLBACK_STORAGE.lock().unwrap();
    storage.insert(fallback_key(), key);
    Ok(())
}

#[tauri::command]
pub fn delete_api_key() -> Result<(), KeychainError> {
    // Try to delete from keychain
    if let Ok(entry) = get_entry() {
        match entry.delete_credential() {
            Ok(()) => {}
            Err(keyring::Error::NoEntry) => {}
            Err(e) => {
                eprintln!("Keychain delete error: {}", e);
            }
        }
    }

    // Also remove from fallback storage
    let mut storage = FALLBACK_STORAGE.lock().unwrap();
    storage.remove(&fallback_key());
    Ok(())
}

#[tauri::command]
pub async fn test_api_key(key: String) -> Result<bool, KeychainError> {
    // Test the API key by making a simple request to Claude API
    let client = reqwest::Client::new();

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 1,
            "messages": [
                {"role": "user", "content": "Hi"}
            ]
        }))
        .send()
        .await
        .map_err(|e| KeychainError::Keyring(format!("Network error: {}", e)))?;

    let status = response.status().as_u16();

    match status {
        200 => Ok(true),
        401 => Ok(false),
        _ => {
            // Try to get the error message from the response body
            let error_body = response.text().await.unwrap_or_default();

            // Try to parse as JSON to extract the message
            let error_msg = if let Ok(json) = serde_json::from_str::<serde_json::Value>(&error_body) {
                json["error"]["message"]
                    .as_str()
                    .unwrap_or(&error_body)
                    .to_string()
            } else {
                error_body
            };

            Err(KeychainError::Keyring(format!("API error ({}): {}", status, error_msg)))
        }
    }
}
