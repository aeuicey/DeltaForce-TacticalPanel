import { useEffect, useRef, useState } from 'react'

/** 声音静音（美术资源/声音静音.svg，iconfont 1024×1024）：喇叭 + X */
const MUTED_PATH =
  'M128 420.576v200.864h149.12l175.456 140.064V284.288l-169.792 136.288H128z m132.256-64l204.288-163.968a32 32 0 0 1 52.032 24.96v610.432a32 32 0 0 1-51.968 24.992l-209.92-167.552H96a32 32 0 0 1-32-32v-264.864a32 32 0 0 1 32-32h164.256zM752 458.656L870.4 300.8a32 32 0 1 1 51.2 38.4L792 512l129.6 172.8a32 32 0 0 1-51.2 38.4l-118.4-157.856-118.4 157.856a32 32 0 0 1-51.2-38.4l129.6-172.8-129.6-172.8a32 32 0 0 1 51.2-38.4l118.4 157.856z'
/** 喇叭本体（声音静音.svg 第一子路径）：取消静音态显示 */
const SPEAKER_PATH =
  'M128 420.576v200.864h149.12l175.456 140.064V284.288l-169.792 136.288H128z m132.256-64l204.288-163.968a32 32 0 0 1 52.032 24.96v610.432a32 32 0 0 1-51.968 24.992l-209.92-167.552H96a32 32 0 0 1-32-32v-264.864a32 32 0 0 1 32-32h164.256z'

interface SplashVideoOverlayProps {
  /** 用户自定义视频播放 URI；为 null 时播放内置默认视频 */
  videoUri: string | null
  /** 可跳过：显示提示条幅，任意点击/触摸关闭 */
  skippable: boolean
  /** 播放结束 / 跳过 / 出错后的关闭回调 */
  onClose: () => void
}

/**
 * 开屏视频覆盖层（Android 独占）：
 * 冷启动时全屏黑底播放开屏视频，默认静音（右上角静音按钮可取消静音），
 * 播完自动关闭；可跳过时任意点击跳过。
 */
export default function SplashVideoOverlay({ videoUri, skippable, onClose }: SplashVideoOverlayProps) {
  const src = videoUri ?? `${import.meta.env.BASE_URL}video/intro.mp4`
  const [hintVisible, setHintVisible] = useState(skippable)
  const [errorVisible, setErrorVisible] = useState(false)
  // 首帧就绪前隐藏视频，避免 WebView 默认的播放占位图标闪现
  const [ready, setReady] = useState(false)
  // 默认静音播放，点右上角按钮取消静音
  const [muted, setMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const closedRef = useRef(false)

  const closeOnce = () => {
    if (closedRef.current) return
    closedRef.current = true
    onClose()
  }

  // 播放失败：覆盖层内显示应用内提示（安卓原生 alert 深色主题不可读），短暂展示后关闭
  const handleError = () => {
    if (closedRef.current) return
    setErrorVisible(true)
    window.setTimeout(closeOnce, 1800)
  }

  // 切换静音：拦截事件冒泡，避免触发覆盖层的"点击跳过"
  const toggleMute = (event: React.SyntheticEvent) => {
    event.stopPropagation()
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }

  // 「点击即可跳过」提示条幅 5 秒后自动消失
  useEffect(() => {
    if (!skippable) return
    const timer = window.setTimeout(() => setHintVisible(false), 5000)
    return () => window.clearTimeout(timer)
  }, [skippable])

  return (
    <div
      className={`splash-video-overlay ${skippable ? 'skippable' : ''}`}
      role="presentation"
      onClick={skippable ? closeOnce : undefined}
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted={muted}
        playsInline
        className={ready ? 'ready' : ''}
        onCanPlay={() => setReady(true)}
        onEnded={closeOnce}
        onError={handleError}
      />
      <button
        type="button"
        className="splash-mute-btn"
        title={muted ? '取消静音' : '静音'}
        aria-label={muted ? '取消静音' : '静音'}
        onClick={toggleMute}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <svg viewBox="0 0 1024 1024" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d={muted ? MUTED_PATH : SPEAKER_PATH} />
        </svg>
      </button>
      {errorVisible ? <div className="splash-error-hint">开屏视频播放失败，已跳过</div> : null}
      {skippable && hintVisible ? <div className="splash-skip-hint">点击即可跳过</div> : null}
    </div>
  )
}
