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
 * Single entry point for "which animations does this request render?".
 *
 * Every read of the animation buckets goes through here. Each bucket is stored
 * as a published/draft pair — `motionkit_pg_animation_<type>` next to
 * `motionkit_pg_draft_<type>`, and `motionkit_global_animations` next to
 * `motionkit_global_animations_draft`. Only the published half is ever sent to
 * a visitor, which is what keeps drafts out of every page's HTML.
 *
 * Three audiences, three methods:
 *  - published()  → public visitors
 *  - for_editor() → the editor, which wants both halves stitched back together
 *  - for_share()  → a share link, which is published plus one animation's draft
 */
final class AnimationResolver
{
  /**
   * Published global animation bucket.
   */
  public const GLOBAL_PUBLISHED_OPTION = 'motionkit_global_animations';

  /**
   * Draft global animation bucket. Read only for the editor and share links.
   */
  public const GLOBAL_DRAFT_OPTION = 'motionkit_global_animations_draft';

  /**
   * Key prefix a page's published animations are stored under.
   */
  private const PAGE_PUBLISHED_PREFIX = 'motionkit_pg_animation_';

  /**
   * Key prefix a page's draft animations are stored under.
   */
  private const PAGE_DRAFT_PREFIX = 'motionkit_pg_draft_';

  /**
   * Field carrying an animation's working copy on the wire.
   *
   * The editor sends one list where a published animation may carry its
   * unpublished edits under this key. Storage splits the two apart; reads for
   * the editor put them back.
   */
  public const DRAFT_FIELD = 'draft';

  /**
   * Field carrying an animation's lifecycle state.
   *
   * A boolean could only ever answer "is this live", which left the two
   * unpublished states — private work, and work someone has been handed a link
   * to — indistinguishable. The three values below are the actual states.
   */
  public const STATUS_FIELD = 'status';

  /**
   * Nobody can see it. Lives in the draft bucket and renders for no request.
   */
  public const STATUS_DRAFT = 'draft';

  /**
   * Still not live, but a share link exists — so it renders for a request
   * carrying that link's token, and for no other.
   */
  public const STATUS_PREVIEW = 'preview';

  /**
   * Every visitor gets it.
   */
  public const STATUS_PUBLISHED = 'published';

  /**
   * Page type resolver — owns storage routing and the read memo.
   *
   * @var MotionkitBuilderPageType
   */
  private MotionkitBuilderPageType $page_type;

  /**
   * Per-request memo for the global buckets, keyed by option name.
   *
   * @var array<string,array>
   */
  private array $global_cache = [];

  public function __construct(MotionkitBuilderPageType $page_type)
  {
    $this->page_type = $page_type;
  }

  // ─── Audiences ───────────────────────────────────────────────────

  /**
   * What a public visitor renders — published entries only.
   *
   * @param array $page_type_config Descriptor from getCurrentPageType().
   * @return array
   */
  public function published(array $page_type_config): array
  {
    // Page first, then global — the order enqueue_frontend_scripts() has always merged in, and frontend.js dispatches in list order.
    return array_merge(
      $this->split($this->page_bucket($page_type_config))['published'],
      $this->split($this->global_bucket(self::GLOBAL_PUBLISHED_OPTION))['published']
    );
  }

  /**
   * What the editor loads — one list per bucket, working copies re-attached.
   *
   * `shared` is applied here rather than stored: the share row is the only
   * thing that knows a link exists, so deriving the state from it on read is
   * what keeps the two from ever disagreeing. Saving the marked-up list back
   * writes plain `draft` again, which is correct — a save shares nothing.
   *
   * @param array    $page_type_config Descriptor from getCurrentPageType().
   * @param string[] $preview_ids       Ids a live share link currently covers.
   * @return array{global: array, page: array}
   */
  public function for_editor(array $page_type_config, array $preview_ids = []): array
  {
    return [
      'global' => $this->global_for_editor($preview_ids),
      'page'   => $this->page_for_editor($page_type_config, $preview_ids),
    ];
  }

  /**
   * The global bucket as the editor wants it — the half `get_settings` returns.
   *
   * @param string[] $preview_ids Ids a live share link currently covers.
   * @return array
   */
  public function global_for_editor(array $preview_ids = []): array
  {
    return $this->mark_preview(
      $this->stitch(
        $this->global_bucket(self::GLOBAL_PUBLISHED_OPTION),
        $this->global_bucket(self::GLOBAL_DRAFT_OPTION)
      ),
      array_flip($preview_ids)
    );
  }

