import { useEffect, useRef, useCallback, useState } from 'react'

function useAurora(disabled: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (disabled) return
    const el = ref.current
    if (!el) return
    let frame: number
    let start = performance.now()
    const animate = (now: number) => {
      const t = (now - start) / 1000
      el.style.transform = `
        translate(
          ${Math.sin(t * 0.015) * 4}%,
          ${Math.cos(t * 0.02) * 3}%
        )
        rotate(${Math.sin(t * 0.01) * 3}deg)
      `
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])
  return ref
}

function useParticles(disabled: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0, active: false })

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (disabled) return
    mouseRef.current.x = e.clientX
    mouseRef.current.y = e.clientY
    mouseRef.current.active = true
  }, [disabled])

  const onMouseLeave = useCallback(() => {
    mouseRef.current.active = false
  }, [])

  useEffect(() => {
    if (disabled) return
    window.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [onMouseMove, onMouseLeave, disabled])

  useEffect(() => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)
    let frame: number
    let angleX = 0, angleY = 0, angleZ = 0

    const formulas = [
      'f(x) = ∫ e^x dx', '∇ × E = -∂B/∂t', 'E = mc²', 'iℏ ∂/∂t |Ψ⟩ = Ĥ |Ψ⟩',
      '∑ x_i p_i', 'O(n log n)', '1010101', 'P ≠ NP', 'dy/dx', 'λ*x.x',
      'π ≈ 3.14159', 'θ = ωt + φ', 'log₂(N)', 'G(V, E)'
    ]

    const count = 50
    const particles = Array.from({ length: count }, () => {
      const isFormula = Math.random() < 0.22
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35 - 0.05,
        size: Math.random() * 1.5 + 0.8,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.5 ? 'rgba(0, 242, 254,' : 'rgba(139, 92, 246,',
        isFormula,
        text: isFormula ? formulas[Math.floor(Math.random() * formulas.length)] : '',
        parallaxFactor: Math.random() * 0.04 + 0.015
      }
    })

    // Page Visibility Tracker to freeze loop on tab hide
    let isVisible = true
    const handleVisibilityChange = () => {
      isVisible = !document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 3D Wireframe Cube Definition
    interface Point3D { x: number; y: number; z: number }
    const cubeVertices: Point3D[] = [
      { x: -50, y: -50, z: -50 },
      { x: 50, y: -50, z: -50 },
      { x: 50, y: 50, z: -50 },
      { x: -50, y: 50, z: -50 },
      { x: -50, y: -50, z: 50 },
      { x: 50, y: -50, z: 50 },
      { x: 50, y: 50, z: 50 },
      { x: -50, y: 50, z: 50 },
    ]
    const cubeEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ]

    // 3D Wireframe Sphere Definition
    const sphereVertices: Point3D[] = []
    const sphereEdges: [number, number][] = []
    const rings = 6
    const segments = 10
    const radius = 45

    for (let r = 0; r <= rings; r++) {
      const phi = (r * Math.PI) / rings
      const sinPhi = Math.sin(phi)
      const cosPhi = Math.cos(phi)

      for (let s = 0; s < segments; s++) {
        const theta = (s * 2 * Math.PI) / segments
        const sinTheta = Math.sin(theta)
        const cosTheta = Math.cos(theta)

        sphereVertices.push({
          x: radius * sinPhi * cosTheta,
          y: radius * cosPhi,
          z: radius * sinPhi * sinTheta,
        })
      }
    }

    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < segments; s++) {
        const p1 = r * segments + s
        const p2 = r * segments + ((s + 1) % segments)
        const p3 = (r + 1) * segments + s
        
        sphereEdges.push([p1, p2])
        if (r < rings) {
          sphereEdges.push([p1, p3])
        }
      }
    }

    const rotateX3D = (pt: Point3D, angle: number): Point3D => {
      const cos = Math.cos(angle), sin = Math.sin(angle)
      return { x: pt.x, y: pt.y * cos - pt.z * sin, z: pt.y * sin + pt.z * cos }
    }
    const rotateY3D = (pt: Point3D, angle: number): Point3D => {
      const cos = Math.cos(angle), sin = Math.sin(angle)
      return { x: pt.x * cos + pt.z * sin, y: pt.y, z: -pt.x * sin + pt.z * cos }
    }
    const rotateZ3D = (pt: Point3D, angle: number): Point3D => {
      const cos = Math.cos(angle), sin = Math.sin(angle)
      return { x: pt.x * cos - pt.y * sin, y: pt.x * sin + pt.y * cos, z: pt.z }
    }

    const animate = (now: number) => {
      if (!isVisible) {
        frame = requestAnimationFrame(animate)
        return
      }

      ctx.clearRect(0, 0, w, h)
      const mouse = mouseRef.current
 
      // Slowly increase angles for rotating 3D shapes
      angleX += 0.005
      angleY += 0.008
      angleZ += 0.003

      // Parallax shifts based on mouse position
      const mpx = mouse.active ? (mouse.x - w / 2) : 0
      const mpy = mouse.active ? (mouse.y - h / 2) : 0

      // 1. Draw Digital Wave at the bottom (Background)
      ctx.beginPath()
      for (let x = 0; x < w; x += 15) {
        const yOffset = h - 60 + Math.sin(x * 0.005 + now * 0.001) * 12 + Math.cos(x * 0.0025 - now * 0.0006) * 6 + (mpy * 0.02)
        const alpha = 0.06 + Math.sin(x * 0.01 + now * 0.0015) * 0.03
        ctx.fillStyle = `rgba(0, 242, 254, ${alpha})`
        ctx.fillRect(x + (mpx * 0.01), yOffset, 2.2, 2.2)
      }

      // 2. Draw 3D Rotating Sphere in top left (Midground)
      const sphereCenterX = 180 + (mpx * 0.02)
      const sphereCenterY = 180 + (mpy * 0.02)
      const projectedSphere: { x: number; y: number }[] = []

      sphereVertices.forEach((v) => {
        let rot = rotateX3D(v, angleX * 0.6)
        rot = rotateY3D(rot, angleY * 0.6)
        
        const d = 250
        const scale = d / (d + rot.z)
        projectedSphere.push({
          x: sphereCenterX + rot.x * scale,
          y: sphereCenterY + rot.y * scale
        })
      })

      ctx.strokeStyle = 'rgba(139, 92, 246, 0.06)'
      ctx.lineWidth = 0.7
      sphereEdges.forEach(([start, end]) => {
        if (projectedSphere[start] && projectedSphere[end]) {
          ctx.beginPath()
          ctx.moveTo(projectedSphere[start].x, projectedSphere[start].y)
          ctx.lineTo(projectedSphere[end].x, projectedSphere[end].y)
          ctx.stroke()
        }
      })

      // 3. Draw 3D Rotating Wireframe Cube in bottom right (Midground)
      const centerX = w - 160 + (mpx * 0.03)
      const centerY = h - 160 + (mpy * 0.03)
      const projected: { x: number; y: number }[] = []
      
      cubeVertices.forEach((v) => {
        let rot = rotateX3D(v, angleX)
        rot = rotateY3D(rot, angleY)
        rot = rotateZ3D(rot, angleZ)
        
        // 3D to 2D projection
        const d = 250 // Perspective distance
        const scale = d / (d + rot.z)
        projected.push({
          x: centerX + rot.x * scale,
          y: centerY + rot.y * scale
        })
      })

      ctx.strokeStyle = 'rgba(0, 242, 254, 0.07)'
      ctx.lineWidth = 0.8
      cubeEdges.forEach(([start, end]) => {
        ctx.beginPath()
        ctx.moveTo(projected[start].x, projected[start].y)
        ctx.lineTo(projected[end].x, projected[end].y)
        ctx.stroke()
      })

      // 3. Draw Particles (Forefront)
      particles.forEach((p, idx) => {
        // Adjust velocity
        p.x += p.vx
        p.y += p.vy

        // Wave motion
        p.y += Math.sin(now * 0.001 + p.phase) * 0.06

        // Mouse interaction (repel gently)
        if (mouse.active) {
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 140) {
            const force = (140 - dist) / 140
            const angle = Math.atan2(dy, dx)
            p.x += Math.cos(angle) * force * 1.2
            p.y += Math.sin(angle) * force * 1.2
          }
        }

        // Apply Parallax drift to final coordinates
        const renderX = p.x + (mpx * p.parallaxFactor)
        const renderY = p.y + (mpy * p.parallaxFactor)

        // Bound checks
        if (p.y < -30) { p.y = h + 30; p.x = Math.random() * w }
        if (p.x < -30) p.x = w + 30
        if (p.x > w + 30) p.x = -30

        const alpha = Math.min(1, Math.max(0.12, 1 - p.y / h)) * 0.45

        if (p.isFormula) {
          ctx.font = '9px monospace'
          ctx.fillStyle = `${p.color} ${alpha * 0.7})`
          ctx.fillText(p.text, renderX, renderY)
        } else {
          ctx.beginPath()
          ctx.arc(renderX, renderY, p.size, 0, Math.PI * 2)
          ctx.fillStyle = `${p.color} ${alpha})`
          ctx.fill()

          ctx.beginPath()
          ctx.arc(renderX, renderY, p.size * 3, 0, Math.PI * 2)
          ctx.fillStyle = `${p.color} ${alpha * 0.15})`
          ctx.fill()
        }

        // Connect nearby nodes
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j]
          if (p.isFormula || p2.isFormula) continue
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 110) {
            const lineAlpha = (110 - dist) / 110 * alpha * 0.25
            const renderX2 = p2.x + (mpx * p2.parallaxFactor)
            const renderY2 = p2.y + (mpy * p2.parallaxFactor)

            ctx.beginPath()
            ctx.moveTo(renderX, renderY)
            ctx.lineTo(renderX2, renderY2)
            ctx.strokeStyle = `rgba(0, 242, 254, ${lineAlpha})`
            ctx.lineWidth = 0.55
            ctx.stroke()
          }
        }
      })

      frame = requestAnimationFrame(animate)
    }

    const resize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    frame = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [onMouseMove])

  return canvasRef
}

