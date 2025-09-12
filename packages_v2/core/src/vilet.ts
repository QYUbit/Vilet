import { bindProp, registerBinding } from "./bind"
import { element } from "./element"
import { effect, reactive, Ref, ref } from "./reactivity"
import { scheduler } from "./scheduler"
import { clone } from "./template"

const V = {
    reactive,
    ref,
    effect,
    element,
    clone,
    scheduler,

    registerBinding,
    bindProp,
    addProperty,
    use,

}

function use(cb: (v: typeof V) => void) {
    cb(V)
}

function addProperty(name: string, options: PropertyDescriptor & ThisType<any>) {
    Object.defineProperty(V, name, options)
}

export type Vilet = typeof V
export default V