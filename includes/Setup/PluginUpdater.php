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
 * Serves Connector updates from the MotionKit store (EDD Software Licensing).
 *
 * The store only hands out a package for a license that is valid for the item on
 * this site's URL. The site is activated on the license when it connects, and
 * LicenseStatus receives the key from the editor server, so a site with no
 * license key never registers the updater at all.
 *
 * @package MotionKitConnector
 * @since 1.0.0
 */
final class PluginUpdater
{
    private const STORE_URL = 'https://my.motionkit.io/';
    private const ITEM_ID = 17;
    private const CACHE_OPTION = 'motionkit_connector_update_info';
    private const FAILED_OPTION = 'motionkit_connector_update_failed';
    private const CACHE_TTL = 3 * HOUR_IN_SECONDS;
    private const RETRY_AFTER = HOUR_IN_SECONDS;

    private string $basename;
    private string $slug;
    private string $license = '';
    private bool $force_checked = false;

    public function __construct(string $plugin_file)
    {
        $this->basename = plugin_basename($plugin_file);
        $this->slug = dirname($this->basename);
    }

    public function init(): void
    {
        // Updates are only ever checked from wp-admin, the wp_version_check cron and WP-CLI, so a front-end request has nothing to hook.
        if (!is_admin() && !wp_doing_cron() && !(defined('WP_CLI') && WP_CLI)) {
            return;
        }

        $this->license = LicenseStatus::get_license_key();

        if ('' === $this->license) {
            return;
        }

        add_filter('pre_set_site_transient_update_plugins', [$this, 'check_update']);
        add_filter('plugins_api', [$this, 'plugins_api'], 10, 3);
    }

    /**
     * Inject this plugin's entry into the update_plugins transient.
     *
     * @param mixed $transient
     * @return mixed
     */
    public function check_update($transient)
    {
        if (!is_object($transient)) {
            $transient = new \stdClass();
        }

        $info = $this->get_info();

        if (!$info) {
            return $transient;
        }

        $item = $this->to_update_item($info);

        if (version_compare(MOTIONKIT_CONNECTOR_VERSION, $info->new_version, '<')) {
            $transient->response[$this->basename] = $item;
            unset($transient->no_update[$this->basename]);
        } else {
            // WordPress needs the no_update entry to offer the auto-update toggle for a plugin that is not on wordpress.org.
            $transient->no_update[$this->basename] = $item;
            unset($transient->response[$this->basename]);
        }

        $transient->checked[$this->basename] = MOTIONKIT_CONNECTOR_VERSION;

        return $transient;
    }

    /**
     * Answer the "View version details" modal for this plugin.
     *
     * @param mixed  $result
     * @param string $action
     * @param object $args
     * @return mixed
     */
    public function plugins_api($result, $action = '', $args = null)
    {
        if ('plugin_information' !== $action || !isset($args->slug) || $args->slug !== $this->slug) {
            return $result;
        }

        $info = $this->get_info();

        if (!$info) {
            return $result;
        }

        return (object) [
            'name'          => $info->name,
            'slug'          => $this->slug,
            'version'       => $info->new_version,
            'new_version'   => $info->new_version,
            'author'        => '<a href="https://motionkit.io">MotionKit</a>',
            'homepage'      => $info->homepage,
            'download_link' => $info->package,
            'last_updated'  => $info->last_updated,
            'tested'        => $info->tested,
            'requires'      => $info->requires,
            'requires_php'  => $info->requires_php,
            'sections'      => $info->sections,
            'banners'       => $info->banners,
            'icons'         => $info->icons,
        ];
    }

    private function to_update_item(object $info): object
    {
        return (object) [
            'id'           => $this->basename,
            'slug'         => $this->slug,
            'plugin'       => $this->basename,
            'new_version'  => $info->new_version,
            'url'          => $info->homepage,
            'package'      => $info->package,
            'tested'       => $info->tested,
            'requires'     => $info->requires,
            'requires_php' => $info->requires_php,
            'icons'        => $info->icons,
            'banners'      => $info->banners,
        ];
    }

