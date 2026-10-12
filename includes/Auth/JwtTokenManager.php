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
 * JWT Token Manager for MotionKit Extension
 *
 * Generates and validates HMAC-SHA256 JSON Web Tokens for editor sessions.
 * Tokens are single-use (jti tracked) with a configurable TTL.
 *
 * @package MotionKitConnector
 * @since 1.0.0
 */
final class JwtTokenManager
{
  /**
   * Token TTL in seconds (8 hours — covers a full editor session)
   */
  private const TTL = 28800;

  /**
   * WP option key for used jti values
   */
  private const JTI_OPTION = 'motionkit_used_jtis';

  /**
   * Records where motionkit_jwt_secret came from: 'editor' (the editor's own
   * signing secret, fetched once connected) or 'local' (a fallback minted here).
   * A local secret is replaced by the editor's on a later fetch; an unmarked or
   * local secret never short-circuits that fetch, so a random fallback written
   * before the site connected — or forced by an unauthenticated token hitting
   * get_secret — can no longer stick for good and leave the site signing with a
   * secret the editor never issued.
   */
  private const SECRET_SOURCE_OPTION = 'motionkit_jwt_secret_source';

  // Gates the legacy /connect/token-secret fetch in get_secret(). A site upgraded from an older build holds an unmarked secret, so without this every token check on a site still carrying a dead legacy api key would make an outbound call that earlier builds never made.
  private const SECRET_SYNC_LOCK = 'motionkit_connector_secret_sync_lock';

  /**
   * Generate a signed JWT by calling the MotionKit server's /connect/launch endpoint.
   *
   * @param string $site_url The WordPress site URL being edited
   * @return string The JWT token, or empty string on failure
   */
  public static function generate(string $site_url): string
  {
    $editor_url = apply_filters('motionkit/editor/url', EditorEndpoint::base());
    $editor_url = rtrim($editor_url, '/');

    $access_token = OAuthHandler::get_access_token();
    if (empty($access_token)) {
      return self::generate_local($site_url);
    }

    $response = wp_remote_post(
      $editor_url . '/connect/launch',
      [
        'headers' => [
          'Content-Type'  => 'application/json',
          'Authorization' => 'Bearer ' . $access_token,
        ],
        'body'    => wp_json_encode([
          'site'     => home_url(),
          'page_url' => $site_url,
        ]),
        'timeout' => 15,
      ]
    );

    if (!is_wp_error($response)) {
      $code = wp_remote_retrieve_response_code($response);
      $body = json_decode(wp_remote_retrieve_body($response), true);

      if ($code === 200 && !empty($body['token'])) {
        return $body['token'];
      }
    }

    return self::generate_local($site_url);
  }

  private static function generate_local(string $site_url): string
  {
    $secret = self::get_secret();
    $now = time();
    $jti = bin2hex(random_bytes(16));

    $header = self::base64url_encode(wp_json_encode([
      'alg' => 'HS256',
      'typ' => 'JWT',
    ]));

    $payload = self::base64url_encode(wp_json_encode([
      'iss'  => home_url(),
      'sub'  => get_current_user_id(),
      'site' => $site_url,
      'iat'  => $now,
      'exp'  => $now + self::TTL,
      'jti'  => $jti,
    ]));

    $signature = self::base64url_encode(
      hash_hmac('sha256', "$header.$payload", $secret, true)
    );

    return "$header.$payload.$signature";
  }

  public static function validate(string $token)
  {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
      return false;
    }

    [$header, $payload, $signature] = $parts;

    $secret = self::get_secret();
    $expected_sig = self::base64url_encode(
      hash_hmac('sha256', "$header.$payload", $secret, true)
    );

    if (!hash_equals($expected_sig, $signature)) {
      return false;
    }

    $data = json_decode(self::base64url_decode($payload), true);
    if (!is_array($data)) {
      return false;
    }

