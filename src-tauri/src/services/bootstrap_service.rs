use crate::core::app_state::AppState;
use crate::core::runtime_capabilities::{
    builtin_plugin_manifest_descriptors, builtin_tool_packaging_descriptors,
};
use crate::errors::AppError;
use crate::models::{
    AppBootstrapPayload, LegacyWorkspaceSnapshotDto, RuntimeCapabilitiesDto,
    RuntimeCapabilityDescriptorDto, RuntimeExecutionHookCapabilityDto,
    RuntimeImportAdapterCapabilityDto, RuntimePluginManifestCapabilityDto,
    RuntimeProtocolCapabilityDto, RuntimeToolPackagingCapabilityDto,
};
use crate::storage::db;

fn build_runtime_capabilities(state: &AppState) -> RuntimeCapabilitiesDto {
    RuntimeCapabilitiesDto {
        descriptors: state
            .capability_registry
            .descriptors()
            .iter()
            .map(|descriptor| RuntimeCapabilityDescriptorDto {
                key: descriptor.key.clone(),
                kind: descriptor.kind.clone(),
                display_name: descriptor.display_name.clone(),
                availability: descriptor.availability.clone(),
            })
            .collect(),
        protocols: state
            .protocol_registry
            .descriptors()
            .iter()
            .map(|descriptor| RuntimeProtocolCapabilityDto {
                key: descriptor.key.clone(),
                display_name: descriptor.display_name.clone(),
                schemes: descriptor.schemes.clone(),
                availability: descriptor.availability.clone(),
            })
            .collect(),
        import_adapters: state
            .import_registry
            .descriptors()
            .iter()
            .map(|descriptor| RuntimeImportAdapterCapabilityDto {
                key: descriptor.key.clone(),
                display_name: descriptor.display_name.clone(),
                availability: descriptor.availability.clone(),
            })
            .collect(),
        execution_hooks: state
            .hook_registry
            .descriptors()
            .iter()
            .map(|descriptor| RuntimeExecutionHookCapabilityDto {
                key: descriptor.key.clone(),
                display_name: descriptor.display_name.clone(),
                availability: descriptor.availability.clone(),
            })
            .collect(),
        tool_packaging: builtin_tool_packaging_descriptors()
            .into_iter()
            .map(|descriptor| RuntimeToolPackagingCapabilityDto {
                key: descriptor.key,
                display_name: descriptor.display_name,
                availability: descriptor.availability,
            })
            .collect(),
        plugin_manifests: builtin_plugin_manifest_descriptors()
            .into_iter()
            .map(|descriptor| RuntimePluginManifestCapabilityDto {
                key: descriptor.key,
                display_name: descriptor.display_name,
                availability: descriptor.availability,
            })
            .collect(),
    }
}

pub fn bootstrap_app(
    state: &AppState,
    legacy_snapshot: Option<LegacyWorkspaceSnapshotDto>,
) -> Result<AppBootstrapPayload, AppError> {
    let mut payload = db::ensure_bootstrap_data(&state.db_path, legacy_snapshot)?;

    if let Ok(mut guard) = state.settings_cache.write() {
        *guard = Some(payload.settings.clone());
    }

    payload.capabilities = Some(build_runtime_capabilities(state));
    Ok(payload)
}
