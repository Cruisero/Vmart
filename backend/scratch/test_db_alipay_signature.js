const { PrismaClient } = require('@prisma/client');
const AlipaySdk = require('alipay-sdk').default;
const prisma = new PrismaClient();

async function main() {
  console.log('--- DB-based Alipay Signature Test ---');

  // 1. Query the domain record and tenant settings
  const domainRecord = await prisma.tenantDomain.findUnique({
    where: { domain: '88hao.shop' },
    include: { tenant: { include: { settings: true } } }
  });

  if (!domainRecord) {
    console.log('❌ Domain 88hao.shop not found');
    return;
  }

  const tenant = domainRecord.tenant;
  console.log('Tenant found:', tenant.id, 'Slug:', tenant.shopSlug);
  
  if (!tenant.settings) {
    console.log('❌ Tenant has no settings');
    return;
  }

  const paymentConfigStr = tenant.settings.paymentConfig;
  if (!paymentConfigStr) {
    console.log('❌ Tenant has no paymentConfig');
    return;
  }

  console.log('Raw paymentConfig:', paymentConfigStr);
  const payConfig = JSON.parse(paymentConfigStr);
  console.log('Parsed config keys:', Object.keys(payConfig));

  // paymentController.js maps these keys:
  // appId: tenantPayConfig.alipay_app_id
  // privateKey: tenantPayConfig.alipay_private_key
  // alipayPublicKey: tenantPayConfig.alipay_public_key
  
  const appId = payConfig.alipay_app_id;
  const privateKey = payConfig.alipay_private_key;
  const alipayPublicKey = payConfig.alipay_public_key;

  console.log('Mapped App ID:', appId);
  console.log('Mapped Private Key Length:', privateKey ? privateKey.length : 'undefined');
  console.log('Mapped Public Key Length:', alipayPublicKey ? alipayPublicKey.length : 'undefined');

  if (!appId || !privateKey || !alipayPublicKey) {
    console.log('❌ One or more mapped keys are missing/undefined!');
    return;
  }

  // Let's see if there are any hidden characters/newline/carriage return differences
  console.log('Private key starts with:', JSON.stringify(privateKey.substring(0, 30)));
  console.log('Private key ends with:', JSON.stringify(privateKey.substring(privateKey.length - 30)));
  
  try {
    const sdk = new AlipaySdk({
      appId,
      privateKey,
      alipayPublicKey,
      camelcase: true
    });

    console.log('Calling alipay.trade.precreate with DB keys...');
    const result = await sdk.exec('alipay.trade.precreate', {
      notifyUrl: 'https://88hao.shop/api/payment/alipay/notify',
      bizContent: {
        outTradeNo: 'TEST_DB_' + Date.now(),
        totalAmount: '0.01',
        subject: 'Database signature test'
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
