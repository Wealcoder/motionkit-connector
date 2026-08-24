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

use MotionKitConnector\Common\MotionkitBuilderPageType;
use MotionKitConnector\Auth\JwtTokenManager;
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
   * Initialize REST API
   *
   * @return void
   */
  public function init(): void
  {
    $this->page_type = MotionkitBuilderPageType::instance();
    add_action('rest_api_init', [$this, 'register_routes']);
    add_filter('rest_pre_serve_request', [$this, 'add_cors_headers'], 10, 4);
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

    // GET /motionkit/v1/pages
    register_rest_route(self::NAMESPACE, '/pages', [
      'methods'             => \WP_REST_Server::READABLE,
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
        esc_html__('Invalid or expired token.', 'motionkit-connector'),
        ['status' => 401]
      );
    }

    if (is_user_logged_in() && current_user_can('manage_options')) {
      return true;
    }

    return new \WP_Error(
      'rest_forbidden',
      esc_html__('Authentication required.', 'motionkit-connector'),
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

    $allowed = [
      'save_global_settings',
      'save_global_animation',
      'save_current_page_settings',
      'save_current_page_animation',
      'save_page_transition_code',
      'save_favourite_cloud_animation',
      'save_animation_folders',
      'delete_global_settings',
      'delete_current_page_settings',
      'get_settings',
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
        update_option('motionkit_global_animations', $payload['animationConfigs'] ?? []);
        update_option('motionkit_page_settings_updated_at', time(), true);
        return new \WP_REST_Response(['success' => true, 'data' => ['msg' => 'global_animation_saved']], 200);

      case 'save_current_page_animation':
        $page_type_config = $payload['pageTypeConfigs'] ?? [];
        if (!is_array($page_type_config) || !$this->is_valid_page_type_config($page_type_config)) {
          return new \WP_REST_Response(['success' => false, 'error' => 'invalid_page_type_config'], 400);
        }
        $this->page_type->saveConfig(
          $page_type_config,
          $payload['animationConfigs'] ?? []
        );
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

      case 'save_page_transition_code':
        // This action stores raw JS that is printed on every front-end page.
        // That is arbitrary-code execution site-wide, so it is gated on the
        // same capability WordPress uses for unfiltered markup/scripts. A
        // JWT-only caller (no logged-in user with the cap) is refused — the
        // editor performs this save while an admin is authenticated.
        if (!current_user_can('unfiltered_html')) {
          return new \WP_REST_Response(['success' => false, 'error' => 'forbidden_unfiltered_html'], 403);
        }

        $code         = isset($payload['code']) && is_string($payload['code']) ? $payload['code'] : '';
        $preset_key   = isset($payload['presetKey']) ? sanitize_text_field((string) $payload['presetKey']) : '';
        $preset_label = isset($payload['presetLabel']) ? sanitize_text_field((string) $payload['presetLabel']) : '';

        if ($code === '') {
          delete_option('motionkit-page-transition-code');
          return new \WP_REST_Response(['success' => true, 'data' => ['msg' => 'page_transition_cleared']], 200);
        }

        update_option('motionkit-page-transition-code', [
          'code'        => $code,
          'presetKey'   => $preset_key,
          'presetLabel' => $preset_label,
          'updated_at'  => time(),
        ], false);
        return new \WP_REST_Response(['success' => true, 'data' => ['msg' => 'page_transition_saved']], 200);

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
        update_option('motionkit_page_settings_updated_at', time(), true);
        return new \WP_REST_Response(['success' => true, 'data' => ['msg' => 'page_config_deleted']], 200);

      case 'get_settings':
        return new \WP_REST_Response([
          'success' => true,
          'data'    => [
            'globalSettings'          => get_option('motionkit_global_settings', []),
            'globalAnimation'         => get_option('motionkit_global_animations', []),
            'favouriteCloudAnimation' => get_option('motionkit_favourite_cloud_animation', []),
            'animationFolders'        => $this->get_animation_folders(),
          ],
        ], 200);
    }

    return new \WP_REST_Response(['success' => false, 'error' => 'unreachable'], 500);
  }

  public function search_pages(\WP_REST_Request $request): \WP_REST_Response
  {
    $search   = strtolower(trim($request->get_param('s') ?? ''));
    $per_page = min((int) $request->get_param('per_page'), 50) ?: 10;
    $page     = max((int) $request->get_param('page'), 1);
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
    return add_query_arg('action', 'motionkit-editor', $url);
  }
}
