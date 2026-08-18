import { useEffect, useState } from 'react'
import { platform } from '../platform'

export interface DeviceType {
  platform: typeof platform.kind
  mobileLayout: boolean
  coarsePointer: boolean
  /** 竖屏方向（访客端横屏体验更佳，用于竖屏提醒） */
  portrait: boolean
}

function readDeviceType(): DeviceType {
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const narrowScreen = window.matchMedia('(max-width: 900px)').matches
  return {
    platform: platform.kind,
    mobileLayout: platform.kind === 'android' || (coarsePointer && narrowScreen),
    coarsePointer,
    portrait: window.matchMedia('(orientation: portrait)').matches,
  }
}

export function useDeviceType(): DeviceType {
  const [device, setDevice] = useState(readDeviceType)

  useEffect(() => {
    const queries = [
      window.matchMedia('(pointer: coarse)'),
      window.matchMedia('(max-width: 900px)'),
      window.matchMedia('(orientation: portrait)'),
    ]
    const update = () => setDevice(readDeviceType())
    queries.forEach((query) => query.addEventListener('change', update))
    window.addEventListener('orientationchange', update)
    return () => {
      queries.forEach((query) => query.removeEventListener('change', update))
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return device
}
