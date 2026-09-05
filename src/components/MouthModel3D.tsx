import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { UICopy } from '../i18n'
import type { TargetSound } from '../types'

const colors = {
  coral: 0xff705c,
  coralLight: 0xffb4a8,
  teal: 0x27d8c2,
  navy: 0x081f4d,
  gold: 0xffd47a,
  tissue: 0xf6b3a9,
  velum: 0xd9a7ff,
  bone: 0xfff8e8,
}

function tube(points: THREE.Vector3[], color: number, radius = 0.055, opacity = 1) {
  const curve = new THREE.CatmullRomCurve3(points)
  const geometry = new THREE.TubeGeometry(curve, 48, radius, 12, false)
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: opacity < 1 ? 0.22 : 0.1,
    transparent: opacity < 1,
    opacity,
    roughness: 0.52,
  })
  return { mesh: new THREE.Mesh(geometry, material), curve }
}

function ellipsoid(
  scale: [number, number, number],
  position: [number, number, number],
  color: number,
  opacity = 1,
) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.56,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 28), material)
  mesh.scale.set(...scale)
  mesh.position.set(...position)
  return mesh
}

export function MouthModel3D({ copy }: { copy: UICopy['model'] }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [sound, setSound] = useState<TargetSound>('L')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    camera.position.set(0.05, 0.55, 6.8)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)

    const model = new THREE.Group()
    const defaultRotation = -0.2
    model.rotation.set(-0.05, defaultRotation, 0)
    model.position.y = -0.05
    scene.add(model)

    // Sagittal cutaway: lips are on the right and the throat is on the left.
    model.add(tube([
      new THREE.Vector3(-0.35, 0.92, 0),
      new THREE.Vector3(0.35, 1.12, 0),
      new THREE.Vector3(1.08, 0.94, 0),
      new THREE.Vector3(1.52, 0.62, 0),
    ], colors.tissue, 0.13).mesh)

    model.add(tube([
      new THREE.Vector3(-1.22, 1.28, 0),
      new THREE.Vector3(-0.25, 1.64, 0),
      new THREE.Vector3(0.85, 1.55, 0),
      new THREE.Vector3(1.58, 1.18, 0),
    ], colors.teal, 0.045, 0.32).mesh)
    model.add(ellipsoid([1.28, 0.3, 0.42], [0.15, 1.35, 0], colors.teal, 0.08))

    model.add(tube([
      new THREE.Vector3(-1.42, -0.75, 0),
      new THREE.Vector3(-1.48, 0.15, 0),
      new THREE.Vector3(-1.35, 1.12, 0),
    ], colors.tissue, 0.09, 0.62).mesh)

    model.add(tube([
      new THREE.Vector3(-1.25, -0.78, 0),
      new THREE.Vector3(-0.2, -1.02, 0),
      new THREE.Vector3(0.95, -0.76, 0),
      new THREE.Vector3(1.62, -0.18, 0),
    ], colors.tissue, 0.075, 0.55).mesh)

    const tongue = ellipsoid(
      [1.42, 0.47, sound === 'N' ? 0.72 : 0.61],
      [-0.1, -0.48, 0],
      colors.coral,
    )
    tongue.rotation.z = -0.03
    model.add(tongue)

    model.add(tube([
      new THREE.Vector3(0.18, -0.3, 0),
      new THREE.Vector3(0.66, 0.03, 0),
      new THREE.Vector3(1.04, 0.48, 0),
    ], colors.coral, sound === 'N' ? 0.25 : 0.19).mesh)

    const tip = ellipsoid(
      sound === 'N' ? [0.42, 0.2, 0.8] : [0.34, 0.18, 0.42],
      [1.08, 0.55, 0],
      colors.coralLight,
    )
    tip.rotation.z = -0.13
    model.add(tip)

    const ridge = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.08, 14, 42, Math.PI * 1.65),
      new THREE.MeshStandardMaterial({ color: colors.gold, emissive: colors.gold, emissiveIntensity: 0.18 }),
    )
    ridge.rotation.set(Math.PI / 2, 0, -0.3)
    ridge.position.set(1.05, 0.8, 0)
    model.add(ridge)

    const velumPoints = sound === 'L'
      ? [new THREE.Vector3(-0.34, 0.92, 0), new THREE.Vector3(-0.76, 1.05, 0), new THREE.Vector3(-1.23, 1.04, 0)]
      : [new THREE.Vector3(-0.34, 0.92, 0), new THREE.Vector3(-0.68, 0.74, 0), new THREE.Vector3(-0.92, 0.47, 0)]
    model.add(tube(velumPoints, colors.velum, 0.13).mesh)

    const teethMaterial = new THREE.MeshStandardMaterial({ color: colors.bone, roughness: 0.28 })
    for (const z of [-0.3, 0, 0.3]) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.32, 0.2), teethMaterial)
      tooth.position.set(1.53, 0.42, z)
      tooth.rotation.z = -0.13
      model.add(tooth)
    }
    ;[0.28, -0.05]
      .map((y) => ellipsoid([0.18, 0.1, 0.56], [1.76, y, 0], colors.tissue))
      .forEach((lip) => model.add(lip))

    const airflow = sound === 'N'
      ? [tube([
          new THREE.Vector3(-1.48, -0.55, 0),
          new THREE.Vector3(-1.35, 0.25, 0),
          new THREE.Vector3(-1.08, 0.92, 0),
          new THREE.Vector3(-0.3, 1.38, 0),
          new THREE.Vector3(0.78, 1.39, 0),
          new THREE.Vector3(1.62, 1.13, 0),
        ], colors.teal, 0.06)]
      : [-0.62, 0.62].map((z) => tube([
          new THREE.Vector3(-1.42, -0.43, z * 0.25),
          new THREE.Vector3(-0.72, -0.05, z * 0.55),
          new THREE.Vector3(0.15, 0, z),
          new THREE.Vector3(0.98, 0.25, z * 1.08),
          new THREE.Vector3(1.73, 0.12, z * 0.66),
        ], colors.coral, 0.055))
    airflow.forEach(({ mesh }) => model.add(mesh))

    const particles = airflow.map(({ curve }) => {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 18, 12),
        new THREE.MeshStandardMaterial({ color: sound === 'N' ? colors.teal : colors.coral, emissive: sound === 'N' ? colors.teal : colors.coral, emissiveIntensity: 0.8 }),
      )
      model.add(particle)
      return { particle, curve }
    })

    scene.add(new THREE.HemisphereLight(0xffffff, colors.navy, 2.3))
    const key = new THREE.DirectionalLight(0xffffff, 3.4)
    key.position.set(2.5, 4, 5)
    scene.add(key)
    const rim = new THREE.DirectionalLight(sound === 'N' ? colors.teal : colors.coral, 1.6)
    rim.position.set(-3, 2, 2)
    scene.add(rim)

    let dragging = false
    let hasDragged = false
    let previousX = 0
    const pointerDown = (event: PointerEvent) => {
      dragging = true
      hasDragged = true
      previousX = event.clientX
      renderer.domElement.setPointerCapture(event.pointerId)
    }
    const pointerMove = (event: PointerEvent) => {
      if (!dragging) return
      model.rotation.y = THREE.MathUtils.clamp(model.rotation.y + (event.clientX - previousX) * 0.008, -0.62, 0.32)
      previousX = event.clientX
    }
    const pointerUp = () => { dragging = false }
    renderer.domElement.addEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointermove', pointerMove)
    renderer.domElement.addEventListener('pointerup', pointerUp)
    renderer.domElement.addEventListener('pointercancel', pointerUp)
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

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    const clock = new THREE.Clock()
    const animate = () => {
      const elapsed = clock.getElapsedTime()
      particles.forEach(({ particle, curve }, index) => {
        particle.position.copy(curve.getPoint((elapsed * (reducedMotion ? 0 : 0.28) + index * 0.42) % 1))
      })
      if (!dragging && !hasDragged && !reducedMotion) model.rotation.y = defaultRotation + Math.sin(elapsed * 0.42) * 0.06
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
      renderer.domElement.removeEventListener('pointercancel', pointerUp)
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

  const callouts = sound === 'L' ? [copy.lContact, copy.lVelum, copy.lAir] : [copy.nContact, copy.nVelum, copy.nAir]

  return (
    <section className={`mouth-model-card sound-${sound.toLowerCase()}`} data-testid="mouth-model" data-sound={sound}>
      <div className="model-toolbar">
        <div><span>{copy.interactive}</span><strong>{sound === 'L' ? copy.lateral : copy.nasal}</strong></div>
        <div className="model-switch" role="group" aria-label={copy.soundPicker}>
          {(['L', 'N'] as const).map((item) => (
            <button key={item} data-testid={`model-sound-${item.toLowerCase()}`} type="button" aria-pressed={sound === item} className={sound === item ? `active ${item.toLowerCase()}` : ''} onClick={() => setSound(item)}>{item}</button>
          ))}
        </div>
      </div>
      <div ref={hostRef} className="mouth-model-canvas" role="img" aria-label={sound === 'L' ? copy.ariaL : copy.ariaN} />
      <div className="model-callouts">
        {callouts.map((callout, index) => <span key={callout}><b>{index + 1}</b>{callout}</span>)}
      </div>
      <div className="model-legend" aria-hidden="true">
        <span><i className="tongue-key" />{copy.tongue}</span>
        <span><i className="ridge-key" />{copy.ridge}</span>
        <span><i className="velum-key" />{copy.velum}</span>
        <span><i className={sound === 'N' ? 'air-key nasal' : 'air-key'} />{copy.airPath}</span>
      </div>
      <p><strong>{copy.drag}</strong> {copy.disclaimer}</p>
    </section>
  )
}
