const crypto = require('crypto');

// 生产数据库中提取的配置
const config = {
  alipay_app_id: "2021003190607362",
  alipay_private_key: "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCja4k/2Iehm8wBbYLzqAEWdcj7RlDB33ie9l69VDcSFCQqD1pw0Ak942fTrjEyVZNWS4QvaN+5Y4BCTpWGar7YxLbCAXHI7ge7CkbetKgDI1QFt0dW2rqVuINXwS7qYMvNJCDLmNVkuGtspnYWl+rTzdQG3lFrSxQxi9i7vawRuB5n/XhwzWhX7ipBNLUkyvFhxBG2vI1RnmrVSXG11xhVg87v+R5YkGzmwh9/30kec2juhbnBJ8+I+vg41Pr0wmPjrd/tzGFtUl0uNTXcNWOuEbUTO6JLYEzLoIAZEyZkIcun7r4ckWhEKFctWk8gsgKIBYtzTCo4wo7oN9kxKzPpAgMBAAECggEAb5EM5H+pKRW6Ewd2rW33QCQtkA6TN6ifKrc8Orlx12/UuLo+nmIIzS2hRozXnWt66SEpH0zT4Dcj6yDHSDs8C7VQp+ZgjjKjKHh9pbFkOrA1vqk/lPZDB9AuKw0CQJTQzj5p/VVb6iVVgZmraQVSFkOhCwdgQoXBRYoZ7yIwhO88OXgjSZkTklbWBg91MrUi9hvWDQw8zqOG4YYW6mygOX2ov82wIqGL7aJMgzi9/XvkDIfUBy6RPsAZO+kXu3OgaXIbEOw6ZzCcLJenR9aIjf7vVilFf9KMkYOqeSku4Ulv+bXpw++41cNqz2rIL5GmIsHW6GZOcZ83AANPakH9AQKBgQDayDQiemJxc0PHv5Rj8q1UXM4zaYLTpQu3oKQhUY4rb9C7Fqn/cJr/94TZ6ZD4uUY3wwqXi6FeWQZ787WxgA1IPEQoHPoIs2LVkTiMt1xJP9G2K1heRG3MrWGJ9kk4qE+sg8CpeE31oVQ/bZirsgQoC5JkB9LdYxwpEvBDLeFDGQKBgQC/OFvr1o6vGct9Cdb/d1W18ogxrFGBZudfVMAWy1LgnirmXU5XyhIE9AKLJI0tVNYHzLI1G5dOp7POuDTcGYqqUAFiwEo+KHkVN9/KLxRa16tchJQdH/Nm+ga6jpCHRFO+v0LsCpfZjKNoyU1xzOS554xyHvHomjQb76elIczhUQKBgBtZxfK9fAsUztds4t8v2m1egMS6nwlYa8OUCJDFwlE51E1fQvdVG3t+dRRM97uwZc/YyT0yzoSd+oqKaB99k6uBJUAihzuJOYTbd8dXsOjTWqM8ffqi8VsSHcyChprXp8Y4XmCRUqWvennHeLuWMKDU+YMZ20mj90RHQtQTK0MZAoGBAJdLM0eE6j3Wje8vsuFL/Q/JhkKvEYnt7lC6EIW4d6lq24yK9Kp3IgyzN7P5xo3AWtuu9K0aWHwOKjD8BC7FMraQOJh2hgdqJGtKWxFwcI1zqIy6BSqKFh464soGdInh4NTCJWP2+bBSGxSUeWb581q3vqKoo0Qjhek4lA8OkDkRAoGAbWkZayV4ieVeDFTe9IgLZeQBaFjWl0M6DF4efIf5OGuf7z9qJnMriotOF7K0T5ZnnkDkjyEU4DE2PorzYv9P7ueUU0w1UleTS8H2mXubOGJX+hb+AwCaBHPUFGPxI3XgNiH8gf03WrIN14dKsDJtZL0Ts4uP/AxLIaaaEzOD+SA=",
  alipay_public_key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmi1q27OhxyLF9/Ya0JL9ETfqZ0Qt4mBidYi1Jfdka3mgUchrmij+JfwbYye/fKOAsE3VPyD3ziTAR+BC27V8fe5k+5iGmZ+UMVOZkRS2KSw4i33wNfeY3PAZJQkI7pQcli4OqjVODZh595BYb8NsIzmgn0C6O/qvF+JcS/Al/GbKKi0qVkDbXu6K/lrIIOrbOEIXmaaFGERXZYXjxyFrAniPYaS/QKn5xUsiiEikujomXJU9iV3O+bt97lg3u+DDhOg820BN3lFQsWlzxvfXgyq5wzsr9Mc2S50Gad/hiGug8ah5GT7V1Px1hucydaTOd6Yn3yfVuD97KfyWbE1/vwIDAQAB"
};

