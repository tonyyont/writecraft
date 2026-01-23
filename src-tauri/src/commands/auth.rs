use keyring::Entry;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

const SERVICE_NAME: &str = "writecraft";
const AUTH_ACCOUNT_NAME: &str = "supabase-auth";

// Fallback in-memory storage when keychain fails
static AUTH_FALLBACK_STORAGE: std::sync::LazyLock<Mutex<HashMap<String, String>>> =
    std::sync::LazyLock::new(|| Mutex::new(HashMap::new()));

// ============================================
// Error types
// ============================================

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("Authentication failed: {0}")]
    AuthFailed(String),
    #[error("Network error: {0}")]
    Network(String),
    #[error("Storage error: {0}")]
    Storage(String),
    #[error("Not authenticated")]
    NotAuthenticated,
    #[error("Session expired")]
    SessionExpired,
    #[error("Invalid credentials")]
    InvalidCredentials,
    #[error("Email not confirmed")]
    EmailNotConfirmed,
    #[error("User already exists")]
    UserAlreadyExists,
}

impl serde::Serialize for AuthError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

// ============================================
// Session types
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthSession {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
    pub user: AuthUser,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthUser {
    pub id: String,
    pub email: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub full_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
    pub email_confirmed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub email: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub full_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileUpdate {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub full_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subscription {
    pub plan_id: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_period_end: Option<String>,
    pub cancel_at_period_end: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Usage {
    pub message_count: i32,
    pub message_limit: i32,
    pub period_start: String,
    pub period_end: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionInfo {
    pub subscription: Option<Subscription>,
    pub usage: Option<Usage>,
    pub allowed_models: Vec<String>,
}

// ============================================
// Supabase API response types
// ============================================

#[derive(Debug, Deserialize)]
struct SupabaseAuthResponse {
    access_token: String,
    refresh_token: String,
    expires_at: Option<i64>,
    expires_in: Option<i64>,
    user: SupabaseUser,
}

#[derive(Debug, Deserialize)]
struct SupabaseUser {
    id: String,
    email: Option<String>,
    email_confirmed_at: Option<String>,
    user_metadata: Option<SupabaseUserMetadata>,
}

#[derive(Debug, Deserialize)]
struct SupabaseUserMetadata {
    full_name: Option<String>,
    name: Option<String>,
    avatar_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SupabaseError {
    error: Option<String>,
    error_description: Option<String>,
    message: Option<String>,
    msg: Option<String>,
}

// ============================================
// Keychain helpers
// ============================================

fn get_auth_entry() -> Result<Entry, AuthError> {
    Entry::new(SERVICE_NAME, AUTH_ACCOUNT_NAME).map_err(|e| AuthError::Storage(e.to_string()))
}

fn auth_fallback_key() -> String {
    format!("{}:{}", SERVICE_NAME, AUTH_ACCOUNT_NAME)
}

// ============================================
// File-based persistent fallback
// ============================================

fn get_session_file_path() -> Option<PathBuf> {
    // Save to ~/Library/Application Support/com.writecraft.app/session.json
    dirs::data_dir().map(|p| p.join("com.writecraft.app").join("session.json"))
}

fn save_session_to_file(session: &AuthSession) -> Result<(), AuthError> {
    if let Some(path) = get_session_file_path() {
        // Create directory if it doesn't exist
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| AuthError::Storage(e.to_string()))?;
        }
        let json = serde_json::to_string(session).map_err(|e| AuthError::Storage(e.to_string()))?;
        fs::write(&path, &json).map_err(|e| AuthError::Storage(e.to_string()))?;
        tracing::debug!("Session saved to file: {:?}", path);
    }
    Ok(())
}

fn load_session_from_file() -> Option<AuthSession> {
    let path = get_session_file_path()?;
    let json = fs::read_to_string(&path).ok()?;
    let session = serde_json::from_str(&json).ok()?;
    tracing::debug!("Session loaded from file: {:?}", path);
    Some(session)
}

fn clear_session_file() {
    if let Some(path) = get_session_file_path() {
        let _ = fs::remove_file(&path);
        tracing::debug!("Session file cleared: {:?}", path);
    }
}

fn save_session(session: &AuthSession) -> Result<(), AuthError> {
    let json = serde_json::to_string(session).map_err(|e| AuthError::Storage(e.to_string()))?;

    // Try keychain first
    if let Ok(entry) = get_auth_entry() {
        match entry.set_password(&json) {
            Ok(()) => {
                tracing::info!("Session saved to keychain");
                // Also save to file as backup
                let _ = save_session_to_file(session);
                return Ok(());
            }
            Err(e) => {
                tracing::warn!(error = %e, "Keychain save failed, using file fallback");
            }
        }
    }

    // Fall back to file storage (persists across restarts)
    save_session_to_file(session)?;
    tracing::info!("Session saved to file fallback");

    // Also keep in memory for this session
    let mut storage = AUTH_FALLBACK_STORAGE.lock().unwrap();
    storage.insert(auth_fallback_key(), json);
    Ok(())
}

fn load_session() -> Option<AuthSession> {
    // Try keychain first
    if let Ok(entry) = get_auth_entry() {
        match entry.get_password() {
            Ok(json) => {
                if let Ok(session) = serde_json::from_str::<AuthSession>(&json) {
                    tracing::info!("Session loaded from keychain");
                    return Some(session);
                }
            }
            Err(keyring::Error::NoEntry) => {
                tracing::debug!("No session in keychain");
            }
            Err(e) => {
                tracing::warn!(error = %e, "Keychain read failed");
            }
        }
    }

    // Try file fallback (persists across restarts)
    if let Some(session) = load_session_from_file() {
        tracing::info!("Session loaded from file fallback");
        return Some(session);
    }

    // Finally try in-memory (only works within same session)
    let storage = AUTH_FALLBACK_STORAGE.lock().unwrap();
    if let Some(json) = storage.get(&auth_fallback_key()) {
        if let Ok(session) = serde_json::from_str(json) {
            tracing::info!("Session loaded from memory fallback");
            return Some(session);
        }
    }

    tracing::debug!("No session found anywhere");
    None
}

fn clear_session() {
    // Try to delete from keychain
    if let Ok(entry) = get_auth_entry() {
        let _ = entry.delete_credential();
    }

    // Clear file fallback
    clear_session_file();

    // Clear memory fallback
    let mut storage = AUTH_FALLBACK_STORAGE.lock().unwrap();
    storage.remove(&auth_fallback_key());

    tracing::info!("Session cleared from all storage locations");
}

// ============================================
// Configuration
// ============================================

const SUPABASE_URL: &str = "https://ausxaxibmaztljouwhyx.supabase.co";
const SUPABASE_ANON_KEY: &str = "sb_publishable_cYznAZlD3GCHzRs4SWxtNw_L9pFRJal";

fn get_supabase_url() -> Result<String, AuthError> {
    Ok(SUPABASE_URL.to_string())
}

fn get_supabase_anon_key() -> Result<String, AuthError> {
    Ok(SUPABASE_ANON_KEY.to_string())
}

// ============================================
// Auth commands
// ============================================

/// Sign up with email and password
#[tauri::command]
pub async fn sign_up(email: String, password: String) -> Result<AuthSession, AuthError> {
    let supabase_url = get_supabase_url()?;
    let anon_key = get_supabase_anon_key()?;

    let client = Client::new();
    let response = client
        .post(format!("{}/auth/v1/signup", supabase_url))
        .header("apikey", &anon_key)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "email": email,
            "password": password
        }))
        .send()
        .await
        .map_err(|e| AuthError::Network(e.to_string()))?;

    let status = response.status();

    if !status.is_success() {
        let error: SupabaseError = response
            .json()
            .await
            .unwrap_or(SupabaseError {
                error: Some("Unknown error".to_string()),
                error_description: None,
                message: None,
                msg: None,
            });

        let error_msg = error
            .message
            .or(error.error_description)
            .or(error.msg)
            .or(error.error)
            .unwrap_or_else(|| "Unknown error".to_string());

        if error_msg.contains("already registered") {
            return Err(AuthError::UserAlreadyExists);
        }

        return Err(AuthError::AuthFailed(error_msg));
    }

    let auth_response: SupabaseAuthResponse = response
        .json()
        .await
        .map_err(|e| AuthError::AuthFailed(e.to_string()))?;

    let session = convert_auth_response(auth_response)?;

    // Save session to keychain
    save_session(&session)?;

    Ok(session)
}

/// Sign in with email and password
#[tauri::command]
pub async fn sign_in(email: String, password: String) -> Result<AuthSession, AuthError> {
    let supabase_url = get_supabase_url()?;
    let anon_key = get_supabase_anon_key()?;

    let client = Client::new();
    let response = client
        .post(format!(
            "{}/auth/v1/token?grant_type=password",
            supabase_url
        ))
        .header("apikey", &anon_key)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "email": email,
            "password": password
        }))
        .send()
        .await
        .map_err(|e| AuthError::Network(e.to_string()))?;

    let status = response.status();

    if !status.is_success() {
        let error: SupabaseError = response.json().await.unwrap_or(SupabaseError {
            error: Some("Unknown error".to_string()),
            error_description: None,
            message: None,
            msg: None,
        });

        let error_msg = error
            .message
            .or(error.error_description)
            .or(error.msg)
            .or(error.error)
            .unwrap_or_else(|| "Unknown error".to_string());

        if error_msg.contains("Invalid login") || error_msg.contains("Invalid email or password") {
            return Err(AuthError::InvalidCredentials);
        }
        if error_msg.contains("Email not confirmed") {
            return Err(AuthError::EmailNotConfirmed);
        }

        return Err(AuthError::AuthFailed(error_msg));
    }

    let auth_response: SupabaseAuthResponse = response
        .json()
        .await
        .map_err(|e| AuthError::AuthFailed(e.to_string()))?;

    let session = convert_auth_response(auth_response)?;

    // Save session to keychain
    save_session(&session)?;

    Ok(session)
}

