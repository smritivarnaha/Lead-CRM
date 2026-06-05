import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
// import prisma from "@/lib/prisma"; // Assuming you have a prisma client export

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> }
) {
  try {
    const { websiteId } = await params;
    const body = await request.json();
    const { email, password, firstName, lastName } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // 1. Create the User in Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.createUser({
      emailAddress: [email],
      password: password,
      firstName: firstName || "",
      lastName: lastName || "",
      publicMetadata: {
        role: "CLIENT",
        websiteId: websiteId, // Critical: this maps them to the specific website
      },
    });

    // 2. Create the User in Prisma (Mocking Prisma call for now, since no DB connection is active here)
    /*
    await prisma.user.create({
      data: {
        id: clerkUser.id,
        email: email,
        firstName: firstName,
        lastName: lastName,
        role: "CLIENT",
        websiteId: websiteId,
      }
    });
    */

    return NextResponse.json(
      { success: true, message: "Client account created successfully", userId: clerkUser.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[CREATE_CLIENT_ERROR]", error);
    // Return the actual clerk error message if available
    const errorMsg = error.errors?.[0]?.message || "Failed to create client account";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
