import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { TargetSound } from '../types'

const colors = {
  coral: 0xff705c,
  teal: 0x13a99b,
  navy: 0x081f4d,
  gold: 0xffd47a,
  tissue: 0xf6b3a9,
}

function tube(points: THREE.Vector3[], color: number, radius = 0.055) {
  const curve = new THREE.CatmullRomCurve3(points)
  const geometry = new THREE.TubeGeometry(curve, 42, radius, 10, false)
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.12 })
  return { mesh: new THREE.Mesh(geometry, material), curve }
}

export function MouthModel3D() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [sound, setSound] = useState<TargetSound>('L')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    camera.position.set(0.1, 0.45, 6.3)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)

    const model = new THREE.Group()
    model.rotation.set(-0.08, -0.34, 0)
    scene.add(model)

    const palatePath = [
      new THREE.Vector3(-1.65, 0.55, 0),
      new THREE.Vector3(-0.95, 1.08, 0),
      new THREE.Vector3(0.05, 1.2, 0),
      new THREE.Vector3(1.25, 0.72, 0),
    ]
    model.add(tube(palatePath, colors.tissue, 0.16).mesh)

    const tongueMaterial = new THREE.MeshStandardMaterial({
      color: colors.coral,
      roughness: 0.55,
      metalness: 0.02,
    })
    const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 52, 30), tongueMaterial)
    tongue.scale.set(1.48, 0.43, sound === 'N' ? 0.78 : 0.62)
    tongue.position.set(-0.18, -0.52, 0)
    tongue.rotation.z = -0.06
    model.add(tongue)

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.42, 38, 24), tongueMaterial)
    tip.scale.set(sound === 'N' ? 1.02 : 0.7, 0.38, sound === 'N' ? 1.5 : 0.75)
    tip.position.set(1.02, sound === 'N' ? 0.48 : 0.37, 0)
    model.add(tip)

    const ridge = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.09, 14, 44, Math.PI * 1.5),
      new THREE.MeshStandardMaterial({ color: colors.gold, emissive: colors.gold, emissiveIntensity: 0.14 }),
    )
    ridge.rotation.set(Math.PI / 2, 0, -0.34)
    ridge.position.set(0.92, 0.72, 0)
    model.add(ridge)

    const teethMaterial = new THREE.MeshStandardMaterial({ color: 0xfffcf1, roughness: 0.3 })
    for (const z of [-0.45, -0.15, 0.15, 0.45]) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 0.23), teethMaterial)
      tooth.position.set(1.55, 0.43, z)
      tooth.rotation.z = -0.12
      model.add(tooth)
    }

    const airflow = sound === 'N'
      ? [tube([
          new THREE.Vector3(0.82, 0.58, 0),
          new THREE.Vector3(0.3, 1.15, 0),
          new THREE.Vector3(-0.25, 1.58, 0),
        ], colors.teal)]
      : [-0.58, 0.58].map((z) => tube([
          new THREE.Vector3(0.5, -0.18, z * 0.7),
          new THREE.Vector3(1.04, -0.02, z),
          new THREE.Vector3(1.72, 0.1, z * 0.82),
        ], colors.coral))
    airflow.forEach(({ mesh }) => model.add(mesh))

    const particles = airflow.map(({ curve }) => {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 18, 12),
        new THREE.MeshStandardMaterial({ color: sound === 'N' ? colors.teal : colors.coral, emissive: sound === 'N' ? colors.teal : colors.coral }),
      )
      model.add(particle)
      return { particle, curve }
    })

    scene.add(new THREE.HemisphereLight(0xffffff, colors.navy, 2.1))
    const key = new THREE.DirectionalLight(0xffffff, 3.2)
    key.position.set(2, 4, 5)
    scene.add(key)

    let dragging = false
    let previousX = 0
    const pointerDown = (event: PointerEvent) => {
      dragging = true
      previousX = event.clientX
      renderer.domElement.setPointerCapture(event.pointerId)
    }
    const pointerMove = (event: PointerEvent) => {
      if (!dragging) return
      model.rotation.y += (event.clientX - previousX) * 0.009
      previousX = event.clientX
    }
    const pointerUp = () => { dragging = false }
    renderer.domElement.addEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointermove', pointerMove)
    renderer.domElement.addEventListener('pointerup', pointerUp)
    renderer.domElement.style.touchAction = 'none'

    const resize = () => {
      const width = Math.max(1, host.clientWidth)
      const height = Math.max(1, host.clientHeight)
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    let frame = 0
    const clock = new THREE.Clock()
    const animate = () => {
      const elapsed = clock.getElapsedTime()
      particles.forEach(({ particle, curve }, index) => {
        particle.position.copy(curve.getPoint((elapsed * 0.34 + index * 0.37) % 1))
      })
      if (!dragging) model.rotation.y += 0.0012
      renderer.render(scene, camera)
      frame = window.requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointermove', pointerMove)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => material.dispose())
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [sound])

  return (
    <section className="mouth-model-card">
      <div className="model-toolbar">
        <div><span>Interactive model</span><strong>{sound === 'L' ? 'Lateral airflow' : 'Nasal airflow'}</strong></div>
        <div className="model-switch" aria-label="Model sound">
          {(['L', 'N'] as const).map((item) => (
            <button key={item} className={sound === item ? `active ${item.toLowerCase()}` : ''} onClick={() => setSound(item)}>{item}</button>
          ))}
        </div>
      </div>
      <div ref={hostRef} className="mouth-model-canvas" aria-label={`Rotatable teaching model for the ${sound} sound`} />
      <div className="model-legend">
        <span><i className="tongue-key" />tongue</span>
        <span><i className="ridge-key" />contact ridge</span>
        <span><i className={sound === 'N' ? 'air-key nasal' : 'air-key'} />air path</span>
      </div>
      <p>Drag to rotate. This is a model articulation—not a scan or measurement of your tongue.</p>
    </section>
  )
}
