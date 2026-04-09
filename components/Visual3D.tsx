import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll, MeshDistortMaterial, Stars, Environment, Box, Torus, Sphere, Icosahedron, Octahedron, Ring, Float, Sparkles, Grid } from '@react-three/drei';
import * as THREE from 'three';

const Group = 'group' as any;
const Mesh = 'mesh' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const AmbientLight = 'ambientLight' as any;
const PointLight = 'pointLight' as any;
const GridHelper = 'gridHelper' as any;
const PlaneGeometry = 'planeGeometry' as any;
const SpotLight = 'spotLight' as any;

const SECTION_HEIGHT = 10;

const HeroModule = () => {
  const outerRef = useRef<THREE.Group>(null!);
  const innerRef = useRef<THREE.Group>(null!);
  const midRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    outerRef.current.rotation.y = t * 0.15;
    outerRef.current.rotation.z = Math.sin(t * 0.3) * 0.1;

    midRef.current.rotation.x = t * 0.4;
    midRef.current.rotation.y = -t * 0.2;

    innerRef.current.rotation.y = -t * 1.2;
    innerRef.current.rotation.x = Math.cos(t * 0.5) * 0.2;

    // Pulsing effect
    const scale = 1.2 + Math.sin(t * 4) * 0.08;
    innerRef.current.scale.set(scale, scale, scale);
  });

  return (
    <Group>
      <Float speed={3} rotationIntensity={0.8} floatIntensity={1.5}>
        {/* Inner Core */}
        <Group ref={innerRef}>
          <Icosahedron args={[0.8, 0]}>
            <MeshStandardMaterial
              color="#ffffff"
              emissive="#a855f7"
              emissiveIntensity={25}
              metalness={1}
              roughness={0}
            />
          </Icosahedron>
          <PointLight intensity={15} color="#a855f7" distance={10} />
        </Group>

        {/* Middle Shell - Geometric cage */}
        <Group ref={midRef}>
          <Torus args={[1.8, 0.015, 16, 100]}>
            <MeshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={5} />
          </Torus>
          <Torus args={[1.8, 0.015, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
            <MeshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={5} />
          </Torus>
        </Group>

        {/* Outer Shell - Large Wireframe */}
        <Group ref={outerRef}>
          <Octahedron args={[3, 0]}>
            <MeshStandardMaterial
              color="#7c3aed"
              wireframe
              transparent
              opacity={0.3}
              emissive="#7c3aed"
              emissiveIntensity={1}
            />
          </Octahedron>

          {/* Satellite points */}
          {[...Array(8)].map((_, i) => (
            <Mesh key={i} position={[
              Math.cos(i * Math.PI / 4) * 3,
              Math.sin(i * Math.PI / 4) * 3,
              Math.cos(i * Math.PI / 2) * 1.5
            ]}>
              <Sphere args={[0.1, 8, 8]}>
                <MeshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={10} />
              </Sphere>
            </Mesh>
          ))}
        </Group>
      </Float>
      <Sparkles count={120} scale={8} size={4} speed={0.8} color="#a855f7" />
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
        <Torus args={[2, 0.03, 16, 100]}>
          <MeshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={10} />
        </Torus>
      </Mesh>
      <Mesh ref={ring2}>
        <Torus args={[1.6, 0.02, 16, 100]}>
          <MeshStandardMaterial color="#d8b4fe" emissive="#d8b4fe" emissiveIntensity={5} />
        </Torus>
      </Mesh>
      <Box args={[0.02, 4, 0.02]}>
        <MeshBasicMaterial color="#a855f7" transparent opacity={0.5} />
      </Box>
      <Box args={[4, 0.02, 0.02]}>
        <MeshBasicMaterial color="#a855f7" transparent opacity={0.5} />
      </Box>
    </Group>
  );
};

const IntelModule = () => {
  return (
    <Group>
      <Float speed={5} rotationIntensity={2} floatIntensity={2}>
        <Icosahedron args={[2, 1]}>
          <MeshDistortMaterial color="#6d28d9" distort={0.5} speed={4} emissive="#6d28d9" emissiveIntensity={3} />
        </Icosahedron>
      </Float>
    </Group>
  );
};

const TacticalModule = () => {
  const sweep = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    sweep.current.rotation.z -= 0.08;
  });
  return (
    <Group rotation={[-Math.PI / 3, 0, 0]}>
      <GridHelper args={[10, 20, '#4b5563', '#1e1b4b']} />
      <Ring args={[3.4, 3.5, 64]}>
        <MeshBasicMaterial color="#a855f7" side={THREE.DoubleSide} />
      </Ring>
      <Mesh ref={sweep} position={[0, 0, 0.05]}>
        <PlaneGeometry args={[3.5, 0.08]} />
        <MeshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.8} />
      </Mesh>
    </Group>
  );
};

