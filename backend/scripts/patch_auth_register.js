const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/controllers/authController.js');
let code = fs.readFileSync(targetFile, 'utf8');

const regex = /const user = await prisma\.user\.create\(\{\s*data: \{([\s\S]*?)\}\s*\}\)/;

code = code.replace(regex, (match, dataStr) => {
    return `const role = req.body.isSaas ? 'TENANT_ADMIN' : 'USER'
        
        const user = await prisma.user.create({
            data: {${dataStr.replace(/role: 'USER'/, 'role')}
            }
        })
        
        // 如果是 SaaS 注册，自动为其开通 Tenant 记录实现极速入驻
        if (req.body.isSaas) {
            const tenant = await prisma.tenant.create({
                data: {
                    userId: user.id,
                    shopName: '数字商城',
                    shopSlug: 'shop-' + Math.random().toString(36).substring(2, 8),
                    status: 'ACTIVE'
                }
            })
            await prisma.tenantSetting.create({
                data: { tenantId: tenant.id }
            })
        }`;
});

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Patched register successfully');
