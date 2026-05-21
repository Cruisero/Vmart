const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderNo = 'KA20260521WIPMNNF9HSFY';
  console.log(`Setting order status to PENDING for: ${orderNo}`);

  // 1. Reset order status to PENDING so createPayment can proceed
  await prisma.order.update({
    where: { orderNo },
    data: { status: 'PENDING' }
  });

  // 2. Load paymentController
  // We need to resolve relative to backend root
  const paymentController = require('../src/controllers/paymentController');

  // Mock req and res
  const req = {
    body: {
      orderNo,
      paymentMethod: 'alipay'
    },
    // Mock protocols/host if needed by yipay, though alipay doesn't need it
    protocol: 'https',
    get: (name) => {
      if (name === 'host') return '88hao.shop';
      return '';
    }
  };

  const res = {
    statusCode: 200,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log('--- Controller res.json output ---');
      console.log('Status Code:', this.statusCode);
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  };

  const next = (err) => {
    console.error('--- Controller next() called with error ---');
    console.error(err);
  };

  console.log('Invoking paymentController.createPayment...');
  await paymentController.createPayment(req, res, next);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
