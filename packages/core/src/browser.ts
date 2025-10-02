import {
    reactive,
    ref,
    effect,
    element,
    clone,
    scheduler,
    registerBinding,
    bindProp
} from "./index"
(window as any).V = {
    reactive,
    ref,
    effect,
    element,
    clone,
    scheduler,
    registerBinding,
    bindProp
}