<?php

/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

namespace MotionKitConnector;

/**
 * Main Plugin Class
 *
 * @package MotionKitConnector
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

use MotionKitConnector\Includes\Autoloader;
use MotionKitConnector\Factory\ComponentFactory;
use MotionKitConnector\Frontend\Frontend;

/**
 * Main Plugin Class
 *
 * Handles plugin initialization, activation, and deactivation.
 */
final class Plugin
{
    /**
     * Plugin version
     */
    public const VERSION = '1.0.0';

    /**
     * Plugin name
     */
    public const PLUGIN_NAME = 'MotionKit Connector';

    /**
     * Plugin slug
     */
    public const PLUGIN_SLUG = 'motionkit-connector';

    /**
     * Plugin instance
     *
     * @var Plugin|null
     */
    private static ?Plugin $instance = null;

    /**
     * Plugin file path
     *
     * @var string
     */
    private string $plugin_file;

    /**
     * Plugin directory path
     *
     * @var string
     */
    private string $plugin_dir;

    /**
     * Plugin URL
     *
     * @var string
     */
    private string $plugin_url;

    /**
     * Autoloader instance
     *
     * @var Autoloader
     */
    private Autoloader $autoloader;

    /**
     * Frontend instance
     *
     * @var Frontend|null
     */
    private ?Frontend $frontend = null;

    /**
     * Constructor
     *
     * @param string $plugin_file The main plugin file path
     */
    private function __construct(string $plugin_file)
    {
        $this->plugin_file = $plugin_file;
        $this->plugin_dir = plugin_dir_path($plugin_file);
        $this->plugin_url = plugin_dir_url($plugin_file);

        $this->init_autoloader();
        $this->init_hooks();
    }

    /**
     * Get plugin instance
     *
     * @param string $plugin_file The main plugin file path
     * @return Plugin The plugin instance
     */
    public static function get_instance(string $plugin_file): Plugin
    {
        if (null === self::$instance) {
            self::$instance = new self($plugin_file);
        }

        return self::$instance;
    }

    /**
     * Initialize autoloader
     *
     * @return void
     */
    private function init_autoloader(): void
    {
        require_once $this->plugin_dir . 'includes/Autoloader.php';
        
        $this->autoloader = new Autoloader($this->plugin_dir . 'includes/');
        $this->autoloader->register();
    }

    /**
     * Initialize hooks
     *
     * @return void
     */
    private function init_hooks(): void
    {
        add_action('plugins_loaded', [$this, 'init'], 10);
        // One-shot autoload migration — flips legacy option rows that were saved with autoload=no but are read on every frontend request, so they join the alloptions cache instead of triggering a SELECT per page load. Sentinel-guarded to run exactly once per install. Lives here (not the dashboard plugin) because the hot options are this plugin's own.
        add_action('admin_init', [$this, 'maybe_fix_autoload_flags'], 5);
        // One-shot status rename — the stored word `draft` used to mean "saved but not published" and now means "parked", so records written under the old meaning are relabelled `saved`. Without it every animation a user had saved would go quiet in their editor on update. The REST save dispatcher calls the same guarded method, which is what covers a site whose wp-admin is never opened.
        add_action('admin_init', [Migrations\StatusSavedMigration::class, 'maybe_run'], 5);

        register_activation_hook($this->plugin_file, [$this, 'activate']);
        register_deactivation_hook($this->plugin_file, [$this, 'deactivate']);
    }

