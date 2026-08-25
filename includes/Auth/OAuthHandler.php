<?php

/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

namespace MotionKitConnector\Auth;

// Prevent direct access
if (!defined('ABSPATH')) {
  exit;
}

/**
 * OAuth Handler for MotionKit Extension
 *
 * Manages the OAuth connect flow between WordPress and motionkit.io:
 * - State token generation (CSRF protection)
 * - Redirect to motionkit.io authorize page
 * - Callback handling (code → access token exchange)
 * - Token storage (AES-256 encrypted in wp_options)
 * - Disconnect / token revocation
 *
 * @package MotionKitConnector
 * @since 1.0.0
 */
final class OAuthHandler
{
  /**
   * MotionKit authorize endpoint
   */
  private const AUTHORIZE_URL = 'https://editor.motionkit.io/connect/authorize';

  /**
   * MotionKit token exchange endpoint
   */
  private const TOKEN_URL = 'https://editor.motionkit.io/connect/token';

  /**
   * MotionKit revoke endpoint
   */
  private const REVOKE_URL = 'https://editor.motionkit.io/connect/revoke';

  /**
   * Get the authorize URL.
   *
   * @return string
   */
  private static function get_authorize_base_url(): string
  {
    return apply_filters('motionkit/connect/authorize_url', self::AUTHORIZE_URL);
  }

  /**
   * Get the token exchange URL.
   *
   * @return string
   */
  private static function get_token_url(): string
  {
    return apply_filters('motionkit/connect/token_url', self::TOKEN_URL);
  }

  /**
   * Get the revoke URL.
   *
   * @return string
   */
  private static function get_revoke_url(): string
  {
    return apply_filters('motionkit/connect/revoke_url', self::REVOKE_URL);
  }

  /**
   * Get the validate URL.
   *
   * @return string
   */
  private static function get_validate_url(): string
  {
    return apply_filters('motionkit/connect/validate_url', 'https://editor.motionkit.io/connect/validate');
  }

  /**
   * Get the verify-session URL.
   *
   * @return string
   */
  public static function get_verify_session_url(): string
  {
    return apply_filters('motionkit/connect/verify_session_url', 'https://editor.motionkit.io/connect/verify-session');
  }

  /**
   * WP option keys
   */
  private const OPT_ACCESS_TOKEN = 'motionkit_access_token';
  private const OPT_CONNECTED_AT = 'motionkit_connected_at';
  private const OPT_CONNECTED_EMAIL = 'motionkit_connected_email';
  private const OPT_STATE_TOKEN = 'motionkit_oauth_state';

