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
 * The connector is the animation engine; the main MotionKit plugin provides
 * the admin dashboard, OAuth connect flow, and settings.
 *
 * To comply with WordPress security guidelines and prevent dropper/trojan
 * heuristic flags, this class NEVER silently downloads or executes remote code
 * in the background on admin_init. Instead:
 *
 *   1. If the main plugin is already installed on disk, activating it on
 *      connector activation is handled safely.
 *   2. If the main plugin is missing, an informative admin banner prompts the
 *      administrator to explicitly install and activate it via a nonced,
 *      capability-checked user action.
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
     * Option flag: the user dismissed the restore notice.
     */
    private const DISMISS_RESTORE_FLAG = 'motionkit_connector_restore_dismissed';

    /**
     * Transient lock to prevent concurrent installation requests.
     */
    private const INSTALL_LOCK_TRANSIENT = 'motionkit_connector_install_lock';

    /**
     * admin-post action name for the manual "Install / Activate" button.
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
     * Register admin hooks. Called once from Plugin::init() on every load.
     *
     * @return void
     */
    public function init(): void
    {
        // If connector was activated and the main plugin is already installed on disk, activate it.
        add_action('admin_init', [$this, 'maybe_activate_existing_main']);
        add_action('admin_notices', [$this, 'render_notice']);

        // Explicit user actions from the banner.
        add_action('admin_post_' . self::RESTORE_ACTION, [$this, 'handle_manual_restore']);
        add_action('admin_post_' . self::DISMISS_ACTION, [$this, 'handle_dismiss_restore']);
    }

    /**
     * Flag that the main plugin should be activated on the next admin request if already on disk.
     *
     * @return void
     */
    public function flag_pending_install(): void
    {
        if ($this->is_main_active()) {
            return;
        }
        update_option(self::PENDING_FLAG, 1, false);
    }

    /**
     * If the connector was activated and the main plugin is already present on disk,
     * safely activate it on admin_init. Never performs remote downloads in the background.
     *
     * @return void
     */
    public function maybe_activate_existing_main(): void
    {
        if (!get_option(self::PENDING_FLAG)) {
            return;
        }

        if (!current_user_can('activate_plugins')) {
            return;
        }

        delete_option(self::PENDING_FLAG);
        delete_option(self::DISMISS_RESTORE_FLAG);

        if ($this->is_main_active()) {
            return;
        }

        // Only activate if files are already locally on disk. Never download remotely on admin_init.
        if ($this->is_main_installed()) {
            $this->activate_main();
        }
    }

    /**
     * Install (or activate) the main plugin.
     * Triggered strictly upon explicit administrator user action.
     *
     * @param bool $force Whether to force download and overwrite existing plugin files.
     * @return true|\WP_Error
     */
    private function install_or_activate_main(bool $force = false)
    {
        // If not forced and already installed, just activate.
        if (!$force && $this->is_main_installed()) {
            return $this->activate_main();
        }

        // Install from WordPress.org, then activate.
        $result = $this->install_main_from_wporg();
        if (is_wp_error($result)) {
            if ($this->is_main_installed()) {
                return $this->activate_main();
            }
            return $result;
        }

        return $this->activate_main();
    }

    /**
     * Manual "Install / Activate MotionKit" button handler from the notice banner.
     *
     * @return void
     */
    public function handle_manual_restore(): void
    {
        if (!current_user_can('install_plugins') || !current_user_can('activate_plugins')) {
            wp_die(esc_html__('You do not have permission to do this.', 'motionkit-connector'));
        }
        check_admin_referer(self::RESTORE_ACTION);

        // Explicit user request — clear any dismissal and prior errors.
        delete_option(self::DISMISS_RESTORE_FLAG);
        delete_transient(self::ERROR_TRANSIENT);

        // Concurrency lock to prevent duplicate runs
        if (get_transient(self::INSTALL_LOCK_TRANSIENT)) {
            wp_safe_redirect($this->redirect_back());
            exit;
        }
        set_transient(self::INSTALL_LOCK_TRANSIENT, 1, 60);

        if (!$this->is_main_active()) {
            $result = $this->install_or_activate_main(false);
            if (is_wp_error($result)) {
                $this->store_error($result->get_error_message());
            }
        }

        delete_transient(self::INSTALL_LOCK_TRANSIENT);

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
     * Install the main plugin from the official WordPress.org repository.
     *
     * @return true|\WP_Error
     */
    private function install_main_from_wporg()
    {
        if (!function_exists('plugins_api')) {
            require_once ABSPATH . 'wp-admin/includes/plugin-install.php';
        }
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/misc.php';
        require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        require_once ABSPATH . 'wp-admin/includes/plugin.php';

        $api = plugins_api('plugin_information', [
            'slug'   => self::MAIN_PLUGIN_SLUG,
            'fields' => ['sections' => false],
        ]);

        if (is_wp_error($api)) {
            return new \WP_Error(
                'wporg_lookup_failed',
                sprintf(
                    /* translators: %s: the wordpress.org lookup error message. */
                    __('WordPress.org lookup for MotionKit failed: %s', 'motionkit-connector'),
                    $api->get_error_message()
                )
            );
        }

        if (empty($api->download_link)) {
            return new \WP_Error(
                'no_download_link',
                __('WordPress.org did not return a download link for MotionKit.', 'motionkit-connector')
            );
        }

        $skin     = new \Automatic_Upgrader_Skin();
        $upgrader = new \Plugin_Upgrader($skin);

        $result = $upgrader->install($api->download_link);

        if (is_wp_error($result)) {
            return $result;
        }
        if ($result === false) {
            $messages = $skin->get_upgrade_messages();
            $detail   = is_array($messages) && $messages ? end($messages) : '';
            return new \WP_Error(
                'install_failed',
                $detail !== ''
                    ? $detail
                    : __('The MotionKit plugin could not be installed from WordPress.org.', 'motionkit-connector')
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
     * Admin banner for the missing-main-plugin states.
     * Prompts the administrator to install or activate MotionKit.
     *
     * @return void
     */
    public function render_notice(): void
    {
        if (!current_user_can('install_plugins') || !current_user_can('activate_plugins')) {
            return;
        }

        if ($this->is_main_active()) {
            delete_transient(self::ERROR_TRANSIENT);
            return;
        }

        $error     = get_transient(self::ERROR_TRANSIENT);
        $dismissed = (bool) get_option(self::DISMISS_RESTORE_FLAG);

        $reinstall_url = wp_nonce_url(
            admin_url('admin-post.php?action=' . self::RESTORE_ACTION),
            self::RESTORE_ACTION
        );
        $dismiss_url = wp_nonce_url(
            admin_url('admin-post.php?action=' . self::DISMISS_ACTION),
            self::DISMISS_ACTION
        );

        $is_installed = $this->is_main_installed();
        $button_label = $is_installed
            ? __('Activate MotionKit', 'motionkit-connector')
            : __('Install & Activate MotionKit', 'motionkit-connector');

        if ($error !== false) {
            delete_transient(self::ERROR_TRANSIENT);
            ?>
            <div class="notice notice-error is-dismissible">
                <p>
                    <strong><?php esc_html_e('MotionKit Connector:', 'motionkit-connector'); ?></strong>
                    <?php esc_html_e('Failed to set up the MotionKit core plugin.', 'motionkit-connector'); ?>
                    <?php echo esc_html($error); ?>
                </p>
                <p>
                    <a href="<?php echo esc_url($reinstall_url); ?>" class="button button-primary">
                        <?php echo esc_html($button_label); ?>
                    </a>
                </p>
            </div>
            <?php
            return;
        }

        if ($dismissed) {
            return;
        }

        ?>
        <div class="notice notice-warning">
            <p>
                <strong><?php esc_html_e('MotionKit Connector:', 'motionkit-connector'); ?></strong>
                <?php
                if ($is_installed) {
                    esc_html_e('The MotionKit core plugin is installed but inactive. The connector requires the core plugin for admin settings and animations.', 'motionkit-connector');
                } else {
                    esc_html_e('MotionKit Connector requires the MotionKit core plugin to be installed and active.', 'motionkit-connector');
                }
                ?>
            </p>
            <p>
                <a href="<?php echo esc_url($reinstall_url); ?>" class="button button-primary">
                    <?php echo esc_html($button_label); ?>
                </a>
                <a href="<?php echo esc_url($dismiss_url); ?>" class="button button-link" style="margin-left:8px;">
                    <?php esc_html_e('Dismiss', 'motionkit-connector'); ?>
                </a>
            </p>
        </div>
        <?php
    }
}
