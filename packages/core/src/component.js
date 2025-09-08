import { bindElements } from "./bind"
import { reactive } from "./reactivity"

const componentDirectives = {}

export function registerDirective(name, handler) {
    componentDirectives[name] = handler
}

// Creates and runs a component. Returns ref.
export function component(config) {
    let cleanupFns = []
    let active = false
    let context

    if (!config.$options) {
        config.$options = {}
    }

    const componentRef = {
        init() {
            active = true

            context = config.$ctx? reactive(config.$ctx) : reactive({})
            if (context) config.$ctx = context
            const root = config.$root? document.querySelector(config.$root): document

            Object.entries(componentDirectives).forEach(([name, handler]) => {
                if (name in config) {
                    handler(config[name], context, config)
                }
            })

            cleanupFns = bindElements(config, root, context)
            if (isFunction(config.$init)) config.$init(context)
        },

        destroy() {
            active = false
            if (isFunction(config.$cleanup)) config.$cleanup(context)
            cleanupFns.forEach(fn => fn())
            cleanupFns = []
            context = null
        },

        get context() {
            return context
        }
    }

    if (!config.$options.noAutoInit) {
        componentRef.init()
    }

    return componentRef
}

// Clones a template element and registers bindings. Returns ref.
export function template(config) {
    let cleanupFns = []
    let active = false
    let clone
    let context
    let mounted = []

    const templateRef = {
        init() {
            active = true

            context = config.$ctx? reactive(config.$ctx) : reactive({})
            config.$ctx = context

            const root = config.$root ? document.querySelector(config.$root) : document
            clone = root.querySelector(config.$selector ?? config.$).content.cloneNode(true)

            Object.entries(componentDirectives).forEach(([name, handler]) => {
                if (name in config) {
                    handler(config[name], context, config, clone)
                }
            })

            cleanupFns = bindElements(config, clone, context)
            if (isFunction(config.$init)) config.$init(context)
        },

        mount(el) {
            mounted = Array.from(clone.childNodes)
            el.appendChild(clone)
            if (isFunction(config.$mount)) config.$mount(context)
        },

        unmount(el) {
            mounted.forEach((element) => {
                if (element.parentNode === el) {
                    el.removeChild(element)
                }
            })
            
            mounted = []

            if (isFunction(config.$unmount)) config.$unmount(context)
        },

        destroy() {
            active = false
            if (isFunction(config.$cleanup)) config.$cleanup(context)
            cleanupFns.forEach(fn => fn())
            cleanupFns = []
            context = null
            clone = null
        },

        get context() {
            return context
        },

        get mounted() {
            return mounted
        }
    }

    return templateRef
}

function isFunction(value) {
    return typeof value === "function"
}
