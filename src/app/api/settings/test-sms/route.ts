import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey, phone } = await req.json();

    if (!apiKey || !phone) {
      return NextResponse.json({ success: false, error: "Missing API Key or Phone Number" }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "").slice(-10);

    if (cleanPhone.length !== 10) {
      return NextResponse.json({ success: false, error: "Invalid Indian phone number length. Must be 10 digits." }, { status: 400 });
    }

    const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        "authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        route: "q",
        message: "This is a test message from LeadFlow CRM!",
        language: "english",
        flash: 0,
        numbers: cleanPhone,
      }),
    });

    const data = await res.json();
    
    if (data.return === false || data.status_code === 999) {
       return NextResponse.json({ success: false, error: data.message || "Fast2SMS Error" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Test SMS Sent Successfully!", data }, { status: 200 });

  } catch (error) {
    console.error("[TEST SMS ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
