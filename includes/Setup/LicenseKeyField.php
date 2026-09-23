<?php

/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

namespace MotionKitConnector\Setup;

use MotionKitConnector\Auth\LicenseStatus;

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * License key field in the Connector's Plugins-list row.
 *
 * The standard EDD flow: the key is checked against the store, activated for
 * this site's URL if it is not yet, and only then saved for the updater. It is
 * the fallback for sites the editor server does not hand a key to.
 *
 * @package MotionKitConnector
 * @since 1.0.1
 */
final class LicenseKeyField
{
    private const SAVE_ACTION = 'motionkit_connector_save_key';
    private const RESULT_ARG = 'motionkit_key_result';

    // EDD statuses a saved key can end on; anything else is reported as invalid.
    private const RESULTS = [
        'valid', 'removed', 'expired', 'disabled', 'revoked', 'invalid',
        'no_activations_left', 'item_mismatch', 'error',
    ];

    private string $basename;

    public function __construct(string $plugin_file)
    {
        $this->basename = plugin_basename($plugin_file);
    }

    public function init(): void
    {
        if (!is_admin()) {
            return;
        }

        add_action('after_plugin_row_' . $this->basename, [$this, 'render_row'], 10, 2);
        add_action('admin_post_' . self::SAVE_ACTION, [$this, 'handle_save']);
        add_action('admin_notices', [$this, 'render_notice']);
    }

    /**
     * @param string $plugin_file
     * @param array  $plugin_data
     */
    public function render_row($plugin_file, $plugin_data): void
    {
        if (!current_user_can('update_plugins')) {
            return;
        }

        $manual = LicenseStatus::get_manual_key();
        $active = is_plugin_active($this->basename) ? ' active' : '';
        $columns = _get_list_table('WP_Plugins_List_Table')->get_column_count();

        printf('<tr class="plugin-update-tr%s"><td colspan="%d" class="plugin-update colspanchange">', esc_attr($active), (int) $columns);
        echo '<div class="notice inline notice-info notice-alt"><form method="post" action="' . esc_url(admin_url('admin-post.php')) . '" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0;">';
        echo '<input type="hidden" name="action" value="' . esc_attr(self::SAVE_ACTION) . '">';
        wp_nonce_field(self::SAVE_ACTION);

        printf('<label for="motionkit-connector-license-key"><strong>%s</strong></label>', esc_html__('License key', 'motionkit-connector'));
        printf(
            // Pinned to the small-button height; WordPress's admin inputs are taller and made the one-line row look like a form section.
            '<input type="password" id="motionkit-connector-license-key" name="license_key" class="regular-text" autocomplete="off" placeholder="%s" style="min-height:26px;height:26px;line-height:24px;padding:0 8px;font-size:13px;">',
            esc_attr($manual !== '' ? sprintf(__('Saved key ending in %s', 'motionkit-connector'), substr($manual, -4)) : __('Paste your MotionKit license key', 'motionkit-connector'))
        );
        submit_button(__('Save key', 'motionkit-connector'), 'secondary small', 'motionkit_save_key', false);

        if ($manual !== '') {
            submit_button(__('Remove key', 'motionkit-connector'), 'link-delete small', 'motionkit_remove_key', false);
        }

        printf(
            '<span class="description">%s</span>',
            esc_html__('Enables automatic updates. Find your key in your MotionKit account.', 'motionkit-connector')
        );
        echo '</form></div></td></tr>';
    }

