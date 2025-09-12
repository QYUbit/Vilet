import { bindProp } from "./bind"
import { ElementConfig, ElementRef } from "./types"
import { isFunction, isObject } from "./utils"

export interface Selecter {
  querySelector<K extends keyof HTMLElementTagNameMap>(
    selectors: K
  ): HTMLElementTagNameMap[K] | null
  querySelector(selectors: string): HTMLElement | null
}

export function element<T extends HTMLElement = HTMLElement>(
  this: Selecter | void,
  config: ElementConfig
): ElementRef | undefined {
  if (!isObject(config)) return

  const root: Selecter = this ?? document
  
  const el = (config.$element ?? config.$el ?? 
    root.querySelector(config.$selector ?? config.$select ?? config.$ ?? "")) as T
  
  if (!el) {
    throw new Error("Element not found")
  }

  const cleanupFns: Function[] = []
  
  for (const [key, value] of Object.entries(config)) {
    const cleanup = bindProp(el, key, value, config)
    if (isFunction(cleanup)) {
      cleanupFns.push(cleanup)
    }
  }

  return {
    element: el,
    cleanup: cleanupFns,
    destroy() {
      this.cleanup.forEach(fn => fn())
    }
  }
}

