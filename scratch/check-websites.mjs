import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env manually
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const connectionString = process.env.DATABASE_URL;
console.log('Connecting to DB...');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

try {
  const websites = await prisma.website.findMany();
  console.log('\n=== WEBSITES IN DB ===');
  if (websites.length === 0) {
    console.log('❌ No websites found - database was reset');
    console.log('\nCreating "Rankved" website...');
    
    // Ensure workspace exists
    await prisma.workspace.upsert({
      where: { id: 'mock_workspace_id' },
      create: { id: 'mock_workspace_id', name: 'Default Workspace' },
      update: {},
    });
    
    const newSite = await prisma.website.create({
      data: {
        name: 'Rankved',
        domain: 'rankved.com',
        workspaceId: 'mock_workspace_id',
      }
    });
    
    console.log('\n✅ Website created!');
    console.log(`Website ID: ${newSite.id}`);
    console.log(`\n🎯 YOUR WEBHOOK URL:`);
    console.log(`https://lead-crmsss.vercel.app/api/webhook/receive/${newSite.id}`);
  } else {
    websites.forEach(w => {
      console.log(`\nName: ${w.name}`);
      console.log(`ID: ${w.id}`);
      console.log(`\n🎯 YOUR WEBHOOK URL:`);
      console.log(`https://lead-crmsss.vercel.app/api/webhook/receive/${w.id}`);
    });
  }
} catch(e) {
  console.error('Error:', e.message);
} finally {
  await prisma.$disconnect();
}
