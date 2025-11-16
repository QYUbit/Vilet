import { effect, ReactiveValue, registerBinding } from "../../core/src";
import { getReactiveValue } from "../../core/src/utils";

const transitions = {
    fadeIn: [
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 1, transform: "translateY(0)" }
    ],
    fadeOut: [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-10px)" }
    ],
    slideIn: [
        { opacity: 1, transform: "translateX(-100%)" },
        { opacity: 1, transform: "translateX(0)" }
    ],
    slideOut: [
        { opacity: 1, transform: "translateX(0)" },
        { opacity: 1, transform: "translateX(100%)" }
    ]
}

export interface TransitionConfig {
    show: ReactiveValue<boolean>
    enter?: keyof typeof transitions
    exit?: keyof typeof transitions
    easing?: string
    duration?: number
}

interface ShowElement extends HTMLElement {
    _shouldShow?: boolean
}

export function registerAnimation() {
    registerBinding<TransitionConfig>("$transition", (el, conf) => {
        const {
            show,
            enter = "fadeIn", 
            exit = "fadeOut",
            easing = "cubic-bezier(0.4, 0, 0.2, 1)",
            duration = 300, 
        } = conf

        return effect(() => {
            const shouldShow = getReactiveValue(show)
        
            const showEl = el as ShowElement
            if (showEl._shouldShow === shouldShow) return
        
            showEl._shouldShow = shouldShow
            
            if (shouldShow) {
                showEl.style.display = "block"
            } else {
                setTimeout(
                    () => showEl.style.display = "none",
                    duration
                )
            }
            
            const keyframes = shouldShow ? transitions[enter] : transitions[exit]

            el.animate(keyframes, { 
                duration,
                easing,
                fill: "forwards",
            })
        })
    })
}
