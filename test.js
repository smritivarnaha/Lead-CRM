const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const w = await prisma.workspace.findUnique({ where: { id: 'mock_workspace_id' } });
  console.log('API KEY IN DB:', w.emailApiKey);
  console.log('FROM ADDRESS:', w.fromEmailAddress);
}
main().finally(() => prisma.$disconnect());
