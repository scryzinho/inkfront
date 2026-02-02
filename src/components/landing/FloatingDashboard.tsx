import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, Environment } from "@react-three/drei";
import * as THREE from "three";

function DashboardCard({ position, rotation, scale = 1 }: { 
  position: [number, number, number]; 
  rotation?: [number, number, number];
  scale?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
      meshRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.2) * 0.03;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <RoundedBox
        ref={meshRef}
        args={[2.5 * scale, 1.5 * scale, 0.08]}
        radius={0.15}
        position={position}
        rotation={rotation}
      >
        <meshPhysicalMaterial
          color="#1a1a1a"
          metalness={0.1}
          roughness={0.2}
          transmission={0.6}
          thickness={0.5}
          envMapIntensity={0.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </RoundedBox>
    </Float>
  );
}

function FloatingElements() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#ffffff" />
      
      <DashboardCard position={[0, 0, 0]} scale={1.2} />
      <DashboardCard position={[-2.5, -1, -1]} rotation={[0.1, 0.3, 0]} scale={0.8} />
      <DashboardCard position={[2.5, 0.8, -0.5]} rotation={[-0.1, -0.2, 0.05]} scale={0.9} />
      
      <Environment preset="city" />
    </>
  );
}

export function FloatingDashboard() {
  return (
    <div className="absolute inset-0 opacity-40">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <FloatingElements />
      </Canvas>
    </div>
  );
}
