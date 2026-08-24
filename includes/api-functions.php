<?php

/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

/**
 * Public API — global functions for other plugins and themes.
 *
 * Safe to call unconditionally: each guards on class_exists() and answers false
 * rather than throwing.
 *
 * @package MotionKitConnector
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('motionkit_extension_is_scroll_smoother_active')) {
    /**
     * Is MotionKit Extension driving the page smoother on THIS request?
     *
     * @since 1.0.0
     * @return bool
     */
    function motionkit_extension_is_scroll_smoother_active(): bool
    {
        if (!class_exists('\MotionKitConnector\Frontend\ScrollSmoother')) {
            return false;
        }

        return \MotionKitConnector\Frontend\ScrollSmoother::should_run();
    }
}

if (!function_exists('motionkit_extension_is_scroll_smoother_enabled_for_current_page')) {
    /**
     * Is the smoother switched on for the current page?
     *
     * @since 1.0.0
     * @return bool
     */
    function motionkit_extension_is_scroll_smoother_enabled_for_current_page(): bool
    {
        if (!class_exists('\MotionKitConnector\Frontend\ScrollSmoother')) {
            return false;
        }

        return \MotionKitConnector\Frontend\ScrollSmoother::is_enabled_for_current_page();
    }
}

if (!function_exists('motionkit_extension_is_scroll_smoother_enabled_globally')) {
    /**
     * Is the smoother switched on at the GLOBAL (all-page) level?
     *
     * @since 1.0.0
     * @return bool
     */
    function motionkit_extension_is_scroll_smoother_enabled_globally(): bool
    {
        if (!class_exists('\MotionKitConnector\Frontend\ScrollSmoother')) {
            return false;
        }

        return \MotionKitConnector\Frontend\ScrollSmoother::is_enabled_globally();
    }
}