/// Get OAuth URL for sign in with provider
#[tauri::command]
pub async fn sign_in_with_oauth(provider: String) -> Result<String, AuthError> {
    let supabase_url = get_supabase_url()?;

    // Construct OAuth URL with redirect to custom URL scheme
    let redirect_url = "fizz://auth/callback";
    let oauth_url = format!(
        "{}/auth/v1/authorize?provider={}&redirect_to={}",
        supabase_url, provider, redirect_url
    );

    Ok(oauth_url)
}

/// Open OAuth URL in default browser
#[tauri::command]
pub async fn open_oauth_url(app: AppHandle, url: String) -> Result<(), AuthError> {
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| AuthError::AuthFailed(e.to_string()))?;
    Ok(())
}

/// Handle OAuth callback
#[tauri::command]
pub async fn handle_oauth_callback(url: String) -> Result<AuthSession, AuthError> {
    // Parse the callback URL to extract tokens
    // URL format: fizz://auth/callback#access_token=...&refresh_token=...&expires_in=...

    let fragment = url
        .split('#')
        .nth(1)
        .ok_or_else(|| AuthError::AuthFailed("No fragment in callback URL".to_string()))?;

    let params: HashMap<String, String> = fragment
        .split('&')
        .filter_map(|pair| {
            let mut parts = pair.split('=');
            Some((parts.next()?.to_string(), parts.next()?.to_string()))
        })
        .collect();

    let access_token = params
        .get("access_token")
        .ok_or_else(|| AuthError::AuthFailed("No access token in callback".to_string()))?
        .clone();

    let refresh_token = params
        .get("refresh_token")
        .ok_or_else(|| AuthError::AuthFailed("No refresh token in callback".to_string()))?
        .clone();

    let expires_in: i64 = params
        .get("expires_in")
        .and_then(|s| s.parse().ok())
        .unwrap_or(3600);

    // Get user info using the access token
    let supabase_url = get_supabase_url()?;
    let anon_key = get_supabase_anon_key()?;

    let client = Client::new();
    let response = client
        .get(format!("{}/auth/v1/user", supabase_url))
        .header("apikey", &anon_key)
        .header("Authorization", format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| AuthError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Err(AuthError::AuthFailed("Failed to get user info".to_string()));
    }

    let user: SupabaseUser = response
        .json()
        .await
        .map_err(|e| AuthError::AuthFailed(e.to_string()))?;

    let now = chrono::Utc::now().timestamp();
    let expires_at = now + expires_in;

    let session = AuthSession {
        access_token,
        refresh_token,
        expires_at,
        user: AuthUser {
            id: user.id,
            email: user.email.unwrap_or_default(),
            full_name: user
                .user_metadata
                .as_ref()
                .and_then(|m| m.full_name.clone().or_else(|| m.name.clone())),
            avatar_url: user.user_metadata.as_ref().and_then(|m| m.avatar_url.clone()),
            email_confirmed: user.email_confirmed_at.is_some(),
        },
    };

    // Save session to keychain
    save_session(&session)?;

    Ok(session)
}

