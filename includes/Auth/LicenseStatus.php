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
 * License Status for MotionKit Extension
 *
 * Keeps the connected account's entitlement mirrored on the WordPress site.
 *
 * @package MotionKitConnector
 * @since 1.0.0
 */
final class LicenseStatus
{
  private const OPT_STATE = 'motionkit_license_state';
  // Kept out of OPT_STATE because the state is read for display; the key is a credential only the updater should touch.
  private const OPT_KEY = 'motionkit_license_key';
  private const TRANSIENT_FRESH = 'motionkit_license_fresh';
  private const TRANSIENT_LOCK = 'motionkit_license_lock';
  public const CRON_HOOK = 'motionkit_license_refresh';
  private const FRESH_WINDOW = 12 * HOUR_IN_SECONDS;
  private const GRACE_WINDOW = 72 * HOUR_IN_SECONDS;
  private const KNOWN_STATUSES = ['active', 'inactive', 'expired', 'disabled', 'none', 'unknown'];

  public function init(): void
  {
    add_action(self::CRON_HOOK, [__CLASS__, 'run_scheduled_refresh']);
    add_action('admin_init', [__CLASS__, 'ensure_cron_scheduled']);
    add_action('admin_init', [__CLASS__, 'maybe_refresh'], 20);
    add_action('admin_post_motionkit_refresh_license', [__CLASS__, 'handle_manual_refresh']);
    add_action('admin_notices', [__CLASS__, 'render_admin_notice']);
    add_action('motionkit/oauth/connected', [__CLASS__, 'on_connected']);
    add_action('motionkit/oauth/disconnected', [__CLASS__, 'clear']);
  }

  public static function has_license(): bool
  {
    return !empty(self::get_state()['exists']);
  }

  public static function limit_exceeded(): bool
  {
    return !empty(self::get_state()['limit_exceeded']);
  }

  public static function is_valid(): bool
  {
    $state = self::get_state();

    return !empty($state['exists'])
      && 'active' === $state['status']
      && empty($state['limit_exceeded']);
  }

  public static function get_license_key(): string
  {
    $key = get_option(self::OPT_KEY, '');

    return is_string($key) ? $key : '';
  }

  public static function is_indeterminate(): bool
  {
    return 'unknown' === self::get_state()['status'];
  }

  public static function can_use(string $feature): bool
  {
    $state = self::get_state();

    if (!empty($state['exists']) && !self::is_valid()) {
      return false;
    }

    return !empty($state['features'][$feature]);
  }

  public static function get_feature_value(string $feature)
  {
    $state = self::get_state();

    if (!empty($state['exists']) && !self::is_valid()) {
      return null;
    }

    return $state['features'][$feature] ?? null;
  }

  public static function get_state(): array
  {
    $stored = get_option(self::OPT_STATE);

    if (!is_array($stored) || empty($stored['checked_at'])) {
      $unchecked = self::empty_state();

      if (OAuthHandler::is_connected()) {
        $unchecked['status'] = 'unknown';
      }

      return $unchecked;
    }

    $age = time() - (int) $stored['checked_at'];
    $stored['stale'] = $age > self::GRACE_WINDOW;

    return $stored;
  }

  public static function refresh(bool $force = false)
  {
    if (!OAuthHandler::is_connected()) {
      self::clear();
      return new \WP_Error('not_connected', __('This site is not connected to MotionKit.', 'motionkit-connector'));
    }

    if (!$force && get_transient(self::TRANSIENT_LOCK)) {
      return new \WP_Error('locked', __('A license check is already in progress.', 'motionkit-connector'));
    }

    $token = OAuthHandler::get_access_token();

    if (!$token) {
      return new \WP_Error('no_token', __('No access token stored locally.', 'motionkit-connector'));
    }

    set_transient(self::TRANSIENT_LOCK, 1, MINUTE_IN_SECONDS);

    $args = [
      'timeout'    => 15,
      'user-agent' => 'MotionKitConnector-WP/' . \MotionKitConnector\Plugin::VERSION . '; ' . home_url(),
      'headers'    => ['Content-Type' => 'application/json'],
      'body'       => wp_json_encode([
        'site'       => home_url(),
        'token_hash' => hash('sha256', $token),
        'version'    => \MotionKitConnector\Plugin::VERSION,
      ]),
    ];

    $response = self::post_with_retry(self::get_status_url(), $args);

    delete_transient(self::TRANSIENT_LOCK);

    if (is_wp_error($response)) {
      return new \WP_Error('server_unreachable', $response->get_error_message());
    }

    $code = (int) wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if (404 === $code) {
      self::store(self::normalize(['exists' => false, 'status' => 'none']));
      delete_option(self::OPT_KEY);

      return new \WP_Error(
        'site_not_launched',
        __('This site has not launched the MotionKit editor yet, so there is no license to check.', 'motionkit-connector')
      );
    }

    if (200 !== $code || !is_array($body)) {
      return new \WP_Error(
        'bad_response',
        sprintf(
          __('Unexpected response from the MotionKit server (HTTP %d).', 'motionkit-connector'),
          $code
        )
      );
    }

    if (isset($body['valid']) && false === $body['valid']) {
      // The server-side token was revoked (deliberate: valid:false bypasses the
      // grace window). Store a fully-stamped empty state — NOT empty_state(),
      // whose checked_at=0 would re-trigger the 'unknown' sentinel in
      // get_state() on the very next load and pin the site to "Unable to verify"
      // forever. normalize() stamps checked_at=time() so 'none' actually sticks.
      self::store(self::normalize(['exists' => false, 'status' => 'none']));
      delete_option(self::OPT_KEY);

      return self::get_state();
    }

    // Server resolved the site by hostname and answered with the real license.
    // token_stale means our stored credential no longer matches any active row
    // (a sibling install's connect rotated the shared hash) — the site IS
    // connected and licensed, but the local token needs refreshing via a
    // reconnect. Carry the flag into the stored state so the admin notice can
    // prompt "Reconnect this site" without downgrading the license itself.
    $state = self::normalize($body);
    $state['token_stale'] = !empty($body['token_stale']);
    self::store($state);
    self::store_key($body, $state);

    return self::get_state();
  }

