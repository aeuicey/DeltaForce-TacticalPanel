import { useEffect, useRef, useState } from 'react'

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
 * 冷启动时全屏黑底播放开屏视频，播完自动关闭；可跳过时任意点击跳过。
 */
export default function SplashVideoOverlay({ videoUri, skippable, onClose }: SplashVideoOverlayProps) {
  const src = videoUri ?? `${import.meta.env.BASE_URL}video/intro.mp4`
  const [hintVisible, setHintVisible] = useState(skippable)
  const [errorVisible, setErrorVisible] = useState(false)
  // 首帧就绪前隐藏视频，避免 WebView 默认的播放占位图标闪现
  const [ready, setReady] = useState(false)
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
        src={src}
        autoPlay
        muted={false}
        playsInline
        className={ready ? 'ready' : ''}
        onCanPlay={() => setReady(true)}
        onEnded={closeOnce}
        onError={handleError}
      />
      {errorVisible ? <div className="splash-error-hint">开屏视频播放失败，已跳过</div> : null}
      {skippable && hintVisible ? <div className="splash-skip-hint">点击即可跳过</div> : null}
    </div>
  )
}
