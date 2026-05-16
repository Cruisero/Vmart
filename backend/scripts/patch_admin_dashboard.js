const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../../frontend/src/pages/Admin/Dashboard/index.jsx');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Add TenantSettings import
if (!code.includes('TenantSettings')) {
    code = code.replace(/import Settings from '\.\.\/Settings'/, "import Settings from '../Settings'\nimport TenantSettings from '../TenantSettings'");
}

// 2. Modify menuItems
code = code.replace(/const menuItems = \[([\s\S]*?)\]/, (match) => {
    return `const menuItems = [
    { path: '/admin', icon: FiHome, label: '仪表盘', exact: true },
    { path: '/admin/products', icon: FiPackage, label: '商品管理' },
    { path: '/admin/orders', icon: FiShoppingBag, label: '订单管理' },
    { path: '/admin/tickets', icon: FiMessageCircle, label: '工单管理' },
    { path: '/admin/cards', icon: FiCreditCard, label: '卡密管理' },
    { path: '/admin/users', icon: FiUsers, label: '用户管理', superOnly: true },
    { path: '/admin/agents', icon: FiShare2, label: '代理管理', superOnly: true },
    { path: '/admin/tenants', icon: FiUsers, label: '租户商城', superOnly: true },
    { path: '/admin/settings', icon: FiSettings, label: '系统设置', superOnly: true },
    { path: '/admin/settings', icon: FiSettings, label: '店铺设置', tenantOnly: true },
]`;
});

// 3. Update sidebar rendering
code = code.replace(/\{menuItems\.filter\(item => !item\.superOnly \|\| user\?\.role === 'SUPER_ADMIN'\)\.map\(\(item\) => \(/g, 
    `{menuItems.filter(item => {
                        const isSuperAdmin = user?.role === 'SUPER_ADMIN'
                        if (isSuperAdmin) return !item.tenantOnly
                        if (user?.role === 'TENANT_ADMIN') return !item.superOnly
                        return !item.superOnly && !item.tenantOnly
                    }).map((item) => (`);

// 4. Update Routes to handle TenantSettings
code = code.replace(/<Route path="settings" element=\{<Settings \/>\} \/>/g, `<Route path="settings" element={user?.role === 'TENANT_ADMIN' ? <TenantSettings /> : <Settings />} />`);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Patched Admin Dashboard successfully');
