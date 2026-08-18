/**
 * 网页端分享模式中继服务器（零依赖，仅用 node:http / node:fs / node:path）
 *
 * 契约（与 Web 客户端严格对齐）：
 *   GET  /api/share/health                     → { ok: true }
 *   POST /api/share/:suffix/host    {title, nickname}      → 201 { ok: true, suffix }；已存在 409 { error }
 *   POST /api/share/:suffix/state   {state, modifiedAt}    → 存储 + rev++ + SSE 广播 state；返回 { rev }；无房 404
 *   POST /api/share/:suffix/beat                           → 更新 lastHostBeat，返回 { ok: true }
 *   POST /api/share/:suffix/close                          → 广播 expired 后删房，返回 { ok: true }
 *   GET  /api/share/:suffix                                → 房间元信息；无房 404 { error: 'expired' }
 *   GET  /api/share/:suffix/events?nickname=X              → SSE：注册访客、立即下发当前 state、转发广播
 *
 * 房间 15 秒无心跳自动过期（扫描定时器，过期同样广播 expired 再删房）。
 * 静态服务 dist/（SPA fallback 到 index.html），API 统一 JSON + CORS * + no-store。
 *
 * 环境变量：PORT（默认 8781）、STATIC_DIR（默认 ../dist 相对本文件）
 */

const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const PORT = Number(process.env.PORT) || 8781
const STATIC_DIR = path.resolve(__dirname, process.env.STATIC_DIR || '../dist')
const HEARTBEAT_TIMEOUT_MS = 15_000
const EXPIRY_SCAN_INTERVAL_MS = 5_000

/**
 * rooms: Map<suffix, {
 *   title: string, hostNickname: string, state: string|null, rev: number,
 *   modifiedAt: number, guests: Map<connId, nickname>, lastHostBeat: number,
 *   connections: Map<connId, http.ServerResponse>
 * }>
 */
const rooms = new Map()
let nextConnId = 1

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 20 * 1024 * 1024) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text ? JSON.parse(text) : {})
      } catch {
        reject(new Error('invalid json'))
      }
    })
    req.on('error', reject)
  })
}

/** 向房间所有 SSE 连接广播一个事件 */
function broadcast(room, event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const res of room.connections.values()) {
    try {
      res.write(payload)
    } catch {
      /* 连接异常由 close 事件清理 */
    }
  }
}

/** 删除房间（可选先广播 expired） */
function removeRoom(suffix, { announce = false } = {}) {
  const room = rooms.get(suffix)
  if (!room) return
  if (announce) {
    broadcast(room, 'expired', { suffix })
  }
  for (const res of room.connections.values()) {
    try {
      res.end()
    } catch {
      /* ignore */
    }
  }
  rooms.delete(suffix)
}

// 心跳超时扫描：15 秒无心跳自动过期
setInterval(() => {
  const now = Date.now()
  for (const [suffix, room] of rooms) {
    if (now - room.lastHostBeat > HEARTBEAT_TIMEOUT_MS) {
      removeRoom(suffix, { announce: true })
    }
  }
}, EXPIRY_SCAN_INTERVAL_MS).unref()

function handleEvents(req, res, suffix, nickname) {
  const room = rooms.get(suffix)
  if (!room) {
    sendJson(res, 404, { error: 'expired' })
    return
  }
  const connId = nextConnId++
  const guestName = (nickname || '').trim() || `访客-${connId}`
  room.guests.set(connId, guestName)
  room.connections.set(connId, res)

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no',
  })
  // 连接即下发当前 state（若有），便于访客立即对齐
  if (room.state !== null) {
    res.write(`event: state\ndata: ${JSON.stringify({ rev: room.rev, state: room.state, modifiedAt: room.modifiedAt })}\n\n`)
  }

  req.on('close', () => {
    room.guests.delete(connId)
    room.connections.delete(connId)
  })
}

