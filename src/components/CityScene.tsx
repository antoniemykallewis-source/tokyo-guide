import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { color, mix, positionWorld, time } from 'three/tsl';

export type CitySceneProps = {
  activeCode?: string;
  tier?: 'full' | 'lite';
  onReady?: () => void;
  onSelectDistrict?: (code: string) => void;
};

// Coordinates are centroids of the supplied venues. Buildings and roads are art,
// not cartography. Never use this decorative scene for navigation.
const DISTRICTS = [
  ['SBY', 35.66012, 139.69924], ['HAR', 35.6691, 139.70766],
  ['EBI', 35.6475, 139.70862], ['NAK', 35.64815, 139.69858],
  ['SHM', 35.66174, 139.66826], ['SHJ', 35.69211, 139.70204],
  ['KOE', 35.7033, 139.6499], ['GIN', 35.67308, 139.76568],
  ['TSU', 35.66528, 139.7706], ['TOY', 35.64703, 139.78603],
  ['ODA', 35.62475, 139.77725], ['ASA', 35.71304, 139.79868],
  ['AKI', 35.69922, 139.77158], ['DOM', 35.70625, 139.753],
  ['TOR', 35.6668, 139.7496],
].map(([code, lat, lng]) => ({
  code: code as string,
  x: ((lng as number) - 139.735) * 175,
  z: (35.674 - (lat as number)) * 205,
}));
const LIME = '#DFFF00';
const PAPER = '#F2EEE5';
const INK = '#0B0B0B';

const css = `
.na-city {width:100%;height:100%;min-height:280px;position:relative;overflow:hidden;background:#0B0B0B;isolation:isolate}
.na-city canvas {display:block;touch-action:pan-y!important}
.na-city:after {content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 -80px 80px -60px #0B0B0B;z-index:1}
.na-city-caption {position:absolute;right:16px;bottom:14px;z-index:2;color:#a7aaa0;font:9px/1.5 'Martian Mono',monospace;letter-spacing:.08em;text-transform:uppercase;text-align:right;pointer-events:none}
.na-city-caption b {display:block;color:#DFFF00;font-weight:500}
.na-city-static {position:absolute;inset:0;background:#0B0B0B;overflow:hidden}
.na-city-static svg {display:block;width:100%;height:100%;min-height:280px}
@media (max-width:640px) {.na-city-static svg {width:140%;max-width:none;margin-left:-20%}.na-city-caption {max-width:210px;font-size:8px}}
`;

