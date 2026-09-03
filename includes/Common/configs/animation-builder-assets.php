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
  'premiumPresets' => [
    // ############## CURSOR ############## //
    'motionkit-mk-cursor-cm-pa' => [
      'src' =>  MOTIONKIT_CONNECTOR_PLUGIN_URL . 'assets/build/presets/mostPopular/cursorHoverMoveAnim.js',
      'deps' => ['gsap', 'ScrollTrigger'],
      'version' => MOTIONKIT_CONNECTOR_VERSION,
    ],
    'motionkit-mk-cursor-cr-pa' => [
      'src' =>  MOTIONKIT_CONNECTOR_PLUGIN_URL . 'assets/build/presets/mostPopular/cursorHoverRevealAnim.js',
      'deps' => ['gsap', 'ScrollTrigger'],
      'version' => MOTIONKIT_CONNECTOR_VERSION,
    ],
    'motionkit-mk-cursor-tilt-pa' => [
      'src' =>  MOTIONKIT_CONNECTOR_PLUGIN_URL . 'assets/build/presets/mostPopular/cursorHoverTiltAnim.js',
      'deps' => ['gsap', 'ScrollTrigger'],
      'version' => MOTIONKIT_CONNECTOR_VERSION,
    ],

    // ############## IMAGE ############## //
    'motionkit-mk-image-sr-pa' => [
      'src' =>  MOTIONKIT_CONNECTOR_PLUGIN_URL . 'assets/build/presets/mostPopular/imageSpotlightHoverReveal.js',
      'deps' => ['gsap', 'ScrollTrigger'],
      'version' => MOTIONKIT_CONNECTOR_VERSION,
    ],
    'motionkit-mk-image-mg-pa' => [
      'src' =>  MOTIONKIT_CONNECTOR_PLUGIN_URL . 'assets/build/presets/mostPopular/imageHoverMagnifier.js',
      'deps' => ['gsap', 'ScrollTrigger'],
      'version' => MOTIONKIT_CONNECTOR_VERSION,
    ],
    'motionkit-mk-image-cm-pa' => [
      'src' =>  MOTIONKIT_CONNECTOR_PLUGIN_URL . 'assets/build/presets/mostPopular/imageCinematicMaskAnim.js',
      'deps' => ['gsap', 'ScrollTrigger'],
      'version' => MOTIONKIT_CONNECTOR_VERSION,
    ],
    'motionkit-mk-image-ss-pa' => [
      'src' =>  MOTIONKIT_CONNECTOR_PLUGIN_URL . 'assets/build/presets/mostPopular/imageSliceShutterAnim.js',
      'deps' => ['gsap', 'ScrollTrigger'],
      'version' => MOTIONKIT_CONNECTOR_VERSION,
    ],
    'motionkit-mk-image-md-pa' => [
      'src' =>  MOTIONKIT_CONNECTOR_PLUGIN_URL . 'assets/build/presets/mostPopular/imageMosaicDepthAnim.js',
      'deps' => ['gsap', 'ScrollTrigger'],
      'version' => MOTIONKIT_CONNECTOR_VERSION,
    ],
    'motionkit-mk-image-hr-pa' => [
      'src' =>  MOTIONKIT_CONNECTOR_PLUGIN_URL . 'assets/build/presets/mostPopular/imageHoverRevealAnim.js',
      'deps' => ['gsap', 'ScrollTrigger'],
      'version' => MOTIONKIT_CONNECTOR_VERSION,
    ],

    // ############## POPUP ############## //
    'motionkit-mk-popup-media-pa' => [
      'src' => MOTIONKIT_CONNECTOR_PLUGIN_URL . 'assets/build/presets/mostPopular/popupMediaAnim.js',
      'deps' => ['gsap', 'ScrollTrigger'],
      'version' => MOTIONKIT_CONNECTOR_VERSION,
    ],

    // ############## SCROLL ############## //
    'motionkit-mk-scroll-cr-pa' => [
      'src' => MOTIONKIT_CONNECTOR_PLUGIN_URL . 'assets/build/presets/mostPopular/cubeScrollRevealAnim.js',
      'deps' => ['gsap', 'ScrollTrigger'],
      'version' => MOTIONKIT_CONNECTOR_VERSION,
    ],
    'motionkit-mk-scroll-hor-pa' => [
      'src' => MOTIONKIT_CONNECTOR_PLUGIN_URL . 'assets/build/presets/mostPopular/horizontalScrollAnim.js',
      'deps' => ['gsap', 'ScrollTrigger'],
      'version' => MOTIONKIT_CONNECTOR_VERSION,
    ],
    'motionkit-mk-scroll-vf-pa' => [
      'src' => MOTIONKIT_CONNECTOR_PLUGIN_URL . 'assets/build/presets/mostPopular/scrollVideoFrame.js',
      'deps' => ['gsap', 'ScrollTrigger'],
      'version' => MOTIONKIT_CONNECTOR_VERSION,
    ],

    // ############## STICKY ############## //
    'motionkit-mk-sticky-hs-pa' => [
      'src' => MOTIONKIT_CONNECTOR_PLUGIN_URL . 'assets/build/presets/mostPopular/headerStickyAnim.js',
      'deps' => ['gsap', 'ScrollTrigger'],
      'version' => MOTIONKIT_CONNECTOR_VERSION,
    ],

    // ############## TEXT ############## //
    'motionkit-mk-text-wave-pa' => [
      'src' => MOTIONKIT_CONNECTOR_PLUGIN_URL . 'assets/build/presets/mostPopular/textWaveAnim.js',
      'deps' => ['gsap', 'ScrollTrigger', 'SplitText'],
      'version' => MOTIONKIT_CONNECTOR_VERSION,
    ],
    'motionkit-mk-text-swipe-pa' => [
      'src' => MOTIONKIT_CONNECTOR_PLUGIN_URL . 'assets/build/presets/mostPopular/textSwipeRevealAnim.js',
      'deps' => ['gsap', 'ScrollTrigger', 'SplitText'],
      'version' => MOTIONKIT_CONNECTOR_VERSION,
    ],
  ],
];