    if (!isset($data['exp']) || $data['exp'] < time()) {
      return false;
    }

    if (!isset($data['iss']) || $data['iss'] !== home_url()) {
      return false;
    }

    if (!isset($data['jti']) || self::is_jti_used($data['jti'])) {
      return false;
    }

    self::mark_jti_used($data['jti'], $data['exp']);

    return $data;
  }

  public static function validate_reusable(string $token)
  {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
      return false;
    }

    [$header, $payload, $signature] = $parts;

    $secret = self::get_secret();
    $expected_sig = self::base64url_encode(
      hash_hmac('sha256', "$header.$payload", $secret, true)
    );

    if (!hash_equals($expected_sig, $signature)) {
      return false;
    }

    $data = json_decode(self::base64url_decode($payload), true);
    if (!is_array($data)) {
      return false;
    }

    if (!isset($data['exp']) || $data['exp'] < time()) {
      return false;
    }

    if (!isset($data['iss']) || $data['iss'] !== home_url()) {
      return false;
    }

    return $data;
  }

  private static function get_secret(): string
  {
    $secret = get_option('motionkit_jwt_secret');
    $usable = is_string($secret) && $secret !== '';

    // A secret the editor itself supplied is authoritative — keep it and make no outbound call.
    if ($usable && get_option(self::SECRET_SOURCE_OPTION, '') === 'editor') {
      return $secret;
    }

    // No secret, or only a local fallback: ask the editor for its real signing secret once connected. Fetching here is what lets a local secret be replaced rather than stick for good.
    $editor_url = get_option('motionkit_editor_url', '');
    $api_key = get_option('motionkit_api_key', '');

    // At most one attempt per window: five minutes while a usable secret already signs tokens, thirty seconds when there is none yet. A good answer marks the secret 'editor', which ends the attempts for good.
    if ($editor_url && $api_key && !get_transient(self::SECRET_SYNC_LOCK)) {
      set_transient(self::SECRET_SYNC_LOCK, 1, $usable ? 300 : 30);

      $response = wp_remote_get(
        rtrim($editor_url, '/') . '/connect/token-secret',
        [
          'headers' => ['Authorization' => 'Bearer ' . $api_key],
          // 3s, not 10s: get_secret runs inside validate_reusable, which an unauthenticated /save reaches on any three-part token, so this call must not be a 10s worker-stall an attacker can trigger.
          'timeout' => 3,
        ]
      );

      if (!is_wp_error($response)) {
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!empty($body['token_secret'])) {
          $secret = (string) $body['token_secret'];
          update_option('motionkit_jwt_secret', $secret, false);
          update_option(self::SECRET_SOURCE_OPTION, 'editor', false);
          return $secret;
        }
      }
    }

    // Keep an existing local secret rather than rotating it on every call.
    if ($usable) {
      return $secret;
    }

    // Local fallback so a token this site mints for its own launches works before it is ever connected. Marked local, so the editor's secret replaces it on a later fetch instead of this value being signed with for good.
    $secret = bin2hex(random_bytes(32));
    update_option('motionkit_jwt_secret', $secret, false);
    update_option(self::SECRET_SOURCE_OPTION, 'local', false);

    return $secret;
  }

  private static function is_jti_used(string $jti): bool
  {
    $used = get_option(self::JTI_OPTION, []);
    return isset($used[$jti]);
  }

  private static function mark_jti_used(string $jti, int $exp): void
  {
    $used = get_option(self::JTI_OPTION, []);

    $now = time();
    $used = array_filter($used, function ($expiry) use ($now) {
      return $expiry > $now;
    });

    $used[$jti] = $exp;
    update_option(self::JTI_OPTION, $used, false);
  }

  private static function base64url_encode(string $data): string
  {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
  }

  private static function base64url_decode(string $data): string
  {
    $remainder = strlen($data) % 4;
    if ($remainder) {
      $data .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(strtr($data, '-_', '+/'));
  }
}
