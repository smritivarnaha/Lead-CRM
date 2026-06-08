const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.findUnique({
    where: { id: "mock_workspace_id" }
  });
  console.log("Workspace:");
  console.log(workspace);
  
  const sites = await prisma.website.findMany();
  console.log("Sites:");
  console.log(sites);
}

main().finally(() => prisma.$disconnect());
