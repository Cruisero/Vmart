const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/controllers/authController.js');
let code = fs.readFileSync(targetFile, 'utf8');

code = code.replace(/} catch \(error\) \{\s*next\(error\)\s*}/g, "} catch (error) { res.status(500).json({ error: error.message, stack: error.stack }); }");

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Patched authController error handler');
