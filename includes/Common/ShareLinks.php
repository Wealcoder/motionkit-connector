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
  exit;
}

/**
 * Share links for previewing unpublished animations on the live site.
 *
 * Rows live in the page's own post_meta (`motionkit_pg_share_<type>`) rather
 * than a custom table, which is what keeps this feature free of a migration
 * framework and a WXR export hook: post_meta already travels with exports,
 * backups and staging pushes, and dies with the page.
 *
 * The token is a random opaque id, not a signed JWT. Signing only buys
 * stateless validation, and this is not stateless — revoking needs a row, and
 * the request is already reading post_meta for the animation data anyway.
 *
 * A row carries the shared animation records themselves, not a pointer into the
 * draft bucket. That is what lets a draft stay a draft everywhere: the render
 * path for a share link reads only this key, so `motionkit_pg_draft_<type>` is
 * never touched by a front-end request. The copy is refreshed on every save and
 * dies with the row, so publishing takes the link and its data away together.
 */
final class ShareLinks
{
  /**
   * Query parameter carrying the token on the customer's own site.
   */
  public const QUERY_PARAM = 'mk_share';

  /**
   * Key prefix the rows are stored under.
   */
  private const PAGE_SHARE_PREFIX = 'motionkit_pg_share_';

  /**
   * Key prefix a page's published animations are stored under.
   */
  private const PAGE_PUBLISHED_PREFIX = 'motionkit_pg_animation_';

  /**
   * Token length in bytes before hex encoding — 16 bytes is 128 bits.
   */
  private const TOKEN_BYTES = 16;

  /**
   * Page type resolver — owns storage routing.
   *
   * @var MotionkitBuilderPageType
   */
  private MotionkitBuilderPageType $page_type;

  public function __construct(MotionkitBuilderPageType $page_type)
  {
    $this->page_type = $page_type;
  }

  // ─── Lifecycle ───────────────────────────────────────────────────

  /**
   * Mint a link for one or more animations on a page.
   *
   * The records are copied into the row here rather than referenced, so what
   * the reviewer sees is fixed to what was saved — later edits reach the link
   * only through `reconcile()`, on the save that writes them.
   *
   * @param array               $page_type_config Descriptor for the page's animation key.
   * @param string[]            $animation_ids    Ids the link may reveal.
   * @param array<string,array> $animations       Records to share, keyed by id.
   * @param string              $shared_version   The record's `updatedAt` at share time.
   * @return string|null Raw token to hand the user, or null when there was nothing to share.
   */
  public function create(array $page_type_config, array $animation_ids, array $animations, string $shared_version = ''): ?string
  {
    $ids = $this->clean_ids($animation_ids);
    if (empty($ids)) {
      return null;
    }

    // An id with no record behind it would be a link that reveals nothing, and reconcile would kill it on the next save anyway — refusing here turns that into an error the editor can explain instead of a link that silently shows the live page.
    $snapshot = $this->snapshot_for($ids, $animations);
    if (empty($snapshot)) {
      return null;
    }
    $ids = array_keys($snapshot);

    try {
      $token = bin2hex(random_bytes(self::TOKEN_BYTES));
    } catch (\Exception $e) {
      // random_bytes throws rather than returning weak entropy; a share link is not worth minting from a guessable source.
      return null;
    }

    // Replace any link already covering exactly this set rather than stacking another row. Reopening the publish popover or re-sharing the same animation is the common case, and every extra row is a live URL nobody is tracking.
    $signature = $ids;
    sort($signature);

    $rows = [];
    foreach ($this->rows($page_type_config) as $row) {
      $existing = isset($row['animation_ids']) && is_array($row['animation_ids'])
        ? array_values($row['animation_ids'])
        : [];
      sort($existing);
      if ($existing === $signature) {
        continue;
      }
      $rows[] = $row;
    }

    $rows[] = [
      'hash'           => hash('sha256', $token),
      'animation_ids'  => $ids,
      'animations'     => $snapshot,
      'shared_version' => $shared_version !== '' ? $shared_version : self::version_of($snapshot),
      // Expiry is not enforced yet; storing null now means turning it on later cannot invalidate links already handed out.
      'exp'            => null,
      'created_at'     => time(),
    ];

    $this->save_rows($page_type_config, $rows);

    return $token;
  }