  /**
   * The page bucket as the editor wants it.
   *
   * @param array    $page_type_config Descriptor from getCurrentPageType().
   * @param string[] $preview_ids       Ids a live share link currently covers.
   * @return array
   */
  public function page_for_editor(array $page_type_config, array $preview_ids = []): array
  {
    return $this->mark_preview(
      $this->stitch(
        $this->page_bucket($page_type_config),
        $this->page_bucket($page_type_config, true)
      ),
      array_flip($preview_ids)
    );
  }

  /**
   * Promote `draft` to `preview` wherever a live link covers the id.
   *
   * Applies to a standalone draft and to a published animation's working copy
   * alike — in both cases it is the unpublished half the link is showing, so it
   * is the unpublished half that carries the state.
   *
   * @param array             $entries Stitched list.
   * @param array<string,int> $preview Id set, as returned by array_flip.
   * @return array
   */
  private function mark_preview(array $entries, array $preview): array
  {
    if (empty($preview)) {
      return $entries;
    }

    foreach ($entries as $i => $entry) {
      $id = self::entry_id($entry);
      if ($id === null || !isset($preview[$id])) {
        continue;
      }

      if (isset($entry[self::DRAFT_FIELD]) && is_array($entry[self::DRAFT_FIELD])) {
        $entry[self::DRAFT_FIELD][self::STATUS_FIELD] = self::STATUS_PREVIEW;
      } elseif (self::status_of($entry) === self::STATUS_DRAFT) {
        $entry[self::STATUS_FIELD] = self::STATUS_PREVIEW;
      }

      $entries[$i] = $entry;
    }

    return $entries;
  }

  /**
   * What a share link renders — everything published, plus the records the
   * link itself carries, standing in for their published versions.
   *
   * The overlay comes from the share row, never from the draft bucket: a
   * front-end request must not be able to reach unpublished storage even with a
   * valid token, so the only unpublished data on this path is the copy the link
   * owns. An emptied link therefore falls through to the live page on its own.
   *
   * @param array        $page_type_config Descriptor from getCurrentPageType().
   * @param ShareContext $share            Validated share row.
   * @return array
   */
  public function for_share(array $page_type_config, ShareContext $share): array
  {
    $published = $this->published($page_type_config);

    $overlay = $share->animations();

    if (empty($overlay)) {
      return $published;
    }

    // Stamped `preview` rather than `published`: the runtime plays both, so the record can go out telling the truth about itself instead of pretending to be live. The permission decision already happened when the token was validated.
    foreach ($overlay as $id => $entry) {
      $entry = self::with_status($entry, self::STATUS_PREVIEW);
      $entry['_mkDraft'] = true;
      $overlay[$id] = $entry;
    }

    // array_replace keeps position for ids already published (scenario 3 — the draft stands in place) and appends ids that were never published (scenario 1).
    return array_values(array_replace($this->index_by_id($published), $overlay));
  }

  /**
   * Every unpublished working copy on this page, both buckets.
   *
   * @param array $page_type_config Descriptor from getCurrentPageType().
   * @return array
   */
  public function drafts(array $page_type_config): array
  {
    return array_merge(
      $this->global_bucket(self::GLOBAL_DRAFT_OPTION),
      $this->split($this->global_bucket(self::GLOBAL_PUBLISHED_OPTION))['drafts'],
      $this->page_bucket($page_type_config, true),
      $this->split($this->page_bucket($page_type_config))['drafts']
    );
  }

  /**
   * The same working copies keyed by animation id — the shape share rows copy from.
   *
   * @param array $page_type_config Descriptor from getCurrentPageType().
   * @return array<string,array>
   */
  public function drafts_by_id(array $page_type_config): array
  {
    return $this->index_by_id($this->drafts($page_type_config));
  }

  // ─── Storage split ───────────────────────────────────────────────

