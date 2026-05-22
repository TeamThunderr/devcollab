import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  // Create project if not exists
  await prisma.project.upsert({
    where: { id: "project-test-456" },
    update: {},
    create: {
      id: "project-test-456",
      name: "Test Project",
      workspaceId: "workspace-1",
    }
  });
  
  console.log("Seeded test project successfully.");
}

seed().catch(console.error).finally(() => prisma.$disconnect());
