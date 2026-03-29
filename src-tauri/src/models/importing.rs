use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ImportCurlPayloadDto {
    pub workspace_id: String,
    pub command: String,
}
