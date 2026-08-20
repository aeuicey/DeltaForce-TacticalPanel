import { useEffect, useState } from 'react'

/** 分享弹窗主机态数据（App 轮询 /api/share/:suffix 更新访客列表） */
export interface ShareHostView {
  suffix: string
  title: string
  guestCount: number
  guests: string[]
}

/** 分享弹窗访客态数据（modifiedAt/syncedAt 由 SSE state 事件更新） */
export interface ShareGuestView {
  title: string
  hostNickname: string
  nickname: string
  modifiedAt: number | null
  syncedAt: number | null
}

interface ShareModalProps {
  open: boolean
  onClose: () => void
  /** 主机态：null = 未分享 */
  host: ShareHostView | null
  /** 访客态：null = 非访客 */
  guest: ShareGuestView | null
  /** 房间 404 / SSE expired：整体显示「该分享已过期」 */
  expired: boolean
  /** 中继服务器探测结果（false 时「开启分享」置灰） */
  available: boolean
  busy: boolean
  error: string
  onStart: (title: string) => void
  onStop: () => void
  /** 访客修改昵称（App 侧更新 localStorage 并重连 SSE） */
  onNicknameChange: (nickname: string) => void
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** 「Y 年 M 月 D 日 HH:mm」 */
function formatSyncTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/**
 * 网页端分享模式弹窗（Web 独占），三态：
 * 未分享（战术名必填 + 开启分享）/ 主机态（后缀 + 访客列表 + 停止分享）/ 访客态（昵称修改 + 同步信息）。
 * 过期时整体替换为「该分享已过期」。
 */
export default function ShareModal({
  open,
  onClose,
  host,
  guest,
  expired,
  available,
  busy,
  error,
  onStart,
  onStop,
  onNicknameChange,
}: ShareModalProps) {
  // 未分享态：战术名输入；访客态：昵称修改输入（打开时同步初值）
  const [title, setTitle] = useState('')
  const [nickInput, setNickInput] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!open) return
    setTitle('')
    setNickInput(guest?.nickname ?? '')
    setCopied(false)
    // 仅在打开时初始化输入框
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  /** 复制完整分享链接（剪贴板 API 失败时回退 execCommand） */
  const handleCopyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?share=${host?.suffix ?? ''}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const input = document.createElement('textarea')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  if (!open) return null

  const shareUrl = host ? `${window.location.origin}${window.location.pathname}?share=${host.suffix}` : ''
  const trimmedNick = nickInput.trim()

