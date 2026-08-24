<?php

/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

namespace MotionKitConnector\Helpers;

/**
 * Helper Class
 *
 * @package MotionKitConnector
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Helper Class
 *
 * General utility methods for options, sanitization, and diagnostics.
 */
class Helper
{
    /**
     * Get option with default fallback
     *
     * @param string $option Option name
     * @param mixed $default Default value
     * @return mixed Option value or default
     */
    public static function get_option(string $option, $default = false)
    {
        return get_option($option, $default);
    }

    /**
     * Update option
     *
     * @param string $option Option name
     * @param mixed $value Option value
     * @param bool|null $autoload Autoload option
     * @return bool True if value changed, false otherwise
     */
    public static function update_option(string $option, $value, $autoload = null): bool
    {
        return update_option($option, $value, $autoload);
    }

    /**
     * Delete option
     *
     * @param string $option Option name
     * @return bool True if option deleted, false otherwise
     */
    public static function delete_option(string $option): bool
    {
        return delete_option($option);
    }

    /**
     * Log message to error log if debugging is enabled
     *
     * @param string $message Message to log
     * @param string $level Log level (info, warning, error, debug)
     * @return void
     */
    public static function log(string $message, string $level = 'info'): void
    {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            $formatted_message = sprintf(
                '[MotionKit Extension %s] [%s] %s',
                strtoupper($level),
                current_time('mysql'),
                $message
            );
            // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
            error_log($formatted_message);
        }
    }
}
