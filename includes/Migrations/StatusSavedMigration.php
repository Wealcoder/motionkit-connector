<?php

/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

declare(strict_types=1);

namespace MotionKitConnector\Migrations;

use MotionKitConnector\Common\AnimationResolver;

if (!defined('ABSPATH')) {
  exit;
}

/**
 * Relabels stored `draft` records as `saved`, once per site.
 *
 * The three states used to be draft / preview / published, and `draft` was what
 * an ordinary save produced — every not-yet-published animation carried it, and
 * every one of them played in the editor. The states are now draft / saved /
 * published, where `draft` means parked: the editor leaves it out of playback
 * and a share link does not carry it.
 *
 * So the same stored word changed meaning. Left alone, every animation a user
 * had saved but not published would go quiet in their editor and vanish from
 * their share links the moment the plugin updated. This pass rewrites those
 * records to `saved`, which is what they always meant, and hands the word
 * `draft` over to the new state.
 *
 * It only ever touches the draft buckets. The published bucket carries
 * `published` and is not part of the rename, and records with no `status` at all
 * are left to `AnimationResolver::status_of()`, whose fallback already resolves
 * them to `saved`.
 *
 * Runs from two places, both guarded by one sentinel option: `admin_init`, and
 * the REST save dispatcher. The second is what closes the window where a site
 * whose wp-admin is never opened — or is opened after the editor has already
 * saved a genuinely parked draft — would otherwise have that draft relabelled.
 */
final class StatusSavedMigration
{
  /**
   * Set once the pass has completed. Its presence is the whole guard.
   */
  private const SENTINEL = 'motionkit_status_saved_migrated';

  /**
   * Meta and option key prefix the page-level draft buckets share.
   */
  private const PAGE_DRAFT_PREFIX = 'motionkit_pg_draft_';

  /**
   * The global bucket's draft option.
   */
  private const GLOBAL_DRAFT_OPTION = 'motionkit_global_animations_draft';

  /**
   * Run the pass unless it already has.
   *
   * Cheap enough to call on every request that might write: the guard is a
   * single autoloaded option read, and the sweep happens at most once.
   *
   * @return void
   */
  public static function maybe_run(): void
  {
    if (get_option(self::SENTINEL)) {
      return;
    }

    // Written before the sweep, not after. A fatal partway through would otherwise leave the option unset and re-run the whole pass on the next request, and a second pass over already-relabelled rows is harmless but a second pass over rows written since is not.
    update_option(self::SENTINEL, time(), true);

    self::migrate_option(self::GLOBAL_DRAFT_OPTION);
    self::migrate_options_by_prefix();
    self::migrate_meta('postmeta', 'post_id', 'update_post_meta');
    self::migrate_meta('termmeta', 'term_id', 'update_term_meta');
  }

  /**
   * Rewrite one option's bucket in place.
   *
   * @param string $name Option name.
   * @return void
   */
  private static function migrate_option(string $name): void
  {
    $bucket = get_option($name);
    if (!is_array($bucket)) {
      return;
    }

    $next = self::relabel($bucket);
    if ($next !== $bucket) {
      update_option($name, $next);
    }
  }

  /**
   * The page types stored as options rather than meta — front page, 404, search
   * and the archives.
   *
   * @return void
   */
  private static function migrate_options_by_prefix(): void
  {
    global $wpdb;

    $names = $wpdb->get_col(
      $wpdb->prepare(
        "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s",
        $wpdb->esc_like(self::PAGE_DRAFT_PREFIX) . '%'
      )
    );

    foreach ((array) $names as $name) {
      if (is_string($name) && $name !== '') {
        self::migrate_option($name);
      }
    }
  }

  /**
   * The page types stored as post or term meta.
   *
   * Reads the rows directly to find them — there is no way to ask WordPress for
   * "every object carrying a meta key like this" through the meta API — but
   * writes through `update_*_meta` so caches invalidate the way they should.
   *
   * @param string $table  Table suffix, `postmeta` or `termmeta`.
   * @param string $id_col Object id column on that table.
   * @param string $writer Meta writer to call.
   * @return void
   */
  private static function migrate_meta(string $table, string $id_col, string $writer): void
  {
    global $wpdb;

    $full = $wpdb->prefix . $table;

    $rows = $wpdb->get_results(
      $wpdb->prepare(
        "SELECT {$id_col} AS object_id, meta_key, meta_value FROM {$full} WHERE meta_key LIKE %s",
        $wpdb->esc_like(self::PAGE_DRAFT_PREFIX) . '%'
      )
    );

    foreach ((array) $rows as $row) {
      $bucket = maybe_unserialize($row->meta_value);
      if (!is_array($bucket)) {
        continue;
      }

      $next = self::relabel($bucket);
      if ($next === $bucket) {
        continue;
      }

      $writer((int) $row->object_id, $row->meta_key, $next);
    }
  }

  /**
   * Swap `draft` for `saved` across one bucket, leaving everything else alone.
   *
   * @param array $bucket Stored draft bucket.
   * @return array
   */
  private static function relabel(array $bucket): array
  {
    foreach ($bucket as $i => $entry) {
      if (!is_array($entry)) {
        continue;
      }

      $status = $entry[AnimationResolver::STATUS_FIELD] ?? null;
      if ($status !== AnimationResolver::STATUS_DRAFT) {
        continue;
      }

      $entry[AnimationResolver::STATUS_FIELD] = AnimationResolver::STATUS_SAVED;
      $bucket[$i] = $entry;
    }

    return $bucket;
  }
}
