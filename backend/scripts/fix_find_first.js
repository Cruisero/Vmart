const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/controllers/adminController.js');
let code = fs.readFileSync(targetFile, 'utf8');

// Change findUnique to findFirst where we injected tenantId
code = code.replace(/findUnique\(\{\s*where: \{\s*\.\.\.\(req\.tenantId/g, 'findFirst({ where: { ...(req.tenantId');

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully fixed findFirst');