    public function handle_save(): void
    {
        if (!current_user_can('update_plugins')) {
            wp_die(esc_html__('You do not have permission to perform this action.', 'motionkit-connector'));
        }

        check_admin_referer(self::SAVE_ACTION);

        if (isset($_POST['motionkit_remove_key'])) {
            LicenseStatus::set_manual_key('');
            $this->redirect('removed');
        }

        $key = isset($_POST['license_key']) ? trim(sanitize_text_field(wp_unslash($_POST['license_key']))) : '';

        if ('' === $key) {
            $this->redirect('invalid');
        }

        $status = $this->check($key);

        // Connect normally activates the site on its license; a key pasted here for a site that never connected, or one moved from another site, still needs this site's URL activated before EDD will hand it a package.
        if (in_array($status, ['site_inactive', 'inactive'], true)) {
            $status = $this->request('activate_license', $key);
        }

        if ('valid' === $status) {
            LicenseStatus::set_manual_key($key);
            // A cached "no update" answer belongs to the previous key; clearing WordPress's transient makes the next Plugins load ask the store with this one.
            delete_site_transient('update_plugins');
        }

        $this->redirect($this->result_for($status));
    }

    public function render_notice(): void
    {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display only; the value is matched against a fixed list.
        $result = isset($_GET[self::RESULT_ARG]) ? sanitize_key(wp_unslash($_GET[self::RESULT_ARG])) : '';

        if (!in_array($result, self::RESULTS, true) || !current_user_can('update_plugins')) {
            return;
        }

        $messages = [
            'valid'               => ['success', __('License key saved. MotionKit Connector updates are enabled on this site.', 'motionkit-connector')],
            'removed'             => ['success', __('License key removed.', 'motionkit-connector')],
            'expired'             => ['error', __('This license key has expired. Renew it in your MotionKit account to receive updates.', 'motionkit-connector')],
            'disabled'            => ['error', __('This license key has been disabled. Please contact MotionKit support.', 'motionkit-connector')],
            'revoked'             => ['error', __('This license key has been revoked. Please contact MotionKit support.', 'motionkit-connector')],
            'no_activations_left' => ['error', __('This license key has no site activations left. Free one in your MotionKit account, then try again.', 'motionkit-connector')],
            'item_mismatch'       => ['error', __('This key is not a MotionKit license key.', 'motionkit-connector')],
            'invalid'             => ['error', __('That license key is not valid. Check it and try again.', 'motionkit-connector')],
            'error'               => ['error', __('Could not reach the MotionKit license server. Please try again in a few minutes.', 'motionkit-connector')],
        ];

        [$type, $message] = $messages[$result];

        printf('<div class="notice notice-%1$s is-dismissible"><p>%2$s</p></div>', esc_attr($type), esc_html($message));
    }

    private function check(string $key): string
    {
        return $this->request('check_license', $key);
    }

    // Returns EDD's license status for this site, or 'error' when the store could not be reached.
    private function request(string $action, string $key): string
    {
        $response = wp_remote_post(
            PluginUpdater::STORE_URL,
            [
                'timeout' => 15,
                'body'    => [
                    'edd_action' => $action,
                    'license'    => $key,
                    'item_id'    => PluginUpdater::ITEM_ID,
                    'url'        => home_url(),
                ],
            ]
        );

        if (is_wp_error($response) || 200 !== (int) wp_remote_retrieve_response_code($response)) {
            return 'error';
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);

        if (!is_array($body)) {
            return 'error';
        }

        // activate_license reports a refusal as success:false with the reason in `error`; check_license only ever fills `license`.
        if (isset($body['success']) && false === $body['success'] && !empty($body['error'])) {
            return sanitize_key((string) $body['error']);
        }

        return sanitize_key((string) ($body['license'] ?? 'invalid'));
    }

    private function result_for(string $status): string
    {
        $map = [
            'valid'               => 'valid',
            'expired'             => 'expired',
            'disabled'            => 'disabled',
            'revoked'             => 'revoked',
            'no_activations_left' => 'no_activations_left',
            'item_name_mismatch'  => 'item_mismatch',
            'invalid_item_id'     => 'item_mismatch',
            'key_mismatch'        => 'item_mismatch',
            'error'               => 'error',
        ];

        return $map[$status] ?? 'invalid';
    }

    private function redirect(string $result): void
    {
        wp_safe_redirect(add_query_arg(self::RESULT_ARG, $result, self_admin_url('plugins.php')));
        exit;
    }
}
