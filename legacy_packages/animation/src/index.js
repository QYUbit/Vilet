export default function animation(V) {
    V.registerBinding("$animate", (el, ctx, bind) => {
        const { 
            enter = "fadeIn", 
            exit = "fadeOut",
            easing = "cubic-bezier(0.4, 0, 0.2, 1)",
            duration = 300,
            trigger 
        } = bind
        
        const animations = {
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
        
        if (trigger) {
            return V.effect(() => {
                const shouldShow = withContext(trigger, ctx)
                const keyframes = shouldShow ? animations[enter] : animations[exit]
                
                el.animate(keyframes, { 
                    duration,
                    easing,
                    fill: "forwards",
                })
            })
        }
    })
}

function withContext(value, ...args) {
    return typeof value === "function"? value(...args): value
}
