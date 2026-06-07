const testPayload = {
  name: "Prod Test Lead",
  email: "prod-test@leadflow.app",
  phone: "+91 88888 88888",
  source: "Google Sheet Prod Test",
  message: "Testing direct webhook on production deployment"
};

const webhookUrl = 'https://leadflow-crm-pied.vercel.app/api/webhook/receive/cmq2c778l0000hkl2zk0qx2nm';

fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testPayload)
})
.then(res => res.json())
.then(data => console.log('Production Webhook Response:', data))
.catch(err => console.error('Error:', err));
