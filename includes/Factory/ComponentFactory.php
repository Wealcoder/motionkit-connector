<?php

/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

namespace MotionKitConnector\Factory;

/**
 * Component Factory Class
 *
 * @package MotionKitConnector
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

use MotionKitConnector\Frontend\Frontend;
use MotionKitConnector\Common\Assets\AssetLoader;

/**
 * Component Factory Class
 *
 * Factory pattern for creating plugin components.
 */
final class ComponentFactory
{
    /**
     * Create frontend instance
     *
     * @return Frontend Frontend instance
     */
    public static function create_frontend(): Frontend
    {
        return new Frontend();
    }

    /**
     * Create asset loader instance
     *
     * @return AssetLoader Asset loader instance
     */
    public static function create_asset_loader(): AssetLoader
    {
        return new AssetLoader();
    }
}