/// Sign out and clear session
#[tauri::command]
pub async fn sign_out() -> Result<(), AuthError> {
    // Clear local session
    clear_session();

    // Try to sign out on server (optional, don't fail if it doesn't work)
    if let Some(session) = load_session() {
        if let (Ok(supabase_url), Ok(anon_key)) = (get_supabase_url(), get_supabase_anon_key()) {
            let client = Client::new();
            let _ = client
                .post(format!("{}/auth/v1/logout", supabase_url))
                .header("apikey", &anon_key)
                .header("Authorization", format!("Bearer {}", session.access_token))
                .send()
                .await;
        }
    }

    Ok(())
}

/// Get current session if valid
#[tauri::command]
pub async fn get_session() -> Result<Option<AuthSession>, AuthError> {
    let session = match load_session() {
        Some(s) => s,
        None => return Ok(None),
    };

    // Check if session is expired
    let now = chrono::Utc::now().timestamp();
    if session.expires_at <= now {
        // Try to refresh
        match refresh_session_internal(&session.refresh_token).await {
            Ok(new_session) => Ok(Some(new_session)),
            Err(_) => {
                clear_session();
                Ok(None)
            }
        }
    } else {
        Ok(Some(session))
    }
}

/// Refresh the current session
#[tauri::command]
pub async fn refresh_session() -> Result<AuthSession, AuthError> {
    let session = load_session().ok_or(AuthError::NotAuthenticated)?;
    refresh_session_internal(&session.refresh_token).await
}

