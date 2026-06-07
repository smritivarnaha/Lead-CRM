const webpush = require('web-push');
const { Client } = require('pg');

const VAPID_PUBLIC_KEY = "BI6b4YfmBp2N9v2GyCTqJL_fZ0R6kO2dGwkWNc5Ea4ectdjwMbytUo9CXXVOMMqn-eGN_2tJVjkbE_Hy7bo3Lx8";
const VAPID_PRIVATE_KEY = "qKBQCI2Dwrz0WMYDVgVjUWb15rZSCqELjtc--_nlDTs";
const VAPID_SUBJECT = "mailto:admin@leadflow.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const client = new Client({
  connectionString: 'postgresql://postgres.cegzgpesvkbdcescumux:qrCv%26ygWy9DNY3q@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=no-verify'
});

async function main() {
  try {
    await client.connect();
    const res = await client.query('SELECT * FROM "PushSubscription"');
    console.log(`Found ${res.rows.length} subscriptions.`);
    
    for (const sub of res.rows) {
      console.log(`Sending to subscription ID: ${sub.id}, Endpoint: ${sub.endpoint}`);
      try {
        const result = await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: "Test Push from Script",
            body: "This is a direct test of the push notification system.",
            url: "/settings"
          })
        );
        console.log(`Success! Status code: ${result.statusCode}`);
      } catch (err) {
        console.error(`Failed! Error status code: ${err.statusCode}, message: ${err.message || err}`);
      }
    }
  } catch (e) {
    console.error("Database connection or query failed:", e);
  } finally {
    await client.end();
    process.exit(0);
  }
}

main();
