import { createHash } from "node:crypto";
import { AMIC_INTERNAL_WINDOWS_STATE_SCHEMA } from "../../validate-amic-os-internal-windows-state.mjs";

export function createSyntheticAmicWindowsState(overrides = {}) {
  const trusted = Object.freeze({
    canaryId: "amic-os-canary-20260904-001",
    version: "0.1.32",
    sourceSha: "1".repeat(40),
    sourceTree: "2".repeat(40),
    installerSha256: "3".repeat(64),
    ...overrides,
  });

  const sha256 = (value) => createHash("sha256").update(value).digest("hex");

  function absentFile() {
    return {
      present: false,
      reparse_point: false,
      bytes: null,
      sha256: null,
      file_version: null,
      product_version: null,
    };
  }

  function presentFile(value, version = false) {
    return {
      present: true,
      reparse_point: false,
      bytes: Buffer.byteLength(value),
      sha256: sha256(value),
      file_version: version ? trusted.version : null,
      product_version: version ? `${trusted.version}.0` : null,
    };
  }

  function boundaries() {
    return {
      host_state_read_only: true,
      evidence_file_write_count: 1,
      registry_write_count: 0,
      network_request_count: 0,
      installer_launch_count: 0,
      uninstall_launch_count: 0,
      application_launch_count: 0,
      destructive_action_count: 0,
      private_data_read_count: 0,
      download_verified: false,
      windows_warning_captured: false,
      human_sign_in_checked: false,
      hosted_data_checked: false,
      outlook_action_checked: false,
      update_checked: false,
      rollback_checked: false,
      hosted_data_preservation_checked: false,
      g9_complete_claim: false,
    };
  }

  function expected() {
    return {
      computer_name: "JWS-GALAXYBOOK",
      version: trusted.version,
      source_sha: trusted.sourceSha,
      source_tree: trusted.sourceTree,
      installer_sha256: trusted.installerSha256,
      install_root: "C:\\Program Files\\matter",
      app_id: "com.amic.matter.desktop.internal",
      distribution_profile: "internal-unsigned",
    };
  }

  function host(fingerprint = "4".repeat(64)) {
    return {
      windows: true,
      computer_name: "JWS-GALAXYBOOK",
      computer_name_exact: true,
      host_fingerprint_sha256: fingerprint,
      os_version: "10.0.26100",
      os_build_number: "26100",
      os_architecture: "x64",
      process_architecture: "x64",
      system_drive: "C:",
      system_drive_total_bytes: 512_000_000_000,
      system_drive_free_bytes: 256_000_000_000,
    };
  }

  function nativeSnapshot(files) {
    const rows = Object.entries(files).map(([filePath, value]) => ({
      path: filePath,
      bytes: Buffer.byteLength(value),
      sha256: sha256(value),
    })).sort((left, right) => Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)));
    const contentSha256 = sha256(rows.map(({ path: filePath, bytes, sha256: digest }) => (
      `${digest} ${bytes} ${filePath}\n`
    )).join(""));
    const identitySha256 = "5".repeat(64);
    return {
      schema_version: "law-firm-os.windows-installed-tree-native-snapshot.v1",
      platform: "win32",
      powershell_version: "7.5.2",
      filesystem: "NTFS",
      fixed_point_sequence: ["B0", "I1", "B1", "I2", "B2"],
      fixed_point_exact: true,
      content_sha256: contentSha256,
      identity_sha256: identitySha256,
      file_count: rows.length,
      directory_count: 3,
      bytes: rows.reduce((sum, row) => sum + row.bytes, 0),
      reparse_point_count: 0,
      alternate_data_stream_count: 0,
      hard_link_count: 0,
      files: rows,
      phases: ["B0", "I1", "B1", "I2", "B2"].map((name) => ({
        name,
        content_sha256: contentSha256,
        identity_sha256: identitySha256,
        file_count: rows.length,
        directory_count: 3,
        bytes: rows.reduce((sum, row) => sum + row.bytes, 0),
      })),
    };
  }

  function observed(stage) {
    const zero = stage !== "installed";
    const values = {
      "./matter.exe": "executable",
      "./resources/matter-build-manifest.json": "build-manifest",
      "./resources/matter-internal-unsigned-release.json": "release-marker",
      "./resources/matter-internal-update-trust.json": "update-trust",
      "./resources/classic-outlook/AMIC.OS.Vault.Outlook.dll": "outlook-addin",
    };
    return {
      install_root_present: !zero,
      executable: zero ? absentFile() : presentFile(values["./matter.exe"], true),
      build_manifest_file: zero
        ? absentFile()
        : presentFile(values["./resources/matter-build-manifest.json"]),
      internal_unsigned_marker_file: zero
        ? absentFile()
        : presentFile(values["./resources/matter-internal-unsigned-release.json"]),
      update_trust_file: zero
        ? absentFile()
        : presentFile(values["./resources/matter-internal-update-trust.json"]),
      classic_outlook_addin_file: zero
        ? absentFile()
        : presentFile(values["./resources/classic-outlook/AMIC.OS.Vault.Outlook.dll"]),
      package_metadata: zero ? {
        build_manifest: null,
        internal_unsigned_marker: null,
        update_trust: null,
      } : {
        build_manifest: {
          sha256: sha256(values["./resources/matter-build-manifest.json"]),
          schema_version: "law-firm-os.matter-desktop-build-provenance.v1",
          version: trusted.version,
          source_sha: trusted.sourceSha,
          source_tree: trusted.sourceTree,
          renderer_sha256: "6".repeat(64),
          renderer_file_count: 20,
          channel: "internal",
          platform: "win32",
          architecture: "x64",
          app_id: "com.amic.matter.desktop.internal",
          source_clean: true,
          public_release_claim: false,
          production_go_live_claim: false,
          exact: true,
        },
        internal_unsigned_marker: {
          sha256: sha256(values["./resources/matter-internal-unsigned-release.json"]),
          channel: "internal",
          distribution_profile: "internal-unsigned",
          local_api_default: "disabled",
          bundled_local_api: false,
          exact: true,
        },
        update_trust: {
          sha256: sha256(values["./resources/matter-internal-update-trust.json"]),
          schema_version: "law-firm-os.matter-desktop-internal-update-trust.v1",
          key_id: "matter-internal-update-key-v1",
          public_key_spki_sha256: "7".repeat(64),
          private_key_material_included: false,
          public_release_allowed: false,
          exact: true,
        },
      },
      uninstall_entry_count: zero ? 0 : 1,
      uninstall_exact_count: zero ? 0 : 1,
      product_process_count: 0,
      product_service_count: 0,
      product_scheduled_task_count: 0,
      update_cache_present: false,
      outlook_attachment_cache_present: false,
      registry: {
        desktop_entry_count: zero ? 0 : 2,
        desktop_exact_count: zero ? 0 : 2,
        outlook_addin_entry_count: zero ? 0 : 2,
        outlook_addin_exact_count: zero ? 0 : 2,
        outlook_com_entry_count: zero ? 0 : 2,
        outlook_com_exact_count: zero ? 0 : 2,
        protocol_handler_count: zero ? 0 : 2,
        protocol_handler_exact_count: zero ? 0 : 2,
      },
      shortcuts: {
        count: zero ? 0 : 2,
        exact_target_count: zero ? 0 : 2,
        aggregate_sha256: zero ? null : "8".repeat(64),
      },
      native_installed_tree: zero ? null : nativeSnapshot(values),
    };
  }

  function checks() {
    return {
      host_identity_exact: true,
      windows_x64: true,
      install_root_exact: true,
      uninstall_entry_exact: true,
      process_state_exact: true,
      service_state_exact: true,
      scheduled_task_state_exact: true,
      update_cache_state_exact: true,
      outlook_attachment_cache_state_exact: true,
      desktop_registry_state_exact: true,
      outlook_addin_registry_state_exact: true,
      outlook_com_registry_state_exact: true,
      protocol_handler_state_exact: true,
      shortcut_state_exact: true,
      build_identity_exact: true,
      internal_unsigned_marker_exact: true,
      update_trust_exact: true,
      classic_outlook_file_exact: true,
      native_installed_tree_exact: true,
      stage_state_exact: true,
    };
  }

  function receipt(stage, capturedAt) {
    return {
      schema_version: AMIC_INTERNAL_WINDOWS_STATE_SCHEMA,
      verdict: "PASS",
      stage,
      canary_id: trusted.canaryId,
      captured_at_utc: capturedAt,
      expected: expected(),
      host: host(),
      checks: checks(),
      observed: observed(stage),
      safe_error_codes: [],
      boundaries: boundaries(),
    };
  }

  function sequence() {
    return {
      preinstall: receipt("preinstall", "2026-09-04T01:00:00.000Z"),
      installed: receipt("installed", "2026-09-04T02:00:00.000Z"),
      postuninstall: receipt("postuninstall", "2026-09-04T03:00:00.000Z"),
    };
  }
  return { trusted, receipt, sequence };
}
