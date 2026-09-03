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

// // ── Options actually written by this plugin ──
// $mk_options = [
//     // Activation bookkeeping
//     'motionkit_extension_version',
//     'motionkit_extension_creation_date',
//     // One-shot autoload-migration sentinel (maybe_fix_autoload_flags).
//     'motionkit_autoload_fixed_v1',
//     // Settings / animation data
//     'motionkit_global_settings',
//     'motionkit_global_animations',
//     'motionkit-page-transition-code',
//     'motionkit_animation_folders',
//     'motionkit_favourite_cloud_animation',
//     'motionkit_page_settings_updated_at',
//     // Auth / session secrets
//     'motionkit_jwt_secret',
//     'motionkit_used_jtis',
//     'motionkit_access_token',
//     'motionkit_connected_at',
//     'motionkit_connected_email',
//     'motionkit_license_state',
//     'motionkit_enc_fallback_key',
//     // Legacy pre-OAuth connection settings (read by JwtTokenManager::get_secret).
//     'motionkit_editor_url',
//     'motionkit_api_key',
// ];

// foreach ($mk_options as $mk_option) {
//     delete_option($mk_option);
// }

// // ── Scheduled event ──
// $mk_cron = wp_next_scheduled('motionkit_license_refresh');
// if ($mk_cron) {
//     wp_unschedule_event($mk_cron, 'motionkit_license_refresh');
// }
// wp_clear_scheduled_hook('motionkit_license_refresh');

// // ── Per-page animation/settings meta + option rows ──
// // Keys are motionkit_pg_animation_<type> / motionkit_pg_settings_<type>.
// global $wpdb;

// // Post meta.
// $wpdb->query(
//     "DELETE FROM {$wpdb->postmeta} WHERE meta_key LIKE 'motionkit\\_pg\\_%'"
// );

// // Term meta (table may not exist on very old installs).
// if (!empty($wpdb->termmeta)) {
//     $wpdb->query(
//         "DELETE FROM {$wpdb->termmeta} WHERE meta_key LIKE 'motionkit\\_pg\\_%'"
//     );
// }

// // Option-stored page configs (front/archive/404/search) + any transients.
// $wpdb->query(
//     "DELETE FROM {$wpdb->options} WHERE option_name LIKE 'motionkit\\_pg\\_%'"
// );
// $wpdb->query(
//     "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_motionkit\\_%'
//      OR option_name LIKE '\\_transient\\_timeout\\_motionkit\\_%'"
// );
