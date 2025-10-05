import { TemplateRef } from "./types";

export function clone(selector: string) {
    const template = document.querySelector(selector)
    if (!template || !(template instanceof HTMLTemplateElement)) return null;

    const clone = template.content.cloneNode(true) as DocumentFragment

    const templateRef: TemplateRef = {
        id: crypto.randomUUID(),
        mounted: false,
        elements: [] as ChildNode[],
        fragment: clone,

        mount(el) {
            this.elements = Array.from(clone.childNodes)
            this.mounted = true
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
