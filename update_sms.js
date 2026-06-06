const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const WORKSPACE_ID = "mock_workspace_id";
  
  await prisma.workspace.upsert({
    where: { id: WORKSPACE_ID },
    create: {
      id: WORKSPACE_ID,
      name: "Default Workspace",
      smsAutoReplyEnabled: true,
      fast2smsApiKey: "mqUu2F46Hg5zAaZji0xcIN1OYBQEdLTfMktvVXWRse3yKn9JrlIuVHaw6tcypbjmCO98DJYKh0XPv71s",
    },
    update: {
      smsAutoReplyEnabled: true,
      fast2smsApiKey: "mqUu2F46Hg5zAaZji0xcIN1OYBQEdLTfMktvVXWRse3yKn9JrlIuVHaw6tcypbjmCO98DJYKh0XPv71s",
    }
  });

  console.log("Successfully saved Fast2SMS API key to the database!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
