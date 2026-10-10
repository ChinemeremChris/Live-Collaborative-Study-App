import { useEffect, useLayoutEffect, useRef, useState } from "react";

export default function FitText({ children, className, startFontSize }){
    const containerRef = useRef(null)
    const [fontSize, setFontSize] = useState(startFontSize)

    useLayoutEffect(() => {
        const el = containerRef.current
        if(!el) return

        let currentSize = startFontSize
        const minSize = 12

        el.style.fontSize = `${currentSize}px`

        while(currentSize > minSize && (el.scrollHeight > el.clientHeight  || el.scrollWidth > el.clientWidth)){
            currentSize -= 1
            el.style.fontSize = `${currentSize}px`
        }
        
        setFontSize(currentSize)
    }, [children])

    return (
        <div ref={containerRef} style={{ fontSize: `${fontSize}px` }} className={`${className}`}>
            {children}
        </div>
    )
}