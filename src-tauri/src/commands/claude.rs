use futures::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

const CLAUDE_API_URL: &str = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL: &str = "claude-haiku-4-5-20251001";

#[derive(Debug, thiserror::Error)]
pub enum ClaudeError {
    #[error("Network error: {0}")]
    Network(String),
    #[error("API error: {0}")]
    Api(String),
    #[error("No API key configured")]
    NoApiKey,
    #[error("Rate limited: {0}")]
    RateLimited(String),
}

impl serde::Serialize for ClaudeError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

// ============================================
// Tool calling types
// ============================================

/// Tool definition for Claude API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

/// Content block types for messages
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ContentBlock {
    Text {
        text: String,
    },
    ToolUse {
        id: String,
        name: String,
        input: serde_json::Value,
    },
    ToolResult {
        tool_use_id: String,
        content: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        is_error: Option<bool>,
    },
}

/// Message content can be either a simple string or an array of content blocks
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MessageContent {
    Text(String),
    Blocks(Vec<ContentBlock>),
}

/// Chat message with flexible content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: MessageContent,
}

/// Simplified chat message for backward compatibility
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

impl From<ChatMessage> for Message {
    fn from(msg: ChatMessage) -> Self {
        Message {
            role: msg.role,
            content: MessageContent::Text(msg.content),
        }
    }
}

