<?php

/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

/**
 * Animation Builder Device Configurations
 */

defined('ABSPATH') || die();

return [
  [
    'key' => 'desktop',
    'title' => 'Desktop',
    'viewWidth' => '1920px',
    'mediaQuery' => '(min-width: 1441px)',
    'width' => '1441',
  ],
  [
    'key' => 'laptop',
    'title' => 'Laptop',
    'viewWidth' => '1440px',
    'mediaQuery' => '(min-width: 1200px) and (max-width: 1440px)',
    'width' => '1200-1440'
  ],
  [
    'key' => 'tab_land',
    'title' => 'Tablet Landscape',
    'viewWidth' => '1024px',
    'mediaQuery' => '(min-width: 1024px) and (max-width: 1199px)',
  ],
  [
    'key' => 'tab',
    'title' => 'Tablet',
    'viewWidth' => '768px',
    'mediaQuery' => '(min-width: 768px) and (max-width: 1023px)',
  ],
  [
    'key' => 'mobile',
    'title' => 'Mobile',
    'viewWidth' => '375px',
    'mediaQuery' => '(max-width: 767px)',
  ],
];
