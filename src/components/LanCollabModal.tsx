import { useEffect, useState } from 'react'
import {
  getLanServerInfo,
  startLanServer,
  stopLanServer,
  type LanServerInfo,
  type LanSessionMode,
} from '../platform/lanServer'

/** 内嵌服务器固定端口 */
export const LAN_SERVER_PORT = 18080

interface LanCollabModalProps {
  open: boolean
  onClose: () => void
  /** 运行状态变化时通知外层（Toolbar 按钮高亮 / App 同步逻辑） */
  onSessionChange?: (info: LanServerInfo) => void
}

/**
 * 局域网协作模式弹窗（Android 主机端）：
 * 选择演示/战术协作模式 → 启动 NanoHTTPD 内嵌服务器 → 展示局域网访问地址。
 */
export default function LanCollabModal({ open, onClose, onSessionChange }: LanCollabModalProps) {
  const [mode, setMode] = useState<LanSessionMode>('demo')
  const [info, setInfo] = useState<LanServerInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // 打开时同步一次真实运行状态（可能已在运行）
  useEffect(() => {
    if (!open) return
    setError('')
    void getLanServerInfo().then((current) => {
      setInfo(current)
      if (current.mode) setMode(current.mode)
    })
  }, [open])

  if (!open) return null

  const running = Boolean(info?.running)

  const handleStart = async (targetMode: LanSessionMode = mode) => {
    setBusy(true)
    setError('')
    try {
      const result = await startLanServer(targetMode, LAN_SERVER_PORT)
      if (!result.running) {
        setError('启动失败：仅 Android 端可作为主机开启协作。')
        return
      }
      const next: LanServerInfo = { running: true, mode: result.mode, ip: result.ip, port: result.port, rev: info?.rev ?? 0 }
      setInfo(next)
      onSessionChange?.(next)
    } catch (err) {
      setError(`启动失败：${String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  // 选择模式：运行中直接以新模式重启服务器（原生 start 自动换模式），访客端轮询感知权限变更
  const handleModePick = (next: LanSessionMode) => {
    setMode(next)
    if (running && next !== info?.mode) void handleStart(next)
  }

  const handleStop = async () => {
    setBusy(true)
    setError('')
    try {
      await stopLanServer()
      const next: LanServerInfo = { running: false, mode: null, ip: '', port: 0, rev: 0 }
      setInfo(next)
      onSessionChange?.(next)
    } catch (err) {
      setError(`停止失败：${String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const address = running && info ? `http://${info.ip}:${info.port}` : ''

  return (
    <div className="tb-overlay" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose()
    }}>
      <div className="tb-modal lan-modal">
        <div className="tb-head">
          <span className="tb-title">地图协作</span>
          <button className="tb-close" onClick={onClose} title="关闭" aria-label="关闭">×</button>
        </div>

        <div className="tb-body">
          <div className="tb-row">
            <span className="tb-label">协作模式</span>
            <div className="tb-seg">
              <button
                className={`tb-seg-btn ${mode === 'demo' ? 'active' : ''}`}
                onClick={() => handleModePick('demo')}
                disabled={busy}
              >
                演示模式
              </button>
              <button
                className={`tb-seg-btn ${mode === 'collab' ? 'active' : ''}`}
                onClick={() => handleModePick('collab')}
                disabled={busy}
              >
                战术协作模式
              </button>
            </div>
          </div>

          <div className="tb-tip">
            {mode === 'demo'
              ? '演示模式：本机作为主机向局域网广播当前战术布置，访客在浏览器中实时观看，无法修改。'
              : '战术协作模式：访客与主机实时互相同步战术布置，任何一方的修改都会广播给所有人（后来者覆盖先前修改）。'}
          </div>

          {running && address ? (
            <div className="lan-running">
              <div className="lan-address">{address}</div>
              <div className="tb-tip">访客用同一 Wi-Fi 浏览器打开该地址。{info?.mode === 'demo' ? '当前为演示模式，访客仅可观看。' : '当前为战术协作模式，访客可同步编辑。'}运行中切换模式会自动以新模式重启协作。</div>
            </div>
          ) : null}

          {error ? <div className="tb-tip lan-error">{error}</div> : null}

          {running ? (
            <button className="tb-primary danger" onClick={() => void handleStop()} disabled={busy}>
              {busy ? '停止中…' : '停止协作'}
            </button>
          ) : (
            <button className="tb-primary" onClick={() => void handleStart()} disabled={busy}>
              {busy ? '启动中…' : '开启协作'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
