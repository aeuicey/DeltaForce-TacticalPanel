// GitHub Pages 子路径部署修正脚本（CI 专用，不影响本地构建）
//
// 背景：运行时以绝对路径字符串引用 public/ 资源（'/icons/...'、'/nav_title.png'、
// '/maps/...'，共 900+ 处，含 JSON 数据），Vite 的 base 只重写打包资产与 HTML，
// 不触碰这些字符串字面量。Pages 部署在 /<仓库名>/ 子路径下，这些请求会打到域名根而 404。
// 本脚本在 vite build 之后扫描 dist 产物，把字符串字面量里的绝对路径补上 base 前缀。
//
// '/maps/' 覆盖两类资源，缺一即整张底图或整层高度失效：
//   1. 本地 q80 瓦片底图（攀升/临界点/风暴眼/烬区/堑壕战）——src/config/maps.ts 的 tileUrl；
//   2. 地表高度索引——src/config/mapSurfaceModels.ts 的 manifest 路径，以及
//      dist/maps/*-surfaces-v*/manifest.json 内的 tileUrl 字段。
// 后者必须与 JS 侧常量同步加前缀：src/utils/mapSurfaceHeights.ts 会逐字比较
// manifest.tileUrl 与源码常量，只改一边会抛「高度索引格式不匹配」。
//
// 不改写的绝对路径：'/Game/...'（虚幻资源路径，非 HTTP）、'/api/...'（分享中继接口）、
// 'public/maps/...'（仓库相对路径，仅离线测试脚本读取）。正则要求引号紧邻目标前缀，天然排除。
//
// 用法：node scripts/fix-pages-paths.cjs <base>   例：node scripts/fix-pages-paths.cjs /DeltaForce-TacticalPanel
// 回归测试：node scripts/test-pages-paths.cjs

const fs = require('node:fs')
const path = require('node:path')

// 匹配字符串字面量中的 '/icons/、'/nav_title.png、'/maps/（单/双引号、模板字符串）
const targets = ['/icons/', '/nav_title.png', '/maps/']

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 就地把 distDir 下 js/html/json 里的绝对 public 路径补上 base 前缀。
 * 幂等：重复执行不会叠成 /base/base/maps/...
 * @returns {{ replaced: number, touched: number, perTarget: Record<string, number> }}
 */
function fixPagesPaths(distDir, base) {
  if (!base || !base.startsWith('/')) throw new Error('base 必须以 / 开头，如 /DeltaForce-TacticalPanel')
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base
  // 可选的已有前缀分组实现幂等
  const re = new RegExp(
    '(["\'`])(?:' + escapeRegExp(prefix) + ')?(' + targets.map(escapeRegExp).join('|') + ')',
    'g',
  )

  let touched = 0
  let replaced = 0
  const perTarget = Object.fromEntries(targets.map((target) => [target, 0]))

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
        perTarget[absPath] += 1
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
  return { replaced, touched, perTarget }
}

module.exports = { fixPagesPaths, targets }

if (require.main === module) {
  const base = process.argv[2]
  if (!base || !base.startsWith('/')) {
    console.error('用法: node scripts/fix-pages-paths.cjs <base，如 /DeltaForce-TacticalPanel>')
    process.exit(1)
  }
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base
  const distDir = path.resolve(__dirname, '..', 'dist')
  const { replaced, touched, perTarget } = fixPagesPaths(distDir, base)

  const breakdown = targets.map((target) => `${target}=${perTarget[target]}`).join('，')
  console.log(`fix-pages-paths: base=${prefix}，修正 ${replaced} 处引用（${touched} 个文件）；${breakdown}`)

  // 任一目标 0 命中通常意味着资源引用方式变了（例如改用 import.meta.env.BASE_URL），
  // 或产物结构变化导致漏改。显式告警，避免子路径 404 再次静默上线。
  const missed = targets.filter((target) => perTarget[target] === 0)
  if (missed.length > 0) {
    console.warn(`fix-pages-paths: 警告——以下目标未命中任何引用，请确认是否仍需修正: ${missed.join(', ')}`)
  }
}
