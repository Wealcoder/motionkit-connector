<?php

/**
 * MotionKit Connector — Proprietary. Copyright (c) 2024-2026 Wealcoder / MotionKit.
 * All rights reserved. Licensed, not sold. Unauthorized copying, modification,
 * distribution, reverse engineering, or AI-assisted reproduction is prohibited.
 * See LICENSE.txt. Abuse: legal@motionkit.io
 */

namespace MotionKitConnector\RestApi;

/**
 * REST API Class for MotionKit Extension
 *
 * Registers WP REST API endpoints for MotionKit config operations.
 *
 * @package MotionKitConnector
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
  exit;
}

use MotionKitConnector\Common\AnimationResolver;
use MotionKitConnector\Common\MotionkitBuilderPageType;
use MotionKitConnector\Common\ShareLinks;
use MotionKitConnector\Auth\JwtTokenManager;
use MotionKitConnector\Migrations\StatusSavedMigration;
use MotionKitConnector\Support\EditorSessionTrait;

final class RestApi
{
  use EditorSessionTrait;

  /**
   * REST namespace
   */
  private const NAMESPACE = 'motionkit/v1';

  /**
   * Page type resolver
   *
   * @var MotionkitBuilderPageType
   */
  private MotionkitBuilderPageType $page_type;

  /**
   * Animation payload resolver — stitches the published/draft pair for reads.
   *
   * @var AnimationResolver
   */
  private AnimationResolver $resolver;

  /**
   * Share link store.
   *
   * @var ShareLinks
   */
  private ShareLinks $share_links;

  /**
   * Initialize REST API
   *
   * @return void
   */
  public function init(): void
  {
    $this->page_type = MotionkitBuilderPageType::instance();
    $this->resolver = new AnimationResolver($this->page_type);
    $this->share_links = new ShareLinks($this->page_type);
    add_action('rest_api_init', [$this, 'register_routes']);
    add_filter('rest_pre_serve_request', [$this, 'add_cors_headers'], 10, 4);
    // Last on purpose: it has to see what a REST lockdown plugin decided before it can undo it for our own routes.
    add_filter('rest_authentication_errors', [$this, 'unlock_own_routes'], PHP_INT_MAX);
  }

  /**
   * Register REST routes
   *
   * @return void
   */
  public function register_routes(): void
  {
    // POST /motionkit/v1/save
    register_rest_route(self::NAMESPACE, '/save', [
      'methods'             => \WP_REST_Server::CREATABLE,
      'callback'            => [$this, 'dispatch_simple'],
      'permission_callback' => '__return_true',
    ]);

    // GET or POST /motionkit/v1/pages. POST lets the editor send the session JWT in a text/plain body (a CORS simple request, no preflight) rather than as ?token= on the URL, where a reusable 24h credential would land in access logs. GET stays for an older bridge build that puts the token in the query; the handler and the permission check read it from either place.
    register_rest_route(self::NAMESPACE, '/pages', [
      'methods'             => \WP_REST_Server::READABLE . ', ' . \WP_REST_Server::CREATABLE,
      'callback'            => [$this, 'search_pages'],
      'permission_callback' => [$this, 'check_permission_query_token'],
      'args'                => [
        's' => [
          'required'          => false,
          'sanitize_callback' => 'sanitize_text_field',
        ],
        'per_page' => [
          'required'          => false,
          'default'           => 10,
          'sanitize_callback' => 'absint',
        ],
        'page' => [
          'required'          => false,
          'default'           => 1,
          'sanitize_callback' => 'absint',
        ],
      ],
    ]);
  }

  // ─── Permission ─────────────────────────────────────────────────

  public function check_permission_query_token(\WP_REST_Request $request)
  {
    $token = (string) $request->get_param('token');
    // A text/plain POST body is not parsed into params, so read the token from the decoded body when the query param is absent.
    if ($token === '') {
      $body = json_decode((string) $request->get_body(), true);
      if (is_array($body) && !empty($body['token'])) {
        $token = (string) $body['token'];
      }
    }
    if ($token !== '') {
      if (JwtTokenManager::validate_reusable($token) !== false) {
        return true;
      }
      if ($this->verify_server_session($token)) {
        return true;
      }
    }
    return $this->check_permission($request);
  }

  public function check_permission(?\WP_REST_Request $request = null)
  {
    $auth_header = '';
    if ($request && $request->get_header('Authorization')) {
      $auth_header = $request->get_header('Authorization');
    } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
      $auth_header = sanitize_text_field(wp_unslash($_SERVER['HTTP_AUTHORIZATION']));
    }

    if (preg_match('/^Bearer\s+(.+)$/i', $auth_header, $matches)) {
      $bearer_token = $matches[1];

      if (JwtTokenManager::validate_reusable($bearer_token) !== false) {
        return true;
      }
      if ($this->verify_server_session($bearer_token)) {
        return true;
      }

      return new \WP_Error(
        'rest_forbidden',
        esc_html__('Invalid or expired token.', 'motionkit-with-gsap'),
        ['status' => 401]
      );
    }

    // Cookie fallback for a logged-in administrator, but only with a valid wp_rest nonce. Without the nonce check a cross-site page could ride an admin's cookie to this endpoint, since WordPress core does not nonce-protect a CORS simple request on its own when no nonce is sent. The editor always carries a JWT, so requiring the nonce costs legitimate traffic nothing.
    if (is_user_logged_in() && current_user_can('manage_options')) {
      $nonce = '';
      if ($request && $request->get_header('X-WP-Nonce')) {
        $nonce = (string) $request->get_header('X-WP-Nonce');
      } elseif (isset($_REQUEST['_wpnonce'])) {
        $nonce = sanitize_text_field(wp_unslash($_REQUEST['_wpnonce']));
      }
      if ($nonce !== '' && wp_verify_nonce($nonce, 'wp_rest')) {
        return true;
      }
    }

    return new \WP_Error(
      'rest_forbidden',
      esc_html__('Authentication required.', 'motionkit-with-gsap'),
      ['status' => 401]
    );
  }

  // ─── CORS ──────────────────────────────────────────────────────

  public function add_cors_headers($served, $result, $request, $server)
  {
    $route = $request->get_route();

    if (strpos($route, '/' . self::NAMESPACE) !== 0) {
      return $served;
    }

    $origin = isset($_SERVER['HTTP_ORIGIN']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_ORIGIN'])) : '';
    $allowed_origins = $this->editor_allowed_origins();

    if (!empty($origin) && in_array($origin, $allowed_origins, true)) {
      header('Access-Control-Allow-Origin: ' . $origin);
      header('Vary: Origin');
      header('Access-Control-Allow-Credentials: true');
      header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
      header('Access-Control-Allow-Headers: Content-Type, X-WP-Nonce, Authorization');
    }

    return $served;
  }

  private function get_animation_folders(): array
  {
    $folders = get_option('motionkit_animation_folders', null);
    if (is_array($folders)) {
      return $folders;
    }
    $global = get_option('motionkit_global_settings', []);
    if (is_array($global) && isset($global['animationFolders']) && is_array($global['animationFolders'])) {
      return $global['animationFolders'];
    }
    return [];
  }

  public function dispatch_simple(\WP_REST_Request $request): \WP_REST_Response
  {
    $raw  = $request->get_body();
    $data = json_decode((string) $raw, true);
    if (!is_array($data)) {
      return new \WP_REST_Response(['success' => false, 'error' => 'invalid_json'], 400);
    }

    $token   = isset($data['token'])   ? (string) $data['token']   : '';
    $action  = isset($data['action'])  ? (string) $data['action']  : '';
    $payload = isset($data['payload']) && is_array($data['payload']) ? $data['payload'] : [];

    if ($token === '' || $action === '') {
      return new \WP_REST_Response(['success' => false, 'error' => 'missing_token_or_action'], 400);
    }

    if (JwtTokenManager::validate_reusable($token) === false) {
      if (!$this->verify_server_session($token)) {
        return new \WP_REST_Response(['success' => false, 'error' => 'invalid_token'], 401);
      }
    }

    // Runs before anything is read or written, so the stored `draft` rename cannot land on top of a draft the editor parked deliberately after the update. Sentinel-guarded, so this is one autoloaded option read per request and the sweep happens at most once. Placed after auth on purpose — an unauthenticated request must not be able to trigger a table sweep.
    StatusSavedMigration::maybe_run();

    $allowed = [
      'save_global_settings',
      'save_global_animation',
      'save_current_page_settings',
      'save_current_page_animation',
      'save_favourite_cloud_animation',
      'save_animation_folders',
      'delete_global_settings',
      'delete_current_page_settings',
      'get_settings',
      'create_share_link',
    ];
    if (!in_array($action, $allowed, true)) {
      return new \WP_REST_Response(['success' => false, 'error' => 'unknown_action'], 400);
    }

    switch ($action) {
      case 'save_global_settings':
        update_option('motionkit_global_settings', $payload['animationConfigs'] ?? []);
        update_option('motionkit_page_settings_updated_at', time(), true);
        return new \WP_REST_Response(['success' => true, 'data' => ['msg' => 'global_settings_saved']], 200);

      case 'save_global_animation':
        // The editor sends one list; storage keeps published and draft apart so only the published half ever reaches a visitor's HTML.
        $parts = AnimationResolver::partition_for_storage(
          is_array($payload['animationConfigs'] ?? null) ? $payload['animationConfigs'] : []
        );
        update_option(AnimationResolver::GLOBAL_PUBLISHED_OPTION, $parts['published']);
        if (empty($parts['drafts'])) {
          delete_option(AnimationResolver::GLOBAL_DRAFT_OPTION);
        } else {
          update_option(AnimationResolver::GLOBAL_DRAFT_OPTION, $parts['drafts']);
        }
        update_option('motionkit_page_settings_updated_at', time(), true);
        // Global links are stored on whichever page they were created for, so publishing a global animation can only retire its link while the editor is still telling us which page that is.
        $this->resolver->forget_globals();
        $page_type_config = $payload['pageTypeConfigs'] ?? [];
        if (is_array($page_type_config) && $this->is_valid_page_type_config($page_type_config)) {
          $this->sync_share_links($page_type_config);
        }
        return new \WP_REST_Response(['success' => true, 'data' => ['msg' => 'global_animation_saved']], 200);

      case 'save_current_page_animation':
        $page_type_config = $payload['pageTypeConfigs'] ?? [];
        if (!is_array($page_type_config) || !$this->is_valid_page_type_config($page_type_config)) {
          return new \WP_REST_Response(['success' => false, 'error' => 'invalid_page_type_config'], 400);
        }
        $parts = AnimationResolver::partition_for_storage(
          is_array($payload['animationConfigs'] ?? null) ? $payload['animationConfigs'] : []
        );
        $this->page_type->saveConfig($page_type_config, $parts['published']);
        $this->write_page_drafts($page_type_config, $parts['drafts']);
        update_option('motionkit_page_settings_updated_at', time(), true);
        return new \WP_REST_Response(['success' => true, 'data' => ['msg' => 'page_animation_saved']], 200);

      case 'save_current_page_settings':
        $page_type_config = $payload['pageTypeConfigs'] ?? [];
        if (!is_array($page_type_config) || !$this->is_valid_page_type_config($page_type_config)) {
          return new \WP_REST_Response(['success' => false, 'error' => 'invalid_page_type_config'], 400);
        }
        $this->page_type->saveConfig(
          $this->settings_config($page_type_config),
          $payload['animationConfigs'] ?? []
        );
        update_option('motionkit_page_settings_updated_at', time(), true);
        return new \WP_REST_Response(['success' => true, 'data' => ['msg' => 'page_settings_saved']], 200);

      case 'save_favourite_cloud_animation':
        $favourite = [];
        if (isset($payload['favourite']) && is_array($payload['favourite'])) {
          foreach ($payload['favourite'] as $fav_id) {
            if (is_numeric($fav_id)) {
              $favourite[] = (int) $fav_id;
            } elseif (is_string($fav_id) && $fav_id !== '') {
              $favourite[] = sanitize_text_field($fav_id);
            }
          }
          $favourite = array_values(array_unique($favourite));
        }
        update_option('motionkit_favourite_cloud_animation', $favourite);
        return new \WP_REST_Response(['success' => true, 'data' => ['msg' => 'favourite_cloud_animation_saved']], 200);

      case 'save_animation_folders':
        $folders = [];
        if (isset($payload['animationFolders']) && is_array($payload['animationFolders'])) {
          foreach ($payload['animationFolders'] as $folder) {
            if (!is_array($folder)) continue;
            $folder_id = isset($folder['folderId']) ? sanitize_text_field((string) $folder['folderId']) : '';
            if ($folder_id === '') continue;
            $folders[] = [
              'folderId' => $folder_id,
              'title'    => isset($folder['title']) ? sanitize_text_field((string) $folder['title']) : '',
              'pageType' => isset($folder['pageType']) ? sanitize_text_field((string) $folder['pageType']) : '',
            ];
          }
        }
        update_option('motionkit_animation_folders', $folders);
        return new \WP_REST_Response(['success' => true, 'data' => ['msg' => 'animation_folders_saved']], 200);

      case 'delete_global_settings':
        delete_option('motionkit_global_settings');
        return new \WP_REST_Response(['success' => true, 'data' => ['msg' => 'global_settings_deleted']], 200);

      case 'delete_current_page_settings':
        $page_type_config = $payload['pageTypeConfigs'] ?? [];
        if (!is_array($page_type_config) || !$this->is_valid_page_type_config($page_type_config)) {
          return new \WP_REST_Response(['success' => false, 'error' => 'invalid_page_type_config'], 400);
        }
        $this->page_type->deleteConfig($this->settings_config($page_type_config));
        $this->page_type->deleteConfig($page_type_config);
        // Drafts and share links belong to the animations being cleared — leaving them would resurrect drafts on the next read and keep dead links listed.
        $this->page_type->deleteConfig(AnimationResolver::draft_config($page_type_config));
        $this->page_type->deleteConfig(ShareLinks::share_config($page_type_config));
        update_option('motionkit_page_settings_updated_at', time(), true);
        return new \WP_REST_Response(['success' => true, 'data' => ['msg' => 'page_config_deleted']], 200);

      case 'get_settings':
        $page_type_config = $payload['pageTypeConfigs'] ?? [];

        return new \WP_REST_Response([
          'success' => true,
          'data'    => [
            'globalSettings'          => get_option('motionkit_global_settings', []),
            // Stitched so the editor gets one list with working copies re-attached, the same shape it sent.
            'globalAnimation'         => $this->resolver->global_for_editor(),
            'favouriteCloudAnimation' => get_option('motionkit_favourite_cloud_animation', []),
            'animationFolders'        => $this->get_animation_folders(),
          ],
        ], 200);

      case 'create_share_link':
        $page_type_config = $payload['pageTypeConfigs'] ?? [];
        if (!is_array($page_type_config) || !$this->is_valid_page_type_config($page_type_config)) {
          return new \WP_REST_Response(['success' => false, 'error' => 'invalid_page_type_config'], 400);
        }
        // The records come from storage, never from the request — that is what keeps a share link unable to reveal anything the last save did not already write. The request names no ids any more either: a link covers the whole page.
        $token = $this->share_links->create(
          $page_type_config,
          $this->resolver->drafts_by_id($page_type_config),
          isset($payload['sharedVersion']) && is_string($payload['sharedVersion']) ? $payload['sharedVersion'] : ''
        );
        if ($token === null) {
          return new \WP_REST_Response(['success' => false, 'error' => 'share_link_failed'], 500);
        }
        // Only the token goes back; the editor already knows the page URL it is editing and builds the link itself, which keeps URL validation out of this handler.
        return new \WP_REST_Response([
          'success' => true,
          'data'    => ['token' => $token, 'param' => ShareLinks::QUERY_PARAM],
        ], 200);
    }

    return new \WP_REST_Response(['success' => false, 'error' => 'unreachable'], 500);
  }

  /**
   * Write the page's draft bucket, then bring its share links back in step.
   *
   * A save is the only moment the shared copy changes: it refreshes the records
   * of animations still under review, and drops the ones that just left it —
   * published or deleted, both look the same from here, which is why neither
   * needs a hook of its own.
   *
   * @param array $page_type_config Descriptor for the page's animation key.
   * @param array $drafts           Draft entries to store.
   * @return void
   */
  private function write_page_drafts(array $page_type_config, array $drafts): void
  {
    $draft_config = AnimationResolver::draft_config($page_type_config);

    if (empty($drafts)) {
      $this->page_type->deleteConfig($draft_config);
    } else {
      $this->page_type->saveConfig($draft_config, $drafts);
    }

    $this->sync_share_links($page_type_config);
  }

  /**
   * Re-copy this page's share links from what storage now holds.
   *
   * Reads back rather than reusing the list just written, so page and global
   * working copies are reconciled together — a global animation's link lives on
   * the page it was created for and would otherwise never be revisited.
   *
   * @param array $page_type_config Descriptor for the page's animation key.
   * @return void
   */
  private function sync_share_links(array $page_type_config): void
  {
    $this->share_links->reconcile(
      $page_type_config,
      $this->resolver->drafts_by_id($page_type_config)
    );
  }

  public function search_pages(\WP_REST_Request $request): \WP_REST_Response
  {
    // A text/plain POST body is not parsed into params, so fall back to the decoded body for each field; a GET request leaves the body empty and keeps using the query params.
    $body = json_decode((string) $request->get_body(), true);
    $body = is_array($body) ? $body : [];

    $search   = strtolower(trim((string) ($request->get_param('s') ?? ($body['s'] ?? ''))));
    $per_page = min((int) ($request->get_param('per_page') ?? ($body['per_page'] ?? 0)), 50) ?: 10;
    $page     = max((int) ($request->get_param('page') ?? ($body['page'] ?? 0)), 1);
    $all      = [];

    if ($page === 1) {
      $special_pages = [
        ['title' => 'Homepage',       'type' => 'front_page', 'url' => home_url('/')],
        ['title' => 'Blog',           'type' => 'blog',       'url' => get_permalink(get_option('page_for_posts')) ?: home_url('/')],
        ['title' => '404 Page',       'type' => '404',        'url' => home_url('/404-preview/')],
        ['title' => 'Search Results', 'type' => 'search',     'url' => home_url('/?s=blog')],
      ];

      foreach ($special_pages as $sp) {
        if (!$search || stripos($sp['title'], $search) !== false || stripos($sp['type'], $search) !== false) {
          $all[] = [
            'id'    => null,
            'title' => $sp['title'],
            'type'  => $sp['type'],
            'group' => 'Special Pages',
            'url'   => $this->editor_url($sp['url']),
            'animationCount' => $this->special_page_animation_count($sp['type']),
          ];
        }
      }
    }

    $post_types = get_post_types(['public' => true], 'objects');

    $excluded_types = [
      'wcf-custom-fonts',
      'attachment',
      'elementor_library',
      'e-landing-page',
      'e-floating-buttons',
      'oembed_cache',
      'wp_block',
      'wp_template',
      'wp_template_part',
      'wp_navigation',
      'wp_global_styles',
      'wp_font_family',
      'wp_font_face',
      'custom_css',
      'customize_changeset',
      'revision',
      'nav_menu_item',
      'user_request',
      'fl-builder-template',
      'fl-theme-layout',
      'brizy_template',
      'ct_template',
      'jet-popup',
      'jet-menu',
      'jet-smart-filters',
      'bricks_template',
      'acf-field-group',
      'acf-field',
      'acf-post-type',
      'acf-taxonomy',
      'acf-ui-options-page',
      'wpcf7_contact_form',
      'wpforms',
      'wpforms_log',
      'frm_display',
      'wcf-addons-template',
      'wcf-addons-popup',
      'wcf-code-snippet',
      'wcf-custom-icons',
      'aaeptypebilder',
      'aaeaddon_post_rating',
      'metform-form',
      'metform-entry',
      'wpseo_locations',
      'wpseo_news',
      'redirect_rule',
      'rank_math_schema',
      'rm_content_ai',
      'aioseo-template',
      'et_pb_layout',
      'et_header_layout',
      'et_body_layout',
      'et_footer_layout',
      'et_code_snippet',
      'et_theme_builder',
      'eael_template',
      'elementskit_template',
      'elementskit_widget',
      'ha_library',
      'bdthemes-ep-template',
      'uael-template',
      'uael_popup',
      'elementor_font',
      'elementor_icons',
      'elementor_snippet',
      'elementor-thhf',
      'powerpack_templates',
      'pp-template',
      'unlimited-template',
    ];

    foreach ($excluded_types as $type) {
      unset($post_types[$type]);
    }

    $query_args = [
      'post_type'      => array_keys($post_types),
      'post_status'    => 'publish',
      'posts_per_page' => $per_page,
      'paged'          => $page,
      'orderby'        => 'title',
      'order'          => 'ASC',
    ];

    if ($search) {
      $query_args['s'] = $search;
    }

    $query = new \WP_Query($query_args);

    foreach ($query->posts as $post) {
      $type_obj = $post_types[$post->post_type] ?? null;
      $all[] = [
        'id'    => $post->ID,
        'title' => $post->post_title ?: '(no title)',
        'type'  => $post->post_type,
        'group' => $type_obj ? $type_obj->labels->singular_name : ucfirst($post->post_type),
        'url'   => $this->editor_url(get_permalink($post)),
        'animationCount' => $this->post_animation_count($post),
      ];
    }

    $total_posts = (int) $query->found_posts;

    if ($page === 1) {
      $taxonomies = get_taxonomies(['public' => true], 'objects');

      foreach ($taxonomies as $tax) {
        $term_args = [
          'taxonomy'   => $tax->name,
          'hide_empty' => false,
          'number'     => 1,
        ];
        if ($search) {
          $term_args['search'] = $search;
          $term_args['number'] = 3;
        }

        $terms = get_terms($term_args);
        if (is_wp_error($terms) || empty($terms)) continue;

        foreach ($terms as $term) {
          $link = get_term_link($term);
          if (is_wp_error($link)) continue;

          $all[] = [
            'id'    => $term->term_id,
            'title' => $term->name,
            'type'  => $tax->name,
            'group' => $tax->labels->singular_name ?: ucfirst($tax->name),
            'url'   => $this->editor_url($link),
            'animationCount' => $this->animation_count('term_meta', $tax->name, (int) $term->term_id),
          ];
        }
      }

      if (!$search || stripos('author', $search) !== false) {
        $authors = get_users([
          'has_published_posts' => true,
          'number'              => 1,
        ]);
        if ($search) {
          $authors = get_users([
            'has_published_posts' => true,
            'search'              => "*{$search}*",
            'search_columns'      => ['display_name'],
            'number'              => 3,
          ]);
        }
        foreach ($authors as $author) {
          $all[] = [
            'id'    => $author->ID,
            'title' => $author->display_name,
            'type'  => 'author',
            'group' => 'Author',
            'url'   => $this->editor_url(get_author_posts_url($author->ID)),
            'animationCount' => $this->animation_count('option', 'author', (int) $author->ID),
          ];
        }
      }
    }

    $has_more = $total_posts > ($page * $per_page);

    return new \WP_REST_Response([
      'success'  => true,
      'data'     => $all,
      'page'     => $page,
      'per_page' => $per_page,
      'total'    => $total_posts,
      'has_more' => $has_more,
    ], 200);
  }

  // NOTE: is_valid_page_type_config() and settings_config() intentionally live
  // ONLY in EditorSessionTrait. Earlier a weaker copy here shadowed the trait's
  // stricter version — it dropped the `motionkit_pg_` option-prefix check and
  // the post/term existence check, so a token holder could write any wp_options
  // key (e.g. active_plugins) via save_current_page_animation. Do not redefine
  // them in this class.

  private function editor_url(string $url): string
  {
    return add_query_arg('motionkit', 'editor', $url);
  }

  /**
   * How many animations the editor lists on a page — published and unpublished, one per id.
   *
   * Built from the same descriptor getCurrentPageType() produces when that page
   * is opened, so the count reads the exact key the editor will load.
   *
   * @param string $store_type post_meta, term_meta or option.
   * @param string $type       Page type, as getCurrentPageType() names it.
   * @param int    $id         Post, term or author id; 0 when there is none.
   * @return int
   */
  private function animation_count(string $store_type, string $type, int $id): int
  {
    return count($this->resolver->page_for_editor([
      'id'         => $id,
      'type'       => $type,
      'store_type' => $store_type,
      'option'     => $this->page_type->buildOptionName($type, $id, $store_type),
    ]));
  }

  // The static front page and the posts page open as front_page / home rather than as their post type, so their animations live under that key.
  private function post_animation_count(\WP_Post $post): int
  {
    $id = (int) $post->ID;

    if ($id === (int) get_option('page_on_front')) {
      return $this->animation_count('post_meta', 'front_page', $id);
    }
    if ($id === (int) get_option('page_for_posts')) {
      return $this->animation_count('post_meta', 'home', $id);
    }

    return $this->animation_count('post_meta', $post->post_type, $id);
  }

  // Mirrors the is_front_page() / is_home() / is_search() / is_404() branches of getCurrentPageType(); the list calls the posts page "blog", storage calls it "home".
  private function special_page_animation_count(string $type): int
  {
    if ($type === 'front_page' || $type === 'blog') {
      $storage_type = $type === 'blog' ? 'home' : 'front_page';
      $page_id = (int) get_option($type === 'blog' ? 'page_for_posts' : 'page_on_front');

      return $page_id > 0
        ? $this->animation_count('post_meta', $storage_type, $page_id)
        : $this->animation_count('option', $storage_type, 0);
    }

    return $this->animation_count('option', $type, 0);
  }

  /**
   * Let this plugin's own REST calls through a REST lockdown.
   *
   * Plugins that restrict the REST API to logged-in users (Solid Security's "Restrict REST API", Disable REST API and their kin) answer every anonymous request with a 401 from rest_authentication_errors — our save included, which the bridge sends from the editor iframe with a JWT and no cookie. This runs last, and only answers for our own namespace when the request carries a token: the handlers still verify that token, so a request that gets this far is no better off than on a site with no lockdown at all.
   *
   * @param \WP_Error|null|true $result What the filters before this one decided.
   * @return \WP_Error|null|true
   */
  public function unlock_own_routes($result)
  {
    if (!is_wp_error($result)) {
      return $result;
    }

    if (!self::is_own_rest_request() || !self::request_carries_token()) {
      return $result;
    }

    return true;
  }

  // The route being served, from the ?rest_route= form or the pretty URL, matched against this plugin's namespace.
  private static function is_own_rest_request(): bool
  {
    $prefix = '/' . self::NAMESPACE . '/';

    // phpcs:ignore WordPress.Security.NonceVerification.Recommended
    $route = isset($_GET['rest_route']) ? (string) wp_unslash($_GET['rest_route']) : '';
    if ($route !== '') {
      return strpos($route, $prefix) === 0;
    }

    $path = (string) wp_parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
    return strpos($path, '/' . rest_get_url_prefix() . $prefix) !== false;
  }

  // A bearer header, a ?token= query (the pages search) or a JSON body with a token key (the save, which travels as text/plain to stay a CORS simple request). Presence only: verifying it is the handler's job.
  private static function request_carries_token(): bool
  {
    $auth = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (stripos($auth, 'Bearer ') === 0) {
      return true;
    }

    // phpcs:ignore WordPress.Security.NonceVerification.Recommended
    if (!empty($_GET['token'])) {
      return true;
    }

    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
      return false;
    }

    // php://input can be read again later by the REST server; only the head is needed, the bridge puts the token first.
    $head = (string) file_get_contents('php://input', false, null, 0, 4096);
    return strpos($head, '"token"') !== false;
  }
}