    /**
     * Flip autoload=yes on hot-path options that were originally written with
     * autoload=no. WP only honors the flag on first-create, so existing rows
     * stay autoload=no forever unless we update wp_options.autoload directly.
     *
     * Cheap: one indexed UPDATE against wp_options, gated by a sentinel.
     *
     * @return void
     */
    public function maybe_fix_autoload_flags(): void
    {
        if (get_option('motionkit_autoload_fixed_v1') === '1') {
            return;
        }

        global $wpdb;
        $hot_options = ['motionkit_page_settings_updated_at'];
        // Dynamic %s,%s,... placeholder list sized to $hot_options — this IS the prepare() placeholder syntax, not unescaped SQL; $hot_options is a hardcoded literal above, never external input. The sniff can't trace that {$placeholders} expands to valid %s placeholders before prepare() consumes them via the variadic ...$hot_options args below.
        $placeholders = implode(',', array_fill(0, count($hot_options), '%s'));
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$wpdb->options} SET autoload = 'yes'
                 WHERE option_name IN ({$placeholders}) AND autoload != 'yes'", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
                ...$hot_options
            )
        );
        wp_cache_delete('alloptions', 'options');
        update_option('motionkit_autoload_fixed_v1', '1', true);
    }

    /**
     * Initialize plugin
     *
     * @return void
     */
    public function init(): void
    {
        $this->init_auth();
        $this->init_admin_tools();
        $this->init_frontend();
        $this->init_rest_api();
        $this->init_dependency_installer();
        $this->init_plugin_row_links();

        do_action('MOTIONKIT_EXTENSION_LOADED');
    }

    /**
     * Register the animation-data tools handlers (Tools tab data layer:
     * list/delete AJAX + delete_one POST). The tab's UI lives in the
     * MotionKit dashboard plugin; admin-ajax requests run with is_admin()
     * true, so the guard covers them too.
     *
     * @return void
     */
    private function init_admin_tools(): void
    {
        if (is_admin()) {
            (new \MotionKitConnector\Admin\AnimationDataTools())->init();
        }
    }

    /**
     * Register the admin-side dependency installer that fetches the main
     * MotionKit plugin when only the connector is installed.
     *
     * @return void
     */
    private function init_dependency_installer(): void
    {
        (new \MotionKitConnector\Setup\DependencyInstaller())->init();
    }

    /**
     * Register the connector's Plugins-list action links and row meta
     * (Settings · Editor · Docs · Visit site).
     *
     * @return void
     */
    private function init_plugin_row_links(): void
    {
        (new \MotionKitConnector\Setup\PluginRowLinks($this->plugin_file))->init();
    }

    /**
     * Initialize auth & license handlers
     *
     * @return void
     */
    private function init_auth(): void
    {
        $oauth = new \MotionKitConnector\Auth\OAuthHandler();
        $oauth->init();

        $license = new \MotionKitConnector\Auth\LicenseStatus();
        $license->init();
    }

    /**
     * Initialize frontend functionality
     *
     * @return void
     */
    private function init_frontend(): void
    {
        $this->frontend = ComponentFactory::create_frontend();
        $this->frontend->init();
    }

    /**
     * Initialize REST API endpoints
     *
     * @return void
     */
    private function init_rest_api(): void
    {
        $rest_api = new \MotionKitConnector\RestApi\RestApi();
        $rest_api->init();
    }

    /**
     * Plugin activation
     *
     * @return void
     */
    public function activate(): void
    {
        if (!get_option('motionkit_extension_version')) {
            update_option('motionkit_extension_version', self::VERSION);
            update_option('motionkit_extension_creation_date', current_time('mysql'));
        }

        // Flag the main MotionKit plugin for auto-install on the next admin
        // request. Kept out of the activation context itself (see
        // DependencyInstaller) so a network/filesystem hiccup can't abort the
        // connector's own activation.
        (new \MotionKitConnector\Setup\DependencyInstaller())->flag_pending_install();

        do_action('motionkit_extension_activated');
    }

    /**
     * Plugin deactivation
     *
     * @return void
     */
    public function deactivate(): void
    {
        // Clear the license-refresh cron this plugin schedules (LicenseStatus).
        // Without this, deactivating while the sibling plugin stays active left
        // a handler-less daily event firing forever.
        $timestamp = wp_next_scheduled('motionkit_license_refresh');
        if ($timestamp) {
            wp_unschedule_event($timestamp, 'motionkit_license_refresh');
        }
        wp_clear_scheduled_hook('motionkit_license_refresh');

        do_action('motionkit_extension_deactivated');
    }

    /**
     * Prevent cloning of the singleton.
     */
    private function __clone() {}

    /**
     * Prevent unserializing of the singleton.
     *
     * @throws \Exception
     */
    public function __wakeup()
    {
        throw new \Exception('Cannot unserialize ' . self::class);
    }

    /**
     * Get plugin file path
     *
     * @return string
     */
    public function get_plugin_file(): string
    {
        return $this->plugin_file;
    }

    /**
     * Get plugin directory path
     *
     * @return string
     */
    public function get_plugin_dir(): string
    {
        return $this->plugin_dir;
    }

    /**
     * Get plugin URL
     *
     * @return string
     */
    public function get_plugin_url(): string
    {
        return $this->plugin_url;
    }

    /**
     * Get frontend instance
     *
     * @return Frontend|null
     */
    public function get_frontend(): ?Frontend
    {
        return $this->frontend;
    }
}
