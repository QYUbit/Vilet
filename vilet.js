import { registerBinding } from "./bind";
import { component, template } from "./component";
import { computed, effect, reactive, watch } from "./reactivity";

const V = {
    reactive,
    effect,
    computed,
    watch,

    component,
    template,

    registerBinding
}

export default V
