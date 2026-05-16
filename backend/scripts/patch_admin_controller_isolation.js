const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/controllers/adminController.js');
let c = fs.readFileSync(targetFile, 'utf8');

// Dashboard and Trends
// Look for where: { status: 'ACTIVE' } etc.
c = c.replace(/where: \{ status/g, "where: { ...(req.tenantId ? { tenantId: req.tenantId } : {}), status");
c = c.replace(/where: \{\n\s*status/g, "where: {\n                ...(req.tenantId ? { tenantId: req.tenantId } : {}),\n                status");
c = c.replace(/where: \{\n\s*createdAt/g, "where: {\n                ...(req.tenantId ? { tenantId: req.tenantId } : {}),\n                createdAt");
c = c.replace(/where: \{\n\s*orderId/g, "where: {\n                ...(req.tenantId ? { tenantId: req.tenantId } : {}),\n                orderId");

// Products
// getProducts uses baseWhere = {}
c = c.replace(/const baseWhere = \{\}/g, "const baseWhere = {};\n        if (req.tenantId) baseWhere.tenantId = req.tenantId;");

// Categories
// getCategories uses where = {}
c = c.replace(/const where = \{\}/g, "const where = {};\n        if (req.tenantId) where.tenantId = req.tenantId;");

// General updates/deletes that use id
// where: { id } => where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) }
// Note: we only do this for specific resources.
c = c.replace(/where: \{ id \}/g, "where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) }");

// createProduct
c = c.replace(/data: \{\n\s*name/g, "data: {\n                tenantId: req.tenantId || null,\n                name");

// createCategory
c = c.replace(/data: \{\n\s*name: name.trim/g, "data: {\n                tenantId: req.tenantId || null,\n                name: name.trim");

// importCards
// find product where: { id: productId } (already replaced by where: { id })
// card creation:
c = c.replace(/productId,\n\s*variantId,\n\s*content/g, "productId,\n                variantId,\n                tenantId: req.tenantId || null,\n                content");
c = c.replace(/productId,\n\s*content/g, "productId,\n                tenantId: req.tenantId || null,\n                content");

fs.writeFileSync(targetFile, c, 'utf8');
console.log('Patched adminController.js');