async fn refresh_session_internal(refresh_token: &str) -> Result<AuthSession, AuthError> {
    let supabase_url = get_supabase_url()?;
    let anon_key = get_supabase_anon_key()?;

    let client = Client::new();
    let response = client
        .post(format!(
            "{}/auth/v1/token?grant_type=refresh_token",
            supabase_url
        ))
        .header("apikey", &anon_key)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "refresh_token": refresh_token
        }))
        .send()
        .await
        .map_err(|e| AuthError::Network(e.to_string()))?;

    if !response.status().is_success() {
        clear_session();
        return Err(AuthError::SessionExpired);
    }

    let auth_response: SupabaseAuthResponse = response
        .json()
        .await
        .map_err(|e| AuthError::AuthFailed(e.to_string()))?;

    let session = convert_auth_response(auth_response)?;

    // Save new session to keychain
    save_session(&session)?;

    Ok(session)
}

/// Send password reset email
#[tauri::command]
pub async fn reset_password(email: String) -> Result<(), AuthError> {
    let supabase_url = get_supabase_url()?;
    let anon_key = get_supabase_anon_key()?;

    let client = Client::new();
    let response = client
        .post(format!("{}/auth/v1/recover", supabase_url))
        .header("apikey", &anon_key)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "email": email
        }))
        .send()
        .await
        .map_err(|e| AuthError::Network(e.to_string()))?;

    if !response.status().is_success() {
        let error: SupabaseError = response.json().await.unwrap_or(SupabaseError {
            error: Some("Unknown error".to_string()),
            error_description: None,
            message: None,
            msg: None,
        });

        let error_msg = error
            .message
            .or(error.error_description)
            .or(error.msg)
            .or(error.error)
            .unwrap_or_else(|| "Unknown error".to_string());

        return Err(AuthError::AuthFailed(error_msg));
    }

    Ok(())
}

