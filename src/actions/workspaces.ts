"use server";

import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getWorkspaces() {
  try {
    const user = await currentUser();
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
    const user = await currentUser();
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
