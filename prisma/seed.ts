/**
 * Prisma Seed Script
 *
 * Seeds the database with the default workspace and Rankved website.
 * Uses fixed IDs so the webhook URL NEVER changes, even after a DB reset.
 *
 * Run manually: npx prisma db seed
 * Auto-runs: on every Vercel deploy (via build script)
 */

// Load .env automatically (works locally; Vercel injects env vars natively)
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });
config({ path: resolve(__dirname, "../.env.local"), override: false });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

// Use DIRECT_URL for seed operations (bypasses PgBouncer)
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL environment variable is not set.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

// ─── FIXED IDs — DO NOT CHANGE ─────────────────────────────────────────────
// These are stable identifiers. The webhook URL depends on WEBSITE_ID.
const WORKSPACE_ID = "mock_workspace_id";
const WEBSITE_ID = "cmq2c778l0000hkl2zk0qx2nm";
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Upsert default workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: WORKSPACE_ID },
    create: {
      id: WORKSPACE_ID,
      name: "Default Workspace",
    },
    update: {
      name: "Default Workspace",
    },
  });
  console.log(`✅ Workspace: ${workspace.name} (${workspace.id})`);

  // 2. Upsert Rankved website with fixed ID
  const website = await prisma.website.upsert({
    where: { id: WEBSITE_ID },
    create: {
      id: WEBSITE_ID,
      name: "Rankved",
      domain: "rankved.com",
      workspaceId: WORKSPACE_ID,
    },
    update: {
      name: "Rankved",
      domain: "rankved.com",
      isActive: true,
    },
  });

  console.log(`✅ Website: ${website.name} (${website.id})`);
  console.log("");
  console.log("🎯 Your permanent Webhook URL:");
  console.log(
    `   https://lead-crmsss.vercel.app/api/webhook/receive/${website.id}`
  );
  console.log("");
  console.log("✨ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
