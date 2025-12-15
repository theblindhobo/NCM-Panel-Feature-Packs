<?php
// includes/eventbrite-enhancements.php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Bootstraps all Eventbrite enhancements (hooks live here).
 * Call this only when toggle is ON.
 */
function ncm_eventbrite_enhancements_bootstrap() {

    // Prevent double-boot if called twice
    static $booted = false;
    if ( $booted ) return;
    $booted = true;

    add_filter( 'post_type_link', 'ncm_eventbrite_external_permalink', 10, 4 );
    add_action( 'iee_after_create_em_eventbrite_event', 'ncm_iee_eventbrite_enhancements', 10, 2 );
    add_action( 'iee_after_update_em_eventbrite_event', 'ncm_iee_eventbrite_enhancements', 10, 2 );
}

/**
 * Use Eventbrite external URL as permalink on the front end
 */
function ncm_eventbrite_external_permalink( $post_link, $post, $leavename, $sample ) {
    if ( $post->post_type !== 'eventbrite_events' ) return $post_link;
    if ( is_admin() ) return $post_link;

    $ticket_link = get_post_meta( $post->ID, 'iee_event_link', true );
    return ! empty( $ticket_link ) ? esc_url( $ticket_link ) : $post_link;
}

/**
 * Force featured image for imported Eventbrite events
 */
function ncm_iee_force_eventbrite_featured_image( $post_id, $centralize_array ) {
    $image_url = '';

    if ( ! empty( $centralize_array['image_url'] ) ) {
        $image_url = $centralize_array['image_url'];
    } elseif ( ! empty( $centralize_array['logo']['original']['url'] ) ) {
        $image_url = $centralize_array['logo']['original']['url'];
    }

    if ( empty( $image_url ) ) return;
    if ( has_post_thumbnail( $post_id ) ) return;

    // media_sideload_image needs these loaded on some hosts
    if ( ! function_exists( 'media_sideload_image' ) ) {
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
    }

    $image_id = media_sideload_image( $image_url, $post_id, null, 'id' );
    if ( is_wp_error( $image_id ) ) return;

    set_post_thumbnail( $post_id, $image_id );
}

/**
 * If venue details are completely empty, set to "Location TBA"
 */
function ncm_iee_force_tba_venue( $post_id, $centralize_array ) {
    $venue = isset( $centralize_array['location'] ) ? $centralize_array['location'] : array();

    $has_any_venue_data =
        ! empty( $venue['name'] )
        || ! empty( $venue['full_address'] )
        || ! empty( $venue['city'] )
        || ! empty( $venue['state'] )
        || ! empty( $venue['country'] )
        || ! empty( $venue['zip'] );

    if ( ! $has_any_venue_data ) {
        update_post_meta( $post_id, 'venue_name', 'Location TBA' );
        update_post_meta( $post_id, 'venue_address', '' );
        update_post_meta( $post_id, 'venue_city', '' );
        update_post_meta( $post_id, 'venue_state', '' );
        update_post_meta( $post_id, 'venue_country', '' );
        update_post_meta( $post_id, 'venue_zipcode', '' );
        update_post_meta( $post_id, 'venue_lat', '' );
        update_post_meta( $post_id, 'venue_lon', '' );
    }
}

/**
 * Wrapper: run all Eventbrite import enhancements after create / update
 */
function ncm_iee_eventbrite_enhancements( $post_id, $centralize_array ) {
    ncm_iee_force_eventbrite_featured_image( $post_id, $centralize_array );
    ncm_iee_force_tba_venue( $post_id, $centralize_array );
}
