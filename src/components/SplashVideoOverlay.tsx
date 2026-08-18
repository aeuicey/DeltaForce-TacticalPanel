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
  const closedRef = useRef(false)

  const closeOnce = () => {
    if (closedRef.current) return
    closedRef.current = true
    onClose()
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
        onEnded={closeOnce}
        onError={() => {
          window.alert('开屏视频播放失败，已跳过。')
          closeOnce()
        }}
      />
      {skippable && hintVisible ? <div className="splash-skip-hint">点击即可跳过</div> : null}
    </div>
  )
}
