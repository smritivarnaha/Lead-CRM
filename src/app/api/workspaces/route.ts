import { NextResponse } from "next/server";

// Mock database for now since Postgres is not connected
const mockWorkspaces = [
  { id: "ws_1", name: "RankVed Agency", createdAt: new Date() },
  { id: "ws_2", name: "Dr Anurag Clinic", createdAt: new Date() },
];

export async function GET() {
  try {
    // In the future: const workspaces = await prisma.workspace.findMany();
    return NextResponse.json({ workspaces: mockWorkspaces }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }

    const newWorkspace = {
      id: `ws_${Math.random().toString(36).substr(2, 9)}`,
      name: body.name,
      createdAt: new Date(),
    };

    // In the future: await prisma.workspace.create({ data: { name: body.name } });
    mockWorkspaces.push(newWorkspace);

    return NextResponse.json({ workspace: newWorkspace }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}
