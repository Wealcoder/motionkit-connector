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

    if (!empty($secret)) {
      return $secret;
    }

    $editor_url = get_option('motionkit_editor_url', '');
    $api_key = get_option('motionkit_api_key', '');

    if ($editor_url && $api_key) {
      $response = wp_remote_get(
        rtrim($editor_url, '/') . '/connect/token-secret',
        [
          'headers' => ['Authorization' => 'Bearer ' . $api_key],
          'timeout' => 10,
        ]
      );

      if (!is_wp_error($response)) {
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!empty($body['token_secret'])) {
          $secret = $body['token_secret'];
          update_option('motionkit_jwt_secret', $secret, false);
          return $secret;
        }
      }
    }

    $secret = bin2hex(random_bytes(32));
    update_option('motionkit_jwt_secret', $secret, false);

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
