const { PrismaClient } = require('@prisma/client');
const AlipaySdk = require('alipay-sdk').default;
const prisma = new PrismaClient();

async function main() {
  console.log('--- Testing Alipay without notifyUrl ---');

  const domainRecord = await prisma.tenantDomain.findUnique({
    where: { domain: '88hao.shop' },
    include: { tenant: { include: { settings: true } } }
  });

  const payConfig = JSON.parse(domainRecord.tenant.settings.paymentConfig);
  const appId = payConfig.alipay_app_id;
  const privateKey = payConfig.alipay_private_key;
  const alipayPublicKey = payConfig.alipay_public_key;

  const sdk = new AlipaySdk({
    appId,
    privateKey,
    alipayPublicKey,
    camelcase: true
  });

  const orderNo = 'KA20260521WIPMNNF9HSFY-' + Math.floor(Math.random() * 1000);
  const totalAmount = '5.00';
  const subject = '虚拟卡 1刀卡 (0刀卡)';
  const body = '订单号: ' + orderNo;

  try {
    const result = await sdk.exec('alipay.trade.precreate', {
      bizContent: {
        outTradeNo: orderNo,
        totalAmount,
        subject,
        body
      }
    });
    console.log('Success without notifyUrl! Result:', JSON.stringify(result));
  } catch (err) {
    console.log('Failed without notifyUrl! Error:', err.message);
    if (err.serverResult) {
      console.log('Server response:', JSON.stringify(err.serverResult));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
