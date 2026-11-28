// GitHub Pages 子路径资源前缀回归测试：node scripts/test-pages-paths.cjs
//
// 守护的故障：v0.2.0 引入本地 q80 瓦片底图后，'/maps/...' 未被 fix-pages-paths 覆盖，
// 线上 https://aeuicey.github.io/maps/ascent-pc-q80-v1/3_0_4.webp 返回 404，
// 攀升/临界点/风暴眼/烬区/堑壕战五张底图在 Pages 上整张空白（CDN 底图不受影响）。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')

const { fixPagesPaths, targets } = require('./fix-pages-paths.cjs')

const BASE = '/DeltaForce-TacticalPanel'

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-paths-'))
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, content)
  }
  return dir
}

function read(dir, rel) {
  return fs.readFileSync(path.join(dir, rel), 'utf8')
}

test('目标清单包含本地底图与高度索引所需的 /maps/', () => {
  assert.ok(targets.includes('/maps/'), '缺少 /maps/ 会让五张本地底图在 Pages 子路径下 404')
  assert.ok(targets.includes('/icons/'))
  assert.ok(targets.includes('/nav_title.png'))
})

test('瓦片 URL 三种引号写法都补前缀', () => {
  const dir = fixture({
    'assets/chunk.js': [
      'const a={tileUrl:`/maps/ascent-pc-q80-v1/{z}_{x}_{y}.webp`};',
      'const b={tileUrl:"/maps/trench-pc-q80-v1/{z}_{x}_{y}.webp"};',
      "const c={tileUrl:'/maps/ember-mobile-q80-v1/{z}_{x}_{y}.webp'};",
    ].join('\n'),
  })
  const { replaced } = fixPagesPaths(dir, BASE)
  assert.equal(replaced, 3)
  const out = read(dir, 'assets/chunk.js')
  assert.ok(out.includes('`' + BASE + '/maps/ascent-pc-q80-v1/{z}_{x}_{y}.webp`'))
  assert.ok(out.includes('"' + BASE + '/maps/trench-pc-q80-v1/{z}_{x}_{y}.webp"'))
  assert.ok(out.includes("'" + BASE + '/maps/ember-mobile-q80-v1/{z}_{x}_{y}.webp' + "'"))
  assert.ok(!/(["'`])\/maps\//.test(out), '仍残留未加前缀的 /maps/ 字面量')
})

test('高度索引 manifest 路径与 manifest 内 tileUrl 同步加前缀（否则抛「高度索引格式不匹配」）', () => {
  const manifest = {
    format: 'deltaforce-map-surfaces',
    mapId: 'ascent',
    tileUrl: '/maps/ascent-pc-q80-v1/{z}_{x}_{y}.webp',
  }
  const dir = fixture({
    'assets/main.js': "const M={ascent:'/maps/ascent-surfaces-v3/manifest.json'};"
      + 'const expected={tileUrl:"/maps/ascent-pc-q80-v1/{z}_{x}_{y}.webp"};',
    'maps/ascent-surfaces-v3/manifest.json': JSON.stringify(manifest),
  })
  fixPagesPaths(dir, BASE)

  const js = read(dir, 'assets/main.js')
  const json = JSON.parse(read(dir, 'maps/ascent-surfaces-v3/manifest.json'))
  assert.ok(js.includes(BASE + '/maps/ascent-surfaces-v3/manifest.json'))
  // mapSurfaceHeights.ts 逐字比较 value.tileUrl 与源码常量，两侧必须一致
  const expectedTileUrl = js.match(/tileUrl:"([^"]+)"/)[1]
  assert.equal(json.tileUrl, expectedTileUrl)
  assert.equal(json.tileUrl, BASE + '/maps/ascent-pc-q80-v1/{z}_{x}_{y}.webp')
})

test('icons 与 nav_title 仍被修正，HTML 一并覆盖', () => {
  const dir = fixture({
    'assets/main.js': 'const logo="/nav_title.png";const i=`/icons/operator/op_10027.png`;',
    'index.html': '<link rel="icon" href="/nav_title.png">',
  })
  const { perTarget } = fixPagesPaths(dir, BASE)
  assert.equal(perTarget['/nav_title.png'], 2)
  assert.equal(perTarget['/icons/'], 1)
  assert.ok(read(dir, 'index.html').includes('href="' + BASE + '/nav_title.png"'))
})

test('幂等：重复执行不叠加前缀', () => {
  const dir = fixture({ 'assets/a.js': 'const u=`/maps/ascent-pc-q80-v1/{z}_{x}_{y}.webp`;' })
  fixPagesPaths(dir, BASE)
  const once = read(dir, 'assets/a.js')
  const second = fixPagesPaths(dir, BASE)
  assert.equal(read(dir, 'assets/a.js'), once)
  assert.equal(second.replaced, 1, '第二次应识别已有前缀并原样重写，而不是跳过或叠加')
  assert.ok(!once.includes(BASE + BASE))
  fixPagesPaths(dir, BASE)
  assert.equal(read(dir, 'assets/a.js'), once)
})

test('base 带尾斜杠与不带等价', () => {
  const files = { 'assets/a.js': 'const u="/maps/ascent-pc-q80-v1/x.webp";' }
  const a = fixture(files)
  const b = fixture(files)
  fixPagesPaths(a, BASE)
  fixPagesPaths(b, BASE + '/')
  assert.equal(read(a, 'assets/a.js'), read(b, 'assets/a.js'))
})

test('不改写非 HTTP 绝对路径与仓库相对路径', () => {
  const original = [
    'const mesh="/Game/Models/Vehicles/LD3000/LD3000.LD3000";',
    'const api="/api/share/session";',
    'const meta={localTileManifest:"public/maps/ascent-pc-q80-v1/manifest.json"};',
    'const proto="//cdn.example.com/maps/x.webp";',
    'const cdn="https://cdn.example.com/maps/y.webp";',
  ].join('\n')
  const dir = fixture({ 'assets/a.js': original })
  const { replaced } = fixPagesPaths(dir, BASE)
  assert.equal(replaced, 0)
  assert.equal(read(dir, 'assets/a.js'), original)
})

test('非 js/html/json 产物不被触碰', () => {
  const dir = fixture({
    'maps/ascent-pc-q80-v1/3_0_4.webp': 'RIFFfakeWEBP',
    'assets/a.css': '.x{background:url(/maps/ascent-pc-q80-v1/3_0_4.webp)}',
  })
  fixPagesPaths(dir, BASE)
  assert.equal(read(dir, 'maps/ascent-pc-q80-v1/3_0_4.webp'), 'RIFFfakeWEBP')
  assert.equal(read(dir, 'assets/a.css'), '.x{background:url(/maps/ascent-pc-q80-v1/3_0_4.webp)}')
})

test('非法 base 直接报错', () => {
  const dir = fixture({ 'assets/a.js': 'const u="/maps/x";' })
  assert.throws(() => fixPagesPaths(dir, ''), /base 必须以 \/ 开头/)
  assert.throws(() => fixPagesPaths(dir, 'DeltaForce-TacticalPanel'), /base 必须以 \/ 开头/)
})

test('真实源码里的本地底图与高度索引路径全部落在目标模式内', () => {
  const root = path.join(__dirname, '..')
  const sources = [
    'src/config/maps.ts',
    'src/config/mapSurfaceModels.ts',
    'src/config/mapMetricCalibration.json',
  ]
  const uncovered = []
  for (const rel of sources) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8')
    for (const match of text.matchAll(/(["'`])(\/maps\/[^"'`]*)/g)) {
      const abs = match[2]
      if (!targets.some((target) => abs.startsWith(target))) uncovered.push(`${rel}: ${abs}`)
    }
  }
  assert.deepEqual(uncovered, [], '存在未被 fix-pages-paths 覆盖的 /maps/ 引用')
})