  /**
   * Split an editor-shaped list into the two buckets storage keeps.
   *
   * @param array $entries List as the editor sends it.
   * @return array{published: array, drafts: array}
   */
  public static function partition_for_storage(array $entries): array
  {
    $published = [];
    $drafts = [];

    foreach ($entries as $entry) {
      if (!is_array($entry)) {
        continue;
      }

      $working = isset($entry[self::DRAFT_FIELD]) && is_array($entry[self::DRAFT_FIELD])
        ? $entry[self::DRAFT_FIELD]
        : null;
      unset($entry[self::DRAFT_FIELD]);

      // Never published — it has no live counterpart, so the whole record is the draft.
      if (!self::is_published($entry)) {
        $drafts[] = self::as_draft($entry);
        continue;
      }

      $published[] = self::with_status($entry, self::STATUS_PUBLISHED);

      if ($working !== null) {
        // Whole record, not a property diff — that is what makes add/delete/update of any field automatic.
        $drafts[] = self::as_draft(array_replace($entry, $working));
      }
    }

    return ['published' => $published, 'drafts' => $drafts];
  }

  /**
   * Put a stored pair back into the single list the editor works with.
   *
   * Every record is stamped with the state it resolves to on the way out, so an
   * animation saved before `status` existed arrives in the editor already
   * carrying it — opening the page is enough, no edit required. The stamp is
   * derived from the boolean the record already had, so nothing changes meaning;
   * it only stops depending on a fallback that will not live forever.
   *
   * @param mixed $published_bucket Raw published bucket.
   * @param mixed $draft_bucket     Raw draft bucket.
   * @return array
   */
  public function stitch($published_bucket, $draft_bucket): array
  {
    $split = $this->split(is_array($published_bucket) ? $published_bucket : []);
    $drafts = $this->index_by_id(array_merge(
      is_array($draft_bucket) ? $draft_bucket : [],
      $split['drafts']
    ));

    $out = [];
    foreach ($split['published'] as $entry) {
      $id = self::entry_id($entry);
      $entry = self::with_status($entry, self::STATUS_PUBLISHED);

      if ($id !== null && isset($drafts[$id])) {
        // `status` stays on the working copy — a published animation's edits are themselves either draft or preview, and that is the question the card badge answers. Its own state is resolved here too, so the pair never carries one stamped field and one bare one.
        $working = self::as_draft($drafts[$id]);
        unset($working[self::DRAFT_FIELD]);
        $entry[self::DRAFT_FIELD] = $working;
        unset($drafts[$id]);
      }
      $out[] = $entry;
    }

    // Whatever is left never had a published counterpart — those are ordinary drafts.
    return array_merge($out, array_map([self::class, 'as_draft'], array_values($drafts)));
  }

  /**
   * Separate a bucket's published entries from unpublished ones.
   *
   * Sites saved before the draft key existed keep both kinds in the published
   * bucket, so this runs on every read rather than as a one-off migration —
   * a half-migrated site still resolves correctly.
   *
   * @param mixed $bucket Raw stored bucket.
   * @return array{published: array, drafts: array}
   */
  public function split($bucket): array
  {
    if (!is_array($bucket)) {
      return ['published' => [], 'drafts' => []];
    }

    $published = [];
    $drafts = [];
    foreach ($bucket as $entry) {
      if (self::is_published($entry)) {
        $published[] = $entry;
      } else {
        $drafts[] = $entry;
      }
    }

    return ['published' => $published, 'drafts' => $drafts];
  }

  // ─── Bucket reads ────────────────────────────────────────────────

  /**
   * Read a global bucket, memoized per request.
   *
   * @param string $option Option name.
   * @return array
   */
  public function global_bucket(string $option): array
  {
    if (array_key_exists($option, $this->global_cache)) {
      return $this->global_cache[$option];
    }

    $raw = get_option($option, []);

    return $this->global_cache[$option] = is_array($raw) ? $raw : [];
  }

  /**
   * Drop the global memo after a write, so a later read in the same request sees it.
   *
   * Page buckets need no equivalent — getConfig() invalidates its own memo on save.
   *
   * @return void
   */
  public function forget_globals(): void
  {
    $this->global_cache = [];
  }

