import { effect } from "./reactivity";

export function bind(el, property, getter) {
    effect(() => {
        const value = typeof getter === 'function' ? getter() : getter
        el[property] = value
    })
}

export function bindText(el, getter) {
    effect(() => {
        const value = typeof getter === 'function' ? getter() : getter
        if (el.textContent !== String(value)) {
            el.textContent = String(value)
        }
    })
}

export function bindHTML(el, getter) {
    effect(() => {
        const value = typeof getter === 'function' ? getter() : getter
        if (el.htmlContent !== String(value)) {
            el.htmlContent = String(value)
        }
    })
}

export function bindVisible(el, getter) {
    effect(() => {
        const value = typeof getter === 'function' ? getter() : getter
        if (value && el.style.display !== "block") {
            el.style.display = "block"
        }
        if (!value && el.style.display !== "none") {
            el.style.display = "none"
        }
    })
}

export const select = selector => document.querySelector(selector)

export function on(el, eventType, callback) {
    el.addEventListener(eventType, callback)
}

export function off(el, eventType, callback) {
    el.removeEventListener(eventType, callback)
}
