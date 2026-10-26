// 网页分享中继服务器端到端回归：node --test scripts/test-share-relay.cjs
// 自包含：在空闲端口拉起 server/share-server.cjs 子进程，跑完即停。
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const net = require('node:net')
const path = require('node:path')
const test = require('node:test')

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
    srv.on('error', reject)
  })
}

async function waitHealthy(base, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${base}/api/share/health`)
      if (r.ok && (await r.json()).ok === true) return
    } catch {
      // 服务器尚未就绪
    }
    await new Promise((res) => setTimeout(res, 100))
  }
  throw new Error('share server did not become healthy')
}

async function withServer(run) {
  const port = await freePort()
  const base = `http://127.0.0.1:${port}`
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'share-server.cjs')], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
  })
  try {
    await waitHealthy(base)
    await run(base)
  } finally {
    child.kill()
  }
}

/** 收集 SSE 事件名序列，直到收到 expired 或超时 */
async function collectSseEvents(base, suffix, nickname, { timeoutMs = 6000 } = {}) {
  const resp = await fetch(`${base}/api/share/${suffix}/events?nickname=${encodeURIComponent(nickname)}`, {
    headers: { Accept: 'text/event-stream' },
  })
  assert.equal(resp.status, 200)
  assert.match(resp.headers.get('content-type') || '', /text\/event-stream/)
  const events = []
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    let chunk
    try {
      chunk = await Promise.race([
        reader.read(),
        new Promise((resolve, reject) => setTimeout(() => reject(new Error('timeout')), deadline - Date.now())),
      ])
    } catch {
      break
    }
    if (chunk.done) break
    buf += decoder.decode(chunk.value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      const event = (block.match(/^event: (.+)$/m) || [])[1]
      events.push(event)
      if (event === 'expired') return events
    }
  }
  return events
}

test('分享中继：建房/冲突/信息/推送/心跳/关闭/过期广播/静态托管全链路', async () => {
  await withServer(async (base) => {
    const suffix = 'abc123'

    let r = await fetch(`${base}/api/share/health`)
    assert.equal(r.status, 200)
    assert.equal((await r.json()).ok, true)

    r = await fetch(`${base}/api/share/${suffix}/host`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '烬区A点快攻', nickname: '队长' }),
    })
    assert.equal(r.status, 201)

    r = await fetch(`${base}/api/share/${suffix}/host`, { method: 'POST', body: '{}' })
    assert.equal(r.status, 409)

    r = await fetch(`${base}/api/share/zzz999`)
    assert.equal(r.status, 404)

    // 访客先订阅（验证后续推送的实时广播）
    const ssePromise = collectSseEvents(base, suffix, '队员甲')
    await new Promise((res) => setTimeout(res, 500))

    r = await fetch(`${base}/api/share/${suffix}`)
    const info = await r.json()
    assert.equal(info.title, '烬区A点快攻')
    assert.equal(info.hostNickname, '队长')
    assert.equal(info.guestCount, 1)
    assert.deepEqual(info.guests, ['队员甲'])

    r = await fetch(`${base}/api/share/${suffix}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: '{"version":1,"a":1}', modifiedAt: Date.now() }),
    })
    assert.equal((await r.json()).rev, 1)
    r = await fetch(`${base}/api/share/${suffix}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: '{"version":1,"a":2}', modifiedAt: Date.now() }),
    })
    assert.equal((await r.json()).rev, 2)

    r = await fetch(`${base}/api/share/${suffix}/beat`, { method: 'POST' })
    assert.equal(r.status, 200)

    r = await fetch(`${base}/api/share/${suffix}/close`, { method: 'POST' })
    assert.equal(r.status, 200)

    const events = await ssePromise
    assert.ok(events.filter((e) => e === 'state').length >= 2, `应收到 2 帧 state，实际 ${events.join(',')}`)
    assert.ok(events.includes('expired'), `应收到 expired，实际 ${events.join(',')}`)

    r = await fetch(`${base}/api/share/${suffix}`)
    assert.equal(r.status, 404)

    r = await fetch(`${base}/`)
    const html = await r.text()
    assert.equal(r.status, 200)
    assert.ok(html.includes('<div id="app"'))

    r = await fetch(`${base}/some/spa/route?share=abc123`)
    assert.equal(r.status, 200)
    assert.ok((await r.text()).includes('<div id="app"'))
  })
})

test('分享中继：心跳超时 15s 后房间自动过期', { timeout: 25000 }, async () => {
  await withServer(async (base) => {
    const suffix = 'old001'
    let r = await fetch(`${base}/api/share/${suffix}/host`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 't', nickname: 'h' }),
    })
    assert.equal(r.status, 201)
    // 中继每 5s 扫描、15s 无心跳过期：最长等约 20s
    const events = await collectSseEvents(base, suffix, 'g', { timeoutMs: 22000 })
    assert.ok(events.includes('expired'))
    r = await fetch(`${base}/api/share/${suffix}`)
    assert.equal(r.status, 404)
  })
})
