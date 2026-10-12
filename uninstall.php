<?php

/**
 * Fired when the plugin is deleted (uninstalled).
 *
 * @package MotionKitConnector
 * @since 1.0.0
 */

// If uninstall not called from WordPress, exit
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

global $wpdb;

// Whether the sibling MotionKit plugin is still installed. Both plugins read and write the same animation content and the same JWT secret, so deleting this one while the other stays must not take that shared data with it. Checked on disk rather than by an active_plugins lookup, because a user may delete an inactive plugin, and because the sibling's own loaded-constant is not defined during this plugin's uninstall.
$mk_sibling_present = file_exists(WP_PLUGIN_DIR . '/motionkit/motionkit.php');

// ── Secrets, auth and bookkeeping: always removed ──
// These are per-install credentials and derived state. If the sibling plugin is still here it re-mints its own JWT secret and holds its own connection, so dropping these frees nothing it needs and leaves no reusable token behind in the database after a delete, which is what wp.org expects.
$mk_always = [
    // Activation bookkeeping.
    'motionkit_extension_version',
    'motionkit_extension_creation_date',
    // One-shot autoload-migration sentinel (maybe_fix_autoload_flags).
    'motionkit_autoload_fixed_v1',
    // Auth / session secrets.
    'motionkit_jwt_secret',
    'motionkit_jwt_secret_source',
    'motionkit_used_jtis',
    // OAuth state is an option (not a transient) so a Redis eviction cannot drop it mid-flow; the transient sweep at the bottom no longer covers it.
    'motionkit_oauth_state',
    'motionkit_access_token',
    'motionkit_connected_at',
    'motionkit_connected_email',
    'motionkit_license_state',
    'motionkit_license_key',
    'motionkit_license_key_manual',
    'motionkit_enc_fallback_key',
    // Store updater cache and outage back-off (PluginUpdater).
    'motionkit_connector_update_info',
    'motionkit_connector_update_failed',
    // Legacy pre-OAuth connection settings (read by JwtTokenManager::get_secret).
    'motionkit_editor_url',
    'motionkit_api_key',
];

foreach ($mk_always as $mk_option) {
    delete_option($mk_option);
}

// ── Scheduled event ──
$mk_cron = wp_next_scheduled('motionkit_license_refresh');
if ($mk_cron) {
    wp_unschedule_event($mk_cron, 'motionkit_license_refresh');
}
wp_clear_scheduled_hook('motionkit_license_refresh');

// ── Animation content: removed only when no sibling plugin shares it ──
// The settings/animation options and every motionkit_pg_* meta and option row are the user's actual work. They go when this is the last MotionKit plugin on the site; a delete of one of a paired install keeps them for the one that remains.
if (!$mk_sibling_present) {
    $mk_content_options = [
        'motionkit_global_settings',
        'motionkit_global_animations',
        'motionkit_global_animations_draft',
        'motionkit-page-transition-code',
        'motionkit_animation_folders',
        'motionkit_favourite_cloud_animation',
        'motionkit_favourite_cloud_animations',
        'motionkit_page_settings_updated_at',
        'motionkit_share_secret',
    ];
    foreach ($mk_content_options as $mk_option) {
        delete_option($mk_option);
    }

    // Per-page animation/settings/draft/share meta + option rows. Keys are motionkit_pg_<bucket>_<type>; they must be removed as one group or a delete would leave half a page's data behind.

    // Post meta.
    $wpdb->query(
        "DELETE FROM {$wpdb->postmeta} WHERE meta_key LIKE 'motionkit\\_pg\\_%'"
    );

    // Term meta (table may not exist on very old installs).
    if (!empty($wpdb->termmeta)) {
        $wpdb->query(
            "DELETE FROM {$wpdb->termmeta} WHERE meta_key LIKE 'motionkit\\_pg\\_%'"
        );
    }

    // Option-stored page configs (front/archive/404/search).
    $wpdb->query(
        "DELETE FROM {$wpdb->options} WHERE option_name LIKE 'motionkit\\_pg\\_%'"
    );
}

// Transients are caches, not content — always cleared.
$wpdb->query(
    "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_motionkit\\_%'
     OR option_name LIKE '\\_transient\\_timeout\\_motionkit\\_%'"
);