function StaticCity({ activeCode, onReady }: Pick<CitySceneProps, 'activeCode' | 'onReady'>) {
  useEffect(() => { onReady?.(); }, [onReady]);
  const scene = useMemo(() => {
    // Isometric illustration, not fabricated Tokyo building footprints.
    const project = (x: number, z: number, h = 0): [number, number] => [800 + (x - z) * 29, 490 + (x + z) * 13 - h * 48];
    const polygon = (points: [number, number][]) => points.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
    const path = (points: [number, number][]) => points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const buildings: { id: number; depth: number; roof: string; left: string; right: string; windows: string; height: number }[] = [];
    for (let row = 0; row < 19; row++) for (let col = 0; col < 19; col++) {
      const id = row * 19 + col;
      const x = (col - 9) * 1.8;
      const z = (row - 9) * 1.8;
      if (rand(id + 28) < .16 || Math.abs(x + z * .35) < .9 || Math.abs(z - x * .15) < .9) continue;
      const width = .74 + rand(id + 81) * .5;
      const depth = .75 + rand(id + 140) * .5;
      const density = .35 + .65 * Math.max(0, 1 - Math.hypot(x, z) / 23);
      const height = .35 + Math.pow(rand(id + 73), 2.2) * 5.8 * density;
      const top = [project(x, z, height), project(x + width, z, height), project(x + width, z + depth, height), project(x, z + depth, height)];
      const floor = [project(x, z), project(x + width, z), project(x + width, z + depth), project(x, z + depth)];
      const windows: string[] = [];
      for (let level = .24; level < height - .12; level += .27) {
        if (rand(id + Math.round(level * 15)) > .28) windows.push(path([project(x + width, z + depth * .13, level), project(x + width, z + depth * .83, level)]));
        if (rand(id + Math.round(level * 27)) > .52) windows.push(path([project(x + width * .2, z + depth, level), project(x + width * .85, z + depth, level)]));
      }
      buildings.push({ id, depth: x + z, height, roof: polygon(top), left: polygon([top[3], top[2], floor[2], floor[3]]), right: polygon([top[1], top[2], floor[2], floor[1]]), windows: windows.join(' ') });
    }
    buildings.sort((a, b) => a.depth - b.depth);
    const grid = Array.from({ length: 23 }, (_, i) => {
      const v = (i - 11) * 1.8;
      return `${path([project(v, -20), project(v, 20)])} ${path([project(-20, v), project(20, v)])}`;
    }).join(' ');
    const districts = DISTRICTS.map(d => ({ ...d, point: project(d.x, d.z) }));
    return { buildings, grid, districts };
  }, []);
  return <div className="na-city-static" aria-hidden="true">
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" focusable="false">
      <path d="M800 -20 L1660 490 L800 1020 L-60 490Z" fill="#0d130d" />
      <path d={scene.grid} fill="none" stroke="#485d32" strokeWidth=".8" opacity=".42" />
      {scene.buildings.map(b => <g key={b.id} stroke="#536844" strokeWidth=".7" strokeLinejoin="round">
        <polygon points={b.left} fill="#121e13" />
        <polygon points={b.right} fill="#1e2d19" />
        <polygon points={b.roof} fill={b.height > 3 ? '#465532' : '#2c3a24'} />
        {b.windows && <path d={b.windows} fill="none" stroke={b.height > 3 ? '#aec26b' : '#708349'} strokeWidth="1.1" opacity={b.height > 3 ? '.66' : '.4'} />}
      </g>)}
      {scene.districts.map(d => {
        const selected = activeCode === d.code;
        const [x, y] = d.point;
        return <g key={d.code} opacity={selected ? 1 : .56} stroke={selected ? LIME : '#a0b66e'}>
          <ellipse cx={x} cy={y} rx={selected ? 43 : 27} ry={selected ? 18 : 11} fill="#0b0b0b" fillOpacity=".6" strokeWidth={selected ? 2 : 1} />
          {selected && <ellipse cx={x} cy={y} rx="57" ry="24" fill="none" opacity=".38" strokeWidth="1" />}
          <path d={`M${x},${y}V${y - (selected ? 130 : 67)}`} strokeWidth={selected ? 2 : 1} />
          <rect x={x - 4} y={y - (selected ? 138 : 75)} width="8" height="8" fill={selected ? LIME : '#a0b66e'} stroke="none" transform={`rotate(45 ${x} ${y - (selected ? 134 : 71)})`} />
          <text x={x + 10} y={y - (selected ? 130 : 67)} stroke="none" fill={selected ? LIME : PAPER} fontFamily="'Martian Mono', monospace" fontSize={selected ? 13 : 10} letterSpacing="1">{d.code}</text>
        </g>;
      })}
    </svg>
  </div>;
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function useSceneActivity(ref: { current: HTMLDivElement | null }) {
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReduced(media.matches);
    let inView = true;
    const update = () => setActive(inView && document.visibilityState === 'visible');
    const observer = new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? false; update(); }, { rootMargin: '100px' });
    if (ref.current) observer.observe(ref.current);
    document.addEventListener('visibilitychange', update);
    media.addEventListener('change', updateMotion);
    update();
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); media.removeEventListener('change', updateMotion); };
  }, [ref]);
  return { active, reduced };
}

type GraphicsSupport = 'checking' | 'webgpu' | 'webgl2' | 'none';

// Do not instantiate Three's WebGL backend until an actual context exists.
// A browser may expose navigator.gpu but return no adapter, or expose the
// WebGL constructors while GPU access is disabled by its environment.
export async function detectGraphicsSupport(): Promise<Exclude<GraphicsSupport, 'checking'>> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'none';
  try {
    const gpu = navigator.gpu;
    if (gpu && await gpu.requestAdapter({ powerPreference: 'low-power' })) return 'webgpu';
  } catch {
    // An unavailable/rejected adapter still permits a genuine WebGL2 fallback.
  }
  let context: WebGL2RenderingContext | null = null;
  try {
    const probe = document.createElement('canvas');
    probe.width = probe.height = 1;
    context = probe.getContext('webgl2', { antialias: false, depth: false });
    return context && !context.isContextLost() && context.getParameter(context.VERSION)
      ? 'webgl2' : 'none';
  } catch {
    return 'none';
  } finally {
    // The detached probe is never rendered and must not consume a live context.
    try { context?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* best effort */ }
  }
}

