import prisma from './src/lib/prisma';

async function fix() {
  await prisma.workspace.update({
    where: { id: 'mock_workspace_id' },
    data: {
      pushIconUrl: null,
      pushBadgeUrl: null
    }
  });
  console.log('Database reset!');
}
fix();