// 格式化为标准的 PEM 格式
function formatPrivateKey(rawKey) {
  if (rawKey.includes('BEGIN')) return rawKey;
  // 支持带 RSA 或普通 PRIVATE KEY，这里我们先按标准 PKCS8 组装
  return `-----BEGIN PRIVATE KEY-----\n${rawKey.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
}

function formatPublicKey(rawKey) {
  if (rawKey.includes('BEGIN')) return rawKey;
  return `-----BEGIN PUBLIC KEY-----\n${rawKey.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
}

console.log('=== 支付宝密钥加密对自查分析 ===');
console.log('AppID:', config.alipay_app_id);

try {
  const pemPrivKey = formatPrivateKey(config.alipay_private_key);
  const pemPubKey = formatPublicKey(config.alipay_public_key);

  // 载入私钥
  const privateKeyObj = crypto.createPrivateKey({
    key: pemPrivKey,
    format: 'pem'
  });
  console.log('\n✔ 私钥载入成功！私钥格式完全合法且为标准 PKCS8 格式。');

  // 从私钥中推导出匹配的【商户应用公钥 (Application Public Key)】
  const derivedPublicKeyObj = crypto.createPublicKey(privateKeyObj);
  const derivedPubKeyPem = derivedPublicKeyObj.export({ type: 'spki', format: 'pem' });
  const cleanDerivedPubKey = derivedPubKeyPem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '');

  // 载入数据库里填写的公钥
  const dbPublicKeyObj = crypto.createPublicKey({
    key: pemPubKey,
    format: 'pem'
  });
  console.log('✔ 数据库内填写的公钥载入成功！');

  const cleanDbPubKey = config.alipay_public_key.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '');

  console.log('\n--- 密钥匹配审计 ---');
  console.log('数据库中保存的公钥（缩略）:', cleanDbPubKey.substring(0, 30) + '...' + cleanDbPubKey.substring(cleanDbPubKey.length - 30));
  console.log('私钥推导出的对应公钥（缩略）:', cleanDerivedPubKey.substring(0, 30) + '...' + cleanDerivedPubKey.substring(cleanDerivedPubKey.length - 30));

  if (cleanDbPubKey === cleanDerivedPubKey) {
    console.log('\n🚨 [严重警报 - 致命配置错误] 🚨');
    console.log('配置说明: 数据库中填写的【支付宝公钥 (ALIPAY_PUBLIC_KEY)】竟然和由【私钥推导出来的公钥】完全一致！！！');
    console.log('这意味着：商户在后台的“支付宝公钥”输入框中，填入了自己电脑生成的【应用公钥 (Application Public Key)】，而不是支付宝平台生成的【支付宝公钥 (Alipay Public Key)】！');
    console.log('\n原因详解:');
    console.log('1. 支付宝扫码支付采用非对称加密。商家本地用【应用私钥】签名，支付宝云端用商家上传的【应用公钥】验签；');
    console.log('2. 同样地，支付宝接口返回数据时，支付宝用【支付宝私钥】签名，商家本地需要用【支付宝公钥】验签；');
    console.log('3. 支付宝SDK在初始化时，必须使用【支付宝公钥】来进行内部签名的正确构建与接口鉴权；');
    console.log('4. 如果您在“支付宝公钥”里填入了自己生成的“应用公钥”，会导致支付宝云端判定您的请求签名【验签失败 (isv.invalid-signature)】，这就是报错操作失败、没有二维码的核心原因！');
  } else {
    console.log('\n✔ 数据库中的公钥与私钥推导出的应用公钥不相同，这表明数据库中配置的确实是第三方（例如支付宝）的公钥。');
    console.log('请核对该公钥是否是支付宝为您该 AppID 生成的【支付宝公钥】。');
  }

} catch (err) {
  console.error('\n❌ 密钥加载或校验过程出错:', err.message);
}