function useGraphicsSupport(enabled: boolean) {
  const [support, setSupport] = useState<GraphicsSupport>('checking');
  useEffect(() => {
    let cancelled = false;
    if (!enabled) return;
    setSupport('checking');
    void detectGraphicsSupport().then(result => { if (!cancelled) setSupport(result); });
    return () => { cancelled = true; };
  }, [enabled]);
  return support;
}

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const update = () => setCoarse(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return coarse;
}

// A demand loop limits continuous background work to 30 fps on phone/lite,
// 60 fps on full. Hidden or offscreen scenes have no animation timer.
function FrameBudget({ active, tier }: { active: boolean; tier: 'full' | 'lite' }) {
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => {
    if (!active) return;
    let timer: number;
    const tick = () => { invalidate(); timer = window.setTimeout(tick, 1000 / (tier === 'full' ? 60 : 30)); };
    tick();
    return () => window.clearTimeout(timer);
  }, [active, tier, invalidate]);
  return null;
}

function rand(n: number) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function CityBlocks({ tier }: { tier: 'full' | 'lite' }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const wire = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const { solid, outline } = useMemo(() => {
    const solid = new THREE.MeshBasicNodeMaterial();
    // Procedural facade windows are generated by the real TSL shader graph.
    // The same node graph runs on WebGPU and Three's WebGL2 backend.
    const rows = positionWorld.y.mul(5).fract().step(.72);
    const columns = positionWorld.x.add(positionWorld.z).mul(4).fract().step(.62);
    const flicker = positionWorld.x.mul(3).add(positionWorld.z).add(time.mul(.08)).sin().mul(.5).add(.5);
    solid.colorNode = mix(color('#10170f'), color('#647440'), rows.mul(columns).mul(flicker).mul(.7));
    const outline = new THREE.MeshBasicNodeMaterial({ color: '#64763a', wireframe: true, transparent: true, opacity: .22 });
    return { solid, outline };
  }, []);
  const blocks = useMemo(() => {
    const result: { x: number; z: number; y: number; sx: number; sz: number }[] = [];
    const resolution = tier === 'full' ? 30 : 22;
    const spacing = 30 / resolution;
    for (let row = 0; row < resolution; row++) for (let col = 0; col < resolution; col++) {
      const n = row * resolution + col;
      const x = (col - resolution / 2) * spacing;
      const z = (row - resolution / 2) * spacing;
      if (Math.abs(x + z * .38) < .55 || Math.abs(z - x * .12) < .55 || rand(n) < .12) continue;
      // A deliberate open river-like cut. It is graphic composition, not Tokyo geography.
      if (x > 6 && z > 3 && x - z * .6 > 3 && x - z * .6 < 4.7) continue;
      const central = Math.max(0, 1 - Math.hypot(x + 2, z + 1) / 18);
      const y = .14 + Math.pow(rand(n + 14), 3) * 3.7 * central;
      result.push({ x, z, y, sx: spacing * (.4 + rand(n + 3) * .28), sz: spacing * (.38 + rand(n + 4) * .3) });
    }
    return result;
  }, [tier]);
  useEffect(() => {
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      matrix.compose(new THREE.Vector3(b.x, b.y / 2, b.z), rotation, new THREE.Vector3(b.sx, b.y, b.sz));
      mesh.current?.setMatrixAt(i, matrix);
      wire.current?.setMatrixAt(i, matrix);
    }
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
    if (wire.current) wire.current.instanceMatrix.needsUpdate = true;
  }, [blocks]);
  useEffect(() => () => { geometry.dispose(); solid.dispose(); outline.dispose(); }, [geometry, solid, outline]);
  return <>
    <instancedMesh ref={mesh} args={[geometry, solid, blocks.length]} frustumCulled={false} />
    <instancedMesh ref={wire} args={[geometry, outline, blocks.length]} frustumCulled={false} />
  </>;
}

