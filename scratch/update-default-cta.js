const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.cegzgpesvkbdcescumux:qrCv%26ygWy9DNY3q@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=no-verify'
});

async function main() {
  try {
    await client.connect();
    await client.query('UPDATE "Workspace" SET "pushCtaUrl" = $1 WHERE id = $2', ['/client/[websiteId]', 'mock_workspace_id']);
    console.log("Updated mock_workspace_id CTA URL successfully!");
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
    process.exit(0);
  }
}

main();