  /**
   * Read a page bucket for the given page type.
   *
   * @param array $page_type_config Descriptor from getCurrentPageType().
   * @param bool  $draft            Read the draft key instead of the published one.
   * @return array
   */
  public function page_bucket(array $page_type_config, bool $draft = false): array
  {
    $config = $draft ? self::draft_config($page_type_config) : $page_type_config;

    // No memo here on purpose — getConfig() memoizes the read itself, so every caller benefits, not just this one.
    return $this->page_type->getConfig($config);
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  /**
   * Rewrite a page type descriptor to point at the draft key.
   *
   * Mirrors `settings_config()` in EditorSessionTrait — same store target,
   * different option prefix.
   *
   * @param array $animation_config Descriptor for the published key.
   * @return array
   */
  public static function draft_config(array $animation_config): array
  {
    return self::reprefix($animation_config, self::PAGE_DRAFT_PREFIX);
  }

  /**
   * Swap the animation prefix on a descriptor's option name for another.
   *
   * @param array  $config
   * @param string $prefix
   * @return array
   */
  public static function reprefix(array $config, string $prefix): array
  {
    if (!empty($config['option']) && is_string($config['option'])) {
      $config['option'] = preg_replace(
        '/^' . preg_quote(self::PAGE_PUBLISHED_PREFIX, '/') . '/',
        $prefix,
        $config['option']
      );
    }
    return $config;
  }

  /**
   * Which of the three states a node is in.
   *
   * `status` wins when it holds one of the three values, and `isPublished` is
   * read when it does not. That second half is the whole migration: every
   * record written before this field existed resolves to draft or published
   * exactly as it did before, so no pass over stored data is needed.
   *
   * @param mixed $node Animation entry or timeline step.
   * @return string One of the STATUS_* constants.
   */
  public static function status_of($node): string
  {
    if (!is_array($node)) {
      return self::STATUS_PUBLISHED;
    }

    $status = $node[self::STATUS_FIELD] ?? null;
    if ($status === self::STATUS_DRAFT || $status === self::STATUS_PREVIEW || $status === self::STATUS_PUBLISHED) {
      return $status;
    }

    // A missing flag means published, matching frontend.js — only a literal false unpublishes.
    if (!array_key_exists('isPublished', $node) || $node['isPublished'] !== false) {
      return self::STATUS_PUBLISHED;
    }

    return self::STATUS_DRAFT;
  }

  /**
   * Stamp a node with a state.
   *
   * `status` is the only field written. The legacy `isPublished` boolean is
   * actively dropped rather than kept in step, so a record stops carrying two
   * answers to the same question the first time it is saved — and cannot end up
   * with the two disagreeing. Reading still understands the old boolean, which
   * is what makes that convergence safe to do one record at a time.
   *
   * @param array  $node
   * @param string $status One of the STATUS_* constants.
   * @return array
   */
  public static function with_status(array $node, string $status): array
  {
    // Removed before being re-added so the field always lands at the tail, whatever order it arrived in. Without that, a record that has been through a stitch reorders its keys on the next save and every future diff carries the noise.
    unset($node[self::STATUS_FIELD], $node['isPublished']);

    $node[self::STATUS_FIELD] = $status;

    return $node;
  }

  /**
   * A record as it belongs in the draft bucket.
   *
   * Always `draft`, never `preview`: a save shares nothing on its own. Whether a
   * link exists is the share row's business, and reconcile — which runs on the
   * same save — is what marks the copy it holds.
   *
   * @param array $entry
   * @return array
   */
  public static function as_draft(array $entry): array
  {
    return self::with_status($entry, self::STATUS_DRAFT);
  }

  /**
   * Whether a node should render for an ordinary visitor.
   *
   * @param mixed $node Animation entry or timeline step.
   * @return bool
   */
  public static function is_published($node): bool
  {
    return self::status_of($node) === self::STATUS_PUBLISHED;
  }

  /**
   * An entry's animation id, or null when it has no usable one.
   *
   * @param mixed $entry
   * @return string|null
   */
  public static function entry_id($entry): ?string
  {
    if (!is_array($entry) || !isset($entry['id']) || !is_string($entry['id']) || $entry['id'] === '') {
      return null;
    }
    return $entry['id'];
  }

  /**
   * Key a list by animation id, dropping entries without one.
   *
   * @param array $entries
   * @return array<string,array>
   */
  private function index_by_id(array $entries): array
  {
    $out = [];
    foreach ($entries as $entry) {
      $id = self::entry_id($entry);
      if ($id !== null) {
        $out[$id] = $entry;
      }
    }
    return $out;
  }
}
