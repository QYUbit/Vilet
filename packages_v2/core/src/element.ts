import { bindProp } from "./bind"
import { ElementConfig, ElementRef, Selecter } from "./types"
import { isFunction, isObject } from "./utils"

export function element<T extends HTMLElement = HTMLElement>(config: ElementConfig): ElementRef | null {
  if (!isObject(config)) return null;

  const root: Selecter = config.$root ?? document
  
  const el = (config.$element ?? config.$el ?? 
    root.querySelector(config.$selector ?? config.$select ?? config.$ ?? "")) as T
  
  if (!el) {
    return null;
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

