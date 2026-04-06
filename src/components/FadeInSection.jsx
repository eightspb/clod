import { useEffect, useRef, useState } from 'react'

export function FadeInSection({ children, className = '', delay = 0, staggerIndex = 0 }) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(true)
  const [shouldAnimate, setShouldAnimate] = useState(false)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.top > window.innerHeight * 0.85) {
      setIsVisible(false)
      setShouldAnimate(true)
      const fallback = setTimeout(() => setIsVisible(true), 2000)
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.unobserve(el)
            clearTimeout(fallback)
          }
        },
        { threshold: 0.08, rootMargin: '0px 0px 80px 0px' }
      )
      observer.observe(el)
      return () => { observer.disconnect(); clearTimeout(fallback) }
    }
  }, [])
  const totalDelay = delay + staggerIndex * 100
  if (!shouldAnimate) {
    return <div ref={ref} className={className}>{children}</div>
  }
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${totalDelay}ms, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${totalDelay}ms`,
      }}
    >
      {children}
    </div>
  )
}
