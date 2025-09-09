export default function observer(V) {
    V.registerBinding("$onIntersect", (el, ctx, cb) => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    cb(ctx, entry)
                }
            })
        }, { threshold: 0.1 })
        
        observer.observe(el)
        
        return () => observer.disconnect()
    })

    V.registerBinding("$onResize", (el, ctx, cb) => {
        const observer = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                cb(ctx, {
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                    element: entry.target
                })
            })
        })
        
        observer.observe(el)
        return () => observer.disconnect()
    })
}