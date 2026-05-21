const AlipaySdk = require('alipay-sdk').default;
const fs = require('fs');

async function testSignature() {
  console.log('--- 测试支付宝签名与接口调用 ---');

  // 1. 读取备份的 haodongxi env
  const dotenvPath = '/app/backups/haodongxi.env';
  if (!fs.existsSync(dotenvPath)) {
    console.log(`❌ 找不到 env 文件: ${dotenvPath}`);
    return;
  }
  const dotenvContent = fs.readFileSync(dotenvPath, 'utf8');
  const getEnvVal = (key) => {
    const match = dotenvContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : null;
  };

  const appId = getEnvVal('ALIPAY_APP_ID');
  const alipayPublicKey = getEnvVal('ALIPAY_PUBLIC_KEY');
  const privateKey = getEnvVal('ALIPAY_PRIVATE_KEY');

  console.log('AppID:', appId);
  console.log('PrivateKey 长度:', privateKey.length);
  console.log('PublicKey 长度:', alipayPublicKey.length);

  // 测试一：直接使用未格式化的私钥初始化 SDK 并调用接口
  try {
    console.log('\n--- 测试一：直接传入数据库中的单行密钥 ---');
    const sdk1 = new AlipaySdk({
      appId,
      privateKey,
      alipayPublicKey,
      camelcase: true
    });

    const result1 = await sdk1.exec('alipay.trade.precreate', {
      bizContent: {
        outTradeNo: 'TEST_' + Date.now(),
        totalAmount: '0.01',
        subject: '签名测试商品'
      }
    });
    console.log('测试一结果:', JSON.stringify(result1));
  } catch (err) {
    console.log('测试一报错:', err.message);
    if (err.serverResult) {
      console.log('测试一服务器返回值:', JSON.stringify(err.serverResult));
    }
  }

  // 测试二：格式化私钥为 PEM 格式 (PKCS8)
  try {
    console.log('\n--- 测试二：格式化私钥为 PEM 格式 (PKCS8) ---');
    const pemPrivateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
    const pemPublicKey = `-----BEGIN PUBLIC KEY-----\n${alipayPublicKey.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;

    const sdk2 = new AlipaySdk({
      appId,
      privateKey: pemPrivateKey,
      alipayPublicKey: pemPublicKey,
      camelcase: true
    });

    const result2 = await sdk2.exec('alipay.trade.precreate', {
      bizContent: {
        outTradeNo: 'TEST_PEM_' + Date.now(),
        totalAmount: '0.01',
        subject: '签名测试商品'
      }
    });
    console.log('测试二结果:', JSON.stringify(result2));
  } catch (err) {
    console.log('测试二报错:', err.message);
    if (err.serverResult) {
      console.log('测试二服务器返回值:', JSON.stringify(err.serverResult));
    }
  }
}

testSignature().catch(console.error);
