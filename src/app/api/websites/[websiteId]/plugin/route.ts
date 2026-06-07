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

  const { origin } = new URL(request.url);
  
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
    $raw_fields = $record->get( 'fields' );
    $fields = [];
    foreach ( $raw_fields as $id => $field ) {
        $fields[ $id ] = $field['value'];
    }
    
    $form_settings = $record->get( 'form_settings' );
    $form_name = isset( $form_settings['form_name'] ) ? $form_settings['form_name'] : 'Form';
    $fields['source'] = 'WordPress Elementor - ' . $form_name;
    
    $fields['page_url'] = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
    $fields['ipAddress'] = isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0] : (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '');
    $fields['site_url'] = home_url();
    
    $webhook_url = '${origin}/api/webhook/receive/auto';
    
    wp_remote_post( $webhook_url, [
        'body' => $fields,
        'blocking' => false
    ]);
}, 10, 2 );

// Support for Contact Form 7
add_action( 'wpcf7_before_send_mail', function( $contact_form, &$abort, $submission ) {
    if ( $submission ) {
        $data = $submission->get_posted_data();
        $data['page_url'] = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
        $data['ipAddress'] = isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0] : (isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '');
        $data['_wpcf7'] = true;
        $data['site_url'] = home_url();
        
        $form_title = $contact_form->title();
        $data['source'] = 'WordPress CF7 - ' . $form_title;
        
        $webhook_url = '${origin}/api/webhook/receive/auto';
        wp_remote_post( $webhook_url, [
            'body' => $data,
            'blocking' => false
        ]);
    }
}, 10, 3 );
`;

  const zip = new JSZip();
  zip.folder("leadflow-crm-integration")?.file("leadflow-crm-integration.php", phpContent);
  
  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
  
  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="leadflow-crm-integration.zip"`,
    },
  });
}