// ============================================
// Profile commands
// ============================================

/// Get user profile
#[tauri::command]
pub async fn get_profile() -> Result<Profile, AuthError> {
    let session = load_session().ok_or(AuthError::NotAuthenticated)?;
    let supabase_url = get_supabase_url()?;
    let anon_key = get_supabase_anon_key()?;

    let client = Client::new();
    let response = client
        .get(format!(
            "{}/rest/v1/profiles?id=eq.{}&select=*",
            supabase_url, session.user.id
        ))
        .header("apikey", &anon_key)
        .header("Authorization", format!("Bearer {}", session.access_token))
        .send()
        .await
        .map_err(|e| AuthError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Err(AuthError::AuthFailed("Failed to get profile".to_string()));
    }

    let profiles: Vec<Profile> = response
        .json()
        .await
        .map_err(|e| AuthError::AuthFailed(e.to_string()))?;

    profiles
        .into_iter()
        .next()
        .ok_or_else(|| AuthError::AuthFailed("Profile not found".to_string()))
}

/// Update user profile
#[tauri::command]
pub async fn update_profile(updates: ProfileUpdate) -> Result<Profile, AuthError> {
    let session = load_session().ok_or(AuthError::NotAuthenticated)?;
    let supabase_url = get_supabase_url()?;
    let anon_key = get_supabase_anon_key()?;

    let client = Client::new();
    let response = client
        .patch(format!(
            "{}/rest/v1/profiles?id=eq.{}",
            supabase_url, session.user.id
        ))
        .header("apikey", &anon_key)
        .header("Authorization", format!("Bearer {}", session.access_token))
        .header("Content-Type", "application/json")
        .header("Prefer", "return=representation")
        .json(&updates)
        .send()
        .await
        .map_err(|e| AuthError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Err(AuthError::AuthFailed("Failed to update profile".to_string()));
    }

    let profiles: Vec<Profile> = response
        .json()
        .await
        .map_err(|e| AuthError::AuthFailed(e.to_string()))?;

    profiles
        .into_iter()
        .next()
        .ok_or_else(|| AuthError::AuthFailed("Profile not found".to_string()))
}

// ============================================
// Subscription commands
// ============================================

/// Get subscription and usage info
#[tauri::command]
pub async fn get_subscription_info() -> Result<SubscriptionInfo, AuthError> {
    let session = load_session().ok_or(AuthError::NotAuthenticated)?;
    let supabase_url = get_supabase_url()?;

    let client = Client::new();
    let response = client
        .get(format!("{}/functions/v1/get-subscription", supabase_url))
        .header("Authorization", format!("Bearer {}", session.access_token))
        .send()
        .await
        .map_err(|e| AuthError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Err(AuthError::AuthFailed(
            "Failed to get subscription".to_string(),
        ));
    }

    let info: SubscriptionInfo = response
        .json()
        .await
        .map_err(|e| AuthError::AuthFailed(e.to_string()))?;

    Ok(info)
}

