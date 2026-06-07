const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.cegzgpesvkbdcescumux:qrCv%26ygWy9DNY3q@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=no-verify'
});

async function fix() {
  try {
    await client.connect();
    await client.query('UPDATE "Workspace" SET "pushIconUrl" = null, "pushBadgeUrl" = null WHERE id = $1', ['mock_workspace_id']);
    console.log("DB reset successful!");
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

fix();
