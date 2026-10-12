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

// Whether the sibling MotionKit plugin is still installed, in any folder. Both plugins read and write the same animation content and the same JWT secret, so deleting this one while the other stays must not take that shared data with it. An active sibling is loaded in this request (WordPress runs uninstall inside a normal admin request), so its constant settles it; an inactive one is found by its text domain, since it may sit in a folder other than motionkit/ (DependencyInstaller resolves it the same way).
$mk_sibling_present = defined('MOTIONKIT_LOADED');
if (!$mk_sibling_present) {
    if (!function_exists('get_plugins')) {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
    }
    $mk_self = defined('WP_UNINSTALL_PLUGIN') ? (string) WP_UNINSTALL_PLUGIN : '';
    foreach (get_plugins() as $mk_basename => $mk_header) {
        if ($mk_basename !== $mk_self && ($mk_header['TextDomain'] ?? '') === 'motionkit') {
            $mk_sibling_present = true;
            break;
        }
    }
}

// ── Options only this plugin reads: always removed ──
$mk_always = [
    // Activation bookkeeping.
    'motionkit_extension_version',
    'motionkit_extension_creation_date',
    // One-shot autoload-migration sentinel (maybe_fix_autoload_flags).
    'motionkit_autoload_fixed_v1',
    // Single-use jti list; the core plugin does not track jti.
    'motionkit_used_jtis',
    'motionkit_license_state',
    'motionkit_license_key',
    'motionkit_license_key_manual',
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

// ── Connection and signing secrets shared with the core plugin ──
// The core plugin reads the same access token, connection details, OAuth state, JWT secret and encryption fallback key. Deleting them while it stays would disconnect the site — which is exactly what deleting and reinstalling this plugin to update it would do — so they go only when this is the last MotionKit plugin, and then no reusable credential is left behind.
if (!$mk_sibling_present) {
    $mk_shared_auth = [
        'motionkit_jwt_secret',
        'motionkit_jwt_secret_source',
        // OAuth state is an option (not a transient) so a Redis eviction cannot drop it mid-flow; the transient sweep at the bottom does not cover it.
        'motionkit_oauth_state',
        'motionkit_access_token',
        'motionkit_connected_at',
        'motionkit_connected_email',
        'motionkit_enc_fallback_key',
    ];
    foreach ($mk_shared_auth as $mk_option) {
        delete_option($mk_option);
    }
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
