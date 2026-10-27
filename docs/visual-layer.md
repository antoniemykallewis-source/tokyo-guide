# Keyless visual layer

`src/components/CityScene.tsx` is a progressively enhanced decorative city, never a substitute for the practical area/card navigation.

## Contract

Default export `CityScene` accepts `activeCode?: string`, `tier?: 'full' | 'lite'`, `onReady?: () => void`, plus optional `onSelectDistrict?: (code: string) => void`.

Import it using `React.lazy`. The wrapping layout must give it a height. It fills that box and has a 280px minimum height. Keep the HTML guide fully usable while the visual chunk loads or fails.

## What is real

- React Three Fiber 9 uses an asynchronous `WebGPURenderer` factory.
- Three's WebGPU renderer automatically chooses WebGL2 when WebGPU is unsupported.
- A real TSL node graph generates lit facade rows, columns, and subtle temporal variation. This is not a CSS WebGPU label.
- `compileAsync(scene, camera)` runs after the scene is mounted. `onReady` signals successful compile completion (or availability of the static fallback). No fake loading percentage.
- District markers use centroid coordinates calculated from the 94 supplied places. They do not claim station precision.
- 1,200 instanced scramble particles on full tier, 320 on lite, move from crossing lanes into the selected district ring. This is CPU-updated instancing, not a GPGPU simulation.
- Instanced abstract building geometry and outline edges. Area selection shifts the camera and reruns the scramble.
- Pointer parallax, real Tokyo hour adjusting the base ground lighting, scan rings.
- DPR caps, offscreen/hidden-tab pause, reduced-motion static fallback, error boundary.

## What is not present

No Google photorealistic tiles, no Mapbox Standard, no real street/building geometry, no licensed environmental audio, no Rive file, no FBO compositor. No keys, credentials, paid API calls, or quotas are created or changed. These are genuine pending integrations, not claimed achievements. The component includes a persistent schematic disclaimer.

## Official compatibility references

- R3F Canvas async renderer and WebGPU integration: https://r3f.docs.pmnd.rs/api/canvas
- Three backend fallback and `forceWebGL`: https://threejs.org/docs/pages/WebGPURenderer.html
- Three Shading Language node material graph: https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language

Consulted 2026-10-27. Actual supported devices must still be tested. No real-phone or cellular performance pass is claimed by this module.

## Validation performed

- Scoped strict TypeScript check passed against the installed React 19, R3F 9 and Three 0.183 types.
- Isolated Vite 8 production build passed. The entire visual harness plus React was 478.21 KB gzip, so this module must remain a deferred chunk outside the initial interaction budget.
- Runtime browser validation is not yet established: local Chromium could not launch under socket restrictions. The single escalation attempt failed during environment setup. The cloud browser could not reach the separate workspace's localhost (`ERR_CONNECTION_REFUSED`). No screenshot or WebGL2 render pass is claimed.
- Remaining required verification: published-browser render, backend caption, shader completion, area reselection, reduced-motion fallback, mobile dimensions, and physical iPhone/Android performance.
