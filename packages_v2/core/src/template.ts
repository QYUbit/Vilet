import { bindProp } from "./bind";
import { isFunction, isObject } from "./utils";

export function template(config: any) {
    if (!isObject(config)) return;
    
    const el = document.querySelector(config.$selector ?? config.$)

    const cleanupFns: Function[] = []
    for (const [key, value] of Object.entries(config)) {
        const cleanup = bindProp(el, key, value, config)
        if (isFunction(cleanup)) cleanupFns.push(cleanup)
    }

    return () => {
        cleanupFns.forEach(fn => fn())
    }
}

export interface TemplateRef {
    mounted: boolean
    elements: ChildNode[]
    fragment: DocumentFragment
    mount(el: HTMLElement): void
    unmount(el: HTMLElement): void
}

export function clone(selector: string) {
    const template = document.querySelector(selector)
    if (!template || !(template instanceof HTMLTemplateElement)) return null;

    const clone = template.content.cloneNode(true)

    const templateRef: TemplateRef = {
        mounted: false,
        elements: [] as ChildNode[],
        fragment: clone as DocumentFragment,

        mount(el) {
            this.mounted = true
            this.elements = Array.from(clone.childNodes)
            el.appendChild(clone)
        },

        unmount(el) {
            this.mounted = false
            this.elements.forEach((element) => {
                if (element.parentNode === el) {
                    el.removeChild(element)
                }
            })
            
            this.elements = []
        }
    }

    return templateRef
}
