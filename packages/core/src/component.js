import { bindElements } from "./bind"
import { effect, reactive } from "./reactivity"

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
    let mountedEls = []
    let isMounted = false

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
            isMounted = true
            mountedEls = Array.from(clone.childNodes)
            el.appendChild(clone)
            if (isFunction(config.$mount)) config.$mount(context)
        },

        unmount(el) {
            isMounted = false
            mountedEls.forEach((element) => {
                if (element.parentNode === el) {
                    el.removeChild(element)
                }
            })
            
            mountedEls = []

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
            return mountedEls
        },

        get isMounted() {
            return isMounted
        }
    }

    if (config.$mount) {
        const { element, when } = config.$mount

        effect(() => {
            const shouldBeMounted = withContext(when, context)

            if (isMounted !== shouldBeMounted) {
                if (shouldBeMounted) {
                    templateRef.mount(element)
                } else {
                    templateRef.unmount(element)
                }
            }
        })
    }

    return templateRef
}

function withContext(value, ...args) {
    return typeof value === "function"? value(...args): value
}

function isFunction(value) {
    return typeof value === "function"
}
