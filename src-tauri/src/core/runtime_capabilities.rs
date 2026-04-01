use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CapabilityDescriptor {
    pub key: String,
    pub kind: String,
    pub display_name: String,
    pub availability: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProtocolDescriptor {
    pub key: String,
    pub display_name: String,
    pub schemes: Vec<String>,
    pub availability: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportDescriptor {
    pub key: String,
    pub display_name: String,
    pub availability: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HookDescriptor {
    pub key: String,
    pub display_name: String,
    pub availability: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ToolPackagingDescriptor {
    pub key: String,
    pub display_name: String,
    pub availability: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PluginManifestDescriptor {
    pub key: String,
    pub display_name: String,
    pub availability: String,
}

#[derive(Debug, Clone, Default)]
pub struct CapabilityRegistry {
    #[allow(dead_code)]
    descriptors: Vec<CapabilityDescriptor>,
}

impl CapabilityRegistry {
    pub fn with_builtin_defaults() -> Self {
        Self {
            descriptors: vec![
                CapabilityDescriptor {
                    key: "protocol.http".to_string(),
                    kind: "protocol".to_string(),
                    display_name: "HTTP".to_string(),
                    availability: "active".to_string(),
                },
                CapabilityDescriptor {
                    key: "import.backup".to_string(),
                    kind: "import_adapter".to_string(),
                    display_name: "Backup Restore".to_string(),
                    availability: "active".to_string(),
                },
                CapabilityDescriptor {
                    key: "import.curl".to_string(),
                    kind: "import_adapter".to_string(),
                    display_name: "Curl Import".to_string(),
                    availability: "active".to_string(),
                },
                CapabilityDescriptor {
                    key: "import.openapi".to_string(),
                    kind: "import_adapter".to_string(),
                    display_name: "OpenAPI Import".to_string(),
                    availability: "active".to_string(),
                },
                CapabilityDescriptor {
                    key: "execution_hook.reserved".to_string(),
                    kind: "execution_hook".to_string(),
                    display_name: "Execution Hook Seam".to_string(),
                    availability: "reserved".to_string(),
                },
                CapabilityDescriptor {
                    key: "tool_packaging.reserved".to_string(),
                    kind: "tool_packaging".to_string(),
                    display_name: "Tool Packaging Seam".to_string(),
                    availability: "reserved".to_string(),
                },
                CapabilityDescriptor {
                    key: "plugin_manifest.reserved".to_string(),
                    kind: "plugin_manifest".to_string(),
                    display_name: "Plugin Manifest Seam".to_string(),
                    availability: "reserved".to_string(),
                },
            ],
        }
    }

    pub fn descriptors(&self) -> &[CapabilityDescriptor] {
        &self.descriptors
    }
}

#[derive(Debug, Clone, Default)]
pub struct ProtocolRegistry {
    descriptors: Vec<ProtocolDescriptor>,
}

impl ProtocolRegistry {
    pub fn with_builtin_defaults() -> Self {
        Self {
            descriptors: vec![ProtocolDescriptor {
                key: "http".to_string(),
                display_name: "HTTP".to_string(),
                schemes: vec!["http".to_string(), "https".to_string()],
                availability: "active".to_string(),
            }],
        }
    }

    pub fn supports(&self, key: &str) -> bool {
        self.descriptors.iter().any(|descriptor| descriptor.key == key)
    }

    pub fn descriptors(&self) -> &[ProtocolDescriptor] {
        &self.descriptors
    }
}

#[derive(Debug, Clone, Default)]
pub struct ImportRegistry {
    #[allow(dead_code)]
    descriptors: Vec<ImportDescriptor>,
}

impl ImportRegistry {
    pub fn with_builtin_defaults() -> Self {
        Self {
            descriptors: vec![ImportDescriptor {
                key: "backup".to_string(),
                display_name: "Backup Restore".to_string(),
                availability: "active".to_string(),
            }, ImportDescriptor {
                key: "curl".to_string(),
                display_name: "Curl Import".to_string(),
                availability: "active".to_string(),
            }, ImportDescriptor {
                key: "openapi".to_string(),
                display_name: "OpenAPI Import".to_string(),
                availability: "active".to_string(),
            }],
        }
    }

    pub fn descriptors(&self) -> &[ImportDescriptor] {
        &self.descriptors
    }
}

#[derive(Debug, Clone, Default)]
pub struct HookRegistry {
    #[allow(dead_code)]
    descriptors: Vec<HookDescriptor>,
}

impl HookRegistry {
    pub fn with_builtin_defaults() -> Self {
        Self {
            descriptors: Vec::new(),
        }
    }

    pub fn descriptors(&self) -> &[HookDescriptor] {
        &self.descriptors
    }
}

pub fn builtin_tool_packaging_descriptors() -> Vec<ToolPackagingDescriptor> {
    vec![ToolPackagingDescriptor {
        key: "tool_packaging.reserved".to_string(),
        display_name: "Tool Packaging Seam".to_string(),
        availability: "reserved".to_string(),
    }]
}

pub fn builtin_plugin_manifest_descriptors() -> Vec<PluginManifestDescriptor> {
    vec![PluginManifestDescriptor {
        key: "plugin_manifest.reserved".to_string(),
        display_name: "Plugin Manifest Seam".to_string(),
        availability: "reserved".to_string(),
    }]
}

#[cfg(test)]
mod tests {
    use super::{CapabilityRegistry, HookRegistry, ImportRegistry, ProtocolRegistry};

    #[test]
    fn builtin_registries_declare_http_and_all_import_adapter_capabilities() {
        let capability_registry = CapabilityRegistry::with_builtin_defaults();
        let protocol_registry = ProtocolRegistry::with_builtin_defaults();
        let import_registry = ImportRegistry::with_builtin_defaults();
        let hook_registry = HookRegistry::with_builtin_defaults();

        assert!(capability_registry
            .descriptors()
            .iter()
            .any(|descriptor| descriptor.kind == "protocol" && descriptor.key == "protocol.http"));
        assert!(capability_registry
            .descriptors()
            .iter()
            .any(|descriptor| descriptor.kind == "import_adapter" && descriptor.key == "import.backup"));
        assert!(capability_registry
            .descriptors()
            .iter()
            .any(|descriptor| descriptor.kind == "import_adapter" && descriptor.key == "import.curl"));
        assert!(capability_registry
            .descriptors()
            .iter()
            .any(|descriptor| descriptor.kind == "import_adapter" && descriptor.key == "import.openapi"));
        assert!(protocol_registry
            .descriptors()
            .iter()
            .any(|descriptor| descriptor.key == "http"));
        assert!(import_registry
            .descriptors()
            .iter()
            .any(|descriptor| descriptor.key == "backup"));
        assert!(import_registry
            .descriptors()
            .iter()
            .any(|descriptor| descriptor.key == "curl"));
        assert!(import_registry
            .descriptors()
            .iter()
            .any(|descriptor| descriptor.key == "openapi"));
        assert!(hook_registry.descriptors().is_empty());
    }

    // [Gate D: Stage Discipline] — future-stage capabilities remain reserved and are not active in the current MVP stage
    #[test]
    fn future_capability_seams_remain_reserved_until_enabled() {
        let capability_registry = CapabilityRegistry::with_builtin_defaults();

        for key in [
            "execution_hook.reserved",
            "tool_packaging.reserved",
            "plugin_manifest.reserved",
        ] {
            assert!(capability_registry
                .descriptors()
                .iter()
                .any(|descriptor| descriptor.key == key && descriptor.availability == "reserved"));
        }

        assert!(capability_registry
            .descriptors()
            .iter()
            .any(|descriptor| descriptor.key == "import.openapi" && descriptor.availability == "active"));
    }
}
