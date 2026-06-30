/// <reference types="vite/client" />

import type { AsfEasyApi } from '../../preload/index'

declare global {
  interface Window {
    asfEasy: AsfEasyApi
  }
}

export {}
