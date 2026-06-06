

async function testSMS() {
  const apiKey = "mqUu2F46Hg5zAaZji0xcIN1OYBQEdLTfMktvVXWRse3yKn9JrlIuVHaw6tcypbjmCO98DJYKh0XPv71s";
  
  // Test with 'q' route (Quick SMS)
  const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      "authorization": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      route: "q",
      message: "LeadFlow Test SMS",
      language: "english",
      flash: 0,
      numbers: "9999999999", // Using a dummy number to see if it rejects or accepts
    }),
  });

  const data = await res.json();
  console.log("Response:", data);
}

testSMS();