function DistrictRings({ activeCode, onSelectDistrict }: CitySceneProps) {
  const active = DISTRICTS.find(d => d.code === activeCode) ?? DISTRICTS[0];
  const scan = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (scan.current) {
      const k = (clock.elapsedTime * .18) % 1;
      scan.current.scale.setScalar(1 + k * 1.35);
      (scan.current.material as THREE.Material).opacity = .3 * (1 - k);
    }
  });
  return <>
    {DISTRICTS.map(d => <group key={d.code} position={[d.x, .07, d.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={e => { e.stopPropagation(); onSelectDistrict?.(d.code); }}>
        <ringGeometry args={[d.code === activeCode ? .65 : .38, d.code === activeCode ? .71 : .41, 64]} />
        <meshBasicMaterial color={d.code === activeCode ? LIME : '#a5af74'} transparent opacity={d.code === activeCode ? 1 : .5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, d.code === activeCode ? .55 : .22, 0]}>
        <cylinderGeometry args={[.018, .018, d.code === activeCode ? 1.1 : .4, 4]} />
        <meshBasicMaterial color={LIME} transparent opacity={d.code === activeCode ? 1 : .42} />
      </mesh>
      <mesh position={[0, d.code === activeCode ? 1.12 : .44, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[d.code === activeCode ? .17 : .08, d.code === activeCode ? .17 : .08, d.code === activeCode ? .17 : .08]} />
        <meshBasicMaterial color={d.code === activeCode ? LIME : PAPER} />
      </mesh>
    </group>)}
    <mesh ref={scan} position={[active.x, .08, active.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[.74, .77, 64]} />
      <meshBasicMaterial color={LIME} transparent opacity={.3} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  </>;
}

function Scramble({ activeCode, tier }: Required<Pick<CitySceneProps, 'tier'>> & Pick<CitySceneProps, 'activeCode'>) {
  const count = tier === 'full' ? 1200 : 320;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const elapsed = useRef(0);
  const completed = useRef(false);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const scale = useMemo(() => new THREE.Vector3(.026, .07, .026), []);
  const rotation = useMemo(() => new THREE.Quaternion(), []);
  const targets = useMemo(() => {
    const district = DISTRICTS.find(d => d.code === activeCode) ?? DISTRICTS[0];
    return Array.from({ length: count }, (_, i) => {
      const angle = rand(i + 81) * Math.PI * 2;
      const ring = .8 + rand(i + 171) * .24;
      const lane = (i % 4) * Math.PI / 2 + Math.PI / 4;
      const distance = rand(i + 60) * 12 + 2;
      return {
        sx: district.x + Math.cos(lane) * distance + (rand(i + 3) - .5) * .65,
        sz: district.z + Math.sin(lane) * distance + (rand(i + 5) - .5) * .65,
        tx: district.x + Math.cos(angle) * ring,
        tz: district.z + Math.sin(angle) * ring,
        ty: i % 5 === 0 ? .1 + rand(i + 4) * 1.6 : .12,
        delay: rand(i + 321) * .5,
      };
    });
  }, [activeCode, count]);
  useEffect(() => { elapsed.current = 0; completed.current = false; }, [targets]);
  useFrame((_, delta) => {
    if (!mesh.current || completed.current) return;
    elapsed.current += Math.min(delta, .05);
    for (let i = 0; i < count; i++) {
      const t = targets[i];
      const p = Math.max(0, Math.min(1, (elapsed.current - t.delay) / 1.7));
      const eased = 1 - Math.pow(1 - p, 3);
      position.set(THREE.MathUtils.lerp(t.sx, t.tx, eased), THREE.MathUtils.lerp(.1, t.ty, eased), THREE.MathUtils.lerp(t.sz, t.tz, eased));
      matrix.compose(position, rotation, scale);
      mesh.current.setMatrixAt(i, matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (elapsed.current > 2.3) completed.current = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
    <boxGeometry args={[1, 1, 1]} />
    <meshBasicMaterial color={LIME} transparent opacity={.65} />
  </instancedMesh>;
}

function CameraRig({ activeCode }: Pick<CitySceneProps, 'activeCode'>) {
  const look = useRef(new THREE.Vector3(-1, 0, 0));
  const target = useMemo(() => new THREE.Vector3(), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const initial = useRef(true);
  useFrame(({ camera, pointer }, delta) => {
    const district = DISTRICTS.find(d => d.code === activeCode);
    const x = district ? district.x * .23 : 0;
    const z = district ? district.z * .23 : 0;
    target.set(x, 0, z);
    position.set(17 + x + pointer.x * 1.3, 17 - pointer.y * .7, 24 + z);
    const lerp = initial.current ? 1 : 1 - Math.exp(-delta * 2.5);
    camera.position.lerp(position, lerp);
    look.current.lerp(target, lerp);
    camera.lookAt(look.current);
    initial.current = false;
  });
  return null;
}

function Warmup({ onReady, onFailed }: Pick<CitySceneProps, 'onReady'> & { onFailed: () => void }) {
  const { gl, scene, camera } = useThree();
  const ready = useRef(onReady);
  const failed = useRef(onFailed);
  ready.current = onReady;
  failed.current = onFailed;
  useEffect(() => {
    let cancelled = false;
    const renderer = gl as unknown as THREE.WebGPURenderer;
    const frame = requestAnimationFrame(() => {
      renderer.compileAsync(scene, camera).then(() => {
        if (!cancelled) ready.current?.();
      }).catch(() => {
        // Never label a failed shader compile as ready. Replace the decoration
        // with the usable static schematic instead.
        if (!cancelled) failed.current();
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [gl, scene, camera]);
  return null;
}

function World({ activeCode, tier = 'lite', onReady, onSelectDistrict, onFailed }: CitySceneProps & { onFailed: () => void }) {
  const hour = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Tokyo', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  const night = hour >= 17 || hour < 6;
  return <>
    <color attach="background" args={[INK]} />
    <fog attach="fog" args={[INK, 25, 65]} />
    <ambientLight intensity={night ? .25 : .6} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.03, 0]}>
      <planeGeometry args={[55, 55]} /><meshBasicMaterial color={night ? '#0a1009' : '#11170d'} />
    </mesh>
    <gridHelper args={[42, 42, '#354022', '#20251b']} position={[0, .005, 0]} />
    <CityBlocks tier={tier} />
    <DistrictRings activeCode={activeCode} onSelectDistrict={onSelectDistrict} />
    <Scramble activeCode={activeCode} tier={tier} />
    <CameraRig activeCode={activeCode} />
    <Warmup onReady={onReady} onFailed={onFailed} />
  </>;
}

export default function CityScene({ activeCode = 'SBY', tier = 'lite', onReady, onSelectDistrict }: CitySceneProps) {
  const root = useRef<HTMLDivElement>(null);
  const { active, reduced } = useSceneActivity(root);
  const graphicsSupport = useGraphicsSupport(!reduced);
  const coarse = useCoarsePointer();
  const renderTier = coarse ? 'lite' : tier;
  const [rendererName, setRendererName] = useState('3D archive');
  const [failed, setFailed] = useState(false);
  const onFailed = useCallback(() => setFailed(true), []);
  const onFallbackReady = useCallback(() => { setRendererName('Static isometric archive'); onReady?.(); }, [onReady]);
  const fallback = <StaticCity activeCode={activeCode} onReady={onFallbackReady} />;
  return <div className="na-city" ref={root} aria-label="Decorative schematic Tokyo city. Use the area list for navigation.">
    <style>{css}</style>
    {reduced || failed || graphicsSupport === 'checking' || graphicsSupport === 'none' ? fallback : <SceneBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <Canvas
          camera={{ position: [17, 17, 24], fov: 42, near: .1, far: 100 }}
          dpr={[1, renderTier === 'full' ? 1.75 : 1.25]}
          frameloop={active ? 'demand' : 'never'}
          fallback={fallback}
          gl={async props => {
            const renderer = new THREE.WebGPURenderer({ canvas: props.canvas as HTMLCanvasElement, antialias: renderTier === 'full', alpha: false, powerPreference: renderTier === 'full' ? 'high-performance' : 'low-power', forceWebGL: graphicsSupport === 'webgl2', outputBufferType: renderTier === 'full' ? THREE.HalfFloatType : THREE.UnsignedByteType });
            await renderer.init();
            const backend = renderer.backend as { isWebGPUBackend?: boolean };
            setRendererName(backend.isWebGPUBackend ? 'WebGPU / TSL' : 'WebGL2 / TSL');
            return renderer;
          }}
        >
          <FrameBudget active={active} tier={renderTier} />
          <World activeCode={activeCode} tier={renderTier} onReady={onReady} onSelectDistrict={onSelectDistrict} onFailed={onFailed} />
        </Canvas>
      </Suspense>
    </SceneBoundary>}
    <div className="na-city-caption"><b>{reduced ? 'STATIC ISOMETRIC ARCHIVE' : rendererName}</b>Schematic city. Not a navigation map.</div>
  </div>;
}
