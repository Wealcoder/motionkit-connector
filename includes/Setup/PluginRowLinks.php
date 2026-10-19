<?php

/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

namespace MotionKitConnector\Setup;

/**
 * Plugin Row Links
 *
 * Adds the connector's action links (Settings · Editor · Docs) on the left of
 * its Plugins-list row, and quick links (Visit site · Docs) as row meta on the
 * right. Every destination is filterable so distribution config can repoint it
 * without editing this file.
 *
 * The "Settings" link targets the main MotionKit admin page — it only appears
 * while the main plugin is active, since that page lives there.
 *
 * @package MotionKitConnector
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

use MotionKitConnector\Auth\JwtTokenManager;
use MotionKitConnector\Common\EditorEndpoint;

final class PluginRowLinks
{
    /**
     * Default documentation URL. Filterable via `motionkit/docs_url`.
     */
    private const DEFAULT_DOCS_URL = 'https://motionkit.io/docs';

    /**
     * Default marketing / plugin-site URL. Filterable via `motionkit/site_url`.
     */
    private const DEFAULT_SITE_URL = 'https://motionkit.io';

    /**
     * Main plugin's basename (its Deactivate link gets the warning too).
     */
    private const MAIN_PLUGIN_BASENAME = 'motionkit/motionkit.php';

    /**
     * The connector's plugin basename, used to hook only its own row.
     *
     * @var string
     */
    private string $basename;

    /**
     * @param string $plugin_file The connector main plugin file (__FILE__).
     */
    public function __construct(string $plugin_file)
    {
        $this->basename = plugin_basename($plugin_file);
    }

    /**
     * Register hooks.
     *
     * @return void
     */
    public function init(): void
    {
        add_filter('plugin_action_links_' . $this->basename, [$this, 'action_links']);
        add_filter('plugin_row_meta', [$this, 'row_meta'], 10, 2);

        // Warn on deactivation of either half of the pair — they depend on each
        // other. Runs late (99) so the confirm() wraps whatever Deactivate link
        // WordPress (or another plugin) produced.
        add_filter('plugin_action_links_' . $this->basename, [$this, 'connector_deactivate_warning'], 99);
        add_filter('plugin_action_links_' . self::MAIN_PLUGIN_BASENAME, [$this, 'main_deactivate_warning'], 99);
    }

    /**
     * Left-side action links: Settings · Editor · Docs, prepended before the
     * default Deactivate link.
     *
     * @param array $links Existing action links.
     * @return array
     */
    public function action_links(array $links): array
    {
        $custom = [];

        // Settings → the main plugin's admin page. Only meaningful when the main
        // plugin is active (it owns that page), so gate on that.
        if ($this->is_main_active()) {
            $custom['settings'] = sprintf(
                '<a href="%s">%s</a>',
                esc_url(admin_url('admin.php?page=motionkit-connect')),
                esc_html__('Settings', 'motionkit-connector')
            );
        }

        // Editor → launch the SaaS editor for this site (new tab).
        $custom['editor'] = sprintf(
            '<a href="%s" target="_blank" rel="noopener">%s</a>',
            esc_url($this->editor_url()),
            esc_html__('Editor', 'motionkit-connector')
        );

        // Docs → documentation (new tab).
        $custom['docs'] = sprintf(
            '<a href="%s" target="_blank" rel="noopener">%s</a>',
            esc_url($this->docs_url()),
            esc_html__('Docs', 'motionkit-connector')
        );

        // Prepend ours so Deactivate stays last.
        return array_merge($custom, $links);
    }

    /**
     * Right-side row meta: Visit site · Docs. Only added to the connector's own
     * row (matched by $plugin_file).
     *
     * @param array  $meta        Existing row meta links.
     * @param string $plugin_file The plugin the row belongs to.
     * @return array
     */
    public function row_meta(array $meta, string $plugin_file): array
    {
        if ($plugin_file !== $this->basename) {
            return $meta;
        }

        // WordPress adds "Visit plugin site" whenever the updater has no "View details" to offer; it goes where Visit site goes, so it is dropped rather than shown twice.
        $core_link = '>' . __('Visit plugin site') . '<'; // phpcs:ignore WordPress.WP.I18n.MissingArgDomain -- core's own string, matched to find core's link.
        $meta = array_values(array_filter($meta, static function ($link) use ($core_link) {
            return false === strpos((string) $link, $core_link);
        }));

        $meta[] = sprintf(
            '<a href="%s" target="_blank" rel="noopener">%s</a>',
            esc_url($this->site_url()),
            esc_html__('Visit site', 'motionkit-connector')
        );

        $meta[] = sprintf(
            '<a href="%s" target="_blank" rel="noopener">%s</a>',
            esc_url($this->docs_url()),
            esc_html__('Docs', 'motionkit-connector')
        );

        return $meta;
    }

    /**
     * Add a confirm() to the connector's Deactivate link.
     *
     * @param array $links Action links for the connector row.
     * @return array
     */
    public function connector_deactivate_warning(array $links): array
    {
        return $this->add_deactivate_confirm(
            $links,
            __('Deactivating the MotionKit Connector stops the animation engine — your animations, page transitions, and smooth scroll will no longer run on the live site. Deactivate anyway?', 'motionkit-connector')
        );
    }

    /**
     * Add a confirm() to the main plugin's Deactivate link. Only meaningful
     * while the connector is active (which it is, since this hook is registered
     * from a running connector) — so the pair is genuinely interdependent here.
     *
     * @param array $links Action links for the main plugin row.
     * @return array
     */
    public function main_deactivate_warning(array $links): array
    {
        return $this->add_deactivate_confirm(
            $links,
            __('MotionKit powers the connect flow, editor launch, and license status for the MotionKit Connector. Deactivating it leaves the connector running without its admin controls. Deactivate anyway?', 'motionkit-connector')
        );
    }

    /**
     * Wrap the "deactivate" action link with an onclick confirm() carrying the
     * given message. Matches WordPress's deactivate link by its
     * `action=deactivate` href (locale-independent) rather than its label.
     *
     * @param array  $links   The plugin-row action links.
     * @param string $message The confirm() prompt (plain text).
     * @return array
     */
    private function add_deactivate_confirm(array $links, string $message): array
    {
        foreach ($links as $key => $html) {
            if (!is_string($html) || strpos($html, 'action=deactivate') === false) {
                continue;
            }

            // esc_js() escapes quotes/newlines so the message is a safe JS
            // string literal inside the double-quoted onclick attribute.
            $onclick = ' onclick="return confirm(\'' . esc_js($message) . '\');"';

            // Inject the handler into the opening <a ...> tag. Only the first
            // <a> (the deactivate anchor itself) is touched.
            $links[$key] = preg_replace('/<a\b/', '<a' . $onclick, $html, 1);
        }

        return $links;
    }

    /**
     * Build the editor launch URL for this site, mirroring the main plugin's
     * ConnectPage::get_editor_url() — site + platform + a session JWT so the
     * editor can open even before an explicit connect (JwtTokenManager falls
     * back to a locally-signed token).
     *
     * @return string
     */
    private function editor_url(): string
    {
        $page_url = home_url('/');

        $query_args = [
            'site'            => $page_url,
            'platform'        => 'wordpress',
            'motionkit_token' => JwtTokenManager::generate($page_url),
        ];

        $base = apply_filters('motionkit/editor/url', EditorEndpoint::base());

        return add_query_arg($query_args, $base);
    }

    /**
     * Documentation URL (filterable).
     *
     * @return string
     */
    private function docs_url(): string
    {
        $url = apply_filters('motionkit/docs_url', self::DEFAULT_DOCS_URL);
        return is_string($url) && $url !== '' ? $url : self::DEFAULT_DOCS_URL;
    }

    /**
     * Marketing / plugin-site URL (filterable).
     *
     * @return string
     */
    private function site_url(): string
    {
        $url = apply_filters('motionkit/site_url', self::DEFAULT_SITE_URL);
        return is_string($url) && $url !== '' ? $url : self::DEFAULT_SITE_URL;
    }

    /**
     * Is the main MotionKit plugin active? Cheap constant check first.
     *
     * @return bool
     */
    private function is_main_active(): bool
    {
        if (defined('MOTIONKIT_VERSION')) {
            return true;
        }
        if (!function_exists('is_plugin_active')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        return is_plugin_active('motionkit/motionkit.php');
    }
}
