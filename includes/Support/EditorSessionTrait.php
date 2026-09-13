<?php

/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

namespace MotionKitConnector\Support;

// Prevent direct access
if (!defined('ABSPATH')) {
  exit;
}

use MotionKitConnector\Auth\OAuthHandler;
use MotionKitConnector\Common\EditorEndpoint;

trait EditorSessionTrait
{
  /**
   * Verify a server-generated editor session token via the SaaS API.
   *
   * @param string $token The JWT string
   * @return bool True if the session is valid
   */
  private function verify_server_session(string $token): bool
  {
    $cache_key = 'motionkit_session_' . substr(md5($token), 0, 16);
    $cached = get_transient($cache_key);

    if ($cached !== false) {
      return $cached === 'valid';
    }

    $verify_url = OAuthHandler::get_verify_session_url();

    $response = wp_remote_post($verify_url, [
      'timeout' => 10,
      'headers' => ['Content-Type' => 'application/json'],
      'body'    => wp_json_encode(['token' => $token]),
    ]);

    if (is_wp_error($response)) {
      return false;
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    $valid = isset($body['valid']) && $body['valid'] === true;

    set_transient($cache_key, $valid ? 'valid' : 'invalid', 300);

    return $valid;
  }

  /**
   * Editor origins allowed to embed the site / read REST responses.
   *
   * @param bool $include_wildcard Append '*' to the base list before filtering.
   * @return array
   */
  private function editor_allowed_origins(bool $include_wildcard = false): array
  {
    // This build's editor, not production's. A dev build that kept the production origin here would hand the dev editor a CSP frame-ancestors list it is not on, so the preview iframe would come up blank and every REST read would fail CORS.
    $origins = [EditorEndpoint::origin()];

    // Localhost editor origins are for local development of the SaaS editor
    // only. Shipping them to production would let any page a visitor runs on
    // their own machine make credentialed cross-origin reads against the live
    // REST API, so gate them behind WP_DEBUG.
    if (defined('WP_DEBUG') && WP_DEBUG) {
      $origins = array_merge($origins, [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost:3000',
      ]);
    }

    // NOTE: $include_wildcard is retained for backward compatibility only. A
    // '*' in a frame-ancestors / CORS list makes the whole allowlist moot
    // (clickjacking / open CORS), so callers must NOT rely on it. It is
    // ignored here on purpose.
    unset($include_wildcard);

    $origins = apply_filters('motionkit/editor/allowed_origins', $origins);

    // Harden against a filter (or legacy caller) reintroducing a wildcard.
    return array_values(array_filter(
      (array) $origins,
      static function ($o) {
        return is_string($o) && $o !== '' && $o !== '*';
      }
    ));
  }

  /**
   * Derive the page-settings config from the page-animation config by
   * swapping the option key prefix.
   *
   * @param array $animation_config
   * @return array
   */
  private function settings_config(array $animation_config): array
  {
    $cfg = $animation_config;
    if (!empty($cfg['option']) && is_string($cfg['option'])) {
      $cfg['option'] = preg_replace(
        '/^motionkit_pg_animation_/',
        'motionkit_pg_settings_',
        $cfg['option']
      );
    }
    return $cfg;
  }

  /**
   * Validate a client-supplied pageTypeConfigs envelope.
   *
   * @param array $config
   * @return bool
   */
  private function is_valid_page_type_config(array $config): bool
  {
    $store_type = $config['store_type'] ?? '';
    $option     = $config['option'] ?? '';

    if (!in_array($store_type, ['post_meta', 'term_meta', 'option'], true)) {
      return false;
    }

    if (!is_string($option) || strpos($option, 'motionkit_pg_') !== 0) {
      return false;
    }

    if ($store_type === 'post_meta') {
      $id = isset($config['id']) ? (int) $config['id'] : 0;
      if ($id <= 0 || !get_post($id)) {
        return false;
      }
    }

    if ($store_type === 'term_meta') {
      $id = isset($config['id']) ? (int) $config['id'] : 0;
      if ($id <= 0 || !get_term($id)) {
        return false;
      }
    }

    return true;
  }
}
