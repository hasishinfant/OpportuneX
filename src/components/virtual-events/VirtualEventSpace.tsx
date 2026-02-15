'use client';

// Virtual Event Space Component
// Main 3D environment for virtual events using React Three Fiber

import type {
  Vector3,
  VirtualEventSpace as VirtualEventSpaceType,
} from '@/types/virtual-events';
import {
  Environment,
  Html,
  OrbitControls,
  PerspectiveCamera,
  Sky,
} from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';

interface VirtualEventSpaceProps {
  space: VirtualEventSpaceType;
  userPosition?: Vector3;
  onPositionChange?: (position: Vector3, rotation: Vector3) => void;
  performanceMode?: 'low' | 'medium' | 'high';
}

// Floor component
function Floor({
  size,
  color,
  texture,
}: {
  size: { width: number; depth: number };
  color: string;
  texture?: string;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size.width, size.depth]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// Avatar placeholder component
function AvatarPlaceholder({ position }: { position: Vector3 }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(state => {
    if (meshRef.current) {
      // Simple idle animation
      meshRef.current.position.y =
        position.y + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Simple capsule avatar */}
      <mesh ref={meshRef} castShadow>
        <capsuleGeometry args={[0.3, 1.2, 8, 16]} />
        <meshStandardMaterial color='#4a90e2' />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color='#f5d5b8' />
      </mesh>
    </group>
  );
}

// Scene objects renderer
function SceneObjects({ objects }: { objects: any[] }) {
  return (
    <>
      {objects.map(obj => {
        const pos = obj.transform.position;
        const rot = obj.transform.rotation;
        const scale = obj.transform.scale || { x: 1, y: 1, z: 1 };

        if (obj.type === 'primitive' && obj.geometry === 'box') {
          return (
            <mesh
              key={obj.id}
              position={[pos.x, pos.y, pos.z]}
              rotation={[rot.x, rot.y, rot.z]}
              scale={[scale.x, scale.y, scale.z]}
              castShadow
              receiveShadow
            >
              <boxGeometry />
              <meshStandardMaterial
                color={obj.material.color || '#ffffff'}
                metalness={obj.material.metalness || 0}
                roughness={obj.material.roughness || 0.5}
              />
            </mesh>
          );
        }

        if (obj.type === 'primitive' && obj.geometry === 'sphere') {
          return (
            <mesh
              key={obj.id}
              position={[pos.x, pos.y, pos.z]}
              castShadow
              receiveShadow
            >
              <sphereGeometry args={[1, 32, 32]} />
              <meshStandardMaterial
                color={obj.material.color || '#ffffff'}
                metalness={obj.material.metalness || 0}
                roughness={obj.material.roughness || 0.5}
              />
            </mesh>
          );
        }

        return null;
      })}
    </>
  );
}

// Camera controller
function CameraController({
  initialPosition,
  onPositionChange,
}: {
  initialPosition?: Vector3;
  onPositionChange?: (position: Vector3, rotation: Vector3) => void;
}) {
  const { camera } = useThree();
  const lastUpdate = useRef(Date.now());

  useEffect(() => {
    if (initialPosition) {
      camera.position.set(
        initialPosition.x,
        initialPosition.y,
        initialPosition.z
      );
    }
  }, [initialPosition, camera]);

  useFrame(() => {
    // Throttle position updates to every 100ms
    const now = Date.now();
    if (now - lastUpdate.current > 100 && onPositionChange) {
      const pos = camera.position;
      const rot = camera.rotation;
      onPositionChange(
        { x: pos.x, y: pos.y, z: pos.z },
        { x: rot.x, y: rot.y, z: rot.z }
      );
      lastUpdate.current = now;
    }
  });

  return null;
}

// Loading fallback
function LoadingFallback() {
  return (
    <Html center>
      <div className='text-white text-xl'>Loading virtual space...</div>
    </Html>
  );
}

// Main component
export default function VirtualEventSpace({
  space,
  userPosition,
  onPositionChange,
  performanceMode = 'medium',
}: VirtualEventSpaceProps) {
  const [isWebXRSupported, setIsWebXRSupported] = useState(false);

  useEffect(() => {
    // Check WebXR support
    if ('xr' in navigator) {
      setIsWebXRSupported(true);
    }
  }, []);

  const { sceneConfig } = space;
  const shadows = performanceMode !== 'low';
  const antialiasing = performanceMode === 'high';

  return (
    <div className='w-full h-screen relative'>
      <Canvas
        shadows={shadows}
        gl={{ antialias: antialiasing }}
        camera={{ position: [0, 2, 5], fov: 75 }}
      >
        <Suspense fallback={<LoadingFallback />}>
          {/* Lighting */}
          <ambientLight intensity={0.5} color={sceneConfig.lighting.ambient} />
          {sceneConfig.lighting.directional.map((light, index) => (
            <directionalLight
              key={index}
              position={[light.position.x, light.position.y, light.position.z]}
              intensity={light.intensity}
              color={light.color}
              castShadow={shadows}
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
          ))}

          {/* Environment */}
          {sceneConfig.environment === 'outdoor' && (
            <Sky sunPosition={[100, 20, 100]} />
          )}
          {performanceMode === 'high' && <Environment preset='sunset' />}

          {/* Floor */}
          <Floor
            size={sceneConfig.floor.size}
            color={sceneConfig.floor.color}
            texture={sceneConfig.floor.texture}
          />

          {/* Scene objects */}
          <SceneObjects objects={sceneConfig.objects} />

          {/* User avatar */}
          {userPosition && <AvatarPlaceholder position={userPosition} />}

          {/* Camera controls */}
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={2}
            maxDistance={50}
            maxPolarAngle={Math.PI / 2}
          />

          <CameraController
            initialPosition={userPosition}
            onPositionChange={onPositionChange}
          />

          <PerspectiveCamera makeDefault position={[0, 2, 5]} />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <div className='absolute top-4 left-4 bg-black bg-opacity-50 text-white p-4 rounded-lg'>
        <h2 className='text-xl font-bold'>{space.name}</h2>
        <p className='text-sm'>{space.description}</p>
        {isWebXRSupported && (
          <button className='mt-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700'>
            Enter VR Mode
          </button>
        )}
      </div>

      {/* Controls hint */}
      <div className='absolute bottom-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-lg text-sm'>
        <p>🖱️ Left click + drag to rotate</p>
        <p>🖱️ Right click + drag to pan</p>
        <p>🖱️ Scroll to zoom</p>
      </div>
    </div>
  );
}