  /**
   * Match a raw token against this page's rows.
   *
   * @param array  $page_type_config Descriptor for the page's animation key.
   * @param string $token            Raw token from the query string.
   * @return ShareContext|null Null for unknown, revoked or expired tokens.
   */
  public function resolve(array $page_type_config, string $token): ?ShareContext
  {
    if (!$this->looks_like_token($token)) {
      return null;
    }

    $incoming = hash('sha256', $token);
    $now = time();

    foreach ($this->rows($page_type_config) as $row) {
      if (!isset($row['hash']) || !is_string($row['hash'])) {
        continue;
      }
      if (!hash_equals($row['hash'], $incoming)) {
        continue;
      }
      // Null expiry means never expires — that is today's only case, but the check is here so enabling expiry later needs no render-path change.
      if (isset($row['exp']) && $row['exp'] !== null && (int) $row['exp'] < $now) {
        return null;
      }

      return new ShareContext(
        isset($row['animation_ids']) && is_array($row['animation_ids']) ? $row['animation_ids'] : [],
        isset($row['animations']) && is_array($row['animations']) ? $row['animations'] : [],
        isset($row['shared_version']) && is_string($row['shared_version']) ? $row['shared_version'] : ''
      );
    }

    return null;
  }

  /**
   * Delete every link covering an animation.
   *
   * Addressed by animation id rather than by token on purpose: tokens are
   * stored hashed and are unrecoverable, so a user who closed the tab has no
   * way to name the link they handed out — but they always know which
   * animation they stopped wanting to share.
   *
   * @param array  $page_type_config Descriptor for the page's animation key.
   * @param string $animation_id     Animation whose links should be dropped.
   * @return int Rows removed.
   */
  public function revoke_for_animation(array $page_type_config, string $animation_id): int
  {
    $ids = $this->clean_ids([$animation_id]);
    if (empty($ids)) {
      return 0;
    }
    $target = $ids[0];

    $kept = [];
    $removed = 0;

    foreach ($this->rows($page_type_config) as $row) {
      $covered = isset($row['animation_ids']) && is_array($row['animation_ids'])
        ? $row['animation_ids']
        : [];

      if (in_array($target, $covered, true)) {
        $removed++;
        continue;
      }
      $kept[] = $row;
    }

    if ($removed > 0) {
      $this->save_rows($page_type_config, $kept);
    }

    return $removed;
  }

  /**
   * Re-copy every live link's records, and delete the ones with nothing left.
   *
   * Called from the save path, this is both halves of the rule at once. An id
   * that still has a working copy gets its shared record rewritten, so the link
   * always shows what was last saved. An id that has none — because it was just
   * published, or deleted — is dropped from the row along with its record, and
   * a row left with no ids goes with it. One pass covers publish and delete, so
   * neither needs a hook of its own.
   *
   * @param array               $page_type_config Descriptor for the page's animation key.
   * @param array<string,array> $live_drafts      Working copies still on the page, keyed by id.
   * @return int Rows removed.
   */
  public function reconcile(array $page_type_config, array $live_drafts): int
  {
    $kept = [];
    $removed = 0;
    $rewritten = 0;

    foreach ($this->rows($page_type_config) as $row) {
      $ids = isset($row['animation_ids']) && is_array($row['animation_ids'])
        ? $this->clean_ids($row['animation_ids'])
        : [];

      $snapshot = $this->snapshot_for($ids, $live_drafts);

      if (empty($snapshot)) {
        $removed++;
        continue;
      }

      $before = $row;
      $row['animation_ids']  = array_keys($snapshot);
      $row['animations']     = $snapshot;
      $row['shared_version'] = self::version_of($snapshot);

      if ($row !== $before) {
        $rewritten++;
      }
      $kept[] = $row;
    }

    if ($removed > 0 || $rewritten > 0) {
      $this->save_rows($page_type_config, $kept);
    }

    return $removed;
  }

  /**
   * Rows for the editor's popover, without the hashes.
   *
   * The raw token is unrecoverable by design, so listing can show what a link
   * covers and when it was made, but never re-display the link itself.
   *
   * @param array $page_type_config Descriptor for the page's animation key.
   * @return array<int,array{animation_ids: string[], shared_version: string, created_at: int}>
   */
  public function listing(array $page_type_config): array
  {
    $out = [];
    foreach ($this->rows($page_type_config) as $row) {
      $out[] = [
        'animation_ids'  => isset($row['animation_ids']) && is_array($row['animation_ids']) ? $row['animation_ids'] : [],
        'shared_version' => isset($row['shared_version']) && is_string($row['shared_version']) ? $row['shared_version'] : '',
        'created_at'     => isset($row['created_at']) ? (int) $row['created_at'] : 0,
      ];
    }
    return $out;
  }

