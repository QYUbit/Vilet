import { bindElements } from "./binding"
import { reactive } from "./reactivity"

// Creates and runs a component. Returns ref.
function component(config) {
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

            cleanupFns = bindElements(config, root, context)
            if (isFunction(config.$init)) config.$init(context)
        },

        destroy() {
            active = false
            if (isFunction(config.$cleanup)) config.$cleanup(context)
            cleanupFns.forEach(fn => fn())
            cleanupFns = []
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
function template(config) {
    let cleanupFns = []
    let active = false
    let root
    let context

    const templateRef = {
        init() {
            active = true

            context = config.$ctx? reactive(config.$ctx) : reactive({})
            config.$ctx = context

            root = config.$root? document.querySelector(config.$root): document
            root = root.querySelector(config.$selector ?? config.$).content.cloneNode(true)

            cleanupFns = bindElements(config, root, context)
            if (isFunction(config.$init)) config.$init(context)
        },

        mount(el) {
            el.appendChild(root)
            if (isFunction(config.$mount)) config.$mount(context)
        },

        destroy() {
            active = false
            if (isFunction(config.$cleanup)) config.$cleanup(context)
            cleanupFns.forEach(fn => fn())
            cleanupFns = []
        },

        get context() {
            return context
        }
    }

    return templateRef
}

function isFunction(value) {
    return typeof value === "function"
}

export { component, template }
