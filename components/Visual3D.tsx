
import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll, MeshDistortMaterial, Stars, Environment, Box, Torus, Sphere, Icosahedron, Octahedron, Ring, Float } from '@react-three/drei';
import * as THREE from 'three';

const SECTION_HEIGHT = 10; // Vertical distance between 3D modules

const HeroModule = () => {
  const meshRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    meshRef.current.rotation.y += 0.005;
    meshRef.current.rotation.z += 0.002;
  });
  return (
    <group ref={meshRef}>
      <Float speed={2} rotationIntensity={1} floatIntensity={1}>
        <Octahedron args={[2, 0]}>
          <meshStandardMaterial color="#7c3aed" wireframe transparent opacity={0.6} emissive="#7c3aed" emissiveIntensity={2} />
        </Octahedron>
        <Octahedron args={[1.2, 0]}>
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={5} />
        </Octahedron>
      </Float>
    </group>
  );
};

const AimModule = () => {
  const ring1 = useRef<THREE.Mesh>(null!);
  const ring2 = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    ring1.current.rotation.x += 0.02;
    ring1.current.rotation.y += 0.01;
    ring2.current.rotation.x -= 0.015;
    ring2.current.rotation.z += 0.02;
  });
  return (
    <group>
      <mesh ref={ring1}>
        <Torus args={[1.5, 0.02, 16, 100]}>
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={10} />
        </Torus>
      </mesh>
      <mesh ref={ring2}>
        <Torus args={[1.2, 0.01, 16, 100]}>
          <meshStandardMaterial color="#d8b4fe" emissive="#d8b4fe" emissiveIntensity={5} />
        </Torus>
      </mesh>
      <Box args={[0.01, 3, 0.01]}>
        <meshBasicMaterial color="#a855f7" transparent opacity={0.4} />
      </Box>
      <Box args={[3, 0.01, 0.01]}>
        <meshBasicMaterial color="#a855f7" transparent opacity={0.4} />
      </Box>
    </group>
  );
};

const IntelModule = () => {
  return (
    <group>
      <Float speed={5} rotationIntensity={2} floatIntensity={2}>
        <Icosahedron args={[1.5, 1]}>
          <MeshDistortMaterial color="#6d28d9" distort={0.4} speed={3} emissive="#6d28d9" emissiveIntensity={2} />
        </Icosahedron>
      </Float>
    </group>
  );
};

const TacticalModule = () => {
  const sweep = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    sweep.current.rotation.z -= 0.05;
  });
  return (
    <group rotation={[-Math.PI / 3, 0, 0]}>
      <gridHelper args={[6, 12, '#4b5563', '#1e1b4b']} />
      <Ring args={[2.4, 2.5, 64]}>
        <meshBasicMaterial color="#a855f7" side={THREE.DoubleSide} />
      </Ring>
      <mesh ref={sweep} position={[0, 0, 0.05]}>
        <planeGeometry args={[2.5, 0.05]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

const PhysicsModule = () => {
  const group = useRef<THREE.Group>(null!);
  useFrame((state) => {
    group.current.children.forEach((child, i) => {
      child.rotation.x += 0.01 + i * 0.001;
      child.rotation.y += 0.01 - i * 0.001;
      child.position.y += Math.sin(state.clock.elapsedTime + i) * 0.002;
    });
  });
  return (
    <group ref={group}>
      {[...Array(12)].map((_, i) => (
        <Box 
          key={i} 
          args={[0.4, 0.4, 0.4]} 
          position={[
            Math.cos(i * 1.2) * 2, 
            Math.sin(i * 1.5) * 1.5, 
            Math.sin(i * 0.8) * 1
          ]}
        >
          <meshStandardMaterial color={i % 2 === 0 ? "#7c3aed" : "#ffffff"} emissive={i % 2 === 0 ? "#7c3aed" : "#ffffff"} emissiveIntensity={2} />
        </Box>
      ))}
    </group>
  );
};

const WorldModule = () => {
  return (
    <group>
      <Sphere args={[2, 64, 64]}>
        <MeshDistortMaterial color="#c084fc" distort={0.6} speed={4} wireframe />
      </Sphere>
      <Sphere args={[1, 32, 32]}>
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={10} />
      </Sphere>
    </group>
  );
};

const Scene = () => {
  const scroll = useScroll();
  const worldRef = useRef<THREE.Group>(null!);
  const { viewport } = useThree();

  useFrame((state) => {
    // total scroll is 0 to 1 over 7 pages.
    // We move the world group upwards as we scroll down.
    const targetY = scroll.offset * SECTION_HEIGHT * 6;
    worldRef.current.position.y = THREE.MathUtils.lerp(worldRef.current.position.y, targetY, 0.1);
  });

  return (
    <group ref={worldRef}>
      <Stars radius={100} depth={50} count={7000} factor={4} saturation={0} fade speed={1.5} />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={3} color="#7c3aed" />

      {/* Position each module vertically */}
      <group position={[0, 0, 0]}>
        <HeroModule />
      </group>

      <group position={[0, -SECTION_HEIGHT, 0]}>
        <AimModule />
      </group>

      <group position={[0, -SECTION_HEIGHT * 2, 0]}>
        <IntelModule />
      </group>

      <group position={[0, -SECTION_HEIGHT * 3, 0]}>
        <TacticalModule />
      </group>

      <group position={[0, -SECTION_HEIGHT * 4, 0]}>
        <PhysicsModule />
      </group>

      <group position={[0, -SECTION_HEIGHT * 5, 0]}>
        <WorldModule />
      </group>
      
      <group position={[0, -SECTION_HEIGHT * 6, 0]}>
        <HeroModule /> {/* Final module for Auth section */}
      </group>

      <Environment preset="night" />
    </group>
  );
};

export default Scene;
