'use client'

import { useEffect, useRef } from 'react'
import { useUIStore } from '@/stores/uiStore'

interface Star {
  x: number
  y: number
  radius: number
  opacity: number
  speed: number
  twinkleOffset: number
}

// [r, g, b] per theme
const STAR_RGB: Record<string, [number, number, number]> = {
  galaxy: [180, 120, 255],
  abyss:  [0,   200, 255],
  golden: [212, 168, 67],
  fire:   [255, 100, 30],
  cosmic: [100, 150, 255],
}

export default function StarfieldBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { bgTheme } = useUIStore()
  const [r, g, b] = STAR_RGB[bgTheme ?? ''] ?? [255, 255, 255]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame: number
    const stars: Star[] = []

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    function initStars() {
      stars.length = 0
      const count = Math.floor((window.innerWidth * window.innerHeight) / 8000)
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          radius: Math.random() * 1.5 + 0.3,
          opacity: Math.random() * 0.7 + 0.1,
          speed: Math.random() * 0.15 + 0.03,
          twinkleOffset: Math.random() * Math.PI * 2,
        })
      }
    }

    function draw(t: number) {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const star of stars) {
        const twinkle = Math.sin(t * 0.001 * star.speed * 10 + star.twinkleOffset)
        const alpha = star.opacity * (0.6 + 0.4 * twinkle)
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.fill()

        star.y -= star.speed
        if (star.y < -2) {
          star.y = canvas.height + 2
          star.x = Math.random() * canvas.width
        }
      }

      animFrame = requestAnimationFrame(draw)
    }

    resize()
    initStars()
    animFrame = requestAnimationFrame(draw)

    const onResize = () => { resize(); initStars() }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', onResize)
    }
  }, [r, g, b])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  )
}