  private static function post_with_retry(string $url, array $args)
  {
    $delays_ms = [300, 900];
    $max_attempts = count($delays_ms) + 1;
    $response = null;

    for ($attempt = 1; $attempt <= $max_attempts; $attempt++) {
      $response = wp_remote_post($url, $args);

      if (!is_wp_error($response)) {
        $code = (int) wp_remote_retrieve_response_code($response);
        if ($code < 500) {
          return $response;
        }
      }

      if ($attempt < $max_attempts) {
        usleep($delays_ms[$attempt - 1] * 1000);
      }
    }

    return $response;
  }

  public static function maybe_refresh(): void
  {
    if (wp_doing_ajax() || !OAuthHandler::is_connected()) {
      return;
    }

    if (get_transient(self::TRANSIENT_FRESH)) {
      return;
    }

    self::refresh();
  }

  public static function run_scheduled_refresh(): void
  {
    if (!OAuthHandler::is_connected()) {
      return;
    }

    self::refresh(true);
  }

  public static function on_connected(): void
  {
    delete_transient(self::TRANSIENT_FRESH);
    self::refresh(true);
  }

  public static function handle_manual_refresh(): void
  {
    if (!current_user_can('manage_options')) {
      wp_die(esc_html__('You do not have permission to perform this action.', 'motionkit-connector'));
    }

    check_admin_referer('motionkit_refresh_license');

    $result = self::refresh(true);

    $args = is_wp_error($result)
      ? ['license_refresh' => 'error', 'reason' => $result->get_error_code()]
      : ['license_refresh' => 'ok'];

    wp_safe_redirect(add_query_arg($args, admin_url('admin.php?page=motionkit-connect&tab=connect')));
    exit;
  }

  public static function clear(): void
  {
    delete_option(self::OPT_STATE);
    delete_option(self::OPT_KEY);
    delete_transient(self::TRANSIENT_FRESH);
    delete_transient(self::TRANSIENT_LOCK);
  }

  private static function cast_feature_value($value)
  {
    if (is_bool($value)) {
      return $value;
    }

    if (is_int($value) || is_float($value)) {
      return $value;
    }

    if (is_array($value)) {
      return array_values(array_map('sanitize_text_field', array_map('strval', $value)));
    }

    if (is_string($value) && is_numeric($value)) {
      return 0 + $value;
    }

    return sanitize_text_field((string) $value);
  }

  private static function normalize(array $body): array
  {
    $license = isset($body['license']) && is_array($body['license']) ? $body['license'] : $body;

    $status = sanitize_key((string) ($license['status'] ?? ''));
    if (!in_array($status, self::KNOWN_STATUSES, true)) {
      $status = 'unknown';
    }

    $sites_limit = isset($license['sites_limit']) ? (int) $license['sites_limit'] : -1;
    $sites_used  = isset($license['sites_used']) ? (int) $license['sites_used'] : 0;

    $limit_exceeded = isset($license['limit_exceeded'])
      ? (bool) $license['limit_exceeded']
      : ($sites_limit !== -1 && $sites_used > $sites_limit);

    $features = [];
    if (isset($license['features']) && is_array($license['features'])) {
      foreach ($license['features'] as $key => $value) {
        $features[sanitize_key((string) $key)] = self::cast_feature_value($value);
      }
    }

    $exists = isset($license['exists'])
      ? (bool) $license['exists']
      : ('none' !== $status && 'unknown' !== $status);

    return [
      'exists'         => $exists,
      'status'         => $status,
      'plan'           => sanitize_text_field((string) ($license['plan'] ?? '')),
      'expires_at'     => sanitize_text_field((string) ($license['expires_at'] ?? '')),
      'sites_limit'    => $sites_limit,
      'sites_used'     => $sites_used,
      'limit_exceeded' => $limit_exceeded,
      'features'       => $features,
      'checked_at'     => time(),
      'stale'          => false,
      'token_stale'    => false,
    ];
  }

