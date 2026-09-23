<?php

/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

namespace MotionKitConnector\Setup;

/**
 * Dependency Installer
 *
 * The connector is the engine; the main MotionKit plugin ships the admin UI,
 * OAuth connect flow, and license reporting. When a customer installs only the
 * connector (the plugin we distribute by direct link), this class fetches and
 * installs the main MotionKit plugin for them so the pair is complete — and it
 * keeps the main plugin present for as long as the connector is active.
 *
 * Two triggers, one install routine:
 *
 *   A) First install (activation-flag driven, one-shot):
 *      1. On connector activation we only set a flag (register_activation_hook
 *         runs in a minimal context — the filesystem/upgrader APIs and
 *         pluggable functions aren't fully available, and a fatal there would
 *         abort the connector's own activation). No network work happens here.
 *      2. On the next admin_init — full admin context — we act on the flag and
 *         clear it, so this path runs once.
 *
 *   B) Restore (standing-state driven, every admin_init):
 *      If the connector is active but the main plugin has gone missing (e.g. the
 *      user deleted it), the flag is long gone — so activation can't help. This
 *      path detects the missing dependency on every admin request and, unless
 *      the user has explicitly dismissed ("Don't reinstall"), auto-restores it.
 *      This is what makes the main plugin recoverable after a delete, since with
 *      it gone there is no MotionKit menu or banner to click.
 *
 * Both paths funnel through install_or_activate_main(). A dismiss (stored as an
 * option) suppresses the *automatic* restore but the banner still offers a
 * manual "Reinstall MotionKit" button. Failures are throttled by a cooldown
 * transient so a bad URL can't re-download on every page load.
 *
 * @package MotionKitConnector
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

final class DependencyInstaller
{
    /**
     * Option flag set at activation, consumed on the next admin_init.
     */
    private const PENDING_FLAG = 'motionkit_connector_install_main_pending';

    /**
     * Transient holding the last install error message (for the admin notice).
     */
    private const ERROR_TRANSIENT = 'motionkit_connector_main_install_error';

    /**
     * Option flag: the user asked us to stop auto-reinstalling the main plugin.
     * The restore banner still offers a manual button, but no automatic install
     * fires while this is set. Cleared automatically once the main plugin is
     * active again (a fresh delete after that re-arms auto-restore).
     */
    private const DISMISS_RESTORE_FLAG = 'motionkit_connector_restore_dismissed';

    /**
     * Transient cooldown between automatic restore attempts, so a persistently
     * failing download (bad URL, server down) can't re-run on every admin page.
     */
    private const RESTORE_COOLDOWN = 'motionkit_connector_restore_cooldown';

    /**
     * admin-post action name for the manual "Reinstall" button.
     */
    private const RESTORE_ACTION = 'motionkit_connector_restore_main';

    /**
     * admin-post action name for the "Don't reinstall" dismiss link.
     */
    private const DISMISS_ACTION = 'motionkit_connector_dismiss_restore';

    /**
     * Main plugin's folder/file, as WordPress identifies it in the plugins list.
     */
    private const MAIN_PLUGIN_BASENAME = 'motionkit/motionkit.php';

    /**
     * Main plugin's folder slug (used to detect a present-but-differently-named
     * install and to locate the entry file after extraction).
     */
    private const MAIN_PLUGIN_SLUG = 'motionkit';

    /**
     * Default direct-download URL for the main plugin zip. Used when the
     * `motionkit/main_plugin_download_url` filter supplies nothing. A filter
     * still overrides this, and an empty string here would fall through to the
     * wordpress.org lookup — so this is the "our server" source of truth.
     */
    private const DEFAULT_MAIN_DOWNLOAD_URL = 'https://github.com/Wealcoder/motionkit/releases/download/latest/motionkit.zip';

    /**
     * Register admin hooks. Called once from Plugin::init() on every load.
     *
     * @return void
     */
    public function init(): void
    {
        // Path A: consume the activation flag (first install / reactivation).
        add_action('admin_init', [$this, 'maybe_install_main_plugin']);
        // Path B: detect a missing main plugin and auto-restore it.
        add_action('admin_init', [$this, 'maybe_restore_main_plugin']);
        add_action('admin_notices', [$this, 'render_notice']);

        // Manual actions from the restore banner.
        add_action('admin_post_' . self::RESTORE_ACTION, [$this, 'handle_manual_restore']);
        add_action('admin_post_' . self::DISMISS_ACTION, [$this, 'handle_dismiss_restore']);
    }

    /**
     * Flag that the main plugin should be installed on the next admin request.
     * Called from the connector's activation hook (Plugin::activate()) — see the
     * class docblock for why the real work is deferred out of activation.
     *
     * @return void
     */
    public function flag_pending_install(): void
    {
        // If the main plugin is already active there is nothing to do.
        if ($this->is_main_active()) {
            return;
        }
        update_option(self::PENDING_FLAG, 1, false);
    }

    /**
     * Path A — resolve the activation flag on a normal admin request. Runs once
     * per connector activation / reactivation.
     *
     * @return void
     */
    public function maybe_install_main_plugin(): void
    {
        if (!get_option(self::PENDING_FLAG)) {
            return;
        }

        // Only a user who could install the plugin in the first place may
        // trigger the network install. Leave the flag set for a capable user.
        if (!current_user_can('install_plugins') || !current_user_can('activate_plugins')) {
            return;
        }

        // Whatever happens below, this attempt is spent — clear the flag first
        // so a fatal mid-install can't loop the download on every admin page.
        delete_option(self::PENDING_FLAG);

        // A fresh activation is an explicit "I want the pair" signal, so clear
        // any earlier "don't reinstall" dismissal too.
        delete_option(self::DISMISS_RESTORE_FLAG);

        if ($this->is_main_active()) {
            return;
        }

        $result = $this->install_or_activate_main();
        if (is_wp_error($result)) {
            $this->store_error($result->get_error_message());
        }
    }

    /**
     * Path B — standing-state restore. On every admin request, if the connector
     * is active but the main plugin is gone, auto-reinstall it (unless the user
     * dismissed that), throttled by a cooldown between failing attempts.
     *
     * @return void
     */
    public function maybe_restore_main_plugin(): void
    {
        // Nothing to restore while it's active. Clear a stale dismissal so a
        // later delete re-arms auto-restore.
        if ($this->is_main_active()) {
            if (get_option(self::DISMISS_RESTORE_FLAG)) {
                delete_option(self::DISMISS_RESTORE_FLAG);
            }
            return;
        }

        // Path A owns this request when its flag is set — don't double-install.
        if (get_option(self::PENDING_FLAG)) {
            return;
        }

        if (!current_user_can('install_plugins') || !current_user_can('activate_plugins')) {
            return;
        }

        // User asked us to stop auto-restoring — the banner still offers a
        // manual button, but we don't act on our own.
        if (get_option(self::DISMISS_RESTORE_FLAG)) {
            return;
        }

        // Back off after a failure so a bad URL doesn't hammer every page load.
        if (get_transient(self::RESTORE_COOLDOWN)) {
            return;
        }

        $result = $this->install_or_activate_main();
        if (is_wp_error($result)) {
            $this->store_error($result->get_error_message());
            // Cool down before the next automatic attempt.
            set_transient(self::RESTORE_COOLDOWN, 1, 15 * MINUTE_IN_SECONDS);
        }
    }

    /**
     * Install (if absent) or activate (if present-but-inactive) the main plugin.
     * Shared by both the activation and the restore paths.
     *
     * @return true|\WP_Error
     */
    private function install_or_activate_main()
    {
        // Present but inactive → just activate, no download needed.
        if ($this->is_main_installed()) {
            return $this->activate_main();
        }

        // Absent → download, install, then activate.
        $result = $this->download_and_install_main();
        if (is_wp_error($result)) {
            return $result;
        }

        return $this->activate_main();
    }

    /**
     * Manual "Reinstall MotionKit" button from the restore banner.
     *
     * @return void
     */
    public function handle_manual_restore(): void
    {
        if (!current_user_can('install_plugins') || !current_user_can('activate_plugins')) {
            wp_die(esc_html__('You do not have permission to do this.', 'motionkit-connector'));
        }
        check_admin_referer(self::RESTORE_ACTION);

        // Explicit request — clear any dismissal and any cooldown, then try now.
        delete_option(self::DISMISS_RESTORE_FLAG);
        delete_transient(self::RESTORE_COOLDOWN);
        delete_transient(self::ERROR_TRANSIENT);

        if (!$this->is_main_active()) {
            $result = $this->install_or_activate_main();
            if (is_wp_error($result)) {
                $this->store_error($result->get_error_message());
            }
        }

        wp_safe_redirect($this->redirect_back());
        exit;
    }

    /**
     * "Don't reinstall" dismiss link from the restore banner.
     *
     * @return void
     */
    public function handle_dismiss_restore(): void
    {
        if (!current_user_can('install_plugins')) {
            wp_die(esc_html__('You do not have permission to do this.', 'motionkit-connector'));
        }
        check_admin_referer(self::DISMISS_ACTION);

        update_option(self::DISMISS_RESTORE_FLAG, 1, false);
        delete_transient(self::ERROR_TRANSIENT);

        wp_safe_redirect($this->redirect_back());
        exit;
    }

    /**
     * A safe URL to return to after a banner action — the referring admin page,
     * or the plugins list as a fallback.
     *
     * @return string
     */
    private function redirect_back(): string
    {
        $ref = wp_get_referer();
        if ($ref && is_string($ref)) {
            return $ref;
        }
        return self_admin_url('plugins.php');
    }

    /**
     * Download the main plugin zip and install it.
     *
     * Source resolution, in order:
     *   1. A URL supplied via the `motionkit/main_plugin_download_url` filter —
     *      our own server or any direct zip. Wins when set, so a distributor can
     *      pin an exact build.
     *   2. Otherwise the wordpress.org repository, resolved by slug through
     *      plugins_api(). This is the default once the main plugin is published
     *      there — no config needed, and WP's normal update channel takes over
     *      afterward.
     *
     * @return true|\WP_Error
     */
    private function download_and_install_main()
    {
        // Load the upgrader stack. On a front-end-triggered admin_init these
        // files may not be included yet.
        if (!function_exists('plugins_api')) {
            require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
        }
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/misc.php';
        require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        require_once ABSPATH . 'wp-admin/includes/plugin.php';

        $source = $this->resolve_install_source();
        if (is_wp_error($source)) {
            return $source;
        }

        $skin     = new \Automatic_Upgrader_Skin();
        $upgrader = new \Plugin_Upgrader($skin);

        $result = $upgrader->install($source);

        if (is_wp_error($result)) {
            return $result;
        }
        if ($result === false) {
            // Upgrader returns false on filesystem-credential failure and some
            // extraction errors; surface the skin's collected messages.
            $messages = $skin->get_upgrade_messages();
            $detail   = is_array($messages) && $messages ? end($messages) : '';
            return new \WP_Error(
                'install_failed',
                $detail !== ''
                    ? $detail
                    : __('The MotionKit plugin could not be installed automatically.', 'motionkit-connector')
            );
        }

        return true;
    }

    /**
     * Activate the main plugin by its known basename, falling back to a
     * folder-slug scan if it was packaged under a different top-level folder.
     *
     * @return true|\WP_Error
     */
    private function activate_main()
    {
        if (!function_exists('activate_plugin')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        $basename = $this->resolve_main_basename();
        if ($basename === '') {
            return new \WP_Error(
                'main_not_found',
                __('MotionKit was installed but its plugin file could not be located.', 'motionkit-connector')
            );
        }

        // Silent activation — do not let a stray activation-time notice from the
        // main plugin abort this request.
        $activated = activate_plugin($basename, '', false, true);

        if (is_wp_error($activated)) {
            return $activated;
        }

        return true;
    }

    /**
     * Is the main plugin active?
     *
     * @return bool
     */
    private function is_main_active(): bool
    {
        // Prefer the constant the main plugin defines on load — cheapest and
        // does not require the plugin.php include.
        if (defined('MOTIONKIT_VERSION')) {
            return true;
        }
        if (!function_exists('is_plugin_active')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        return is_plugin_active($this->resolve_main_basename() ?: self::MAIN_PLUGIN_BASENAME);
    }

    /**
     * Is the main plugin present on disk (active or not)?
     *
     * @return bool
     */
    private function is_main_installed(): bool
    {
        return $this->resolve_main_basename() !== '';
    }

    /**
     * Find the main plugin's basename among installed plugins. Matches the
     * expected basename first, then any plugin whose folder is the main slug.
     *
     * @return string Basename like "motionkit/motionkit.php", or '' if not found.
     */
    private function resolve_main_basename(): string
    {
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        $all = get_plugins();

        if (isset($all[self::MAIN_PLUGIN_BASENAME])) {
            return self::MAIN_PLUGIN_BASENAME;
        }

        $prefix = self::MAIN_PLUGIN_SLUG . '/';
        foreach (array_keys($all) as $basename) {
            if (strpos($basename, $prefix) === 0) {
                return $basename;
            }
        }

        return '';
    }

    /**
     * Resolve where to install the main plugin from: an explicit zip URL if the
     * distributor pinned one, otherwise the wordpress.org download URL looked up
     * by slug.
     *
     * @return string|\WP_Error A zip URL, or WP_Error if neither source resolves.
     */
    private function resolve_install_source()
    {
        // 1. Explicit URL wins (our own server, or a pinned build).
        $url = $this->main_download_url();
        if ($url !== '' && $url !== '#') {
            return $url;
        }

        // 2. Fall back to wordpress.org by slug.
        $api = plugins_api('plugin_information', [
            'slug'   => self::MAIN_PLUGIN_SLUG,
            'fields' => ['sections' => false],
        ]);

        if (is_wp_error($api)) {
            return new \WP_Error(
                'no_source',
                sprintf(
                    /* translators: %s: the wordpress.org lookup error. */
                    __('No MotionKit download URL is configured, and the wordpress.org lookup failed: %s', 'motionkit-connector'),
                    $api->get_error_message()
                )
            );
        }

        if (empty($api->download_link)) {
            return new \WP_Error(
                'no_source',
                __('No MotionKit download URL is configured, and wordpress.org returned no download link.', 'motionkit-connector')
            );
        }

        return $api->download_link;
    }

    /**
     * The direct-download URL for the main plugin. Defaults to our server
     * (DEFAULT_MAIN_DOWNLOAD_URL) and is filterable so a distributor can pin a
     * different build without editing this file. Returning an empty string from
     * the filter forces the wordpress.org-by-slug fallback instead.
     *
     * @return string
     */
    private function main_download_url(): string
    {
        $url = apply_filters('motionkit/main_plugin_download_url', self::DEFAULT_MAIN_DOWNLOAD_URL);
        return is_string($url) ? trim($url) : '';
    }

    /**
     * Record an install error for the admin notice.
     *
     * @param string $message
     * @return void
     */
    private function store_error(string $message): void
    {
        set_transient(self::ERROR_TRANSIENT, $message, HOUR_IN_SECONDS);
    }

    /**
     * Admin banner for the missing-main-plugin states. Nothing shows while the
     * main plugin is active (success is silent — WordPress already lists it).
     *
     * Three cases when it's missing:
     *   - An install attempt failed → error notice + manual "Reinstall" button.
     *   - The user dismissed auto-restore → neutral notice + manual "Reinstall".
     *   - Auto-restore is armed (will run / is cooling down) → info notice with
     *     "Reinstall now" and a "Don't reinstall" opt-out.
     *
     * @return void
     */
    public function render_notice(): void
    {
        if (!current_user_can('install_plugins')) {
            return;
        }

        if ($this->is_main_active()) {
            delete_transient(self::ERROR_TRANSIENT);
            return;
        }

        $error     = get_transient(self::ERROR_TRANSIENT);
        $dismissed  = (bool) get_option(self::DISMISS_RESTORE_FLAG);

        // The banner's primary action always goes through our admin-post
        // handler so a click clears cooldown/dismissal and installs from the
        // trusted, configured source (not a raw zip link the browser downloads).
        $reinstall_url = wp_nonce_url(
            admin_url('admin-post.php?action=' . self::RESTORE_ACTION),
            self::RESTORE_ACTION
        );
        $dismiss_url = wp_nonce_url(
            admin_url('admin-post.php?action=' . self::DISMISS_ACTION),
            self::DISMISS_ACTION
        );

        if ($error !== false) {
            delete_transient(self::ERROR_TRANSIENT);
            ?>
            <div class="notice notice-error">
                <p>
                    <strong><?php esc_html_e('MotionKit Connector:', 'motionkit-connector'); ?></strong>
                    <?php esc_html_e('The main MotionKit plugin could not be installed automatically.', 'motionkit-connector'); ?>
                    <?php echo esc_html($error); ?>
                </p>
                <p>
                    <a href="<?php echo esc_url($reinstall_url); ?>" class="button button-primary">
                        <?php esc_html_e('Reinstall MotionKit', 'motionkit-connector'); ?>
                    </a>
                </p>
            </div>
            <?php
            return;
        }

        if ($dismissed) {
            ?>
            <div class="notice notice-warning">
                <p>
                    <strong><?php esc_html_e('MotionKit Connector:', 'motionkit-connector'); ?></strong>
                    <?php esc_html_e('The main MotionKit plugin is not installed. The connector runs the animation engine, but the MotionKit admin screen and connect flow need the main plugin.', 'motionkit-connector'); ?>
                </p>
                <p>
                    <a href="<?php echo esc_url($reinstall_url); ?>" class="button button-primary">
                        <?php esc_html_e('Reinstall MotionKit', 'motionkit-connector'); ?>
                    </a>
                </p>
            </div>
            <?php
            return;
        }

        // Auto-restore is armed (either about to run, or cooling down after a
        // failure). Tell the user, and let them force it now or opt out.
        ?>
        <div class="notice notice-info">
            <p>
                <strong><?php esc_html_e('MotionKit Connector:', 'motionkit-connector'); ?></strong>
                <?php esc_html_e('The main MotionKit plugin is missing and is being reinstalled automatically. Reload in a moment, or reinstall now.', 'motionkit-connector'); ?>
            </p>
            <p>
                <a href="<?php echo esc_url($reinstall_url); ?>" class="button button-primary">
                    <?php esc_html_e('Reinstall now', 'motionkit-connector'); ?>
                </a>
                <a href="<?php echo esc_url($dismiss_url); ?>" class="button button-link" style="margin-left:8px;">
                    <?php esc_html_e("Don't reinstall", 'motionkit-connector'); ?>
                </a>
            </p>
        </div>
        <?php
    }
}
