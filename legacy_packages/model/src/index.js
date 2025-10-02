export default function model(V) {
    V.registerBinding("$model", (el, ctx, bind) => {
        if (typeof bind === "string") {
            return bindModel(V, el, ctx, bind) 
        } else {
            return bindConfigModel(V, el, ctx, bind)
        }
    })
}

function bindModel(V, el, context, ctxRef) {
    const path = typeof ctxRef === "string" ? ctxRef.split(".") : [ctxRef]
    
    // Context -> DOM
    const ctxChange = V.effect(() => {
        const currentValue = getNestedValue(context, path)
        
        if (el.type === "checkbox") {
            if (el.checked !== currentValue) {
                el.checked = !!currentValue
            }
        } else if (el.type === "radio") {
            if (el.checked !== (el.value === String(currentValue))) {
                el.checked = el.value === String(currentValue)
            }
        } else {
            if (el.value !== String(currentValue || "")) {
                el.value = String(currentValue || "")
            }
        }
    })
    
    // DOM -> Context
    const eventType = getModelEventType(el)
    const domChange = () => {
        let newValue
        
        if (el.type === "checkbox") {
            newValue = el.checked
        } else if (el.type === "radio") {
            newValue = el.value
        } else if (el.type === "number" || el.type === "range") {
            newValue = el.valueAsNumber
        } else {
            newValue = el.value
        }
        
        setNestedValue(context, path, newValue)
    }
    
    el.addEventListener(eventType, domChange)
    
    return () => {
        el.removeEventListener(eventType, domChange)
        if (typeof ctxChange === "function") ctxChange()
    }
}

function bindConfigModel(V, el, context, modelConfig) {
    const { path, validate, transform, valid } = modelConfig
    const _path = path.split(".")
    const isValidPath = valid.split(".")
    
    // Context -> DOM
    V.effect(() => {
        const currentValue = getNestedValue(context, _path)
        el.value = String(currentValue || "")
    })
    
    // DOM -> Context
    const domEvent = () => {
        let value = el.value
        
        if (transform) {
            value = transform(value)
        }

        if (!validate || validate(value)) {
            setNestedValue(context, _path, value)
            setNestedValue(context, isValidPath, true)
        } else {
            setNestedValue(context, isValidPath, false)
            el.value = value // Update context or just DOM?
        }
    }
    
    el.addEventListener("input", domEvent)
    el.addEventListener("blur", domEvent)
    
    return () => {
        el.removeEventListener("input", domEvent)
        el.removeEventListener("blur", domEvent)
    }
}

function getNestedValue(obj, path) {
    return path.reduce((current, key) => current?.[key], obj)
}

function setNestedValue(obj, path, value) {
    const pathCopy = [...path]
    const lastKey = pathCopy.pop()
    const target = pathCopy.reduce((current, key) => {
        if (!current[key]) current[key] = {}
        return current[key]
    }, obj)
    target[lastKey] = value
}

function getModelEventType(el) {
    const tag = el.tagName.toLowerCase()
    const type = el.type?.toLowerCase()
    
    if (type === "checkbox" || type === "radio") {
        return "change"
    } else if (tag === "select") {
        return "change"
    } else {
        return "input"
    }
}
