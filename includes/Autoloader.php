<?php

/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

namespace MotionKitConnector\Includes;

/**
 * Custom Autoloader for MotionKit Extension
 *
 * @package MotionKitConnector
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Custom Autoloader Class
 *
 * Handles automatic loading of classes without vendor dependencies.
 * Follows PSR-4 autoloading standards with WordPress naming conventions.
 */
final class Autoloader
{
    /**
     * The base namespace for the plugin
     *
     * @var string
     */
    private const NAMESPACE_PREFIX = 'MotionKitConnector\\';

    /**
     * The base directory for the namespace prefix
     *
     * @var string
     */
    private string $base_dir;

    /**
     * Constructor
     *
     * @param string $base_dir The base directory for the namespace prefix
     */
    public function __construct(string $base_dir)
    {
        $this->base_dir = rtrim($base_dir, '\\/') . '/';
    }

    /**
     * Register the autoloader
     *
     * @return void
     */
    public function register(): void
    {
        spl_autoload_register([$this, 'load_class']);
    }

    /**
     * Unregister the autoloader
     *
     * @return void
     */
    public function unregister(): void
    {
        spl_autoload_unregister([$this, 'load_class']);
    }

    /**
     * Load the given class or interface
     *
     * @param string $class The fully-qualified class name
     * @return void
     */
    public function load_class(string $class): void
    {
        // Check if the class uses the namespace prefix
        $len = strlen(self::NAMESPACE_PREFIX);
        if (strncmp(self::NAMESPACE_PREFIX, $class, $len) !== 0) {
            return;
        }

        // Get the relative class name
        $relative_class = substr($class, $len);
        
        $file = $this->base_dir . str_replace('\\', '/', $relative_class) . '.php';

        // If the file exists, require it
        if (file_exists($file)) {
            require_once $file;
        }
    }
}
