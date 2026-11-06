import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * GSAP staggered entrance animation hook for card grids and list items
 */
export function useStaggerFade(selector: string = '.stagger-item', delay: number = 0.05) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const elements = containerRef.current.querySelectorAll(selector)
    if (!elements || elements.length === 0) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        elements,
        {
          opacity: 0,
          y: 18,
          scale: 0.98,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: delay,
          ease: 'power2.out',
          clearProps: 'transform',
        }
      )
    }, containerRef)

    return () => ctx.revert()
  }, [selector, delay])

  return containerRef
}

/**
 * Animated counter using GSAP
 */
export function animateCounter(target: HTMLElement, endValue: number, duration: number = 1.2) {
  const obj = { val: 0 }
  gsap.to(obj, {
    val: endValue,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      if (target) {
        target.innerText = Math.round(obj.val).toLocaleString()
      }
    },
  })
}