  /**
   * Whether the local connection credential has drifted from the server and the
   * site should be reconnected. The license itself is fine — only the token
   * needs refreshing — so this is distinct from is_valid()/is_indeterminate().
   *
   * @return bool
   */
  public static function needs_reconnect(): bool
  {
    return !empty(self::get_state()['token_stale']);
  }

  private static function store(array $state): void
  {
    update_option(self::OPT_STATE, $state, false);
    set_transient(self::TRANSIENT_FRESH, 1, self::FRESH_WINDOW);
  }

  private static function store_key(array $body, array $state): void
  {
    $key = sanitize_text_field((string) ($body['license']['key'] ?? ''));

    if ('' !== $key) {
      update_option(self::OPT_KEY, $key, false);
      return;
    }

    // 'unknown' is a billing outage, not an answer, so the last good key keeps serving updates; a stale token gets no key from the server but still owns its license, so it keeps its key until a reconnect.
    if ('unknown' === $state['status'] || !empty($state['token_stale'])) {
      return;
    }

    // An editor build that predates the key sends no `key` field at all, which says nothing about the key — only an explicit empty value, or no license, clears it.
    if (!empty($state['exists']) && !array_key_exists('key', (array) ($body['license'] ?? []))) {
      return;
    }

    delete_option(self::OPT_KEY);
  }

  private static function empty_state(): array
  {
    return [
      'exists'         => false,
      'status'         => 'none',
      'plan'           => '',
      'expires_at'     => '',
      'sites_limit'    => -1,
      'sites_used'     => 0,
      'limit_exceeded' => false,
      'features'       => [],
      'checked_at'     => 0,
      'stale'          => false,
    ];
  }

  private static function get_status_url(): string
  {
    return apply_filters('motionkit/connect/status_url', EditorEndpoint::url('connect/status'));
  }

  public static function ensure_cron_scheduled(): void
  {
    if (!wp_next_scheduled(self::CRON_HOOK)) {
      wp_schedule_event(time() + HOUR_IN_SECONDS, 'daily', self::CRON_HOOK);
    }
  }

  public static function unschedule_cron(): void
  {
    wp_clear_scheduled_hook(self::CRON_HOOK);
  }

  public static function render_admin_notice(): void
  {
    if (!current_user_can('manage_options') || !OAuthHandler::is_connected()) {
      return;
    }

    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    $on_connect_page = $screen && false !== strpos((string) $screen->id, 'motionkit-connect');

    $state = self::get_state();

    // Stale credential → prompt a reconnect. The license is fine; only the local
    // token drifted (a sibling install's connect rotated the shared hash), so
    // "Check again" can't help — a fresh connect is what re-issues a matching
    // token. Shown on the connect page too (unlike the license notices below),
    // since that's exactly where the reconnect action lives.
    if (!empty($state['token_stale'])) {
      $connect_url = admin_url('admin.php?page=motionkit-connect&tab=connect');
      ?>
      <div class="notice notice-warning">
        <p>
          <strong><?php esc_html_e('MotionKit:', 'motionkit-connector'); ?></strong>
          <?php esc_html_e('This site\'s connection needs refreshing. Your license is active, but the local connection token is out of date — reconnect this site to restore full verification.', 'motionkit-connector'); ?>
          <a href="<?php echo esc_url($connect_url); ?>"><?php esc_html_e('Reconnect this site', 'motionkit-connector'); ?></a>
        </p>
      </div>
      <?php
      // Fall through: a license problem below (if any) still shows off-page.
    }

    // The license-state notices below are suppressed on the connect page (it
    // shows the same information inline); the reconnect prompt above is not.
    if ($on_connect_page) {
      return;
    }

    if ('unknown' === $state['status'] || self::is_valid() || !$state['exists']) {
      return;
    }

    if ($state['limit_exceeded']) {
      $message = sprintf(
        __('This site is outside your MotionKit plan\'s site limit (%1$d of %2$d used). Free a slot or upgrade to keep using premium features here.', 'motionkit-connector'),
        $state['sites_used'],
        $state['sites_limit']
      );
    } elseif ('expired' === $state['status']) {
      $message = __('Your MotionKit license has expired. Renew it to keep using premium features.', 'motionkit-connector');
    } elseif ('disabled' === $state['status']) {
      $message = __('Your MotionKit license has been disabled. Please contact support.', 'motionkit-connector');
    } elseif ('inactive' === $state['status']) {
      $message = __('Your MotionKit license is not activated on this site yet. Reconnect the site, or activate it from your MotionKit account, to unlock premium features here.', 'motionkit-connector');
    } else {
      $message = __('The connected MotionKit account has no active license. Premium features are unavailable on this site.', 'motionkit-connector');
    }
    ?>
    <div class="notice notice-warning">
      <p>
        <strong><?php esc_html_e('MotionKit:', 'motionkit-connector'); ?></strong>
        <?php echo esc_html($message); ?>
        <a href="<?php echo esc_url(admin_url('admin.php?page=motionkit-connect&tab=connect')); ?>">
          <?php esc_html_e('View license', 'motionkit-connector'); ?>
        </a>
      </p>
    </div>
    <?php
  }
}
