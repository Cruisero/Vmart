const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderNo = 'KA20260521WIPMNNF9HSFY';
  console.log(`Querying order: ${orderNo}`);

  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { tenant: { include: { settings: true, domains: true } } }
  });

  if (!order) {
    console.log('❌ Order not found');
    return;
  }

  console.log('Order ID:', order.id);
  console.log('Total Amount:', order.totalAmount);
  console.log('Tenant ID:', order.tenantId);
  if (order.tenant) {
    console.log('Tenant Slug:', order.tenant.shopSlug);
    console.log('Tenant Domains:', order.tenant.domains.map(d => d.domain));
    console.log('Tenant settings exists:', !!order.tenant.settings);
    if (order.tenant.settings) {
      console.log('Alipay Enabled:', order.tenant.settings.alipayEnabled);
      console.log('Payment Config:', order.tenant.settings.paymentConfig);
    }
  } else {
    console.log('❌ Order has no tenant relation');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
