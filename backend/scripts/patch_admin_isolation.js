const fs = require('fs');
const path = require('path');

function replaceFile(file, replacer) {
    const fullPath = path.join(__dirname, '../src/controllers', file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let newContent = replacer(content);
        if (content !== newContent) {
            fs.writeFileSync(fullPath, newContent, 'utf8');
            console.log(`Patched ${file}`);
        }
    }
}

// 1. cardController.js
replaceFile('cardController.js', (c) => {
    // getCards
    c = c.replace(/const where = \{\}/, "const where = {};\n        if (req.tenantId) where.tenantId = req.tenantId;");
    // importCards
    c = c.replace(/where: \{ id: productId \}/g, "where: { id: productId, ...(req.tenantId ? { tenantId: req.tenantId } : {}) }");
    c = c.replace(/productId,\n\s*content: content.trim\(\),/g, "productId,\n                content: content.trim(),\n                tenantId: req.tenantId || null,");
    // deleteCard
    c = c.replace(/where: \{ id \}/g, "where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) }");
    return c;
});

// 2. productController.js
replaceFile('productController.js', (c) => {
    // getAdminProducts
    c = c.replace(/const where = \{\}/, "const where = {};\n        if (req.tenantId) where.tenantId = req.tenantId;");
    // createProduct
    c = c.replace(/data: \{/g, "data: {\n                tenantId: req.tenantId || null,");
    // updateProduct / deleteProduct
    c = c.replace(/where: \{ id \}/g, "where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) }");
    // updateProductStatus
    c = c.replace(/where: \{\n\s*id: \{ in: ids \}\n\s*\}/g, "where: {\n                id: { in: ids },\n                ...(req.tenantId ? { tenantId: req.tenantId } : {})\n            }");
    return c;
});

// 3. orderController.js
replaceFile('orderController.js', (c) => {
    // getAdminOrders
    c = c.replace(/const where = \{\}/, "const where = {};\n        if (req.tenantId) where.tenantId = req.tenantId;");
    // getOrder / updateOrderStatus
    c = c.replace(/where: \{ id \}/g, "where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) }");
    return c;
});

// 4. categoryController.js
replaceFile('categoryController.js', (c) => {
    // getCategories (Admin)
    c = c.replace(/const where = \{\}/, "const where = {};\n        if (req.tenantId) where.tenantId = req.tenantId;");
    // createCategory
    c = c.replace(/data: \{/g, "data: {\n                tenantId: req.tenantId || null,");
    // updateCategory / deleteCategory / updateCategoryStatus
    c = c.replace(/where: \{ id \}/g, "where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) }");
    return c;
});

// 5. stats.controller.js
replaceFile('stats.controller.js', (c) => {
    // We need to inject req.tenantId into where blocks for count/aggregate queries
    // Usually it looks like: prisma.product.count({ where: { status: 'ACTIVE' } })
    // Let's just do a broad replacement for where clauses in stats
    c = c.replace(/where: \{/g, "where: {\n                    ...(req.tenantId ? { tenantId: req.tenantId } : {}),");
    return c;
});

// 6. ticketController.js
replaceFile('ticketController.js', (c) => {
    // getAdminTickets
    c = c.replace(/const where = \{\}/, "const where = {};\n        if (req.tenantId) where.tenantId = req.tenantId;");
    // getTicket / replyTicket / closeTicket
    c = c.replace(/where: \{ id \}/g, "where: { id, ...(req.tenantId ? { tenantId: req.tenantId } : {}) }");
    return c;
});

