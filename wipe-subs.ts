import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const result = await prisma.pushSubscription.deleteMany({})
  console.log(`Deleted ${result.count} old push subscriptions.`)
}
main()
