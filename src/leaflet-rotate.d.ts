import 'leaflet'

declare module 'leaflet' {
  interface MapOptions {
    rotate?: boolean
    bearing?: number
    rotateControl?: boolean | { position?: ControlPosition; closeOnZeroBearing?: boolean }
    touchRotate?: boolean
  }

  interface Map {
    setBearing(bearing: number): void
    getBearing(): number
    /**
     * leaflet-rotate 的 Shift＋滚轮旋转处理器（默认启用）。
     * 它同时接管非 Shift 滚轮事件并会重新启用 scrollWheelZoom，
     * 因此冻结地图手势时需要一并禁用，否则锁定会被解除。
     */
    shiftKeyRotate: Handler
  }
}

declare module 'leaflet-rotate'
