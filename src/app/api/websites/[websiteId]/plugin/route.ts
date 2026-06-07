import { NextResponse } from "next/server";
import JSZip from "jszip";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  const { websiteId } = await params;
  
  const phpContent = `<?php
/**
 * Plugin Name: LeadFlow CRM Integration
 * Description: Automatically sends all Elementor form submissions to LeadFlow CRM.
 * Version: 1.0
 * Author: LeadFlow
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Support for Elementor Pro Forms
add_action( 'elementor_pro/forms/new_record', function( $record, $handler ) {
    $website_id = '${websiteId}';
    
    $raw_fields = $record->get( 'fields' );
    $fields = [];
    foreach ( $raw_fields as $id => $field ) {
        $fields[ $id ] = $field['value'];
    }
    
    $fields['sourceUrl'] = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
    
    $webhook_url = 'https://lead-crmsss.vercel.app/api/webhook/receive/' . $website_id;
    
    wp_remote_post( $webhook_url, [
        'body' => $fields, // WP handles urlencoding automatically
        'blocking' => false
    ]);
}, 10, 2 );

// Support for Contact Form 7
add_action( 'wpcf7_before_send_mail', function( $contact_form, &$abort, $submission ) {
    $website_id = '${websiteId}';
    if ( $submission ) {
        $data = $submission->get_posted_data();
        $data['sourceUrl'] = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
        $data['_wpcf7'] = true;
        
        $webhook_url = 'https://lead-crmsss.vercel.app/api/webhook/receive/' . $website_id;
        wp_remote_post( $webhook_url, [
            'body' => $data,
            'blocking' => false
        ]);
    }
}, 10, 3 );
`;

  const zip = new JSZip();
  zip.folder("leadflow-crm-integration")?.file("leadflow-crm-integration.php", phpContent);
  
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  
  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="leadflow-crm-${websiteId}.zip"`,
    },
  });
}