  /**
   * Initialize OAuth hooks
   *
   * @return void
   */
  public function init(): void
  {
    add_action('admin_init', [$this, 'handle_callback']);
    add_action('admin_init', [$this, 'handle_disconnect']);
    add_action('admin_init', [$this, 'handle_verify']);
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
   * Get connection info for display.
   *
   * @return array{connected: bool, email: string, connected_at: string}
   */
  public static function get_connection_info(): array
  {
    return [
      'connected'    => self::is_connected(),
      'email'        => get_option(self::OPT_CONNECTED_EMAIL, ''),
      'connected_at' => get_option(self::OPT_CONNECTED_AT, ''),
    ];
  }

  /**
   * Get the stored access token (decrypted).
   *
   * @return string|false
   */
  public static function get_access_token()
  {
    $encrypted = get_option(self::OPT_ACCESS_TOKEN);
    if (empty($encrypted)) {
      return false;
    }
    return self::decrypt($encrypted);
  }

  /**
   * Build the authorize URL and store state token.
   *
   * @param bool $switch_account
   * @return string
   */
  public function get_authorize_url(bool $switch_account = false): string
  {
    $state = bin2hex(random_bytes(32));
    set_transient(self::OPT_STATE_TOKEN, $state, 600);

    $params = [
      'state'         => $state,
      'site'          => home_url('/'),
      'response_type' => 'code',
      'redirect_uri'  => $this->get_callback_url(),
    ];

    if ($switch_account) {
      $params['prompt'] = 'login';
    }

    return add_query_arg($params, self::get_authorize_base_url());
  }

  private function get_callback_url(): string
  {
    return admin_url('admin.php?page=motionkit-connect');
  }

  public function handle_callback(): void
  {
    if (!isset($_GET['page'], $_GET['code'], $_GET['state'])) {
      return;
    }

    // Unslash + sanitize before comparing; CSRF for this OAuth callback is enforced by the server-stored `state` token validated with hash_equals() below.
    $page = sanitize_key(wp_unslash($_GET['page']));
    if ($page !== 'motionkit-connect') {
      return;
    }

    if (!current_user_can('manage_options')) {
      return;
    }

    $code = sanitize_text_field(wp_unslash($_GET['code']));
    $state = sanitize_text_field(wp_unslash($_GET['state']));

    $stored_state = get_transient(self::OPT_STATE_TOKEN);
    if (!$stored_state || !hash_equals($stored_state, $state)) {
      wp_safe_redirect(wp_nonce_url(
        admin_url('admin.php?page=motionkit-connect&tab=connect&error=invalid_state'),
        'motionkit_notice'
      ));
      exit;
    }

    delete_transient(self::OPT_STATE_TOKEN);

    $result = $this->exchange_code_for_token($code);

    if (is_wp_error($result)) {
      $redirect = admin_url('admin.php?page=motionkit-connect&tab=connect&error=' . $result->get_error_code());
      if ($result->get_error_message()) {
        $redirect = add_query_arg('error_message', rawurlencode($result->get_error_message()), $redirect);
      }
      wp_safe_redirect(wp_nonce_url($redirect, 'motionkit_notice'));
      exit;
    }

    $encrypted = self::encrypt($result['access_token']);
    update_option(self::OPT_ACCESS_TOKEN, $encrypted, false);
    update_option(self::OPT_CONNECTED_AT, current_time('mysql'), false);

    if (!empty($result['email'])) {
      update_option(self::OPT_CONNECTED_EMAIL, sanitize_email($result['email']), false);
    }

    do_action('motionkit/oauth/connected');

    wp_safe_redirect(wp_nonce_url(
      admin_url('admin.php?page=motionkit-connect&tab=connect&connected=1'),
      'motionkit_notice'
    ));
    exit;
  }

  private function exchange_code_for_token(string $code)
  {
    $response = wp_remote_post(self::get_token_url(), [
      'timeout' => 30,
      'headers' => [
        'Content-Type' => 'application/json',
      ],
      'body' => wp_json_encode([
        'code'         => $code,
        'site'         => home_url('/'),
        'redirect_uri' => $this->get_callback_url(),
        'grant_type'   => 'authorization_code',
      ]),
    ]);

    if (is_wp_error($response)) {
      return new \WP_Error('token_exchange_failed', $response->get_error_message());
    }

    $status = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if ($status !== 200 || empty($body['access_token'])) {
      $error_code = !empty($body['limit_exceeded']) ? 'limit_exceeded' : 'token_exchange_failed';
      $error_msg  = $body['message'] ?? $body['error'] ?? 'Failed to exchange authorization code';
      return new \WP_Error($error_code, $error_msg);
    }

    return $body;
  }

  public function handle_verify(): void
  {
    if (!isset($_GET['motionkit_verify'])) {
      return;
    }

    if (!current_user_can('manage_options')) {
      return;
    }

    if (!isset($_GET['_wpnonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_GET['_wpnonce'])), 'motionkit_verify')) {
      return;
    }

    $result = $this->verify_token_with_server();

    if (is_wp_error($result)) {
      wp_safe_redirect(wp_nonce_url(
        admin_url('admin.php?page=motionkit-connect&verify=error&reason=' . $result->get_error_code()),
        'motionkit_notice'
      ));
      exit;
    }

    $status = $result ? 'valid' : 'invalid';
    wp_safe_redirect(wp_nonce_url(
      admin_url('admin.php?page=motionkit-connect&verify=' . $status),
      'motionkit_notice'
    ));
    exit;
  }

  public function verify_token_with_server()
  {
    $token = self::get_access_token();
    if (!$token) {
      return new \WP_Error('no_token', 'No access token stored locally');
    }

    $token_hash = hash('sha256', $token);

    $response = wp_remote_post(self::get_validate_url(), [
      'timeout' => 15,
      'headers' => ['Content-Type' => 'application/json'],
      'body'    => wp_json_encode([
        'site'       => home_url(),
        'token_hash' => $token_hash,
      ]),
    ]);

    if (is_wp_error($response)) {
      return new \WP_Error('server_unreachable', $response->get_error_message());
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    return !empty($body['valid']);
  }

  public function handle_disconnect(): void
  {
    if (!isset($_GET['motionkit_disconnect'])) {
      return;
    }

    if (!current_user_can('manage_options')) {
      return;
    }

    if (!isset($_GET['_wpnonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_GET['_wpnonce'])), 'motionkit_disconnect')) {
      return;
    }

    $token = self::get_access_token();
    if ($token) {
      wp_remote_post(self::get_revoke_url(), [
        'timeout' => 10,
        'headers' => ['Content-Type' => 'application/json'],
        'body'    => wp_json_encode(['access_token' => $token, 'site' => home_url()]),
      ]);
    }

    delete_option(self::OPT_ACCESS_TOKEN);
    delete_option(self::OPT_CONNECTED_AT);
    delete_option(self::OPT_CONNECTED_EMAIL);
    delete_option('motionkit_jwt_secret');
    delete_option('motionkit_used_jtis');

    do_action('motionkit/oauth/disconnected');

    wp_safe_redirect(wp_nonce_url(
      admin_url('admin.php?page=motionkit-connect&tab=connect&disconnected=1'),
      'motionkit_notice'
    ));
    exit;
  }

  private static function encrypt(string $value): string
  {
    $key = self::get_encryption_key();
    $iv = random_bytes(16);
    $ciphertext = openssl_encrypt($value, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);

    // Encrypt-then-MAC: sign IV+ciphertext so an attacker with DB-write access can't bit-flip the stored token undetected; the 'v2:' prefix keeps pre-MAC values decryptable via the legacy branch below.
    $mac = hash_hmac('sha256', $iv . $ciphertext, $key, true);

    return 'v2:' . base64_encode($mac . $iv . $ciphertext);
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

    // Legacy (pre-MAC) format: IV + ciphertext, no integrity tag. Still accepted so existing connections survive the upgrade; re-connecting or switching accounts rewrites the option in v2 format.
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
    // Prefer WordPress's own salts. If a site is missing them, fall back to a
    // per-site random secret persisted once — never a hard-coded literal like
    // 'default-key', which would make every such site's stored token trivially
    // decryptable with a known key.
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
