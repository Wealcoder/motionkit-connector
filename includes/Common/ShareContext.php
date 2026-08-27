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
 * A validated share link, resolved from the `mk_share` query parameter.
 *
 * Carrying this instead of the raw token means the render path can never see
 * an unvalidated value: the object only exists once ShareLinks has matched the
 * token against a stored row.
 *
 * The animation records travel inside the link's own row, so a share render
 * never reads the draft bucket. Drafts stay drafts on both sides of the wire —
 * what a reviewer sees is a copy the share row owns, taken at save time.
 */
final class ShareContext
{
  /**
   * Animation ids this link is allowed to reveal.
   *
   * Not exposed: it exists to gate `$animations` in the constructor, and every
   * reader wants the records themselves. A list even though today's UI shares
   * exactly one, so growing to several is a UI change, not a storage change.
   *
   * @var string[]
   */
  private array $animation_ids;

  /**
   * The shared records themselves, keyed by animation id.
   *
   * @var array<string,array>
   */
  private array $animations;

  /**
   * The shared animation's `updatedAt` when the link was last written.
   *
   * @var string
   */
  private string $shared_version;

  /**
   * @param string[]            $animation_ids
   * @param array<string,array> $animations
   */
  public function __construct(array $animation_ids, array $animations = [], string $shared_version = '')
  {
    $this->animation_ids = array_values(array_filter($animation_ids, 'is_string'));
    $this->shared_version = $shared_version;

    // Ids are the authority on what the link may reveal; a record that outlived its id stays unreadable rather than rendering off a stale snapshot.
    $allowed = array_flip($this->animation_ids);
    $this->animations = array_intersect_key(
      array_filter($animations, 'is_array'),
      $allowed
    );
  }

  /**
   * The shared animation records, keyed by id.
   *
   * @return array<string,array>
   */
  public function animations(): array
  {
    return $this->animations;
  }

  /**
   * @return string
   */
  public function shared_version(): string
  {
    return $this->shared_version;
  }
}
