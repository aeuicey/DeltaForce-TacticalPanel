/**
 * 网页端分享模式：分享中继服务器 API 封装（零依赖 Node 中继 + SSE 房间制同步）。
 * 全部走同源相对路径（端口无关），由部署侧将 /api/share 反代到中继服务器。
 * 所有方法失败安全：网络错误/非法数据不抛异常，以 null / false / 'error' 表达。
 */

/** 房间信息（GET /api/share/:suffix） */
export interface ShareRoomInfo {
  title: string
  hostNickname: string
  rev: number
  modifiedAt: number
  guestCount: number
  guests: string[]
}

/** getShareInfo 结果：房间信息 / 404 过期 / 网络或数据错误 */
export type ShareInfoResult = ShareRoomInfo | 'expired' | null

/** createShareHost 结果：201 创建成功 / 409 后缀冲突 / 其余错误 */
export type ShareHostResult = 'created' | 'conflict' | 'error'

const SHARE_API_BASE = '/api/share'

/** 访客昵称 localStorage 键（首访必填，可在分享弹窗修改） */
export const SHARE_NICKNAME_KEY = 'deltaforce-share-nickname'

/** 生成 6 位 [a-z0-9] 分享后缀 */
export function genShareSuffix(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let suffix = ''
  for (let i = 0; i < 6; i += 1) suffix += alphabet[Math.floor(Math.random() * alphabet.length)]
  return suffix
}

async function parseJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

/** 探测中继服务器（GET /api/share/health，默认 2s 超时；失败安全返回 false） */
export async function probeShareServer(timeoutMs = 2000): Promise<boolean> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${SHARE_API_BASE}/health`, { cache: 'no-store', signal: controller.signal })
    if (!res.ok) return false
    const data = await parseJson<{ ok?: unknown }>(res)
    return data?.ok === true
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}

/** 主机创建房间：POST /api/share/:suffix/host {title,nickname} → 201/409 */
export async function createShareHost(suffix: string, title: string, nickname: string): Promise<ShareHostResult> {
  try {
    const res = await fetch(`${SHARE_API_BASE}/${suffix}/host`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, nickname }),
    })
    if (res.status === 201) return 'created'
    if (res.status === 409) return 'conflict'
    return 'error'
  } catch {
    return 'error'
  }
}

/** 主机推送整份快照：POST /api/share/:suffix/state {state,modifiedAt} → {rev} */
export async function pushShareState(suffix: string, state: string, modifiedAt: number): Promise<number | null> {
  try {
    const res = await fetch(`${SHARE_API_BASE}/${suffix}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, modifiedAt }),
    })
    if (!res.ok) return null
    const data = await parseJson<{ rev?: unknown }>(res)
    return typeof data?.rev === 'number' ? data.rev : null
  } catch {
    return null
  }
}

/** 主机心跳：POST /api/share/:suffix/beat（失败静默，下轮重试） */
export async function shareBeat(suffix: string): Promise<void> {
  try {
    await fetch(`${SHARE_API_BASE}/${suffix}/beat`, { method: 'POST' })
  } catch {
    // 心跳失败静默
  }
}

/**
 * 主机保活心跳（解决标签页后台被浏览器节流导致中继 15s 无心跳判过期）：
 * - 优先用 Web Worker 定时器（不受后台标签页 intensive throttling 影响）
 * - Worker 不可用时回退 setInterval
 * - 切回前台立即补跳一次；返回停止函数
 */
export function startShareHeartbeat(suffix: string, intervalMs = 5000): () => void {
  const beat = () => void shareBeat(suffix)
  beat()
  let timer: number | null = null
  let worker: Worker | null = null
  let workerUrl = ''
  try {
    workerUrl = URL.createObjectURL(new Blob([`setInterval(() => postMessage(0), ${intervalMs})`], { type: 'application/javascript' }))
    worker = new Worker(workerUrl)
    worker.onmessage = beat
  } catch {
    timer = window.setInterval(beat, intervalMs)
  }
  const onVisible = () => {
    if (document.visibilityState === 'visible') beat()
  }
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    worker?.terminate()
    if (workerUrl) URL.revokeObjectURL(workerUrl)
    if (timer !== null) window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
  }
}

/** 主机主动关闭房间：POST /api/share/:suffix/close（失败静默） */
export async function closeShare(suffix: string): Promise<void> {
  try {
    await fetch(`${SHARE_API_BASE}/${suffix}/close`, { method: 'POST' })
  } catch {
    // 关闭失败静默
  }
}

/** pagehide 兜底关闭：sendBeacon 优先，fetch keepalive 兜底 */
export function closeShareBeacon(suffix: string): void {
  const url = `${SHARE_API_BASE}/${suffix}/close`
  try {
    if (typeof navigator.sendBeacon === 'function'
      && navigator.sendBeacon(url, new Blob(['{}'], { type: 'application/json' }))) {
      return
    }
  } catch {
    // 走 fetch 兜底
  }
  void fetch(url, { method: 'POST', keepalive: true }).catch(() => {
    // 静默
  })
}

/** 拉取房间信息（主机轮询访客列表 / 访客加入前校验）：404 → 'expired' */
export async function getShareInfo(suffix: string): Promise<ShareInfoResult> {
  try {
    const res = await fetch(`${SHARE_API_BASE}/${suffix}`, { cache: 'no-store' })
    if (res.status === 404) return 'expired'
    if (!res.ok) return null
    const data = await parseJson<Partial<ShareRoomInfo>>(res)
    if (!data || typeof data.title !== 'string') return null
    return {
      title: data.title,
      hostNickname: typeof data.hostNickname === 'string' ? data.hostNickname : '',
      rev: typeof data.rev === 'number' ? data.rev : 0,
      modifiedAt: typeof data.modifiedAt === 'number' ? data.modifiedAt : 0,
      guestCount: typeof data.guestCount === 'number' ? data.guestCount : 0,
      guests: Array.isArray(data.guests) ? data.guests.filter((g): g is string => typeof g === 'string') : [],
    }
  } catch {
    return null
  }
}

/** 访客订阅房间 SSE：event: state data {rev,state,modifiedAt}；event: expired */
export function openShareEvents(suffix: string, nickname: string): EventSource {
  return new EventSource(`${SHARE_API_BASE}/${suffix}/events?nickname=${encodeURIComponent(nickname)}`)
}