  /**
   * Every animation id a live link on this page currently covers.
   *
   * The editor reads this to tell a private draft from one someone is holding a
   * link to — the two look identical in storage, and only a row says which.
   *
   * @param array $page_type_config Descriptor for the page's animation key.
   * @return string[]
   */
  public function shared_ids(array $page_type_config): array
  {
    $ids = [];
    foreach ($this->rows($page_type_config) as $row) {
      if (!isset($row['animation_ids']) || !is_array($row['animation_ids'])) {
        continue;
      }
      foreach ($row['animation_ids'] as $id) {
        if (is_string($id) && $id !== '') {
          $ids[] = $id;
        }
      }
    }

    return array_values(array_unique($ids));
  }

  // ─── Storage ─────────────────────────────────────────────────────

  /**
   * Rewrite a page type descriptor to point at the share key.
   *
   * @param array $animation_config Descriptor for the published key.
   * @return array
   */
  public static function share_config(array $animation_config): array
  {
    $cfg = $animation_config;
    if (!empty($cfg['option']) && is_string($cfg['option'])) {
      $cfg['option'] = preg_replace(
        '/^' . preg_quote(self::PAGE_PUBLISHED_PREFIX, '/') . '/',
        self::PAGE_SHARE_PREFIX,
        $cfg['option']
      );
    }
    return $cfg;
  }

  /**
   * @param array $page_type_config
   * @return array<int,array>
   */
  private function rows(array $page_type_config): array
  {
    $raw = $this->page_type->getConfig(self::share_config($page_type_config));

    return is_array($raw) ? array_values(array_filter($raw, 'is_array')) : [];
  }

  /**
   * @param array $page_type_config
   * @param array $rows
   * @return void
   */
  private function save_rows(array $page_type_config, array $rows): void
  {
    $config = self::share_config($page_type_config);

    if (empty($rows)) {
      $this->page_type->deleteConfig($config);
      return;
    }

    $this->page_type->saveConfig($config, array_values($rows));
  }

  // ─── Validation ──────────────────────────────────────────────────

  /**
   * Cheap shape check before any hashing or storage read.
   *
   * @param string $token
   * @return bool
   */
  private function looks_like_token(string $token): bool
  {
    return (bool) preg_match('/^[a-f0-9]{' . (self::TOKEN_BYTES * 2) . '}$/', $token);
  }

  /**
   * The records a row should carry, keyed by id, dropping ids with none.
   *
   * @param string[]            $ids     Ids the row claims.
   * @param array<string,array> $records Available records, keyed by id.
   * @return array<string,array>
   */
  private function snapshot_for(array $ids, array $records): array
  {
    $out = [];
    foreach ($ids as $id) {
      if (isset($records[$id]) && is_array($records[$id])) {
        // Stored as `shared`, not `published` — having a link is a state of its own, and this copy must stay unable to render for anyone who is not holding the token.
        $out[$id] = AnimationResolver::with_status($records[$id], AnimationResolver::STATUS_PREVIEW);
      }
    }
    return $out;
  }

  /**
   * Newest `updatedAt` across a row's records — what the reviewer's banner dates.
   *
   * Timestamps are ISO strings from the editor, so a string compare orders them
   * correctly without parsing; a record without one simply does not win.
   *
   * @param array<string,array> $records
   * @return string
   */
  private static function version_of(array $records): string
  {
    $newest = '';
    foreach ($records as $record) {
      $stamp = isset($record['updatedAt']) && is_string($record['updatedAt']) ? $record['updatedAt'] : '';
      if ($stamp > $newest) {
        $newest = $stamp;
      }
    }
    return $newest;
  }

  /**
   * @param array $ids
   * @return string[]
   */
  private function clean_ids(array $ids): array
  {
    $out = [];
    foreach ($ids as $id) {
      if (is_string($id) && $id !== '' && preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id)) {
        $out[] = $id;
      }
    }
    return array_values(array_unique($out));
  }
}
