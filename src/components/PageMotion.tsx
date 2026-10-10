import { useEffect, useLayoutEffect } from "react"
import { useLocation } from "react-router-dom"

export function PageMotion() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    const scope = document.querySelector(".app-main")
    if (!scope || !("IntersectionObserver" in window)) return
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    let intersection: IntersectionObserver | undefined
    let mutations: MutationObserver | undefined
    const clear = () => {
      intersection?.disconnect()
      mutations?.disconnect()
      scope.querySelectorAll(".motion-pending, .motion-revealed").forEach((element) => {
        element.classList.remove("motion-pending", "motion-revealed")
      })
    }
    const start = () => {
      clear()
      if (preference.matches) return
      const observed = new WeakSet<Element>()
      intersection = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.remove("motion-pending")
          entry.target.classList.add("motion-revealed")
          intersection?.unobserve(entry.target)
        }
      }, { threshold: 0.06 })
      const observe = () => {
        scope.querySelectorAll("[data-reveal]").forEach((element) => {
          if (observed.has(element)) return
          observed.add(element)
          element.classList.add("motion-pending")
          intersection?.observe(element)
        })
      }
      // One observer also covers lists populated after the page's network request.
      mutations = new MutationObserver(observe)
      mutations.observe(scope, { childList: true, subtree: true })
      observe()
    }
    start()
    preference.addEventListener("change", start)
    return () => { clear(); preference.removeEventListener("change", start) }
  }, [pathname])

  return null
}
