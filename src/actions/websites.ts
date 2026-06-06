"use server";

import prisma from "@/lib/prisma";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getWebsites() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const websites = await prisma.website.findMany({
      include: {
        users: {
          where: { role: "CLIENT" },
          select: { id: true, email: true, firstName: true, lastName: true },
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const plainWebsites = JSON.parse(JSON.stringify(websites));
    return { success: true, websites: plainWebsites };
  } catch (error) {
    console.error("Error fetching websites:", error);
    return { success: false, error: "Failed to fetch websites" };
  }
}

export async function createWebsite(data: { name: string; domain: string }) {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Ensure the mock workspace exists
    let workspace = await prisma.workspace.findUnique({
      where: { id: "mock_workspace_id" }
    });
    
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          id: "mock_workspace_id",
          name: "Default Workspace",
        }
      });
    }

    const newSite = await prisma.website.create({
      data: {
        name: data.name,
        domain: data.domain,
        workspaceId: "mock_workspace_id", 
      },
    });

    const plainSite = JSON.parse(JSON.stringify(newSite));
    revalidatePath("/websites");
    return { success: true, website: plainSite };
  } catch (error) {
    console.error("Error creating website:", error);
    return { success: false, error: "Failed to create website" };
  }
}

export async function createClientLogin(data: { 
  email: string; 
  firstName: string;
  lastName: string;
  websiteId: string; 
  websiteName: string; 
}) {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const clerk = await clerkClient();

    // Check if user already exists in Clerk
    const existingUsers = await clerk.users.getUserList({ emailAddress: [data.email] });
    
    if (existingUsers.totalCount > 0) {
      return { success: false, error: `A user with email ${data.email} already exists.` };
    }

    // Create the Clerk user with a temporary password
    const tempPassword = `Client@${Math.random().toString(36).slice(2, 10)}!`;
    
    const newClerkUser = await clerk.users.createUser({
      emailAddress: [data.email],
      firstName: data.firstName,
      lastName: data.lastName,
      password: tempPassword,
      publicMetadata: {
        role: "CLIENT",
        websiteId: data.websiteId,
        websiteName: data.websiteName,
      },
    });

    // Also save user to our database
    await prisma.user.upsert({
      where: { email: data.email },
      create: {
        id: newClerkUser.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: "CLIENT",
        websiteId: data.websiteId,
        workspaceId: "mock_workspace_id",
      },
      update: {
        websiteId: data.websiteId,
        role: "CLIENT",
      },
    });

    return { 
      success: true, 
      tempPassword,
      message: `Client account created! Share these credentials:\nEmail: ${data.email}\nPassword: ${tempPassword}` 
    };
  } catch (error: unknown) {
    console.error("Error creating client login:", error);
    const errMsg = (error as { errors?: Array<{ message: string }> })?.errors?.[0]?.message || "Failed to create client login";
    return { success: false, error: errMsg };
  }
}

export async function resetClientPassword(userId: string) {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const clerk = await clerkClient();
    const tempPassword = `Client@${Math.random().toString(36).slice(2, 10)}!`;
    
    await clerk.users.updateUser(userId, {
      password: tempPassword
    });

    return { success: true, tempPassword };
  } catch (error: unknown) {
    console.error("Error resetting password:", error);
    return { success: false, error: "Failed to reset password" };
  }
}

export async function deleteClientLogin(userId: string) {
  try {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const clerk = await clerkClient();
    
    // Delete from Clerk
    await clerk.users.deleteUser(userId);
    
    // Delete from Prisma
    await prisma.user.delete({
      where: { id: userId }
    });

    revalidatePath("/websites");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting client user:", error);
    return { success: false, error: "Failed to delete user" };
  }
}
