import { bindProp } from "./bind";
import { isFunction, isObject } from "./utils";

export interface Selecter {
    querySelector(selectors: keyof HTMLElementTagNameMap): HTMLElement
}

export interface ElementRef {
    element: HTMLElement
    cleanup: Function[]
    destroy(): void
}

export function element(this: Selecter | void, config: any) {
    if (!isObject(config)) return;

    const root: Selecter = this ?? document

    const el = config.$element ?? config.$el
    ?? root.querySelector(config.$selector ?? config.$select ?? config.$)

    const cleanupFns: Function[] = []
    for (const [key, value] of Object.entries(config)) {
        const cleanup = bindProp(el, key, value, config)
        if (isFunction(cleanup)) cleanupFns.push(cleanup)
    }

    const elementRef: ElementRef = {
        element: el,
        cleanup: cleanupFns,
        destroy() {
            this.cleanup.forEach(fn => fn())
        }
    }

    return elementRef
}
