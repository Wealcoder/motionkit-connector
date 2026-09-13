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
 * Which SaaS editor this build talks to.
 *
 * Every editor URL in the plugin — the launch links, the five `/connect/*`
 * endpoints, the license status call and the origin allowed to frame the site —
 * derives from one constant, `MOTIONKIT_CONNECTOR_EDITOR_ORIGIN`. That is what
 * lets `motionkit-connector build --dev` rewrite a single line in the staged
 * copy and have the whole plugin follow it, with a grep afterwards proving the
 * rewrite took. The host used to be a literal in nine places, where a dev build
 * would have meant nine seds and any one of them silently missing would have
 * produced a zip that talked to two environments at once.
 *
 * The main MotionKit plugin keeps its own hardcoded default — it is a separate
 * repo with a separate build. It follows this one through the
 * `motionkit/editor/url` filter that `Plugin` registers whenever this build is
 * not pointed at production, which is why a dev connector is enough to move the
 * "Build Animation" and "Launch MotionKit" buttons without shipping a dev build
 * of the dashboard too.
 */
final class EditorEndpoint
{
  /**
   * Production. Also the literal the main plugin hardcodes, which is what
   * `retarget()` matches on.
   */
  public const DEFAULT_ORIGIN = 'https://editor.motionkit.io';

  /**
   * Resolved origin, memoized. `null` until first read.
   *
   * @var string|null
   */
  private static ?string $origin = null;

  /**
   * Scheme and host, no trailing slash — `https://editor.motionkit.io`.
   *
   * A constant that is missing or malformed falls back to production rather
   * than failing: a build that cannot say where its editor is should behave
   * like the shipping one, not like nothing.
   *
   * @return string
   */
  public static function origin(): string
  {
    if (self::$origin !== null) {
      return self::$origin;
    }

    if (!defined('MOTIONKIT_CONNECTOR_EDITOR_ORIGIN') || !is_string(MOTIONKIT_CONNECTOR_EDITOR_ORIGIN)) {
      return self::$origin = self::DEFAULT_ORIGIN;
    }

    $origin = rtrim(trim(MOTIONKIT_CONNECTOR_EDITOR_ORIGIN), '/');

    // Scheme + host + optional port and nothing else — a path or query here would corrupt every URL built from it. `http` is allowed so the constant can name a local editor during development; the shipped value is always https.
    if (!preg_match('#^https?://[A-Za-z0-9.\-]+(:\d{1,5})?$#', $origin)) {
      return self::$origin = self::DEFAULT_ORIGIN;
    }

    return self::$origin = $origin;
  }

  /**
   * Origin with a trailing slash — the shape every `motionkit/editor/url`
   * default has always had.
   *
   * @return string
   */
  public static function base(): string
  {
    return self::origin() . '/';
  }

  /**
   * An endpoint under the editor, e.g. `url('connect/authorize')`.
   *
   * @param string $path Path without a leading slash.
   * @return string
   */
  public static function url(string $path): string
  {
    return self::origin() . '/' . ltrim($path, '/');
  }

  /**
   * Is this build pointed at production?
   *
   * @return bool
   */
  public static function is_default(): bool
  {
    return self::origin() === self::DEFAULT_ORIGIN;
  }

  /**
   * Move a production editor URL onto this build's editor, host only.
   *
   * Registered on `motionkit/editor/url`, where the value arrives in two
   * shapes: the bare base this plugin passes, and the base with the launch
   * query string already appended, which is what the main plugin passes. A host
   * swap covers both, where replacing the value outright would have thrown away
   * the `site`, `platform` and `motionkit_token` args on three of the four
   * button call sites.
   *
   * Only a value still on the production origin is touched, so a site that has
   * its own filter on this hook keeps whatever that filter decided.
   *
   * @param mixed $url Filtered editor URL.
   * @return mixed
   */
  public static function retarget($url)
  {
    if (!is_string($url) || strpos($url, self::DEFAULT_ORIGIN) !== 0) {
      return $url;
    }

    return self::origin() . substr($url, strlen(self::DEFAULT_ORIGIN));
  }
}