/// Get Stripe checkout URL for upgrading
#[tauri::command]
pub async fn get_checkout_url(price_id: String) -> Result<String, AuthError> {
    let session = load_session().ok_or(AuthError::NotAuthenticated)?;
    let supabase_url = get_supabase_url()?;

    let client = Client::new();
    let response = client
        .post(format!("{}/functions/v1/create-checkout", supabase_url))
        .header("Authorization", format!("Bearer {}", session.access_token))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "priceId": price_id
        }))
        .send()
        .await
        .map_err(|e| AuthError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Err(AuthError::AuthFailed(
            "Failed to create checkout session".to_string(),
        ));
    }

    #[derive(Deserialize)]
    struct CheckoutResponse {
        url: String,
    }

    let checkout: CheckoutResponse = response
        .json()
        .await
        .map_err(|e| AuthError::AuthFailed(e.to_string()))?;

    Ok(checkout.url)
}

/// Get Stripe billing portal URL
#[tauri::command]
pub async fn get_billing_portal_url() -> Result<String, AuthError> {
    let session = load_session().ok_or(AuthError::NotAuthenticated)?;
    let supabase_url = get_supabase_url()?;

    let client = Client::new();
    let response = client
        .post(format!(
            "{}/functions/v1/create-portal-session",
            supabase_url
        ))
        .header("Authorization", format!("Bearer {}", session.access_token))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({}))
        .send()
        .await
        .map_err(|e| AuthError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Err(AuthError::AuthFailed(
            "Failed to create portal session".to_string(),
        ));
    }

    #[derive(Deserialize)]
    struct PortalResponse {
        url: String,
    }

    let portal: PortalResponse = response
        .json()
        .await
        .map_err(|e| AuthError::AuthFailed(e.to_string()))?;

    Ok(portal.url)
}

// ============================================
// Helper functions
// ============================================

fn convert_auth_response(response: SupabaseAuthResponse) -> Result<AuthSession, AuthError> {
    let now = chrono::Utc::now().timestamp();
    let expires_at = response
        .expires_at
        .unwrap_or_else(|| now + response.expires_in.unwrap_or(3600));

    Ok(AuthSession {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        expires_at,
        user: AuthUser {
            id: response.user.id,
            email: response.user.email.unwrap_or_default(),
            full_name: response
                .user
                .user_metadata
                .as_ref()
                .and_then(|m| m.full_name.clone().or_else(|| m.name.clone())),
            avatar_url: response
                .user
                .user_metadata
                .as_ref()
                .and_then(|m| m.avatar_url.clone()),
            email_confirmed: response.user.email_confirmed_at.is_some(),
        },
    })
}

/// Get the current access token (for internal use by Claude proxy)
/// Automatically refreshes expired sessions
pub async fn get_access_token() -> Result<String, AuthError> {
    let session = load_session().ok_or(AuthError::NotAuthenticated)?;

    // Check if session is expired
    let now = chrono::Utc::now().timestamp();
    if session.expires_at <= now {
        // Try to refresh the session
        match refresh_session_internal(&session.refresh_token).await {
            Ok(new_session) => Ok(new_session.access_token),
            Err(_) => {
                clear_session();
                Err(AuthError::SessionExpired)
            }
        }
    } else {
        Ok(session.access_token)
    }
}

/// Debug command to check auth state
#[tauri::command]
pub fn debug_auth_state() -> Result<String, String> {
    let session = load_session();

    match session {
        Some(s) => {
            let now = chrono::Utc::now().timestamp();
            let expires_in = s.expires_at - now;
            Ok(format!(
                "Session found:\n  User: {} ({})\n  Token prefix: {}...\n  Expires in: {} seconds\n  Expired: {}",
                s.user.email,
                s.user.id,
                &s.access_token[..20.min(s.access_token.len())],
                expires_in,
                expires_in <= 0
            ))
        }
        None => Ok("No session found".to_string())
    }
}