  return (
    <div className="tb-overlay" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose()
    }}>
      <div className="tb-modal share-modal">
        <div className="tb-head">
          <span className="tb-title">分享</span>
          <button className="tb-close" onClick={onClose} title="关闭" aria-label="关闭">×</button>
        </div>

        <div className="tb-body">
          {expired ? (
            <>
              <div className="share-expired">该分享已过期</div>
              <div className="tb-tip">主机已停止分享或分享链接已失效，请向主机索取新的分享链接。</div>
            </>
          ) : host ? (
            <>
              <div className="tb-row">
                <span className="tb-label">战术名</span>
                <span className="tb-value">{host.title}</span>
                <span className="share-badge host">主机</span>
              </div>
              <div className="tb-row">
                <span className="tb-label">分享链接</span>
              </div>
              <div className="share-url">{shareUrl}</div>
              <button className="tb-primary" onClick={handleCopyLink}>
                {copied ? '已复制到剪贴板' : '复制链接'}
              </button>
              <div className="tb-tip">访客用浏览器打开上述链接即可实时观看你的战术布置（只读）。</div>
              <div className="tb-row">
                <span className="tb-label">访客</span>
                <span className="tb-value">{host.guestCount} 人</span>
              </div>
              {host.guests.length > 0 ? (
                <div className="share-guest-list">
                  {host.guests.map((name, i) => (
                    <span key={`${name}-${i}`} className="share-guest-item">{name}</span>
                  ))}
                </div>
              ) : (
                <div className="tb-tip">暂无访客。</div>
              )}
              {error ? <div className="tb-tip lan-error">{error}</div> : null}
              <button className="tb-primary danger" onClick={onStop} disabled={busy}>
                {busy ? '停止中…' : '停止分享'}
              </button>
            </>
          ) : guest ? (
            <>
              <div className="tb-row">
                <span className="tb-label">战术名</span>
                <span className="tb-value">{guest.title}</span>
                <span className="share-badge guest">访客</span>
              </div>
              <div className="tb-row">
                <span className="tb-label">主机</span>
                <span className="tb-value">{guest.hostNickname}</span>
              </div>
              <div className="tb-row">
                <span className="tb-label">昵称</span>
                <input
                  className="tb-input"
                  value={nickInput}
                  maxLength={16}
                  placeholder="请输入昵称"
                  onChange={(e) => setNickInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && trimmedNick && trimmedNick !== guest.nickname) onNicknameChange(trimmedNick)
                  }}
                />
                <button
                  type="button"
                  className="tb-mini"
                  disabled={!trimmedNick || trimmedNick === guest.nickname}
                  onClick={() => onNicknameChange(trimmedNick)}
                >
                  更新
                </button>
              </div>
              {guest.modifiedAt && guest.syncedAt ? (
                <div className="share-sync-line">
                  主机于 {Math.max(0, Math.round((Date.now() - guest.modifiedAt) / 1000))} 秒前修改战术，已于 {formatSyncTime(guest.syncedAt)} 同步
                </div>
              ) : (
                <div className="share-sync-line">已连接，等待主机同步战术…</div>
              )}
              <div className="tb-tip">分享为只读模式：你实时观看主机的战术布置，无法修改。</div>
            </>
          ) : (
            <>
              <div className="tb-tip">开启分享后生成 6 位后缀链接，访客通过链接实时观看你的战术布置（只读），当前战术状态保留，可继续编辑并实时同步。</div>
              <div className="tb-row">
                <span className="tb-label">战术名</span>
                <input
                  className="tb-input"
                  value={title}
                  maxLength={24}
                  placeholder="必填，如：烬区 A 点快攻"
                  autoFocus
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && title.trim() && available && !busy) onStart(title.trim())
                  }}
                />
              </div>
              {!available ? (
                <div className="tb-tip lan-error">未检测到分享中继服务器，需部署分享中继服务器（见 Docker 部署）。</div>
              ) : null}
              {error ? <div className="tb-tip lan-error">{error}</div> : null}
              <button
                className="tb-primary"
                disabled={!title.trim() || !available || busy}
                onClick={() => onStart(title.trim())}
              >
                {busy ? '开启中…' : '开启分享'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface ShareNicknameModalProps {
  open: boolean
  onSubmit: (nickname: string) => void
}

/** 访客首访昵称弹窗（必填，无关闭入口；确认后加入分享） */
export function ShareNicknameModal({ open, onSubmit }: ShareNicknameModalProps) {
  const [nickname, setNickname] = useState('')
  useEffect(() => {
    if (open) setNickname('')
  }, [open])

  if (!open) return null

  const trimmed = nickname.trim()

  return (
    <div className="tb-overlay">
      <div className="tb-modal share-modal">
        <div className="tb-head">
          <span className="tb-title">加入战术分享</span>
        </div>
        <div className="tb-body">
          <div className="tb-tip">首次加入分享需要设置昵称（对主机与其他访客可见）。分享为只读模式，你仅能观看主机的战术布置。</div>
          <div className="tb-row">
            <span className="tb-label">昵称</span>
            <input
              className="tb-input"
              value={nickname}
              maxLength={16}
              placeholder="必填，请输入昵称"
              autoFocus
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && trimmed) onSubmit(trimmed)
              }}
            />
          </div>
          <button className="tb-primary" disabled={!trimmed} onClick={() => onSubmit(trimmed)}>
            加入分享
          </button>
        </div>
      </div>
    </div>
  )
}
