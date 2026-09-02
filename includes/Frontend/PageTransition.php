<?php

/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

declare(strict_types=1);

namespace MotionKitConnector\Frontend;

defined('ABSPATH') || exit;

/**
 * Page Transition Runtime Generator & Manager
 *
 * Automatically generates, enqueues and runs smooth animated page transitions
 * across WordPress page navigations using GSAP with luxury cinematic easing and zero flicker.
 *
 * @package MotionKitConnector
 */
final class PageTransition
{
  /**
   * Check if page transition is enabled globally
   */
  public static function is_enabled(): bool
  {
    $global = get_option('motionkit_global_settings');
    if (!is_array($global)) {
      return false;
    }

    $pt = $global['pageTransition'] ?? null;
    if (is_object($pt)) {
      $pt = (array) $pt;
    }

    // Strictly `true`, because pageTransitionEngine/config.js is strict. A looser gate here than in the engine means the cover is painted for a transition that will never run, and there is no timer behind this one to undo it.
    return is_array($pt) && ($pt['enable'] ?? null) === true;
  }

  /**
   * Get the active transition configuration
   */
  public static function get_config(): ?array
  {
    $global = get_option('motionkit_global_settings');
    if (!is_array($global)) {
      return null;
    }

    $pt = $global['pageTransition'] ?? null;
    if (is_object($pt)) {
      $pt = (array) $pt;
    }

    // See is_enabled(): the same strict comparison, for the same reason.
    if (!is_array($pt) || ($pt['enable'] ?? null) !== true) {
      return null;
    }

    return $pt;
  }

  /**
   * Print instant anti-flicker early check in <head>
   */
  public static function print_head_early_cover(): void
  {
    if (!self::is_enabled()) {
      return;
    }

    $cfg = self::get_config();
    $preset_cfg = $cfg['preset'] ?? [];
    // The cover exists only to stop a flash of the uncovered page before the engine boots and arrive() sets the real state, so any full-screen fill will do — but it must be the SELECTED preset's colour. This read was hardcoded to `curtain`, so choosing any other transition painted the early cover in a colour from a preset the visitor never sees.
    // A custom transition has no colour setting — its look comes from the user's own tween vars — so the neutral default is the honest fill here rather than a colour borrowed from a preset the visitor never sees.
    $key = ($cfg['tabs'] ?? null) === 'custom'
      ? ''
      : (is_string($preset_cfg['transitionType'] ?? null) ? $preset_cfg['transitionType'] : '');
    $selected = ($key !== '' && is_array($preset_cfg[$key] ?? null)) ? $preset_cfg[$key] : [];
    $fallback = is_array($preset_cfg['curtain'] ?? null) ? $preset_cfg['curtain'] : [];
    $color = esc_attr($selected['color'] ?? $fallback['color'] ?? '#0a0a0a');
    ?>
    <style id="motionkit-pt-early-style">
      .motionkit-pt-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999999;
        pointer-events: none;
        overflow: hidden;
        visibility: hidden;
        transform: translate3d(0, 0, 0);
        -webkit-transform: translate3d(0, 0, 0);
      }
      .motionkit-pt-overlay.is-active,
      html.motionkit-pt-arriving .motionkit-pt-overlay {
        pointer-events: auto !important;
        visibility: visible !important;
      }
      .motionkit-pt-panel {
        position: absolute;
        inset: 0;
        background: <?php echo $color; ?>;
        will-change: transform;
        transform: translate3d(0, 0, 0);
        -webkit-transform: translate3d(0, 0, 0);
      }
    </style>
    <script id="motionkit-pt-early-script">
      (function () {
        try {
          if (sessionStorage.getItem('motionkit-pt-arriving') !== '1') return;
          var html = document.documentElement;
          html.classList.add('motionkit-pt-arriving');
          // The engine drops this class the moment it owns the overlay, so in the normal case the timer never fires. It exists for the case where the engine never boots at all — a 404 on the bundle, a GSAP CDN that never answers — because the rule above is printed !important, and !important is the one thing a CSS animation cannot outrank, so the pure-CSS failsafe pattern the preloader uses is not available here. That leaves this inline script, which is the only JS guaranteed to have run if the class exists at all. Unnetted, the class pins a full-screen pointer-events:auto overlay over the page and no link or button on it can be clicked again.
          // Firing early is harmless: before the engine boots there is no overlay for the rule to match, and once it boots the overlay's own is-active class carries the cover.
          setTimeout(function () {
            html.classList.remove('motionkit-pt-arriving');
          }, 4000);
        } catch (e) {}
      })();
    </script>
    <?php
  }

}
