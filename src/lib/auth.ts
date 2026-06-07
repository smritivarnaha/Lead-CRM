import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  websiteId: string | null;
  workspaceId: string | null;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    // 1. Query the local database for the user (extremely fast, ~2-5ms)
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

    // 2. Fallback: User not found locally (e.g. first login). Fetch from Clerk API and upsert.
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return null;

    const role = (clerkUser.publicMetadata?.role as string) || "SUPER_ADMIN";
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

    const newUser = await prisma.user.upsert({
      where: { email },
      create: {
        id: userId,
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        role,
        websiteId,
        workspaceId: workspace.id,
      },
      update: {
        id: userId,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        role,
        websiteId,
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
}
