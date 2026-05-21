const { PrismaClient } = require('@prisma/client');
const AlipaySdk = require('alipay-sdk').default;
const prisma = new PrismaClient();

async function main() {
  console.log('--- DB-based Exact Params Alipay Test ---');

  // Query tenant config
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

  // Exact parameters from the failed request:
  // out_trade_no: "KA20260521WIPMNNF9HSFY" (let's append a random suffix to make it unique, e.g. -T1)
  // total_amount: "5.00"
  // subject: "虚拟卡 1刀卡 (0刀卡)"
  // body: "订单号: KA20260521WIPMNNF9HSFY-T1"
  // notify_url: "https://88hao.shop/api/payment/alipay/notify"
  
  const orderNo = 'KA20260521WIPMNNF9HSFY-' + Math.floor(Math.random() * 1000);
  const totalAmount = '5.00';
  const subject = '虚拟卡 1刀卡 (0刀卡)';
  const body = '订单号: ' + orderNo;
  const notifyUrl = 'https://88hao.shop/api/payment/alipay/notify';

  try {
    console.log('Calling alipay.trade.precreate with EXACT parameters...');
    const result = await sdk.exec('alipay.trade.precreate', {
      notifyUrl,
      bizContent: {
        outTradeNo: orderNo,
        totalAmount,
        subject,
        body
      }
    });

    console.log('Success! Result:', JSON.stringify(result));
  } catch (err) {
    console.log('Failed! Error:', err.message);
    if (err.serverResult) {
      console.log('Server response:', JSON.stringify(err.serverResult));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
