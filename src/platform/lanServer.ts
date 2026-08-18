/**
 * 局域网协作模式：Android 原生 LanServer 插件（NanoHTTPD 内嵌服务器）的 TS 封装。
 * 非 android 平台全部安全 no-op，可直接调用不会抛错。
 */
import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { platform } from './index'

export type LanSessionMode = 'demo' | 'collab'

/** start/getInfo 返回的服务器信息。 */
export interface LanServerInfo {
  running: boolean
  mode: LanSessionMode | null
  ip: string
  port: number
  rev: number
}

/** start 的返回值（启动成功后 running=true）。 */
export interface LanServerStartResult {
  running: boolean
  ip: string
  port: number
  mode: LanSessionMode
}

/** stateReceived 事件负载：访客（collab 模式）POST 上来的整份状态。 */
export interface LanStateReceivedEvent {
  rev: number
  /** 整份 PersistedAppState 的 JSON 字符串 */
  state: string
}

export interface LanServerPlugin {
  start(options: { mode: LanSessionMode; port: number }): Promise<LanServerStartResult>
  stop(): Promise<void>
  getInfo(): Promise<LanServerInfo>
  pushState(options: { state: string }): Promise<{ rev: number }>
  pushView(options: { centerLat: number; centerLng: number; zoom: number; seq: number }): Promise<{ viewRev: number }>
  addListener(
    eventName: 'stateReceived',
    listenerFunc: (event: LanStateReceivedEvent) => void,
  ): Promise<PluginListenerHandle>
}

const plugin = registerPlugin<LanServerPlugin>('LanServer')

const NOT_RUNNING: LanServerInfo = { running: false, mode: null, ip: '', port: 0, rev: 0 }

const isAndroid = platform.kind === 'android'

/** 启动内嵌服务器（仅 Android；其余平台返回 running:false）。 */
export async function startLanServer(mode: LanSessionMode, port: number): Promise<LanServerStartResult> {
  if (!isAndroid) return { running: false, ip: '', port: 0, mode }
  return plugin.start({ mode, port })
}

export async function stopLanServer(): Promise<void> {
  if (!isAndroid) return
  await plugin.stop()
}

export async function getLanServerInfo(): Promise<LanServerInfo> {
  if (!isAndroid) return NOT_RUNNING
  try {
    return await plugin.getInfo()
  } catch {
    return NOT_RUNNING
  }
}

/** 主机推送最新整份状态（JSON 字符串），返回新 rev。失败静默返回 0。 */
export async function pushLanState(state: string): Promise<number> {
  if (!isAndroid) return 0
  try {
    const result = await plugin.pushState({ state })
    return result.rev
  } catch {
    return 0
  }
}

/** 主机推送当前地图视角（演示模式「同步视角」；非 Android no-op 返回 0）。 */
export async function pushLanView(centerLat: number, centerLng: number, zoom: number, seq: number): Promise<number> {
  if (!isAndroid) return 0
  try {
    const result = await plugin.pushView({ centerLat, centerLng, zoom, seq })
    return result.viewRev
  } catch {
    return 0
  }
}

/** 监听访客 POST 上来的状态（仅 collab 模式；非 Android 返回 null）。 */
export async function addLanStateReceivedListener(
  listener: (event: LanStateReceivedEvent) => void,
): Promise<PluginListenerHandle | null> {
  if (!isAndroid) return null
  return plugin.addListener('stateReceived', listener)
}
