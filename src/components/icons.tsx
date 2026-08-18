/**
 * UI 图标集（问题5：UI 图标统一采用 SVG 绘制）
 * 线性描边风格，颜色继承 currentColor，尺寸可调。
 */

interface IconProps {
  size?: number
  className?: string
}

function Svg({
  size = 16,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** 左箭头（收起面板） */
export function IconChevronLeft({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M10 3 5 8l5 5" />
    </Svg>
  )
}

/** 右箭头（展开面板） */
export function IconChevronRight({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M6 3l5 5-5 5" />
    </Svg>
  )
}

/** 下箭头（下拉展开） */
export function IconChevronDown({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M3 6l5 5 5-5" />
    </Svg>
  )
}

/** 全屏 */
export function IconFullscreen({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" />
    </Svg>
  )
}

/** 关闭（×） */
export function IconClose({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </Svg>
  )
}

/** 加号（部署/添加） */
export function IconPlus({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M8 2v12M2 8h12" />
    </Svg>
  )
}

/** 旋转（载具旋转提示） */
export function IconRotate({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M13 8a5 5 0 1 1-1.5-3.5" />
      <path d="M13 2v3h-3" />
    </Svg>
  )
}

/**
 * 锁定/解锁（绘制组件锁定）：美术资源/锁定.svg、解锁.svg，iconfont 1024×1024 填充式。
 * 与上方 16×16 描边图标风格不同，独立 svg 包装（fill="currentColor"）。
 */
function FillSvg({ size = 16, className, viewBox = '0 0 1024 1024', children }: IconProps & { viewBox?: string; children: React.ReactNode }) {
  return (
    <svg className={className} width={size} height={size} viewBox={viewBox} fill="currentColor" aria-hidden="true">
      {children}
    </svg>
  )
}

const LOCK_BODY_PATH =
  'M758.5 931h-497c-50.453 0-91.5-41.047-91.5-91.5v-335c0-50.453 41.047-91.5 91.5-91.5h497c50.453 0 91.5 41.047 91.5 91.5v335c0 50.453-41.047 91.5-91.5 91.5z m-497-454c-15.164 0-27.5 12.336-27.5 27.5v335c0 15.163 12.336 27.5 27.5 27.5h497c15.163 0 27.5-12.337 27.5-27.5v-335c0-15.164-12.337-27.5-27.5-27.5h-497z'
const LOCK_SHACKLE_PATH =
  'M512.1 791c-17.673 0-32-14.327-32-32V588.999c0-17.673 14.327-32 32-32 17.673 0 32 14.327 32 32V759c0 17.673-14.328 32-32 32zM297.472 446.595c-17.673 0-32-14.327-32-32 0-109.504 25.127-192.098 74.684-245.486 22.309-24.034 49.483-42.036 80.767-53.505 27.139-9.95 57.454-14.995 90.101-14.995 76.909 0 134.36 20.286 175.638 62.018 51.002 51.562 75.166 134.096 73.874 252.317-0.191 17.552-14.481 31.649-31.99 31.65-0.12 0-0.237 0-0.357-0.002-17.672-0.193-31.842-14.676-31.648-32.348 1.08-98.854-17.552-168.368-55.379-206.611-28.637-28.952-71.205-43.025-130.137-43.025-52.665 0-94.371 16.163-123.96 48.04-38.214 41.169-57.59 109.113-57.59 201.946-0.003 17.674-14.329 32.001-32.003 32.001z'
const UNLOCK_SHACKLE_PATH =
  'M512.1 791c-17.673 0-32-14.327-32-32V588.999c0-17.673 14.327-32 32-32 17.673 0 32 14.327 32 32V759c0 17.673-14.328 32-32 32zM297.472 446.595c-17.673 0-32-14.327-32-32 0-109.504 25.127-192.098 74.684-245.486 22.309-24.034 49.483-42.036 80.767-53.505 27.139-9.95 57.454-14.995 90.101-14.995 64.215 0 114.448 14.036 153.567 42.911 22.108 16.319 40.617 37.577 55.012 63.183 14.526 25.841 25.306 56.97 32.037 92.523 3.288 17.365-8.124 34.106-25.488 37.395-17.363 3.291-34.106-8.123-37.395-25.488-19.446-102.703-72.6-146.523-177.733-146.523-52.665 0-94.371 16.163-123.96 48.04-38.214 41.169-57.59 109.113-57.59 201.946-0.002 17.674-14.329 31.999-32.002 31.999z'

/** 锁定（绘制组件锁定） */
export function IconLock({ size, className }: IconProps) {
  return (
    <FillSvg size={size} className={className} viewBox="160 90 700 851">
      <path d={LOCK_BODY_PATH} />
      <path d={LOCK_SHACKLE_PATH} />
    </FillSvg>
  )
}

/** 解锁（绘制组件解锁） */
export function IconUnlock({ size, className }: IconProps) {
  return (
    <FillSvg size={size} className={className} viewBox="160 90 700 851">
      <path d={LOCK_BODY_PATH} />
      <path d={UNLOCK_SHACKLE_PATH} />
    </FillSvg>
  )
}

/**
 * 地图协作（局域网协作模式入口）：美术资源/地图协作.svg，iconfont 1024×1024 多色填充式。
 * 保留原始配色，独立 svg 包装（不使用 currentColor）。
 */
const COLLAB_PATHS: { d: string; fill: string }[] = [
  {
    d: 'M845.312 858.464L932.576 896 960 928H288l22.88-32 93.376-39.456a381.504 381.504 0 0 1-117.248-44.48C172.768 745.472 103.2 621.696 103.2 480 103.2 267.936 267.936 102.592 480 102.592c212.064 0 377.152 165.344 377.152 377.408 0 58.368-6.176 113.728-29.504 163.264a383.84 383.84 0 0 1-39.296 65.632c8.608-3.168 17.92 0 27.648 0 44.16 0 72.192 30.912 72.192 75.104 0 33.824-13.184 62.752-42.88 74.464z m-96.96-74.464c0-6.944-11.456-13.664-9.824-20.064-16.96 15.424-35.264 29.376-54.784 41.6l64.608 21.184c-7.84-12.384 0-27.008 0-42.72z',
    fill: '#FFFFFF',
  },
  {
    d: 'M288 800c0 4.352 0.16 8.64 0.512 12.928A383.872 383.872 0 0 1 96 480C96 268 267.904 96 480.032 96 692.064 96 864 268 864 480c0 58.048-12.896 113.12-35.968 162.464a160.96 160.96 0 0 0-34.496-2.336A350.624 350.624 0 0 0 832 479.968C832 285.536 674.4 128 480.032 128 285.6 128 128 285.536 128 479.968c0 124.32 64.448 233.6 161.76 296.224A161.28 161.28 0 0 0 288 800z',
    fill: '#5D6D7E',
  },
  {
    d: 'M624 576c-15.424 0-30.272 2.432-44.16 6.912-12.928-128.32-84.16-140.384-107.52-144.832-27.232-5.152-49.504-7.744-49.504-41.216s43.328-45.056 59.392-41.152c16.064 3.776 37.088-52.832-19.84-82.4-56.832-29.664-76.64 24.416-88.96 72.096-12.384 47.648-34.656 34.72-39.648-20.608-4.864-55.36-18.464-12.864-29.632 10.304-11.136 23.136-74.24 51.456-79.104 30.912-3.104-12.928 1.536-42.048 5.44-61.92 55.936-85.44 149.44-141.984 255.648-144.032A320.032 320.032 0 0 1 768 340.352c0.288 43.072-21.792 79.808-48.384 87.424-35.84 10.304-29.632 51.456-29.632 51.456 30.976 54.912 21.6 79.936-0.96 112.256-19.52-9.92-41.6-15.488-65.024-15.488zM160.96 505.344c3.68-63.648 16.192-121.344 16.192-121.344s45.28 49.408 88.64 72.128c51.968 27.2 118.208 43.2 118.208 43.2-98.752 78.08-116.288 163.136-118.432 204.672a458.816 458.816 0 0 1-93.824-137.856 318.976 318.976 0 0 1-10.752-60.8z',
    fill: '#ACB4C0',
  },
  {
    d: 'M680 777.12c43.872 14.72 80 46.208 100.8 86.88h-37.056a143.872 143.872 0 0 0-119.744-64c-49.92 0-93.92 25.408-119.744 64H467.2a176.544 176.544 0 0 1 100.8-86.88 80 80 0 1 1 112.064 0h-0.032zM624 768a48 48 0 1 0 0-96 48 48 0 0 0 0 96z',
    fill: '#30AD98',
  },
  {
    d: 'M488 841.12c43.872 14.72 80 46.208 100.8 86.88h-37.056a143.872 143.872 0 0 0-119.744-64c-49.92 0-93.92 25.408-119.744 64H275.2a176.544 176.544 0 0 1 100.8-86.88 80 80 0 1 1 112.064 0h-0.032zM432 832a48 48 0 1 0 0-96 48 48 0 0 0 0 96z m440 9.12c43.872 14.72 80 46.208 100.8 86.88h-37.056a143.872 143.872 0 0 0-119.744-64c-49.92 0-93.92 25.408-119.744 64H659.2a176.544 176.544 0 0 1 100.8-86.88 80 80 0 1 1 112.064 0h-0.032zM816 832a48 48 0 1 0 0-96 48 48 0 0 0 0 96z',
    fill: '#27A2DF',
  },
]

/** 地图协作（局域网协作模式入口，Android 专属） */
export function IconCollab({ size = 16, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 1024 1024" aria-hidden="true">
      {COLLAB_PATHS.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill} />
      ))}
    </svg>
  )
}

