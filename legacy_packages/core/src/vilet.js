import { registerBinding } from "./bind";
import { component, registerDirective, template } from "./component";
import { computed, effect, reactive, watch } from "./reactivity";
import { scheduler } from "./scheduler";

const V = {
    reactive,
    effect,
    computed,
    watch,
    scheduler,

    component,
    template,

    registerDirective,
    registerBinding,
    use
}

function use(cb) {
    cb(V)
}

export default V