async function handleApi(req, res, pathname, query) {
  // OPTIONS 预检
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  if (pathname === '/api/share/health' && req.method === 'GET') {
    sendJson(res, 200, { ok: true })
    return
  }

  // /api/share/:suffix 或 /api/share/:suffix/<action>
  const match = pathname.match(/^\/api\/share\/([a-z0-9]{6})(?:\/(host|state|beat|close|events))?$/)
  if (!match) {
    sendJson(res, 404, { error: 'not found' })
    return
  }
  const [, suffix, action] = match
  const room = rooms.get(suffix)

  try {
    // 建房
    if (action === 'host' && req.method === 'POST') {
      if (room) {
        sendJson(res, 409, { error: 'room exists' })
        return
      }
      const body = await readBody(req)
      const now = Date.now()
      rooms.set(suffix, {
        title: String(body.title || '未命名战术'),
        hostNickname: String(body.nickname || '房主'),
        state: null,
        rev: 0,
        modifiedAt: typeof body.modifiedAt === 'number' ? body.modifiedAt : now,
        guests: new Map(),
        connections: new Map(),
        lastHostBeat: now,
      })
      sendJson(res, 201, { ok: true, suffix })
      return
    }

    // 以下全部要求房间存在
    if (!room) {
      sendJson(res, 404, { error: 'expired' })
      return
    }

    if (!action && req.method === 'GET') {
      sendJson(res, 200, {
        title: room.title,
        hostNickname: room.hostNickname,
        rev: room.rev,
        modifiedAt: room.modifiedAt,
        guestCount: room.guests.size,
        guests: [...room.guests.values()],
      })
      return
    }

    if (action === 'state' && req.method === 'POST') {
      const body = await readBody(req)
      if (typeof body.state !== 'string') {
        sendJson(res, 400, { error: 'state must be a string' })
        return
      }
      room.state = body.state
      room.modifiedAt = typeof body.modifiedAt === 'number' ? body.modifiedAt : Date.now()
      room.rev += 1
      room.lastHostBeat = Date.now()
      broadcast(room, 'state', { rev: room.rev, state: room.state, modifiedAt: room.modifiedAt })
      sendJson(res, 200, { rev: room.rev })
      return
    }

    if (action === 'beat' && req.method === 'POST') {
      room.lastHostBeat = Date.now()
      sendJson(res, 200, { ok: true })
      return
    }

    if (action === 'close' && req.method === 'POST') {
      removeRoom(suffix, { announce: true })
      sendJson(res, 200, { ok: true })
      return
    }

    if (action === 'events' && req.method === 'GET') {
      handleEvents(req, res, suffix, query.get('nickname'))
      return
    }

    sendJson(res, 405, { error: 'method not allowed' })
  } catch (err) {
    sendJson(res, 400, { error: String((err && err.message) || 'bad request') })
  }
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(STATIC_DIR, pathname)
  // 防目录穿越
  if (!filePath.startsWith(STATIC_DIR + path.sep) && filePath !== STATIC_DIR) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }
  let stat = null
  try {
    stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html')
      stat = fs.statSync(filePath)
    }
  } catch {
    stat = null
  }
  // SPA fallback：非资源文件一律回退到 index.html
  if (!stat) {
    filePath = path.join(STATIC_DIR, 'index.html')
    try {
      stat = fs.statSync(filePath)
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Not Found')
      return
    }
  }
  const ext = path.extname(filePath).toLowerCase()
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
  })
  fs.createReadStream(filePath).pipe(res)
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const pathname = decodeURIComponent(url.pathname)
  if (pathname.startsWith('/api/share')) {
    handleApi(req, res, pathname, url.searchParams)
  } else if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res, pathname)
  } else {
    res.writeHead(405)
    res.end('Method Not Allowed')
  }
})

server.listen(PORT, () => {
  console.log(`[share-server] listening on http://0.0.0.0:${PORT}`)
  console.log(`[share-server] static dir: ${STATIC_DIR}`)
})
