import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { cache } from "react";

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  websiteId: string | null;
  workspaceId: string | null;
}

export const getAuthenticatedUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    // 1. Query the local database for the user by primary key (instant, ~2ms)
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        websiteId: true,
        workspaceId: true,
      },
    });

    if (dbUser) {
      return dbUser;
    }

    // 2. Fallback: User not found by id. Fetch from Clerk API and upsert.
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return null;

    // Check if user already exists by email
    const existingByEmail = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        websiteId: true,
        workspaceId: true,
      },
    });

    if (existingByEmail) {
      // If user exists with different ID, update ID to match Clerk userId
      if (existingByEmail.id !== userId) {
        try {
          await prisma.$executeRawUnsafe(
            'UPDATE "User" SET "id" = $1 WHERE "email" = $2',
            userId,
            email
          );
          existingByEmail.id = userId;
        } catch (e) {
          // If update fails due to FK, continue with existing user record
        }
      }
      return existingByEmail;
    }

    const adminEmails = ["rankved.business@gmail.com", "sarthakj9u@gmail.com"];
    let role = clerkUser.publicMetadata?.role as string;
    
    if (!role) {
      if (adminEmails.includes(email.toLowerCase())) {
        role = "SUPER_ADMIN";
      } else {
        role = "STAFF";
      }
    }
    const websiteId = clerkUser.publicMetadata?.websiteId as string | undefined;

    // Ensure mock workspace exists for new user setup
    let workspace = await prisma.workspace.findUnique({
      where: { id: "mock_workspace_id" },
    });

    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          id: "mock_workspace_id",
          name: "Default Workspace",
        },
      });
    }

    const newUser = await prisma.user.create({
      data: {
        id: userId,
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        role,
        websiteId,
        workspaceId: workspace.id,
      },
    });

    return {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      websiteId: newUser.websiteId,
      workspaceId: newUser.workspaceId,
    };
  } catch (error) {
    console.error("Error in getAuthenticatedUser:", error);
    return null;
  }
});
