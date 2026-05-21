const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- 比较数据库中 88hao.shop 的支付配置与 haodongxi 系统的 .env 配置 ---');

  // 1. 读取 haodongxi .env
  const dotenvPath = '/app/backups/haodongxi.env';
  if (!fs.existsSync(dotenvPath)) {
    console.log(`❌ 未找到 haodongxi 的 env 文件: ${dotenvPath}`);
    return;
  }
  const dotenvContent = fs.readFileSync(dotenvPath, 'utf8');
  const getEnvVal = (key) => {
    const match = dotenvContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : null;
  };

  const envAppId = getEnvVal('ALIPAY_APP_ID');
  const envPubKey = getEnvVal('ALIPAY_PUBLIC_KEY');
  const envPrivKey = getEnvVal('ALIPAY_PRIVATE_KEY');

  // 2. 读取 Vmart 88hao.shop tenantSetting
  const domainRecord = await prisma.tenantDomain.findUnique({
    where: { domain: '88hao.shop' },
    include: { tenant: { include: { settings: true } } }
  });

  if (!domainRecord) {
    console.log('❌ 数据库中未找到 88hao.shop 域名绑定的租户');
    return;
  }

  const paymentConfigStr = domainRecord.tenant.settings.paymentConfig;
  if (!paymentConfigStr) {
    console.log('❌ 租户没有支付配置 paymentConfig');
    return;
  }

  const payConfig = JSON.parse(paymentConfigStr);
  const dbAppId = payConfig.alipay_app_id || payConfig.alipayAppId;
  const dbPubKey = payConfig.alipay_public_key || payConfig.alipayPublicKey;
  const dbPrivKey = payConfig.alipay_private_key || payConfig.alipayPrivateKey;

  console.log('\n--- APP ID 对比 ---');
  console.log('haodongxi .env:', envAppId);
  console.log('Vmart DB:', dbAppId);
  console.log('是否一致:', envAppId === dbAppId);

  console.log('\n--- 公钥 (Alipay Public Key) 对比 ---');
  console.log('haodongxi .env (长度):', envPubKey ? envPubKey.length : 'null');
  console.log('Vmart DB (长度):', dbPubKey ? dbPubKey.length : 'null');
  console.log('是否完全一致:', envPubKey === dbPubKey);
  if (envPubKey !== dbPubKey) {
    console.log('不一致差异分析:');
    for (let i = 0; i < Math.max(envPubKey.length, dbPubKey.length); i++) {
      if (envPubKey[i] !== dbPubKey[i]) {
        console.log(`位置 ${i}: haodongxi='${envPubKey[i] || ""}', Vmart DB='${dbPubKey[i] || ""}'`);
        break;
      }
    }
  }

  console.log('\n--- 私钥 (Private Key) 对比 ---');
  console.log('haodongxi .env (长度):', envPrivKey ? envPrivKey.length : 'null');
  console.log('Vmart DB (长度):', dbPrivKey ? dbPrivKey.length : 'null');
  console.log('是否完全一致:', envPrivKey === dbPrivKey);
  if (envPrivKey !== dbPrivKey) {
    console.log('不一致差异分析:');
    for (let i = 0; i < Math.max(envPrivKey.length, dbPrivKey.length); i++) {
      if (envPrivKey[i] !== dbPrivKey[i]) {
        console.log(`位置 ${i}: haodongxi='${envPrivKey[i] || ""}', Vmart DB='${dbPrivKey[i] || ""}'`);
        break;
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
