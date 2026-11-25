<?php
/**
 * Plugin Name: VOXO Chat
 * Description: Install the VOXO widget and expose published WordPress/WooCommerce content in read-only mode.
 * Version: 1.0.0
 * Requires at least: 6.0
 * Text Domain: voxo-chat
 * Domain Path: /languages
 */

defined('ABSPATH') || exit;

const VOXO_OPTION = 'voxo_chat_settings';

function voxo_settings() {
  return wp_parse_args(get_option(VOXO_OPTION, array()), array('tenant_id' => '', 'api_url' => '', 'connector_token' => ''));
}

function voxo_register_settings() {
  register_setting('voxo_chat', VOXO_OPTION, array('sanitize_callback' => 'voxo_sanitize_settings'));
}
add_action('admin_init', 'voxo_register_settings');

function voxo_sanitize_settings($value) {
  return array(
    'tenant_id' => sanitize_text_field($value['tenant_id'] ?? ''),
    'api_url' => esc_url_raw($value['api_url'] ?? ''),
    'connector_token' => sanitize_text_field($value['connector_token'] ?? ''),
  );
}

function voxo_settings_page() {
  $settings = voxo_settings(); ?>
  <div class="wrap"><h1>VOXO Chat</h1><form method="post" action="options.php"><?php settings_fields('voxo_chat'); ?>
  <table class="form-table"><tr><th><?php esc_html_e('Tenant identifier', 'voxo-chat'); ?></th><td><input class="regular-text" name="<?php echo VOXO_OPTION; ?>[tenant_id]" value="<?php echo esc_attr($settings['tenant_id']); ?>" /></td></tr>
  <tr><th><?php esc_html_e('VOXO API URL', 'voxo-chat'); ?></th><td><input class="regular-text" type="url" name="<?php echo VOXO_OPTION; ?>[api_url]" value="<?php echo esc_attr($settings['api_url']); ?>" placeholder="https://api.voxo.example" /></td></tr>
  <tr><th><?php esc_html_e('Connector token', 'voxo-chat'); ?></th><td><input class="regular-text" type="password" name="<?php echo VOXO_OPTION; ?>[connector_token]" value="<?php echo esc_attr($settings['connector_token']); ?>" /></td></tr></table>
  <?php submit_button(); ?></form></div><?php
}

function voxo_menu() { add_options_page('VOXO Chat', 'VOXO Chat', 'manage_options', 'voxo-chat', 'voxo_settings_page'); }
add_action('admin_menu', 'voxo_menu');

function voxo_load_textdomain() {
  load_plugin_textdomain('voxo-chat', false, dirname(plugin_basename(__FILE__)) . '/languages');
}
add_action('plugins_loaded', 'voxo_load_textdomain');

function voxo_authorized(WP_REST_Request $request) {
  $token = voxo_settings()['connector_token'];
  return $token && hash_equals($token, preg_replace('/^Bearer\s+/i', '', $request->get_header('authorization')));
}

function voxo_catalog(WP_REST_Request $request) {
  $page = max(1, (int) $request->get_param('page'));
  $posts = get_posts(array('post_status' => 'publish', 'posts_per_page' => 100, 'paged' => $page));
  $items = array_map(function($post) { return array('id' => 'post:' . $post->ID, 'title' => get_the_title($post), 'content' => wp_strip_all_tags(apply_filters('the_content', $post->post_content)), 'url' => get_permalink($post), 'updatedAt' => get_post_modified_time('c', true, $post)); }, $posts);
  if (class_exists('WooCommerce')) {
    $products = wc_get_products(array('status' => 'publish', 'limit' => 100, 'page' => $page));
    foreach ($products as $product) $items[] = array('id' => 'product:' . $product->get_id(), 'title' => $product->get_name(), 'content' => wp_strip_all_tags($product->get_description() ?: $product->get_short_description()), 'url' => get_permalink($product->get_id()), 'updatedAt' => $product->get_date_modified()->date('c'), 'type' => 'product', 'sku' => $product->get_sku(), 'priceAmount' => $product->get_price());
  }
  return rest_ensure_response(array('items' => $items, 'page' => $page, 'hasMore' => count($posts) === 100));
}

function voxo_routes() {
  register_rest_route('voxo/v1', '/manifest', array('methods' => 'GET', 'permission_callback' => 'voxo_authorized', 'callback' => function() { return array('provider' => 'wordpress', 'woocommerce' => class_exists('WooCommerce'), 'catalogEndpoint' => rest_url('voxo/v1/catalog')); }));
  register_rest_route('voxo/v1', '/catalog', array('methods' => 'GET', 'permission_callback' => 'voxo_authorized', 'callback' => 'voxo_catalog'));
}
add_action('rest_api_init', 'voxo_routes');

function voxo_widget() {
  $settings = voxo_settings();
  if (!$settings['tenant_id'] || !$settings['api_url']) return;
  printf('<script async src="%s/widget.js" data-tenant-id="%s"></script>', esc_url(rtrim($settings['api_url'], '/')), esc_attr($settings['tenant_id']));
}
add_action('wp_footer', 'voxo_widget', 100);
