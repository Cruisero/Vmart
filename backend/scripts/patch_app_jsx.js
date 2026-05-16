const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../../frontend/src/App.jsx');
let code = fs.readFileSync(targetFile, 'utf8');

code = code.replace(/import TenantDashboard from '.\/pages\/Tenant'\n/, '');
code = code.replace(/\s*{\/\* 租户商城后台 \*\/}\n\s*<Route path="\/tenant\/\*" element={<TenantDashboard \/>} \/>/, '');

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Patched App.jsx');
