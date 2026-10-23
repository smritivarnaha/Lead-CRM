import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { websiteId } = await params;

  if (user.role === "CLIENT" && user.websiteId !== websiteId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const origin = "https://crm.rankved.com";
  const targetEndpointId =
    websiteId && websiteId !== "YOUR_WEBSITE_ID" && websiteId !== "undefined"
      ? websiteId
      : "auto";

  const phpContent = `<?php
/**
 * Plugin Name: Rankved LeadFlow CRM Integration
 * Description: Automatically captures form submissions from Elementor Pro, Contact Form 7, WPForms, and Fluent Forms and dispatches them to Rankved CRM in real time.
 * Version: 2.0
 * Author: Rankved Healthcare Martech
 */

if ( ! defined( 'ABSPATH' ) ) exit;

function leadflow_crm_get_webhook_url() {
    return '${origin}/api/webhook/receive/${targetEndpointId}';
}

function leadflow_crm_get_client_ip() {
    if ( ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
        $ips = explode( ',', sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) );
        return trim( $ips[0] );
    }
    return isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
}

function leadflow_crm_dispatch_payload( $payload ) {
    $payload['page_url']  = isset( $_SERVER['HTTP_REFERER'] ) ? esc_url_raw( wp_unslash( $_SERVER['HTTP_REFERER'] ) ) : home_url();
    $payload['ipAddress'] = leadflow_crm_get_client_ip();
    $payload['site_url']  = home_url();

    wp_remote_post( leadflow_crm_get_webhook_url(), [
        'headers'  => [ 'Content-Type' => 'application/json; charset=utf-8' ],
        'body'     => wp_json_encode( $payload ),
        'blocking' => false,
        'timeout'  => 10,
    ]);
}

// 1. Elementor Pro Forms
add_action( 'elementor_pro/forms/new_record', function( $record, $handler ) {
    $raw_fields = $record->get( 'fields' );
    $fields = [];

    foreach ( $raw_fields as $id => $field ) {
        $val = isset( $field['value'] ) ? $field['value'] : '';
        if ( is_array( $val ) ) {
            $val = implode( ', ', $val );
        }
        // Prefer human-readable field title if Elementor ID is a generic hash like field_b492c1
        $label = ! empty( $field['title'] ) ? $field['title'] : $id;
        $fields[ $label ] = $val;
    }

    $form_settings = $record->get( 'form_settings' );
    $form_name = isset( $form_settings['form_name'] ) ? $form_settings['form_name'] : 'Elementor Form';
    $fields['form_name'] = $form_name;
    $fields['source']    = 'WordPress Elementor - ' . $form_name;

    leadflow_crm_dispatch_payload( $fields );
}, 10, 2 );

// 2. Contact Form 7
add_action( 'wpcf7_before_send_mail', function( $contact_form, &$abort, $submission ) {
    if ( ! $submission ) return;

    $posted_data = $submission->get_posted_data();
    $data = [];

    if ( is_array( $posted_data ) ) {
        foreach ( $posted_data as $key => $val ) {
            if ( strpos( $key, '_wpcf7' ) === 0 ) continue;
            $data[ $key ] = is_array( $val ) ? implode( ', ', $val ) : $val;
        }
    }

    $form_title = method_exists( $contact_form, 'title' ) ? $contact_form->title() : 'CF7 Form';
    $data['_wpcf7']    = 'true';
    $data['form_name'] = $form_title;
    $data['source']    = 'WordPress CF7 - ' . $form_title;

    leadflow_crm_dispatch_payload( $data );
}, 10, 3 );

// 3. WPForms
add_action( 'wpforms_process_complete', function( $fields, $entry, $form_data, $entry_id ) {
    $data = [];
    if ( is_array( $fields ) ) {
        foreach ( $fields as $field_id => $field ) {
            $label = ! empty( $field['name'] ) ? $field['name'] : 'field_' . $field_id;
            $val   = isset( $field['value'] ) ? $field['value'] : '';
            $data[ $label ] = is_array( $val ) ? implode( ', ', $val ) : $val;
        }
    }

    $form_title = isset( $form_data['settings']['form_title'] ) ? $form_data['settings']['form_title'] : 'WPForms';
    $data['form_name'] = $form_title;
    $data['source']    = 'WordPress WPForms - ' . $form_title;

    leadflow_crm_dispatch_payload( $data );
}, 10, 4 );

// 4. Fluent Forms
add_action( 'fluentform/submission_inserted', function( $insertId, $formData, $form ) {
    $data = [];
    if ( is_array( $formData ) ) {
        foreach ( $formData as $key => $val ) {
            if ( strpos( $key, '__fluent' ) === 0 || strpos( $key, '_fluent' ) === 0 ) continue;
            $data[ $key ] = is_array( $val ) ? implode( ', ', array_filter( $val, 'is_scalar' ) ) : $val;
        }
    }

    $form_title = isset( $form->title ) ? $form->title : 'Fluent Form';
    $data['form_name'] = $form_title;
    $data['source']    = 'WordPress Fluent Forms - ' . $form_title;

    leadflow_crm_dispatch_payload( $data );
}, 10, 3 );
`;

  const zip = new JSZip();
  zip.folder("leadflow-crm-integration")?.file("leadflow-crm-integration.php", phpContent);

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="leadflow-crm-integration-${targetEndpointId}.zip"`,
    },
  });
}