    /**
     * The store's answer, cached for CACHE_TTL and keyed to the license so a changed key is never served another key's package.
     *
     * @return object|null
     */
    private function get_info(): ?object
    {
        $license_hash = md5($this->license);
        $cache = get_option(self::CACHE_OPTION);

        if (!$this->is_force_check()
            && is_array($cache)
            && ($cache['license'] ?? '') === $license_hash
            && (int) ($cache['timeout'] ?? 0) > time()
        ) {
            $cached = json_decode((string) ($cache['value'] ?? ''), true);

            return is_array($cached) ? (object) $cached : null;
        }

        // A store outage would otherwise add a 15s request to every wp-admin page load until it recovers.
        if ((int) get_option(self::FAILED_OPTION, 0) > time()) {
            return null;
        }

        $info = $this->fetch_remote();

        if (!$info) {
            update_option(self::FAILED_OPTION, time() + self::RETRY_AFTER, false);
            return null;
        }

        delete_option(self::FAILED_OPTION);
        update_option(
            self::CACHE_OPTION,
            [
                'license' => $license_hash,
                'timeout' => time() + self::CACHE_TTL,
                'value'   => wp_json_encode($info),
            ],
            false
        );

        return (object) $info;
    }

    // "Check again" on Dashboard → Updates should reach the store once, not reuse a three-hour-old answer; the flag stops the several transient writes in that request from each refetching.
    private function is_force_check(): bool
    {
        if ($this->force_checked) {
            return false;
        }

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only; it only decides whether to bypass a cache.
        if (empty($_GET['force-check']) || !current_user_can('update_plugins')) {
            return false;
        }

        $this->force_checked = true;

        return true;
    }

    /**
     * @return array|null
     */
    private function fetch_remote(): ?array
    {
        $response = wp_remote_post(
            self::STORE_URL,
            [
                'timeout' => 15,
                'body'    => [
                    'edd_action'  => 'get_version',
                    'license'     => $this->license,
                    'item_id'     => self::ITEM_ID,
                    'version'     => MOTIONKIT_CONNECTOR_VERSION,
                    'slug'        => $this->slug,
                    'url'         => home_url(),
                    'beta'        => false,
                    'php_version' => phpversion(),
                    'wp_version'  => get_bloginfo('version'),
                ],
            ]
        );

        if (is_wp_error($response) || 200 !== (int) wp_remote_retrieve_response_code($response)) {
            return null;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);

        if (!is_array($body) || empty($body['new_version'])) {
            return null;
        }

        $sections = array_map('wp_kses_post', array_map('strval', self::unpack($body['sections'] ?? [])));

        return [
            'name'         => sanitize_text_field((string) ($body['name'] ?? 'MotionKit Connector')),
            'new_version'  => sanitize_text_field((string) $body['new_version']),
            'homepage'     => esc_url_raw((string) ($body['homepage'] ?? 'https://motionkit.io')),
            // Empty when the license is not valid for this site; WordPress then shows the update without an "Update now" link.
            'package'      => esc_url_raw((string) ($body['package'] ?? '')),
            'last_updated' => sanitize_text_field((string) ($body['last_updated'] ?? '')),
            'tested'       => sanitize_text_field((string) ($body['tested'] ?? '')),
            'requires'     => sanitize_text_field((string) ($body['requires'] ?? '')),
            'requires_php' => sanitize_text_field((string) ($body['requires_php'] ?? '')),
            'sections'     => $sections,
            'banners'      => array_map('esc_url_raw', array_map('strval', self::unpack($body['banners'] ?? []))),
            'icons'        => array_map('esc_url_raw', array_map('strval', self::unpack($body['icons'] ?? []))),
        ];
    }

    // EDD sends sections and banners as PHP-serialized strings; objects are refused so a tampered response cannot instantiate a class here.
    private static function unpack($value): array
    {
        if (is_string($value) && is_serialized($value)) {
            $value = @unserialize($value, ['allowed_classes' => false]); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged,WordPress.PHP.DiscouragedPHPFunctions.serialize_unserialize
        }

        return is_array($value) ? array_filter($value, 'is_scalar') : [];
    }
}
