import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { DrawSettings, Side, ToolMode } from '../types'
import DrawBar from './DrawBar'
import { Checkbox, IconCollab, IconFullscreen, IconVideo } from './icons'
import ShortcutHelp from './ShortcutHelp'
import { platform } from '../platform'
import type { GameDataPlatform } from '../config/gameDataPlatform'

type ToolbarMenu = 'map' | 'mode' | 'device' | 'advanced'

interface ToolbarSelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface ToolbarSelectProps {
  menu: ToolbarMenu
  label: string
  value: string
  options: ToolbarSelectOption[]
  openMenu: ToolbarMenu | null
  onOpenMenu: (menu: ToolbarMenu | null) => void
  onSelect?: (value: string) => void
  align?: 'left' | 'right'
}

function ToolbarSelect({
  menu,
  label,
  value,
  options,
  openMenu,
  onOpenMenu,
  onSelect,
  align = 'left',
}: ToolbarSelectProps) {
  const open = openMenu === menu
  const menuId = `toolbar-${menu}-menu`
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [menuPosition, setMenuPosition] = useState<CSSProperties>({})

  useLayoutEffect(() => {
    if (!open || platform.kind !== 'android') return
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuPosition(align === 'right'
        ? { top: rect.bottom + 4, right: Math.max(6, window.innerWidth - rect.right) }
        : { top: rect.bottom + 4, left: Math.max(6, rect.left) })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [align, open])

  return (
    <div className={`map-select topbar-select menu-${menu} ${open ? 'open' : ''}`}>
      <button
        ref={buttonRef}
        className="map-select-btn"
        onClick={() => onOpenMenu(open ? null : menu)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
      >
        <span className="map-select-label">{label}</span>
        <span className="map-select-value">{value}</span>
        <i className="fa-solid fa-chevron-down" aria-hidden="true" />
      </button>
      {open ? (
        <div id={menuId} className={`map-select-menu align-${align}`} role="listbox" style={menuPosition}>
          {options.map((option) => (
            <button
              key={option.value}
              role="option"
              aria-selected={value === option.label}
              className={`map-select-item ${value === option.label ? 'active' : ''}`}
              disabled={option.disabled}
              onClick={() => {
                if (option.disabled) return
                onSelect?.(option.value)
                onOpenMenu(null)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

const MAPS: { id: string; name: string }[] = [
  { id: 'ascent', name: '攀升' },
  { id: 'flashpoint', name: '临界点' },
  { id: 'fault', name: '断层' },
  { id: 'brokentrack', name: '断轨' },
  { id: 'colosseum', name: '克劳狄斗兽场' },
  { id: 'stormeye', name: '风暴眼' },
  { id: 'ember', name: '烬区' },
  { id: 'pyramid', name: '金字塔' },
  { id: 'trench', name: '堑壕战' },
  { id: 'umuscanal', name: '乌姆斯运河' },
  { id: 'aftershock', name: '余震' },
]

const MAP_OPTIONS: ToolbarSelectOption[] = MAPS.map((map) => ({ value: map.id, label: map.name }))

const DEVICE_OPTIONS: ToolbarSelectOption[] = [
  { value: 'pc', label: 'PC端' },
  { value: 'mobile', label: '移动端' },
]

interface ToolbarProps {
  mapId: string
  onMapId: (id: string) => void
  gameDataPlatform: GameDataPlatform
  onGameDataPlatform: (platform: GameDataPlatform) => void
  gameModeName: string
  gameModeOptions: { id: string; name: string }[]
  onGameMode: (id: string) => void
  onOpenModeEditor: () => void
  view: Side
  onView: (v: Side) => void
  // ---- 绘制工具（固定在顶部栏） ----
  tool: ToolMode
  onTool: (t: ToolMode) => void
  draw: DrawSettings
  onDrawChange: (d: DrawSettings) => void
  dirty: boolean
  canUndo: boolean
  onUndo: () => void
  canRedo: boolean
  onRedo: () => void
  canDeleteSel: boolean
  onDeleteSelected: () => void
  onClearDraw: () => void
  onClearVehicles: () => void
  onClearAll: () => void
  /** 打开战术板弹窗（导出 HTML / 方案管理） */
  onOpenTactical: () => void
  /** 打开局域网协作弹窗（仅 Android 主机端渲染按钮） */
  onOpenLanCollab?: () => void
  /** 局域网协作服务器运行中（按钮高亮态） */
  lanCollabRunning?: boolean
  /** 开屏视频「可跳过」开关（仅 Android 渲染入口） */
  splashSkippable?: boolean
  onSplashSkippableChange?: (v: boolean) => void
  /** 选择自定义开屏视频（仅 Android 渲染入口） */
  onPickSplashVideo?: () => void
  /** 恢复默认开屏视频（仅 Android 渲染入口） */
  onResetSplashVideo?: () => void
  /** 演示模式访客只读：禁用绘制/编辑按钮（仅保留查看） */
  readOnly?: boolean
  cinematicModeSwitch?: boolean
}

/** 左上角图标（来自 enn.com.cn，三角洲行动标题标识） */
const OFFICIAL_LOGO = '/nav_title.png'

/** 全屏切换（复刻官网功能） */
function toggleFullscreen() {
  void platform.toggleFullscreen()
}

/**
 * 顶部工具栏（官网风格）：
 * 左上角官网图标 → 地图选择栏 → 绘制工具（内嵌） → 模式切换区。
 */
export default function Toolbar({
  mapId,
  onMapId,
  gameDataPlatform,
  onGameDataPlatform,
  gameModeName,
  gameModeOptions,
  onGameMode,
  onOpenModeEditor,
  view,
  onView,
  tool,
  onTool,
  draw,
  onDrawChange,
  dirty,
  canUndo,
  onUndo,
  canRedo,
  onRedo,
  canDeleteSel,
  onDeleteSelected,
  onClearDraw,
  onClearVehicles,
  onClearAll,
  onOpenTactical,
  onOpenLanCollab,
  lanCollabRunning = false,
  splashSkippable = true,
  onSplashSkippableChange,
  onPickSplashVideo,
  onResetSplashVideo,
  readOnly = false,
  cinematicModeSwitch = false,
}: ToolbarProps) {
  const [openMenu, setOpenMenu] = useState<ToolbarMenu | null>(null)
  // 「开屏视频」三级子菜单展开态（hover 展开、点击切换，兼容触摸）
  const [splashSubOpen, setSplashSubOpen] = useState(false)
  const currentMap = MAPS.find((m) => m.id === mapId) ?? MAPS[0]

  useEffect(() => {
    if (!cinematicModeSwitch) return
    const openTimer = window.setTimeout(() => setOpenMenu('mode'), 1100)
    const selectTimer = window.setTimeout(() => {
      onGameMode('winner-takes-all')
      setOpenMenu(null)
    }, 3100)
    const openDataTimer = window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>('.topbar-select.menu-device .map-select-btn')?.click()
    }, 4300)
    const selectDataTimer = window.setTimeout(() => {
      const mobileOption = [...document.querySelectorAll<HTMLButtonElement>('.topbar-select.menu-device .map-select-item')]
        .find((option) => option.textContent?.trim() === '移动端')
      mobileOption?.click()
    }, 5900)
    return () => {
      window.clearTimeout(openTimer)
      window.clearTimeout(selectTimer)
      window.clearTimeout(openDataTimer)
      window.clearTimeout(selectDataTimer)
    }
  }, [cinematicModeSwitch, onGameMode])

  // 三个下拉栏共用一个打开状态，保证同一时间只展开一项。
  useEffect(() => {
    if (!openMenu) return
    const onDocDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest('.topbar-select') && !t.closest('.advanced-menu-wrap')) setOpenMenu(null)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null)
    }
    document.addEventListener('pointerdown', onDocDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onDocDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openMenu])

  // 高阶菜单收起时同步收起「开屏视频」三级子菜单
  useEffect(() => {
    if (openMenu !== 'advanced') setSplashSubOpen(false)
  }, [openMenu])

  return (
    <header className="toolbar">
      {/* 左上角官网图标（与左侧工具栏同宽） */}
      <div className="logo-area">
        <img
          className="logo-mark-img"
          src={OFFICIAL_LOGO}
          alt="三角洲行动"
          draggable={false}
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      </div>

      {/* 地图选择（下拉栏） */}
      <ToolbarSelect
        menu="map"
        label="全面战场"
        value={currentMap.name}
        options={MAP_OPTIONS}
        openMenu={openMenu}
        onOpenMenu={setOpenMenu}
        onSelect={onMapId}
      />

      {/* 绘制工具（固定于顶部栏） */}
      <DrawBar
        tool={tool}
        onTool={onTool}
        draw={draw}
        onDrawChange={onDrawChange}
        dirty={dirty}
        canUndo={canUndo}
        onUndo={onUndo}
        canRedo={canRedo}
        onRedo={onRedo}
        canDeleteSel={canDeleteSel}
        onDeleteSelected={onDeleteSelected}
        onClearDraw={onClearDraw}
        onClearVehicles={onClearVehicles}
        onClearAll={onClearAll}
        readOnly={readOnly}
      />

      {/* 右侧模式切换区 */}
      <div className="mode-area">
        <ToolbarSelect
          menu="mode"
          label="模式"
          value={gameModeName}
          options={[
            { value: 'attack-defense', label: '攻防模式' },
            ...gameModeOptions.map((mode) => ({ value: mode.id, label: mode.name })),
            { value: 'occupation', label: '占领模式', disabled: true },
            { value: '__configure__', label: '配置模式…' },
          ]}
          openMenu={openMenu}
          onOpenMenu={setOpenMenu}
          onSelect={(id) => {
            if (id === '__configure__') onOpenModeEditor()
            else onGameMode(id)
          }}
          align="right"
        />
        <ToolbarSelect
          menu="device"
          label="游戏数据"
          value={gameDataPlatform === 'mobile' ? '移动端' : 'PC端'}
          options={DEVICE_OPTIONS}
          openMenu={openMenu}
          onOpenMenu={setOpenMenu}
          onSelect={(value) => onGameDataPlatform(value as GameDataPlatform)}
          align="right"
        />
        <div className="mode-divider" />
        <div className="mode-group seg">
          <button
            className={`mode-btn ${view === 'attack' ? 'active' : ''}`}
            onClick={() => onView('attack')}
            aria-label="攻方视角"
          >
            <span className="mode-view-long">攻方视角</span>
            <span className="mode-view-short" aria-hidden="true">攻</span>
          </button>
          <button
            className={`mode-btn ${view === 'defense' ? 'active' : ''}`}
            onClick={() => onView('defense')}
            aria-label="守方视角"
          >
            <span className="mode-view-long">守方视角</span>
            <span className="mode-view-short" aria-hidden="true">守</span>
          </button>
        </div>
        <button className="fullscreen-btn" onClick={toggleFullscreen} title="全屏 / 退出全屏">
          <IconFullscreen size={16} />
        </button>
        <ShortcutHelp compact />
        <button className="tactical-btn" onClick={onOpenTactical} title="战术板：导出 / 保存阶段战术">
          <span className="tactical-label-long">战术板</span>
          <span className="tactical-label-short" aria-hidden="true">板</span>
        </button>
        {/* 高阶菜单（二级目录：地图协作 / 开屏视频，Android 主机端独占） */}
        {platform.kind === 'android' && (onOpenLanCollab || onPickSplashVideo) ? (
          <div className={`advanced-menu-wrap ${openMenu === 'advanced' ? 'open' : ''}`}>
            <button
              className={`tactical-btn advanced-btn ${lanCollabRunning ? 'running' : ''}`}
              onClick={() => setOpenMenu(openMenu === 'advanced' ? null : 'advanced')}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'advanced'}
              title="高阶菜单"
            >
              <span className="tactical-label-long">高阶菜单</span>
              <span className="tactical-label-short" aria-hidden="true">阶</span>
              <i className="fa-solid fa-chevron-down" aria-hidden="true" />
            </button>
            {openMenu === 'advanced' ? (
              <div className="advanced-menu" role="menu">
                {onOpenLanCollab ? (
                  <button
                    role="menuitem"
                    className={`map-select-item ${lanCollabRunning ? 'active' : ''}`}
                    onClick={() => {
                      onOpenLanCollab()
                      setOpenMenu(null)
                    }}
                  >
                    <IconCollab size={14} />
                    <span>地图协作{lanCollabRunning ? '（运行中）' : ''}</span>
                  </button>
                ) : null}
                {onPickSplashVideo ? (
                  <div
                    className={`advanced-submenu-wrap ${splashSubOpen ? 'open' : ''}`}
                    onMouseEnter={() => setSplashSubOpen(true)}
                    onMouseLeave={() => setSplashSubOpen(false)}
                  >
                    <button
                      role="menuitem"
                      className={`map-select-item ${splashSubOpen ? 'active' : ''}`}
                      aria-haspopup="menu"
                      aria-expanded={splashSubOpen}
                      onClick={() => setSplashSubOpen((v) => !v)}
                    >
                      <IconVideo size={14} />
                      <span>开屏视频</span>
                      <i className="fa-solid fa-chevron-left submenu-caret" aria-hidden="true" />
                    </button>
                    {splashSubOpen ? (
                      <div className="advanced-submenu" role="menu">
                        <button
                          role="menuitem"
                          className="map-select-item"
                          onClick={() => {
                            onPickSplashVideo()
                            setSplashSubOpen(false)
                            setOpenMenu(null)
                          }}
                        >
                          <span>选择视频…</span>
                        </button>
                        <Checkbox
                          className="splash-skip-checkbox"
                          checked={splashSkippable}
                          onChange={(v) => onSplashSkippableChange?.(v)}
                          label="可跳过"
                        />
                        <button
                          role="menuitem"
                          className="map-select-item"
                          onClick={() => {
                            onResetSplashVideo?.()
                            setSplashSubOpen(false)
                            setOpenMenu(null)
                          }}
                        >
                          <span>恢复默认视频</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  )
}
