import { effect, Ref, registerBinding } from "../../core/src";

export function registerModel() {
    registerBinding<Ref<any>>("$model", (el, model) => {
        const inputEl = el as HTMLInputElement

        const cleanup = effect(() => {
            const current = model.value

            if (inputEl.type === "checkbox") {
                if (inputEl.checked !== current) {
                    inputEl.checked = !!current
                }
            } else if (inputEl.type === "radio") {
                if (inputEl.checked !== (inputEl.value === String(current))) {
                    inputEl.checked = inputEl.value === String(current)
                }
            } else {
                if (inputEl.value !== String(current || "")) {
                    inputEl.value = String(current || "")
                }
            }
        })

        const eventType = getModelEventType(inputEl)
        const domChange = () => {            
            if (inputEl.type === "checkbox") {
                model.value = inputEl.checked
            } else if (inputEl.type === "radio") {
                model.value = inputEl.value
            } else if (inputEl.type === "number" || inputEl.type === "range") {
                model.value = inputEl.valueAsNumber
            } else {
                model.value = inputEl.value
            }
        }
    
        inputEl.addEventListener(eventType, domChange)

        return () => {
            inputEl.removeEventListener(eventType, domChange)
            cleanup()
        }
    })
}

function getModelEventType(el: HTMLInputElement): string {
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
