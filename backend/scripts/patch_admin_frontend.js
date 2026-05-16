const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../../frontend/src/pages/Admin/Dashboard/index.jsx');
let code = fs.readFileSync(targetFile, 'utf8');

// Filter menu items
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
]`;
});

// Update the rendering of menuItems to check superOnly
code = code.replace(/\{menuItems\.map\(\(item\) => \(\s*<NavLink/g, `{menuItems.filter(item => !item.superOnly || user?.role === 'SUPER_ADMIN').map((item) => (\n                    <NavLink`);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully patched admin frontend');
