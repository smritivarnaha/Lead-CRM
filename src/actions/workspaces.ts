"use server";

import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getWorkspaces() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const workspaces = await prisma.workspace.findMany({
      include: {
        _count: {
          select: {
            websites: true,
            users: true,
            leads: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return { success: true, workspaces: JSON.parse(JSON.stringify(workspaces)) };
  } catch (error) {
    console.error("[GET_WORKSPACES_ERROR]", error);
    return { success: false, error: "Failed to fetch workspaces" };
  }
}

export async function createWorkspace(name: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    if (!name || name.trim() === "") {
      return { success: false, error: "Workspace name is required" };
    }

    const newWorkspace = await prisma.workspace.create({
      data: {
        name: name.trim()
      }
    });

    revalidatePath("/workspaces");
    return { success: true, workspace: JSON.parse(JSON.stringify(newWorkspace)) };
  } catch (error) {
    console.error("[CREATE_WORKSPACE_ERROR]", error);
    return { success: false, error: "Failed to create workspace" };
  }
}

export async function deleteWorkspace(id: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Simply delete related models to emulate cascade delete
    await prisma.lead.deleteMany({ where: { workspaceId: id } });
    await prisma.website.deleteMany({ where: { workspaceId: id } });
    await prisma.user.deleteMany({ where: { workspaceId: id } });
    await prisma.emailCampaign.deleteMany({ where: { workspaceId: id } });
    await prisma.emailTemplate.deleteMany({ where: { workspaceId: id } });
    await prisma.emailAutomation.deleteMany({ where: { workspaceId: id } });
    await prisma.emailQueue.deleteMany({ where: { workspaceId: id } });
    await prisma.smsTemplate.deleteMany({ where: { workspaceId: id } });

    await prisma.workspace.delete({
      where: { id }
    });

    revalidatePath("/workspaces");
    return { success: true };
  } catch (error) {
    console.error("[DELETE_WORKSPACE_ERROR]", error);
    return { success: false, error: "Failed to delete workspace" };
  }
}
