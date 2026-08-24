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

    return is_array($pt) && !empty($pt['enable']) && false !== filter_var($pt['enable'], FILTER_VALIDATE_BOOLEAN);
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

    if (!is_array($pt) || empty($pt['enable']) || false === filter_var($pt['enable'], FILTER_VALIDATE_BOOLEAN)) {
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
    $curtain = $preset_cfg['curtain'] ?? [];
    $color = esc_attr($curtain['color'] ?? '#0a0a0a');
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
          if (sessionStorage.getItem('motionkit-pt-arriving') === '1') {
            document.documentElement.classList.add('motionkit-pt-arriving');
          }
        } catch (e) {}
      })();
    </script>
    <?php
  }

  /**
   * Generate self-installing JS runtime for the active page transition
   */
  public static function generate_runtime_script(): string
  {
    // 1. Check if explicit custom/exported code was saved
    $stored = get_option('motionkit-page-transition-code');
    if (is_array($stored) && !empty($stored['code']) && is_string($stored['code']) && strlen(trim($stored['code'])) > 50) {
      return $stored['code'];
    }

    // 2. Otherwise generate dynamically from global settings
    $cfg = self::get_config();
    if ($cfg === null) {
      return '';
    }

    $preset_cfg = $cfg['preset'] ?? [];
    $type = $preset_cfg['transitionType'] ?? 'curtain';
    $curtain = $preset_cfg['curtain'] ?? [];

    $direction = $curtain['direction'] ?? 'up';
    $color = $curtain['color'] ?? '#0a0a0a';
    $exit_duration = (float) ($curtain['exitDuration'] ?? 0.75);
    $exit_ease = $curtain['exitEase'] ?? 'power4.inOut';
    $enter_duration = (float) ($curtain['enterDuration'] ?? 0.75);
    $enter_ease = $curtain['enterEase'] ?? 'power4.inOut';
    $body_effect = $preset_cfg['bodyEffect'] ?? 'none';
    $body_strength = (float) ($preset_cfg['bodyStrength'] ?? 1.0);
    $hold_duration = (float) ($preset_cfg['holdDuration'] ?? 0.0);

    return self::build_preset_script([
      'type'          => $type,
      'direction'     => $direction,
      'color'         => $color,
      'exitDuration'  => $exit_duration > 0 ? $exit_duration : 0.75,
      'exitEase'      => $exit_ease,
      'enterDuration' => $enter_duration > 0 ? $enter_duration : 0.75,
      'enterEase'     => $enter_ease,
      'bodyEffect'    => $body_effect,
      'bodyStrength'  => $body_strength,
      'holdDuration'  => $hold_duration,
    ]);
  }

  private static function build_preset_script(array $opts): string
  {
    $json = wp_json_encode($opts);

    return <<<JS
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  var CONFIG = {$json};
  var ARRANGE_KEY = 'motionkit-pt-arriving';

  function init() {
    var overlay = document.querySelector('.motionkit-pt-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'motionkit-pt-overlay';
      overlay.innerHTML = '<div class="motionkit-pt-panel" style="background:' + (CONFIG.color || '#0a0a0a') + '"></div>';
      document.body.appendChild(overlay);
    }

    var panel = overlay.querySelector('.motionkit-pt-panel');
    var isX = CONFIG.direction === 'left' || CONFIG.direction === 'right';
    var prop = isX ? 'xPercent' : 'yPercent';
    var exitFrom = { up: 100, down: -100, left: 100, right: -100 }[CONFIG.direction] || 100;
    var enterTo = { up: -100, down: 100, left: -100, right: 100 }[CONFIG.direction] || -100;

    // Check if arriving from a transition
    var arriving = false;
    try {
      arriving = sessionStorage.getItem(ARRANGE_KEY) === '1' || document.documentElement.classList.contains('motionkit-pt-arriving');
      if (arriving) sessionStorage.removeItem(ARRANGE_KEY);
    } catch (e) {}

    var cleanEarlyState = function () {
      document.documentElement.classList.remove('motionkit-pt-arriving');
    };

    if (arriving) {
      overlay.classList.add('is-active');

      if (typeof gsap !== 'undefined') {
        gsap.set(panel, { xPercent: 0, yPercent: 0, opacity: 1, force3D: true });

        var startEnter = function () {
          cleanEarlyState();
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              var tweenVars = {
                duration: Number(CONFIG.enterDuration) || 0.75,
                ease: CONFIG.enterEase || 'power4.inOut',
                force3D: true,
                onComplete: function () {
                  overlay.classList.remove('is-active');
                }
              };
              tweenVars[prop] = enterTo;
              gsap.to(panel, tweenVars);
            });
          });
        };

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          startEnter();
        } else {
          document.addEventListener('DOMContentLoaded', startEnter, { once: true });
        }
      } else {
        cleanEarlyState();
        overlay.classList.remove('is-active');
      }
    } else {
      cleanEarlyState();
      overlay.classList.remove('is-active');
    }

    // Intercept same-origin link clicks
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a) return;

      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
      if (a.target && a.target !== '' && a.target !== '_self') return;
      if (a.getAttribute('download') !== null) return;

      var target;
      try {
        target = new URL(href, location.href);
      } catch (err) {
        return;
      }

      if (target.origin !== location.origin) return;
      if (target.pathname === location.pathname && target.search === location.search && target.hash) return;
      if (target.pathname.indexOf('/wp-admin') !== -1 || target.pathname.indexOf('/wp-login.php') !== -1) return;
      if (target.search.indexOf('action=motionkit-editor') !== -1) return;

      e.preventDefault();
      overlay.classList.add('is-active');

      try {
        sessionStorage.setItem(ARRANGE_KEY, '1');
      } catch (err) {}

      var navigated = false;
      var navigate = function () {
        if (navigated) return;
        navigated = true;
        location.assign(target.toString());
      };

      if (typeof gsap !== 'undefined') {
        var initialProps = { xPercent: 0, yPercent: 0, opacity: 1, force3D: true };
        initialProps[prop] = exitFrom;
        gsap.set(panel, initialProps);

        var tweenVars = {
          duration: Number(CONFIG.exitDuration) || 0.75,
          ease: CONFIG.exitEase || 'power4.inOut',
          force3D: true,
          onComplete: function () {
            var hold = Math.max(0, Number(CONFIG.holdDuration) || 0) * 1000;
            if (hold > 0) setTimeout(navigate, hold);
            else navigate();
          }
        };
        tweenVars[prop] = 0;
        gsap.to(panel, tweenVars);

        // Failsafe navigation timeout
        setTimeout(navigate, (Number(CONFIG.exitDuration || 0.75) + Number(CONFIG.holdDuration || 0) + 0.3) * 1000);
      } else {
        navigate();
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
JS;
  }
}