function useNoise(disabled: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 128, h = 128
    canvas.width = w
    canvas.height = h
    let frame: number

    const animate = () => {
      const imageData = ctx.createImageData(w, h)
      for (let i = 0; i < imageData.data.length; i += 4) {
        const v = Math.random() * 255
        imageData.data[i] = v
        imageData.data[i + 1] = v
        imageData.data[i + 2] = v
        imageData.data[i + 3] = 10
      }
      ctx.putImageData(imageData, 0, 0)
      frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  return canvasRef
}

export function BackgroundEffects() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const auroraRef = useAurora(isMobile)
  const particlesRef = useParticles(isMobile)
  const noiseRef = useNoise(isMobile)

  if (isMobile) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {/* Layer 1: Aurora (cosmic mesh) */}
      <div
        ref={auroraRef}
        className="absolute inset-0 opacity-[0.08] dark:opacity-[0.14]"
        style={{
          background:
            'radial-gradient(ellipse at 20% 40%, rgba(0,242,254,0.22) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.25) 0%, transparent 50%), radial-gradient(ellipse at 40% 90%, rgba(16,185,129,0.15) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(59,130,246,0.18) 0%, transparent 50%)',
          filter: 'blur(100px)',
        }}
      />

      {/* Layer 2: Conic mesh gradient */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          background:
            'conic-gradient(from 0deg at 50% 50%, rgba(0,242,254,0.1) 0deg, rgba(139,92,246,0.08) 120deg, rgba(16,185,129,0.06) 240deg, rgba(0,242,254,0.1) 360deg)',
          filter: 'blur(70px)',
        }}
      />

      {/* Layer 3: Particles & Neural Connections */}
      <canvas
        ref={particlesRef}
        className="absolute inset-0 opacity-70 dark:opacity-90"
      />

      {/* Layer 4: Premium Tech Grid */}
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,242,254,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(0,242,254,0.25) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 25%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 25%, transparent 75%)',
        }}
      />

      {/* Layer 5: Noise Overlay */}
      <canvas
        ref={noiseRef}
        className="absolute inset-0 w-full h-full opacity-[0.015] dark:opacity-[0.022]"
        style={{ imageRendering: 'pixelated', mixBlendMode: 'overlay' }}
      />

      {/* Layer 6: Soft Light Streaks */}
      <div
        className="absolute inset-0 opacity-[0.018] dark:opacity-[0.025]"
        style={{
          background:
            'linear-gradient(135deg, transparent 35%, rgba(0,242,254,0.15) 45%, transparent 55%), linear-gradient(225deg, transparent 35%, rgba(139,92,246,0.12) 45%, transparent 55%)',
          filter: 'blur(50px)',
        }}
      />
    </div>
  )
}
