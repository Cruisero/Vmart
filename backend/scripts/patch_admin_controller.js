const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/controllers/adminController.js');
let code = fs.readFileSync(targetFile, 'utf8');

// Inject where.tenantId
code = code.replace(/const where = (\{[^}]*\})\s*/g, (match) => {
    if (match.includes('tenantId')) return match;
    return match + '\n        if (req.tenantId) where.tenantId = req.tenantId\n';
});
code = code.replace(/let where = (\{[^}]*\})\s*/g, (match) => {
    if (match.includes('tenantId')) return match;
    return match + '\n        if (req.tenantId) where.tenantId = req.tenantId\n';
});

// For update operations, ensure they can only update their own items
// E.g., const product = await prisma.product.findUnique({ where: { id } })
code = code.replace(/prisma\.([a-zA-Z]+)\.findUnique\(\{\s*where: \{\s*id(?:[^}]*)\}\s*\}\)/g, (match, model) => {
    return match.replace(/where: \{/, 'where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}),');
});

// Create product tenant injection
code = code.replace(/const productData = \{([\s\S]*?)\}/, (match, p1) => {
    if (!p1.includes('tenantId')) {
        return `const productData = {${p1},\n            tenantId: req.tenantId || null\n        }`;
    }
    return match;
});

// Create category tenant injection
code = code.replace(/data: \{\s*name:/g, 'data: {\n                tenantId: req.tenantId || null,\n                name:');

// Import cards tenant injection
code = code.replace(/const validCards = cardsToImport\.map\(card => \(\{/g, 'const validCards = cardsToImport.map(card => ({\n                tenantId: req.tenantId || null,');

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully patched adminController.js');
