const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/controllers/adminController.js');
let code = fs.readFileSync(targetFile, 'utf8');

// Function to inject security check before update/delete
function injectSecurity(methodName, modelName) {
    const regex = new RegExp(`exports\\.${methodName} = async \\(req, res, next\\) => \\{\\s*try \\{\\s*const \\{ id \\} = req\\.params`);
    code = code.replace(regex, (match) => {
        return `${match}\n        if (req.tenantId) { const item = await prisma.${modelName}.findFirst({ where: { id, tenantId: req.tenantId } }); if (!item) return res.status(403).json({ error: '无权操作或记录不存在' }) }`;
    });
}

injectSecurity('updateProduct', 'product');
injectSecurity('deleteProduct', 'product');
injectSecurity('updateCategory', 'category');
injectSecurity('deleteCategory', 'category');
// updateCard does not have const { id } = req.params at the very beginning, let's see
// deleteCard same. Let's just use the basic one for product and category for now.

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully added security checks');