/**
 * 开屏视频（高阶菜单入口）：美术资源/视频.svg，iconfont 1024×1024 多色填充式。
 * 胶片外框 #333333，播放键保留原色 #0080FF（做法同 IconCollab）。
 */
const VIDEO_PATHS: { d: string; fill: string }[] = [
  {
    d: 'M863 291.18v445.77H163V291.18h700m45-65H118c-11.05 0-20 8.95-20 20v535.77c0 11.05 8.95 20 20 20h790c11.05 0 20-8.95 20-20V246.18c0-11.04-8.96-20-20-20z',
    fill: '#333333',
  },
  {
    d: 'M341.1 282.93h-65V767.8h65V282.93zM758.83 282.93h-65V767.8h65V282.93z',
    fill: '#333333',
  },
  {
    d: 'M144.16 401.21h175.91v50H144.16zM144.16 583.01h175.91v50H144.16zM717.94 401.21h175.91v50H717.94zM717.94 583.01h175.91v50H717.94z',
    fill: '#333333',
  },
  {
    d: 'M435.49 420.82v184.55c0 10.34 11.52 16.51 20.13 10.79l140.54-93.41c7.77-5.16 7.7-16.59-0.12-21.66L455.5 409.95c-8.62-5.59-20.01 0.6-20.01 10.87z',
    fill: '#0080FF',
  },
]

