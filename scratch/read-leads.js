const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.cegzgpesvkbdcescumux:qrCv%26ygWy9DNY3q@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=no-verify'
});

async function main() {
  try {
    await client.connect();
    const res = await client.query('SELECT id, "fullName", email, phone, source, "createdAt" FROM "Lead" ORDER BY "createdAt" DESC LIMIT 10');
    console.log("Recent Leads:", res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
    process.exit(0);
  }
}

main();
