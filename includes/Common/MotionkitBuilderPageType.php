<?php

/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

declare(strict_types=1);

namespace MotionKitConnector\Common;

if (!defined('ABSPATH')) {
  exit; // Exit if accessed directly
}

/**
 * Page Type Resolver & Configuration Storage Handler
 */
class MotionkitBuilderPageType
{
  private static ?MotionkitBuilderPageType $instance = null;

  /**
   * Option / meta key prefix for animations
   */
  public string $option_name = 'motionkit_pg_animation_';

  /**
   * Option / meta key prefix for page settings
   */
  public string $settings_prefix = 'motionkit_pg_settings_';

  /**
   * Per-request memo of stored configs, keyed by store target.
   *
   * A single page load reads the same animation key more than once (the enqueue
   * pass and the localized payload), and the settings and draft keys are read
   * from several places. Each miss was a real post_meta / term_meta / option
   * lookup. Writes invalidate their own key, so a save followed by a read in
   * the same request still sees fresh data.
   *
   * @var array<string,array>
   */
  private array $config_cache = [];

  /**
   * Singleton instance
   *
   * @return self
   */
  public static function instance(): self
  {
    if (null === self::$instance) {
      self::$instance = new self();
    }
    return self::$instance;
  }

  public function __construct()
  {
  }

  /**
   * Resolve config array — accepts explicit config or falls back to current page.
   *
   * @param array|false|null $page_type
   * @return array{id: int, type: string, store_type: string, option: string}
   */
  private function resolveConfig($page_type = false): array
  {
    if (is_array($page_type) && !empty($page_type['store_type']) && !empty($page_type['option'])) {
      return [
        'id'         => isset($page_type['id']) ? (int) $page_type['id'] : 0,
        'type'       => isset($page_type['type']) ? sanitize_key((string) $page_type['type']) : 'unknown',
        'store_type' => in_array($page_type['store_type'], ['post_meta', 'term_meta', 'option'], true) ? (string) $page_type['store_type'] : 'option',
        'option'     => sanitize_key((string) $page_type['option']),
      ];
    }

    return $this->getCurrentPageType();
  }

  /**
   * Memo key identifying one stored config — the store target, not the page.
   *
   * @param array $config Resolved page type config.
   * @return string
   */
  private function cacheKey(array $config): string
  {
    return ($config['store_type'] ?? '')
      . '|' . (isset($config['id']) ? (string) $config['id'] : '')
      . '|' . ($config['option'] ?? '');
  }

  /**
   * Save configuration for a given page type.
   *
   * @param array $config
   * @param mixed $animconf
   * @return bool
   */
  public function saveConfig(array $config, $animconf): bool
  {
    $resolved = $this->resolveConfig($config);

    // Drop the memo before writing so a read later in this same request can't serve the pre-write value.
    unset($this->config_cache[$this->cacheKey($resolved)]);

    $store_type = $resolved['store_type'];
    $option_key = $resolved['option'];
    $id = $resolved['id'];

    switch ($store_type) {
      case 'post_meta':
        if ($id > 0) {
          return (bool) update_post_meta($id, $option_key, $animconf);
        }
        return (bool) update_option($option_key, $animconf);

      case 'term_meta':
        if ($id > 0) {
          return (bool) update_term_meta($id, $option_key, $animconf);
        }
        return (bool) update_option($option_key, $animconf);

      case 'option':
      default:
        return (bool) update_option($option_key, $animconf);
    }
  }

  /**
   * Retrieve configuration for a given page type. Always returns array.
   *
   * @param array|false|null $page_type
   * @return array
   */
  public function getConfig($page_type = false): array
  {
    $resolved = $this->resolveConfig($page_type);
    $key = $this->cacheKey($resolved);

    if (array_key_exists($key, $this->config_cache)) {
      return $this->config_cache[$key];
    }

    return $this->config_cache[$key] = $this->readConfig($resolved);
  }

  /**
   * Actually hit storage for a resolved config. Callers go through getConfig().
   *
   * @param array $resolved
   * @return array
   */
  private function readConfig(array $resolved): array
  {
    $store_type = $resolved['store_type'];
    $option_key = $resolved['option'];
    $id = $resolved['id'];

    $result = [];

    switch ($store_type) {
      case 'post_meta':
        if ($id > 0) {
          // metadata_exists(), not !empty(): a page whose animations were all deleted stores an EMPTY array, and empty() cannot tell that apart from never having been saved. The legacy fallback below then served the pre-delete option row, so every deleted animation came back on reload while the editor — which reads what it just wrote — showed it gone.
          if (metadata_exists('post', $id, $option_key)) {
            $result = get_post_meta($id, $option_key, true);
          } else {
            // Legacy slot: sites that stored page animations in an option before the per-post key existed. Only consulted when this post has no row of its own.
            $fallback = get_option($option_key, []);
            if (!empty($fallback)) {
              $result = $fallback;
            }
          }
        } else {
          $result = get_option($option_key, []);
        }
        break;

      case 'term_meta':
        if ($id > 0) {
          $result = metadata_exists('term', $id, $option_key)
            ? get_term_meta($id, $option_key, true)
            : get_option($option_key, []);
        } else {
          $result = get_option($option_key, []);
        }
        break;

      case 'option':
      default:
        $result = get_option($option_key, []);
        break;
    }

    if (is_string($result)) {
      $decoded = json_decode($result, true);
      if (is_array($decoded)) {
        return $decoded;
      }
      $unserialized = maybe_unserialize($result);
      if (is_array($unserialized)) {
        return $unserialized;
      }
      return [];
    }

    return is_array($result) ? $result : [];
  }

