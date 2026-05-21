const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const domain = '88hao.shop';
  const domainRecord = await prisma.tenantDomain.findUnique({
    where: { domain }
  });
  console.log('Domain Record for 88hao.shop:', domainRecord);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
