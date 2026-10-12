<?php

/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

namespace MotionKitConnector\Auth;

use MotionKitConnector\Common\EditorEndpoint;

// Prevent direct access
if (!defined('ABSPATH')) {
  exit;
}

/**
 * Read side of the MotionKit connection.
 *
 * The connect flow itself (authorize, callback, token exchange, verify,
 * disconnect) belongs to the free MotionKit plugin, which owns the Connect page.
 * The connector only needs to know whether the site is connected and what its
 * access token is, for the license check, the editor launch token and the
 * editor session verify.
 *
 * @package MotionKitConnector
 * @since 1.0.0
 */
final class OAuthHandler
{
  private const OPT_ACCESS_TOKEN = 'motionkit_access_token';

  public function init(): void
  {
    // These are the connector's own launch-token secrets; the free plugin's disconnect announces itself with this action rather than knowing about them.
    add_action('motionkit/oauth/disconnected', [__CLASS__, 'forget_session_secrets']);
  }

  /**
   * Get the verify-session URL.
   *
   * @return string
   */
  public static function get_verify_session_url(): string
  {
    return apply_filters('motionkit/connect/verify_session_url', EditorEndpoint::url('connect/verify-session'));
  }

  /**
   * Check if the site is connected to MotionKit.
   *
   * @return bool
   */
  public static function is_connected(): bool
  {
    $token = get_option(self::OPT_ACCESS_TOKEN);
    return !empty($token);
  }

  /**
   * Get the stored access token (decrypted).
   *
   * @return string|false
   */
  public static function get_access_token()
  {
    $encrypted = get_option(self::OPT_ACCESS_TOKEN);
    if (empty($encrypted) || !is_string($encrypted)) {
      return false;
    }

    // The free plugin writes this option in its own cipher format and key, so it is read back through the handler that wrote it.
    if (class_exists('\MotionKit\Auth\OAuthHandler') && method_exists('\MotionKit\Auth\OAuthHandler', 'get_access_token')) {
      $token = \MotionKit\Auth\OAuthHandler::get_access_token();
      if (is_string($token) && $token !== '') {
        return $token;
      }
    }

    // A site connected by an earlier connector build that ran the flow itself still holds a token in this plugin's format; it stays readable until the next connect rewrites it.
    return self::decrypt($encrypted);
  }

  public static function forget_session_secrets(): void
  {
    delete_option('motionkit_jwt_secret');
    delete_option('motionkit_used_jtis');
    // Cleared with the secret so a reconnect re-fetches the editor's secret rather than reading a dangling 'editor' marker left over from the old one.
    delete_option('motionkit_jwt_secret_source');
  }

  private static function decrypt(string $encrypted)
  {
    $key = self::get_encryption_key();

    if (strpos($encrypted, 'v2:') === 0) {
      // Strict mode so malformed base64 fails here instead of silently decoding garbage.
      $data = base64_decode(substr($encrypted, 3), true);
      // 32-byte MAC + 16-byte IV + at least one cipher block.
      if ($data === false || strlen($data) < 49) {
        return false;
      }

      $mac = substr($data, 0, 32);
      $iv = substr($data, 32, 16);
      $ciphertext = substr($data, 48);

      if (!hash_equals(hash_hmac('sha256', $iv . $ciphertext, $key, true), $mac)) {
        return false;
      }

      return openssl_decrypt($ciphertext, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);
    }

    // Legacy (pre-MAC) format: IV + ciphertext, no integrity tag. Still accepted so existing connections survive the upgrade.
    $data = base64_decode($encrypted, true);

    if ($data === false || strlen($data) < 17) {
      return false;
    }

    $iv = substr($data, 0, 16);
    $ciphertext = substr($data, 16);

    return openssl_decrypt($ciphertext, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);
  }

  private static function get_encryption_key(): string
  {
    // WordPress's own salts, or a per-site random secret persisted once when a site lacks them — never a hard-coded literal, which would make every such site's stored token decryptable with a known key.
    $auth   = defined('AUTH_KEY') && AUTH_KEY !== '' ? AUTH_KEY : '';
    $secure = defined('SECURE_AUTH_KEY') && SECURE_AUTH_KEY !== '' ? SECURE_AUTH_KEY : '';

    if ($auth === '' || $secure === '') {
      $fallback = get_option('motionkit_enc_fallback_key', '');
      if (!is_string($fallback) || $fallback === '') {
        $fallback = bin2hex(random_bytes(32));
        update_option('motionkit_enc_fallback_key', $fallback, false);
      }
      $auth   = $auth !== '' ? $auth : $fallback;
      $secure = $secure !== '' ? $secure : strrev($fallback);
    }

    return hash('sha256', $auth . $secure, true);
  }
}
