import React, { useRef, useState, useMemo, forwardRef, useEffect } from 'react';
import { Canvas, useFrame } from 'react-three-fiber';
import * as THREE from 'three';
import createOrbitControls from 'three-orbit-controls';
import { usePlayer } from '../utils/player';

const OrbitControls = createOrbitControls(THREE);

const PianoKey = forwardRef(({ size, color, emissive, ...props }, ref) => {
  return (
    <mesh ref={ref} {...props}>
      <boxGeometry attach="geometry" args={size} />
      <meshStandardMaterial attach="material" color={color} emissive="#111" />
    </mesh>
  );
});

const params = {
  whiteKey: {
    mods: [0, 2, 4, 5, 7, 9, 11],
    size: [0.226, 0.22, 1.5],
    posY: 0,
    posZ: 0,
    padding: 0.01,
    startPos: -6.1,
  },
  blackKey: {
    size: [0.1, 0.24, 1.0],
    posY: 0.1,
    posZ: -0.24,
  },
};

const PianoKeyboard = ({ player }) => {
  const keysRef = useRef(new Array(88).fill(null));
  const keys = useMemo(() => {
    const keys = [];
    let p = 0;
    let whiteIdx = 0;
    let lastWhitePosition = null;
    for (let i = 0; i < 10; ++i) {
      for (let j = 0; j < 12; ++j) {
        const p = i * 12 + j;
        if (p >= 21 && p <= 108) {
          if (params.whiteKey.mods.includes(j)) {
            whiteIdx += 1;
            const { size, padding, startPos, posY, posZ } = params.whiteKey;
            const position = [
              (size[0] + padding) * whiteIdx + startPos,
              posY,
              posZ,
            ];
            lastWhitePosition = position;
            keys.push(
              <PianoKey
                ref={(el) => (keysRef.current[p - 21] = el)}
                key={p}
                size={size}
                color="#fff"
                position={position}
              />,
            );
          } else {
            const { size, posY, posZ } = params.blackKey;
            const position = [
              lastWhitePosition[0] + params.whiteKey.size[0] / 2,
              posY,
              posZ,
            ];
            keys.push(
              <PianoKey
                ref={(el) => (keysRef.current[p - 21] = el)}
                key={p}
                size={size}
                color="#111"
                position={position}
              />,
            );
          }
        }
      }
    }

    return keys;
  }, []);
  useFrame(() => {
    const currentTime = player.currentTime;
    const activeNotes = player.notes
      .filter((item) => {
        const s = item[0];
        const e = item[0] + item[2];
        return s < currentTime && currentTime < e;
      })
      .map((item) => item[1]);
    for (let i = 0; i < 88; ++i) {
      const key = keysRef.current[i];
      const shouldPressed = activeNotes.includes(i + 21);
      if (shouldPressed && !key.pressed) {
        key.position.y -= 0.08;
        key.pressed = true;
      } else if (!shouldPressed && key.pressed) {
        key.position.y += 0.08;
        key.pressed = false;
      }
    }
  });
  return keys;
};

export const Piano = () => {
  const player = usePlayer();
  useEffect(() => {
    const notes = [
      [0, 60, 0.8],
      [1, 60, 0.8],
      [2, 67, 0.8],
      [3, 67, 0.8],
      [4, 69, 0.8],
      [5, 69, 0.8],
      [6, 67, 1.8],
      [8, 65, 0.8],
      [9, 65, 0.8],
      [10, 64, 0.8],
      [11, 64, 0.8],
      [12, 62, 0.8],
      [13, 62, 0.8],
      [14, 60, 1.8],
    ];
    player.updateNotes(notes);
  }, []);
  return (
    <Canvas
      gl={new THREE.WebGLRenderer({ antialias: true })}
      onCreated={({ camera, gl }) => {
        gl.setClearColor(0x0);
        gl.setPixelRatio(window.devicePixelRatio);
        camera.position.set(0, 3, 5);
        const controls = new OrbitControls(camera, gl.domElement);
      }}
    >
      <ambientLight color="#222" />
      <directionalLight color="#fff" intensity={0.8} position={[1, 2, 4]} />
      <directionalLight color="#fff" intensity={0.3} position={[-1, -2, -4]} />
      <PianoKeyboard player={player} />
    </Canvas>
  );
};
