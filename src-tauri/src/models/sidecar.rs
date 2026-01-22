use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DocumentStage {
    Idea,
    Concept,
    Outline,
    Draft,
    Edits,
    Polish,
}

impl Default for DocumentStage {
    fn default() -> Self {
        DocumentStage::Concept
    }
}

/// Content block types for messages (tool calling support)
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub role: String,
    pub content: MessageContent,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConceptSnapshot {
    pub title: String,
    pub core_argument: String,
    pub audience: String,
    pub tone: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Concept {
    pub current: Option<ConceptSnapshot>,
    pub versions: Vec<ConceptSnapshot>,
}

impl Default for Concept {
    fn default() -> Self {
        Concept {
            current: None,
            versions: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutlinePrompt {
    pub id: String,
    pub title: String,
    pub description: String,
    pub estimated_words: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutlineSnapshot {
    pub prompts: Vec<OutlinePrompt>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Outline {
    pub current: Option<Vec<OutlinePrompt>>,
    pub versions: Vec<OutlineSnapshot>,
}

impl Default for Outline {
    fn default() -> Self {
        Outline {
            current: None,
            versions: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub messages: Vec<ChatMessage>,
    pub summary: String,
}

impl Default for Conversation {
    fn default() -> Self {
        Conversation {
            messages: Vec::new(),
            summary: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditHistoryEntry {
    pub id: String,
    pub scope: String,
    pub before: String,
    pub after: String,
    pub accepted: bool,
    pub created_at: String,
    pub rationale: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub model: String,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            model: "claude-sonnet-4-20250514".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Meta {
    pub app_version: String,
    pub last_opened_at: String,
}

impl Default for Meta {
    fn default() -> Self {
        Meta {
            app_version: "0.1.0".to_string(),
            last_opened_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sidecar {
    pub version: String,
    pub document_id: String,
    pub created_at: String,
    pub stage: DocumentStage,
    pub concept: Concept,
    pub outline: Outline,
    pub conversation: Conversation,
    pub editing_history: Vec<EditHistoryEntry>,
    pub settings: Settings,
    pub meta: Meta,
}

impl Sidecar {
    pub fn new() -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Sidecar {
            version: "1.0".to_string(),
            document_id: uuid::Uuid::new_v4().to_string(),
            created_at: now.clone(),
            stage: DocumentStage::default(),
            concept: Concept::default(),
            outline: Outline::default(),
            conversation: Conversation::default(),
            editing_history: Vec::new(),
            settings: Settings::default(),
            meta: Meta {
                app_version: "0.1.0".to_string(),
                last_opened_at: now,
            },
        }
    }
}

impl Default for Sidecar {
    fn default() -> Self {
        Self::new()
    }
}
