// GitHub Pages 子路径部署修正脚本（CI 专用，不影响本地构建）
//
// 背景：运行时以绝对路径字符串引用 public/ 资源（'/icons/...'、'/nav_title.png'，
// 共 70+ 处，含 JSON 数据），Vite 的 base 只重写打包资产与 HTML，不触碰这些字符串。
// Pages 部署在 /<仓库名>/ 子路径下，这些请求会打到域名根而 404。
// 本脚本在 vite build 之后扫描 dist 产物，把字符串字面量里的绝对路径补上 base 前缀。
//
// 用法：node scripts/fix-pages-paths.cjs <base>   例：node scripts/fix-pages-paths.cjs /delta-force

const fs = require('node:fs')
const path = require('node:path')

const base = process.argv[2]
if (!base || !base.startsWith('/')) {
  console.error('用法: node scripts/fix-pages-paths.cjs <base，如 /delta-force>')
  process.exit(1)
}
const prefix = base.endsWith('/') ? base.slice(0, -1) : base
const distDir = path.resolve(__dirname, '..', 'dist')

// 匹配字符串字面量中的 '/icons/ 与 '/nav_title.png（单/双引号、模板字符串）
const targets = ['/icons/', '/nav_title.png']
const re = /(["'`])(\/icons\/|\/nav_title\.png)/g

let touched = 0
let replaced = 0

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full)
      continue
    }
    if (!/\.(js|html|json)$/.test(entry.name)) continue
    const content = fs.readFileSync(full, 'utf8')
    let count = 0
    const next = content.replace(re, (match, quote, absPath) => {
      count++
      return `${quote}${prefix}${absPath}`
    })
    if (count > 0) {
      fs.writeFileSync(full, next)
      touched++
      replaced += count
    }
  }
}

walk(distDir)
console.log(`fix-pages-paths: base=${prefix}，修正 ${replaced} 处引用（${touched} 个文件），目标模式: ${targets.join(', ')}`)
