import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll, MeshDistortMaterial, Stars, Environment, Box, Torus, Sphere, Icosahedron, Octahedron, Ring, Float } from '@react-three/drei';
import * as THREE from 'three';

// Fix: Use component aliases for R3F intrinsic elements to resolve JSX namespace errors when types are not detected.
const Group = 'group' as any;
const Mesh = 'mesh' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const AmbientLight = 'ambientLight' as any;
const PointLight = 'pointLight' as any;
const GridHelper = 'gridHelper' as any;
const PlaneGeometry = 'planeGeometry' as any;

const SECTION_HEIGHT = 10; // Vertical distance between 3D modules

const HeroModule = () => {
  const meshRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    meshRef.current.rotation.y += 0.005;
    meshRef.current.rotation.z += 0.002;
  });
  return (
    // Fix: Using Group alias to avoid intrinsic element error
    <Group ref={meshRef}>
      <Float speed={2} rotationIntensity={1} floatIntensity={1}>
        <Octahedron args={[2, 0]}>
          <MeshStandardMaterial color="#7c3aed" wireframe transparent opacity={0.6} emissive="#7c3aed" emissiveIntensity={2} />
        </Octahedron>
        <Octahedron args={[1.2, 0]}>
          <MeshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={5} />
        </Octahedron>
      </Float>
    </Group>
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
    <Group>
      <Mesh ref={ring1}>
        <Torus args={[1.5, 0.02, 16, 100]}>
          <MeshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={10} />
        </Torus>
      </Mesh>
      <Mesh ref={ring2}>
        <Torus args={[1.2, 0.01, 16, 100]}>
          <MeshStandardMaterial color="#d8b4fe" emissive="#d8b4fe" emissiveIntensity={5} />
        </Torus>
      </Mesh>
      <Box args={[0.01, 3, 0.01]}>
        <MeshBasicMaterial color="#a855f7" transparent opacity={0.4} />
      </Box>
      <Box args={[3, 0.01, 0.01]}>
        <MeshBasicMaterial color="#a855f7" transparent opacity={0.4} />
      </Box>
    </Group>
  );
};

const IntelModule = () => {
  return (
    <Group>
      <Float speed={5} rotationIntensity={2} floatIntensity={2}>
        <Icosahedron args={[1.5, 1]}>
          <MeshDistortMaterial color="#6d28d9" distort={0.4} speed={3} emissive="#6d28d9" emissiveIntensity={2} />
        </Icosahedron>
      </Float>
    </Group>
  );
};

const TacticalModule = () => {
  const sweep = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    sweep.current.rotation.z -= 0.05;
  });
  return (
    <Group rotation={[-Math.PI / 3, 0, 0]}>
      <GridHelper args={[6, 12, '#4b5563', '#1e1b4b']} />
      <Ring args={[2.4, 2.5, 64]}>
        <MeshBasicMaterial color="#a855f7" side={THREE.DoubleSide} />
      </Ring>
      <Mesh ref={sweep} position={[0, 0, 0.05]}>
        <PlaneGeometry args={[2.5, 0.05]} />
        <MeshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.8} />
      </Mesh>
    </Group>
  );
};

const PhysicsModule = () => {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    groupRef.current.children.forEach((child, i) => {
      child.rotation.x += 0.01 + i * 0.001;
      child.rotation.y += 0.01 - i * 0.001;
      child.position.y += Math.sin(state.clock.elapsedTime + i) * 0.002;
    });
  });
  return (
    <Group ref={groupRef}>
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
          <MeshStandardMaterial color={i % 2 === 0 ? "#7c3aed" : "#ffffff"} emissive={i % 2 === 0 ? "#7c3aed" : "#ffffff"} emissiveIntensity={2} />
        </Box>
      ))}
    </Group>
  );
};

const WorldModule = () => {
  return (
    <Group>
      <Sphere args={[2, 64, 64]}>
        <MeshDistortMaterial color="#c084fc" distort={0.6} speed={4} wireframe />
      </Sphere>
      <Sphere args={[1, 32, 32]}>
        <MeshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={10} />
      </Sphere>
    </Group>
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
    <Group ref={worldRef}>
      <Stars radius={100} depth={50} count={7000} factor={4} saturation={0} fade speed={1.5} />
      <AmbientLight intensity={0.4} />
      <PointLight position={[10, 10, 10]} intensity={3} color="#7c3aed" />

      {/* Position each module vertically */}
      <Group position={[0, 0, 0]}>
        <HeroModule />
      </Group>

      <Group position={[0, -SECTION_HEIGHT, 0]}>
        <AimModule />
      </Group>

      <Group position={[0, -SECTION_HEIGHT * 2, 0]}>
        <IntelModule />
      </Group>

      <Group position={[0, -SECTION_HEIGHT * 3, 0]}>
        <TacticalModule />
      </Group>

      <Group position={[0, -SECTION_HEIGHT * 4, 0]}>
        <PhysicsModule />
      </Group>

      <Group position={[0, -SECTION_HEIGHT * 5, 0]}>
        <WorldModule />
      </Group>
      
      <Group position={[0, -SECTION_HEIGHT * 6, 0]}>
        <HeroModule /> {/* Final module for Auth section */}
      </Group>

      <Environment preset="night" />
    </Group>
  );
};

export default Scene;