/** 开屏视频（高阶菜单入口，Android 专属） */
export function IconVideo({ size = 16, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 1024 1024" aria-hidden="true">
      {VIDEO_PATHS.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill} />
      ))}
    </svg>
  )
}

interface CheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onChange: (v: boolean) => void
  label?: string
  className?: string
  disabled?: boolean
}

/**
 * 地图分层勾选框（问题2）：
 * 内部保留原生 <input type="checkbox">（交互/键盘/焦点行为与原生完全一致），
 * 外观使用 SVG 绘制的勾选框（隐藏原生控件，显示自定义方块 + SVG 对勾），与官网暗色风格统一。
 */
export function Checkbox({ checked, indeterminate = false, onChange, label, className, disabled }: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <label className={`layer-item ${disabled ? 'disabled' : ''} ${className ?? ''}`}>
      <input
        type="checkbox"
        className="cb-native"
        ref={inputRef}
        checked={checked}
        aria-checked={indeterminate ? 'mixed' : checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={`cb-box ${checked ? 'checked' : ''} ${indeterminate ? 'indeterminate' : ''}`} aria-hidden="true">
        <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {checked ? <path d="M2 6.5 4.8 9 10 3.6" /> : indeterminate ? <path d="M2.5 6h7" /> : null}
        </svg>
      </span>
      {label && <span className="layer-label">{label}</span>}
    </label>
  )
}
import { useEffect, useRef } from 'react'