const PhysicsModule = () => {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    groupRef.current.children.forEach((child, i) => {
      child.rotation.x += 0.02 + i * 0.002;
      child.rotation.y += 0.02 - i * 0.002;
      child.position.y += Math.sin(state.clock.elapsedTime + i) * 0.005;
    });
  });
  return (
    <Group ref={groupRef}>
      {[...Array(15)].map((_, i) => (
        <Box
          key={i}
          args={[0.5, 0.5, 0.5]}
          position={[
            Math.cos(i * 1.5) * 3,
            Math.sin(i * 1.8) * 2,
            Math.sin(i * 1.2) * 2
          ]}
        >
          <MeshStandardMaterial color={i % 3 === 0 ? "#7c3aed" : "#ffffff"} emissive={i % 3 === 0 ? "#7c3aed" : "#ffffff"} emissiveIntensity={5} />
        </Box>
      ))}
    </Group>
  );
};

const WorldModule = () => {
  return (
    <Group>
      <Sphere args={[2.5, 64, 64]}>
        <MeshDistortMaterial color="#c084fc" distort={0.6} speed={4} wireframe />
      </Sphere>
      <Sphere args={[1.2, 32, 32]}>
        <MeshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={20} />
      </Sphere>
    </Group>
  );
};

const Scene = () => {
  const scroll = useScroll();
  const worldRef = useRef<THREE.Group>(null!);
  const gridRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const targetY = scroll.offset * SECTION_HEIGHT * 6;
    worldRef.current.position.y = THREE.MathUtils.lerp(worldRef.current.position.y, targetY, 0.1);

    // Grid follows scroll but also tiles for a "moving floor" effect
    if (gridRef.current) {
      gridRef.current.position.y = -SECTION_HEIGHT * 0.5 + targetY;
      gridRef.current.rotation.x = -Math.PI / 2.5 + (state.mouse.y * 0.05);
      gridRef.current.rotation.z = state.mouse.x * 0.05;
    }

    // Smooth camera drift
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, state.mouse.x * 0.8, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, state.mouse.y * 0.8, 0.05);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <Group>
      <Stars radius={150} depth={60} count={15000} factor={6} saturation={0} fade speed={3} />
      <AmbientLight intensity={0.3} />
      <SpotLight position={[15, 15, 15]} angle={0.2} penumbra={1} intensity={25} color="#a855f7" />
      <PointLight position={[-15, -15, -15]} intensity={12} color="#6d28d9" />

      {/* Reactive Scanner Grid Floor */}
      <Group ref={gridRef} position={[0, -5, -2]}>
        <Grid
          infiniteGrid
          fadeDistance={30}
          fadeStrength={5}
          sectionSize={1.5}
          sectionThickness={1.5}
          sectionColor="#7c3aed"
          cellColor="#1e1b4b"
          cellSize={0.5}
        />
      </Group>

      <Group ref={worldRef}>
        {/* Hero section: Offset 3D to the right side */}
        <Group position={[5, 0, 0]}>
          <HeroModule />
        </Group>

        {/* Other sections */}
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

        <Group position={[5, -SECTION_HEIGHT * 6, 0]}>
          <HeroModule />
        </Group>
      </Group>

      <Environment preset="night" />
    </Group>
  );
};

export default Scene;