// ============================================
// Streaming event types
// ============================================

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamChunk {
    pub chunk: String,
    pub done: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamError {
    pub error: String,
}

/// Tool use event emitted when Claude calls a tool
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolUseEvent {
    pub id: String,
    pub name: String,
    pub input: serde_json::Value,
}

/// Message stop event with stop reason
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageStopEvent {
    pub stop_reason: String,
}

// ============================================
// SSE parsing types
// ============================================

#[derive(Debug, Deserialize)]
struct ContentBlockDelta {
    #[serde(rename = "type")]
    delta_type: String,
    text: Option<String>,
    partial_json: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ContentBlockStart {
    #[serde(rename = "type")]
    block_type: String,
    id: Option<String>,
    name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct StreamEvent {
    #[serde(rename = "type")]
    event_type: String,
    #[serde(default)]
    #[allow(dead_code)]
    index: Option<usize>,
    content_block: Option<ContentBlockStart>,
    delta: Option<ContentBlockDelta>,
    message: Option<MessageInfo>,
    error: Option<ApiError>,
}

#[derive(Debug, Deserialize)]
struct MessageInfo {
    stop_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ApiError {
    #[serde(rename = "type")]
    error_type: String,
    message: String,
}

// ============================================
// API Request types
// ============================================

#[derive(Debug, Serialize)]
struct ClaudeRequest {
    model: String,
    max_tokens: u32,
    system: Option<String>,
    messages: Vec<Message>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<Vec<Tool>>,
}

/// Response from send_message_with_tools
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssistantResponse {
    pub text_content: String,
    pub tool_uses: Vec<ToolUseEvent>,
    pub stop_reason: String,
}

/// Send a message to Claude API with streaming response (backward compatible)
/// Emits 'claude-stream-chunk' events to frontend as chunks arrive
/// Emits 'claude-stream-error' on error
/// Returns the complete response when done
#[tauri::command]
pub async fn send_message(
    app: AppHandle,
    messages: Vec<ChatMessage>,
    system_prompt: Option<String>,
    model: Option<String>,
) -> Result<String, ClaudeError> {
    // Convert ChatMessage to Message
    let messages: Vec<Message> = messages.into_iter().map(|m| m.into()).collect();

    // Get API key from keychain
    let api_key = super::keychain::get_api_key()
        .map_err(|e| ClaudeError::Api(e.to_string()))?
        .ok_or(ClaudeError::NoApiKey)?;

    let client = Client::new();
    let model = model.unwrap_or_else(|| DEFAULT_MODEL.to_string());

    let request_body = ClaudeRequest {
        model,
        max_tokens: 4096,
        system: system_prompt,
        messages,
        stream: true,
        tools: None,
    };

    let response = client
        .post(CLAUDE_API_URL)
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| ClaudeError::Network(e.to_string()))?;

    let status = response.status();

    // Handle error status codes
    if !status.is_success() {
        let error_body = response.text().await.unwrap_or_default();

        // Try to parse as JSON to extract the error message
        let error_msg = if let Ok(json) = serde_json::from_str::<serde_json::Value>(&error_body) {
            json["error"]["message"]
                .as_str()
                .unwrap_or(&error_body)
                .to_string()
        } else {
            error_body
        };

        return match status.as_u16() {
            401 => Err(ClaudeError::Api("Invalid API key".to_string())),
            429 => Err(ClaudeError::RateLimited(error_msg)),
            400 => Err(ClaudeError::Api(error_msg)),
            500..=599 => Err(ClaudeError::Api(format!("Server error: {}", error_msg))),
            _ => Err(ClaudeError::Api(format!("Error ({}): {}", status, error_msg))),
        };
    }

    // Process SSE stream
    let mut stream = response.bytes_stream();
    let mut full_response = String::new();
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| ClaudeError::Network(e.to_string()))?;

        let chunk_str = String::from_utf8_lossy(&chunk);
        buffer.push_str(&chunk_str);

        // Process complete SSE events (lines starting with "data: ")
        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].trim().to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            if line.starts_with("data: ") {
                let data = &line[6..];

                // Skip [DONE] marker
                if data == "[DONE]" {
                    continue;
                }

                // Parse the JSON event
                if let Ok(event) = serde_json::from_str::<StreamEvent>(data) {
                    match event.event_type.as_str() {
                        "content_block_delta" => {
                            if let Some(delta) = event.delta {
                                if delta.delta_type == "text_delta" {
                                    if let Some(text) = delta.text {
                                        full_response.push_str(&text);

                                        // Emit chunk to frontend
                                        let _ = app.emit(
                                            "claude-stream-chunk",
                                            StreamChunk {
                                                chunk: text,
                                                done: false,
                                            },
                                        );
                                    }
                                }
                            }
                        }
                        "message_stop" => {
                            // Emit final done signal
                            let _ = app.emit(
                                "claude-stream-chunk",
                                StreamChunk {
                                    chunk: String::new(),
                                    done: true,
                                },
                            );
                        }
                        "error" => {
                            if let Some(err) = event.error {
                                let error_msg =
                                    format!("{}: {}", err.error_type, err.message);
                                let _ = app.emit(
                                    "claude-stream-error",
                                    StreamError { error: error_msg.clone() },
                                );
                                return Err(ClaudeError::Api(error_msg));
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    Ok(full_response)
}

// ============================================
// Tool use state tracking for streaming
// ============================================

#[derive(Debug, Default)]
struct ToolUseState {
    id: String,
    name: String,
    input_json: String,
}

/// Send a message to Claude API with tools support
/// Emits 'claude-stream-chunk' for text content
/// Emits 'claude-tool-use' when a tool call is complete
/// Emits 'claude-message-stop' with stop reason
/// Returns AssistantResponse with text content, tool uses, and stop reason
#[tauri::command]
pub async fn send_message_with_tools(
    app: AppHandle,
    messages: Vec<Message>,
    system_prompt: Option<String>,
    tools: Option<Vec<Tool>>,
    model: Option<String>,
) -> Result<AssistantResponse, ClaudeError> {
    // Get API key from keychain
    let api_key = super::keychain::get_api_key()
        .map_err(|e| ClaudeError::Api(e.to_string()))?
        .ok_or(ClaudeError::NoApiKey)?;

    let client = Client::new();
    let model = model.unwrap_or_else(|| DEFAULT_MODEL.to_string());

    let request_body = ClaudeRequest {
        model,
        max_tokens: 4096,
        system: system_prompt,
        messages,
        stream: true,
        tools,
    };

    let response = client
        .post(CLAUDE_API_URL)
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| ClaudeError::Network(e.to_string()))?;

    let status = response.status();

    // Handle error status codes
    if !status.is_success() {
        let error_body = response.text().await.unwrap_or_default();

        let error_msg = if let Ok(json) = serde_json::from_str::<serde_json::Value>(&error_body) {
            json["error"]["message"]
                .as_str()
                .unwrap_or(&error_body)
                .to_string()
        } else {
            error_body
        };

        return match status.as_u16() {
            401 => Err(ClaudeError::Api("Invalid API key".to_string())),
            429 => Err(ClaudeError::RateLimited(error_msg)),
            400 => Err(ClaudeError::Api(error_msg)),
            500..=599 => Err(ClaudeError::Api(format!("Server error: {}", error_msg))),
            _ => Err(ClaudeError::Api(format!("Error ({}): {}", status, error_msg))),
        };
    }

    // Process SSE stream with tool use support
    let mut stream = response.bytes_stream();
    let mut text_content = String::new();
    let mut tool_uses: Vec<ToolUseEvent> = Vec::new();
    let mut buffer = String::new();
    let mut stop_reason = String::from("end_turn");

    // Track current content block being built
    let mut current_tool_use: Option<ToolUseState> = None;

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| ClaudeError::Network(e.to_string()))?;

        let chunk_str = String::from_utf8_lossy(&chunk);
        buffer.push_str(&chunk_str);

        // Process complete SSE events
        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].trim().to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            if line.starts_with("data: ") {
                let data = &line[6..];

                if data == "[DONE]" {
                    continue;
                }

                if let Ok(event) = serde_json::from_str::<StreamEvent>(data) {
                    match event.event_type.as_str() {
                        "content_block_start" => {
                            if let Some(block) = event.content_block {
                                if block.block_type == "tool_use" {
                                    // Start tracking a new tool use
                                    current_tool_use = Some(ToolUseState {
                                        id: block.id.unwrap_or_default(),
                                        name: block.name.unwrap_or_default(),
                                        input_json: String::new(),
                                    });
                                }
                            }
                        }
                        "content_block_delta" => {
                            if let Some(delta) = event.delta {
                                match delta.delta_type.as_str() {
                                    "text_delta" => {
                                        if let Some(text) = delta.text {
                                            text_content.push_str(&text);

                                            // Emit chunk to frontend
                                            let _ = app.emit(
                                                "claude-stream-chunk",
                                                StreamChunk {
                                                    chunk: text,
                                                    done: false,
                                                },
                                            );
                                        }
                                    }
                                    "input_json_delta" => {
                                        if let Some(partial) = delta.partial_json {
                                            if let Some(ref mut tool) = current_tool_use {
                                                tool.input_json.push_str(&partial);
                                            }
                                        }
                                    }
                                    _ => {}
                                }
                            }
                        }
                        "content_block_stop" => {
                            // If we were building a tool use, finalize it
                            if let Some(tool) = current_tool_use.take() {
                                // Parse the accumulated JSON
                                let input: serde_json::Value =
                                    serde_json::from_str(&tool.input_json)
                                        .unwrap_or(serde_json::Value::Object(serde_json::Map::new()));

                                let tool_event = ToolUseEvent {
                                    id: tool.id.clone(),
                                    name: tool.name.clone(),
                                    input: input.clone(),
                                };

                                // Emit tool use event to frontend
                                let _ = app.emit("claude-tool-use", tool_event.clone());

                                tool_uses.push(tool_event);
                            }
                        }
                        "message_delta" => {
                            // Stop reason is handled separately in message_stop
                            // message_delta may contain other info we don't need
                        }
                        "message_stop" => {
                            // Get stop reason from the message info if available
                            if let Some(msg) = event.message {
                                if let Some(reason) = msg.stop_reason {
                                    stop_reason = reason;
                                }
                            }

                            // Emit done signal
                            let _ = app.emit(
                                "claude-stream-chunk",
                                StreamChunk {
                                    chunk: String::new(),
                                    done: true,
                                },
                            );

                            // Emit message stop event
                            let _ = app.emit(
                                "claude-message-stop",
                                MessageStopEvent {
                                    stop_reason: stop_reason.clone(),
                                },
                            );
                        }
                        "error" => {
                            if let Some(err) = event.error {
                                let error_msg = format!("{}: {}", err.error_type, err.message);
                                let _ = app.emit(
                                    "claude-stream-error",
                                    StreamError { error: error_msg.clone() },
                                );
                                return Err(ClaudeError::Api(error_msg));
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    // Handle the case where stop_reason comes from tool_use
    if !tool_uses.is_empty() && stop_reason == "end_turn" {
        stop_reason = String::from("tool_use");
    }

    Ok(AssistantResponse {
        text_content,
        tool_uses,
        stop_reason,
    })
}
