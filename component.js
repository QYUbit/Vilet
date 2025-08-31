import { bindElements } from "./binding"
import { reactive } from "./reactivity"

function setupComponent(config) {
    let state = config.$state? reactive(config.$state) : reactive({})
    if (state) config.$state = state

    const root = config.$root? document.querySelector(config.$root): document
    const cleanupFns = bindElements(config, root, state)
    if (isFunction(config.$init)) config.$init()
    return cleanupFns
}

export function component(config) {
    let cleanupFns = []
    let active = false

    if (!config.$options) {
        config.$options = {}
    }

    if (!config.$options.noAutoInit) {
        active = true
        cleanupFns = setupComponent(config)
    }

    const componentRef = {
        init() {
            active = true
            cleanupFns = setupComponent(config)
        },
        destroy() {
            active = false
            if (isFunction(config.$cleanup)) config.$cleanup()
            cleanupFns.forEach(fn => fn())
        }
    }

    return componentRef
}

export function template(config) {
    let cleanupFns = []
    let active = true

    let state = config.$state? reactive(config.$state) : reactive({})
    config.$state = state

    let root = config.$root? document.querySelector(config.$root): document
    root = root.querySelector(config.$template ?? config.$).content.cloneNode(true)

    cleanupFns = bindElements(config, root, state)

    if (isFunction(config.$init)) config.$init()

    const templateRef = {
        mount(el) {
            el.appendChild(root)
        },
        destroy() {
            active = false
            if (isFunction(config.$cleanup)) config.$cleanup()
            cleanupFns.forEach(fn => fn())
        }
    }

    return templateRef
}

function isFunction(value) {
    return typeof value === "function"
}

function isObject(value) {
    return typeof value === "object" && value !== null
}