  /**
   * Delete configuration for a given page type.
   *
   * @param array|null $page_type
   * @return bool
   */
  public function deleteConfig($page_type = null): bool
  {
    $resolved = $this->resolveConfig($page_type);

    unset($this->config_cache[$this->cacheKey($resolved)]);

    $store_type = $resolved['store_type'];
    $option_key = $resolved['option'];
    $id = $resolved['id'];

    switch ($store_type) {
      case 'post_meta':
        if ($id > 0) {
          delete_post_meta($id, $option_key);
        }
        return (bool) delete_option($option_key);

      case 'term_meta':
        if ($id > 0) {
          delete_term_meta($id, $option_key);
        }
        return (bool) delete_option($option_key);

      case 'option':
      default:
        return (bool) delete_option($option_key);
    }
  }

  /**
   * Determine the current page type, ID, store type, and option name with strict type resolution.
   *
   * @return array{id: int, type: string, store_type: string, option: string}
   */
  public function getCurrentPageType(): array
  {
    $id = 0;
    $type = 'unknown';
    $store_type = 'option';

    if (is_front_page()) {
      $queried_id = (int) get_queried_object_id();
      if ($queried_id > 0) {
        $id = $queried_id;
        $store_type = 'post_meta';
      } else {
        $page_on_front = (int) get_option('page_on_front');
        if ($page_on_front > 0) {
          $id = $page_on_front;
          $store_type = 'post_meta';
        } else {
          $store_type = 'option';
        }
      }
      $type = 'front_page';
    } elseif (is_home()) {
      $queried_id = (int) get_queried_object_id();
      if ($queried_id > 0) {
        $id = $queried_id;
        $store_type = 'post_meta';
      } else {
        $page_for_posts = (int) get_option('page_for_posts');
        if ($page_for_posts > 0) {
          $id = $page_for_posts;
          $store_type = 'post_meta';
        } else {
          $store_type = 'option';
        }
      }
      $type = 'home';
    } elseif (is_singular()) {
      $id = (int) get_queried_object_id();
      $post_type = get_post_type();
      $type = is_string($post_type) && $post_type !== '' ? $post_type : 'post';
      $store_type = $id > 0 ? 'post_meta' : 'option';
    } elseif (is_category()) {
      $id = (int) get_queried_object_id();
      $type = 'category';
      $store_type = $id > 0 ? 'term_meta' : 'option';
    } elseif (is_tag()) {
      $id = (int) get_queried_object_id();
      $type = 'post_tag';
      $store_type = $id > 0 ? 'term_meta' : 'option';
    } elseif (is_tax()) {
      $id = (int) get_queried_object_id();
      $tax = get_query_var('taxonomy');
      $type = is_string($tax) && $tax !== '' ? $tax : 'custom-taxonomy';
      $store_type = $id > 0 ? 'term_meta' : 'option';
    } elseif (is_author()) {
      $id = (int) get_queried_object_id();
      $type = 'author';
      $store_type = 'option';
    } elseif (is_archive()) {
      $type = 'archive';
      $store_type = 'option';
    } elseif (is_search()) {
      $type = 'search';
      $store_type = 'option';
    } elseif (is_404()) {
      $type = '404';
      $store_type = 'option';
    }

    $option = $this->buildOptionName($type, $id, $store_type);

    return [
      'id'         => $id,
      'type'       => (string) $type,
      'store_type' => (string) $store_type,
      'option'     => (string) $option,
    ];
  }

  /**
   * Build the option / meta key name based on page type.
   *
   * @param string $type
   * @param int    $id
   * @param string $store_type
   * @return string
   */
  public function buildOptionName(string $type, int $id, string $store_type): string
  {
    if ($store_type === 'post_meta' || $store_type === 'term_meta') {
      return $this->option_name . $type;
    }

    if ($id > 0) {
      return $this->option_name . $type . '_' . $id;
    }

    return $this->option_name . $type;
  }
}
