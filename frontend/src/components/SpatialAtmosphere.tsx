import { Canvas } from "@react-three/fiber";
import { Float, Sparkles, Stars } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";

function SpatialAccent({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <Float speed={reducedMotion ? 0 : 0.45} rotationIntensity={reducedMotion ? 0 : 0.08} floatIntensity={reducedMotion ? 0 : 0.18}>
      <mesh rotation={[0.3, 0.1, 0]}>
        <torusGeometry args={[1.7, 0.008, 8, 120]} />
        <meshBasicMaterial color="#c7a77a" transparent opacity={0.45} />
      </mesh>
      <mesh rotation={[1.2, 0.5, 0.3]} scale={1.35}>
        <torusGeometry args={[1.7, 0.006, 8, 120]} />
        <meshBasicMaterial color="#e5d4ba" transparent opacity={0.24} />
      </mesh>
    </Float>
  );
}

export default function SpatialAtmosphere() {
  const reducedMotion = useReducedMotion();
  return (
    <div className="spatial-atmosphere" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 6], fov: 43 }} dpr={[1, 1.25]} gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}>
        <ambientLight intensity={0.7} />
        <SpatialAccent reducedMotion={Boolean(reducedMotion)} />
        {!reducedMotion && <Sparkles count={34} scale={7} size={1.8} speed={0.12} color="#f0ddbd" />}
        <Stars radius={9} depth={4} count={35} factor={1} saturation={0} fade speed={reducedMotion ? 0 : 0.08} />
      </Canvas>
    </div>
  );
}
