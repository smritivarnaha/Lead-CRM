import prisma from "./src/lib/prisma";

async function main() {
  await prisma.workspace.update({
    where: { id: "mock_workspace_id" },
    data: {
      smsAutoReplyEnabled: true,
      fast2smsApiKey: "mqUu2F46Hg5zAaZji0xcIN1OYBQEdLTfMktvVXWRse3yKn9JrlIuVHaw6tcypbjmCO98DJYKh0XPv71s",
    }
  });
  console.log("SUCCESS");
}

main().catch(console.error).finally(() => prisma.$disconnect());
