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
  // The five endpoints below were `private const` literals. A const cannot call EditorEndpoint::url(), and hardcoding the host in each one is what a dev build would have had to rewrite five times over — so they are built here instead, from the single origin the plugin defines. The filters are unchanged; only the default they fall back to now follows the build.

  /**
   * Get the authorize URL.
   *
   * @return string
   */
  private static function get_authorize_base_url(): string
  {
    return apply_filters('motionkit/connect/authorize_url', EditorEndpoint::url('connect/authorize'));
  }

  /**
   * Get the token exchange URL.
   *
   * @return string
   */
  private static function get_token_url(): string
  {
    return apply_filters('motionkit/connect/token_url', EditorEndpoint::url('connect/token'));
  }

  /**
   * Get the revoke URL.
   *
   * @return string
   */
  private static function get_revoke_url(): string
  {
    return apply_filters('motionkit/connect/revoke_url', EditorEndpoint::url('connect/revoke'));
  }

  /**
   * Get the validate URL.
   *
   * @return string
   */
  private static function get_validate_url(): string
  {
    return apply_filters('motionkit/connect/validate_url', EditorEndpoint::url('connect/validate'));
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
   * WP option keys
   */
  private const OPT_ACCESS_TOKEN = 'motionkit_access_token';
  private const OPT_CONNECTED_AT = 'motionkit_connected_at';
  private const OPT_CONNECTED_EMAIL = 'motionkit_connected_email';
  private const OPT_STATE_TOKEN = 'motionkit_oauth_state';

  // The state is an option rather than a transient because a persistent object cache (Redis) can evict a transient well before its TTL — on a shared, near-full Redis under allkeys-lru that happens in seconds. The state then vanished mid-flow with no trace in the database, no handler owned the callback, and the user got WordPress's "The link you followed has expired." An option is a real row, so only the expiry below removes it.
  private const STATE_TTL = 600;

  /**
   * Initialize OAuth hooks
   *
   * @return void
   */
  public function init(): void
  {
    // The OAuth FLOW belongs to the free plugin: it owns the Connect page, ConnectPage::authorize_url() prefers its handler, and the state token lives in its motionkit_oauth_state option. Both plugins used to hook these, and whichever ran first answered — the connector, finding nothing in its own transient, redirected with error=invalid_state and exited before the handler holding the state could run. Registering nothing here leaves exactly one callback for one state store.
    if (class_exists('\MotionKit\Auth\OAuthHandler')) {
      return;
    }

    // Standalone connector (free plugin not installed) still needs its own flow.
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

    // With the free plugin active its handler runs the connect (see init()) and writes this option in its own cipher format and key, which decrypt() below cannot read — the license check then stopped at no_token and showed "Unable to verify" forever. Read it back through the handler that wrote it.
    if (class_exists('\MotionKit\Auth\OAuthHandler') && method_exists('\MotionKit\Auth\OAuthHandler', 'get_access_token')) {
      $token = \MotionKit\Auth\OAuthHandler::get_access_token();
      if (is_string($token) && $token !== '') {
        return $token;
      }
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
    self::store_state($state);

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

  // Stored with its own expiry because an option has none of its own. autoload=false: this is read only during the seconds-long callback, never on a normal page load.
  private static function store_state(string $state): void
  {
    update_option(self::OPT_STATE_TOKEN, [
      'state'      => $state,
      'expires_at' => time() + self::STATE_TTL,
    ], false);
  }

  // Returns '' for missing, malformed, or expired state, so every caller sees one "no usable state" answer. An expired row is deleted on read rather than left to accumulate.
  private static function read_state(): string
  {
    $stored = get_option(self::OPT_STATE_TOKEN, '');

    // A plain string is a state written by an older build that used a transient, or by the free plugin, which stores the bare value. Honour it rather than failing a connect that is already in flight across an upgrade.
    if (is_string($stored) && $stored !== '') {
      return $stored;
    }

    if (!is_array($stored) || empty($stored['state'])) {
      return '';
    }

    if (isset($stored['expires_at']) && time() > (int) $stored['expires_at']) {
      self::clear_state();
      return '';
    }

    return (string) $stored['state'];
  }

  private static function clear_state(): void
  {
    delete_option(self::OPT_STATE_TOKEN);
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

    $stored_state = self::read_state();

    // No stored state. init() only registers this callback when the free plugin is absent, so there is no other handler to defer to — the transient simply expired (600s) or was dropped by an object cache. Returning here let the request fall through to a bare page render, which WordPress answers with "The link you followed has expired."; redirect with the real reason so the Connect tab can tell the user to retry.
    if (!$stored_state) {
      wp_safe_redirect(wp_nonce_url(
        admin_url('admin.php?page=motionkit-connect&tab=connect&error=invalid_state'),
        'motionkit_notice'
      ));
      exit;
    }

    if (!hash_equals($stored_state, $state)) {
      wp_safe_redirect(wp_nonce_url(
        admin_url('admin.php?page=motionkit-connect&tab=connect&error=invalid_state'),
        'motionkit_notice'
      ));
      exit;
    }

    self::clear_state();

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
