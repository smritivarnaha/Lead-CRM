const webhookUrl = 'http://localhost:3000/api/webhook/receive/site_abc123';

const testPayload = {
  name: "John Doe",
  email: "john@example.com",
  phone: "555-0199",
  source: "Google Ads LP",
  message: "I need an appointment as soon as possible."
};

fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testPayload)
})
.then(res => res.json())
.then(data => console.log('Webhook Response:', data))
.catch(err => console.error('Error:', err));
