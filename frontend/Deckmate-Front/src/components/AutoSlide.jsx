import { useState, useEffect, useRef } from "react"
export const useAutoSlide = (scrollRef, { enabled = true, interval = 3000 } = {}) => {
    const isInteractingRef = useRef(false)
    const timerRef = useRef(null)
    const startTimerRef = useRef(null)
    const [isAtStart, setIsAtStart] = useState(true)
    const [isAtEnd, setIsAtEnd] = useState(false)

    const UpdateScrollState = () => {
        const element = scrollRef.current
        if (!element) return
        const hasOverflow = element.scrollWidth > element.clientWidth

        setIsAtStart(!hasOverflow || element.scrollLeft <= 5)
        setIsAtEnd(!hasOverflow || element.scrollLeft + element.clientWidth >= element.scrollWidth - 5)
    }

    const GetStep = (element) => {
        const firstCard = element.children[0]
        if (!firstCard) return element.clientWidth
        const cardWidth = firstCard.getBoundingClientRect().width;
        const gap = parseFloat(getComputedStyle(element).columnGap || getComputedStyle(element).gap) || 0
        return cardWidth + gap
    }

    useEffect(() => {
        if (!enabled) return
        const element = scrollRef.current
        if (!element) return

        const startTimer = () => {
            clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => {
                if (isInteractingRef.current) return
                const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 5
                if (atEnd){
                    element.scrollTo({
                        left: 0,
                        behavior: "smooth"
                    })
                }else{
                    element.scrollBy({
                        left: GetStep(element),
                        behavior: "smooth"
                    })
                }
                startTimer()
            }, interval)
        }

        startTimerRef.current = startTimer

        const pause = () => {
            isInteractingRef.current = true
            clearTimeout(timerRef.current)
        }
        const resume = () => {
            isInteractingRef.current = false
            startTimer()
        }

        element.addEventListener("touchstart", pause, { passive: true })
        element.addEventListener("touchend", resume, { passive: true })
        startTimer()

        return () => {
            clearTimeout(timerRef.current)
            element.removeEventListener("touchstart", pause)
            element.removeEventListener("touchend", resume)
        }
    }, [enabled, interval, scrollRef])

    const ResetTimer = () => {
        startTimerRef.current?.()
    }

    const scrollLeft = () => {
        const element = scrollRef.current
        if (!element) return
        const left = GetStep(element)
        element.scrollBy({
            left: -left,
            behavior: "smooth"
        })
        ResetTimer()
    }

    const scrollRight = () => {
        const element = scrollRef.current
        if (!element) return

        element.scrollBy({
            left: GetStep(element),
            behavior: "smooth"
        })
        ResetTimer()
    }
    return {scrollLeft, scrollRight, UpdateScrollState, isAtStart, isAtEnd}
}