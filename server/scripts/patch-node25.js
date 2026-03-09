/**
 * Patch buffer-equal-constant-time cho Node.js v25+
 * Node 25 đã xóa SlowBuffer, cần fallback về Buffer
 * Chạy tự động qua postinstall script
 */
const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'node_modules', 'buffer-equal-constant-time', 'index.js')

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8')
  const oldLine = "var SlowBuffer = require('buffer').SlowBuffer;"
  const newLine = "var SlowBuffer = require('buffer').SlowBuffer || Buffer;"

  if (content.includes(oldLine)) {
    content = content.replace(oldLine, newLine)
    fs.writeFileSync(filePath, content, 'utf8')
    console.log('[patch-node25] Patched buffer-equal-constant-time for Node.js v25+ compatibility')
  } else {
    console.log('[patch-node25] buffer-equal-constant-time already patched')
  }
} else {
  console.log('[patch-node25] buffer-equal-constant-time not found, skipping')
}
