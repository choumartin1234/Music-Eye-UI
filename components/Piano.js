import React, { useRef, useState, useMemo, forwardRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from 'react-three-fiber';
import * as THREE from 'three';
import * as Color from 'color';
import createOrbitControls from 'three-orbit-controls';
import { usePlayer } from '../utils/player';
import { MTLLoader, OBJLoader } from 'three-obj-mtl-loader';
import { Spin } from 'antd';
import axios from 'axios';

const OrbitControls = createOrbitControls(THREE);

const synesthesiaMap = {
  0: [0, 91, 40],
  1: [360, 96, 51],
  2: [14, 91, 51],
  3: [29, 94, 52],
  4: [60, 90, 60],
  5: [73, 73, 55],
  6: [135, 76, 32],
  7: [172, 68, 34],
  8: [248, 82, 28],
  9: [292, 70, 31],
  10: [325, 84, 46],
  11: [330, 84, 34],
};

const PianoKey = forwardRef(({ size, color, emissive, ...props }, ref) => {
  return (
    <mesh ref={ref} {...props}>
      <boxGeometry attach="geometry" args={size} />
      <meshPhongMaterial attach="material" color={color} emissive="#111" />
    </mesh>
  );
});

const createEmptyNote = () => {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshPhongMaterial({
    specular: '#333',
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
};

const updateNoteObject = (note, { color, width, height, position }) => {
  note.material.color.set(color);
  note.scale.set(width, height, 1);
  note.position.set(...position);
};

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
  const { scene } = useThree();
  const allNotesRef = useRef([]);
  const notesGroup = useMemo(() => new THREE.Group(), []);
  useEffect(() => {
    scene.add(notesGroup);
    return () => scene.remove(notesGroup);
  }, []);
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
                ref={(el) => {
                  if (!el) return;
                  keysRef.current[p - 21] = el;
                  el.white = true;
                  el.keyWidth = size[0];
                  el.defaultPosY = position[1];
                }}
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
                ref={(el) => {
                  if (!el) return;
                  keysRef.current[p - 21] = el;
                  el.keyWidth = size[0];
                  el.defaultPosY = position[1];
                }}
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
    const allNotes = allNotesRef.current;
    if (allNotes.length < player.activeNotes.length) {
      for (let i = allNotes.length; i < player.activeNotes.length; ++i) {
        allNotes.push(createEmptyNote());
      }
    }
    const X = 0.5;
    const visibleNotes = allNotes
      .map((obj, i) => {
        if (i >= player.activeNotes.length) return;
        const note = player.activeNotes[i];
        if (note[1] < 21 || note[1] > 108) return;
        const p = note[1];
        const sn = note[0];
        const en = note[0] + note[2];
        const sv = currentTime;
        const ev = currentTime + 4.2;
        if (en <= sv || ev <= sn) return;
        const s = Math.max(sn, sv);
        const e = Math.min(en, ev);
        const key = keysRef.current[p - 21];
        const height = (e - s) * X;
        const data = {
          color: Color.hsl(synesthesiaMap[p % 12]).rgbNumber(),
          width: key.keyWidth,
          height,
          position: [
            key.position.x,
            (s - currentTime) * X + height / 2 + 0.35,
            -1.7,
          ],
        };
        updateNoteObject(obj, data);
        return obj;
      })
      .filter(Boolean);
    //console.log(visibleNotes);
    notesGroup.children = visibleNotes;
    const activeNotes = player.activeNotes
      .filter((item) => {
        const s = item[0];
        const e = item[0] + item[2];
        return s < currentTime && currentTime < e;
      })
      .map((item) => item[1]);
    const axis = new THREE.Vector3(1, 0, 0);
    const whiteKeyRotateA = Math.PI / 60;
    const whiteKeyAddY = -0.06;
    const blackKeyAddY = -0.075;
    const times = 2;
    for (let i = 0; i < 88; ++i) {
      const key = keysRef.current[i];
      const shouldPressed = activeNotes.includes(i + 21);

      if (shouldPressed && !key.pressed) {
        if (key.addY) key.position.y += key.addY;
        if (key.rotateA) key.rotateOnAxis(axis, key.rotateA);
        if (key.white) {
          key.rotateA = whiteKeyRotateA;
          key.rotateATimes = times;
          key.addY = whiteKeyAddY;
          key.addYTimes = times;
        } else {
          key.addY = blackKeyAddY;
          key.addYTimes = times;
        }
        key.pressed = true;
      } else if (!shouldPressed && key.pressed) {
        if (key.addY) key.position.y += key.addY;
        if (key.rotateA) key.rotateOnAxis(axis, key.rotateA);
        if (key.white) {
          key.rotateA = -whiteKeyRotateA;
          key.rotateATimes = times;
          key.addY = -whiteKeyAddY;
          key.addYTimes = times;
        } else {
          key.addY = -blackKeyAddY;
          key.addYTimes = times;
        }
        key.pressed = false;
      } else {
        if (key.addY) {
          if (key.addYTimes) {
            const cur = key.addY / key.addYTimes;
            key.position.y += cur;
            key.addY -= cur;
            key.addYTimes -= 1;
          } else {
            key.position.y += key.addY;
            key.addY = 0;
            key.addYTimes = 0;
          }
        }
        if (key.rotateA) {
          if (key.rotateATimes) {
            const cur = key.rotateA / key.rotateATimes;
            key.rotateOnAxis(axis, cur);
            key.rotateA -= cur;
            key.rotateATimes -= 1;
          } else {
            key.rotateOnAxis(axis, key.rotateA);
            key.rotateA = 0;
            key.rotateATimes = 0;
          }
        }
      }
    }
  });
  return keys;
};

export const Piano = () => {
  const player = usePlayer();
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          width: '100vw',
          height: '100vh',
          top: 0,
          left: 0,
          zIndex: loaded ? 0 : 50,
          backgroundColor: 'black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: loaded ? 0 : 1,
          transition: 'all .3s linear',
        }}
      >
        <Spin size="large" tip="Loading..." />
      </div>
      <Canvas
        gl={new THREE.WebGLRenderer({ antialias: true })}
        onCreated={({ camera, gl, scene }) => {
          gl.setClearColor(0x0);
          gl.setPixelRatio(window.devicePixelRatio);
          camera.position.set(-1.5, 5, 10);
          const mtlLoader = new MTLLoader();
          const objLoader = new OBJLoader();
          mtlLoader.load('/piano/file.mtl', (materials) => {
            materials.preload();
            objLoader.setMaterials(materials);
            objLoader.load('/piano/file.obj', (object) => {
              const SCALE = 8.18e-3;
              object.scale.set(SCALE, SCALE, SCALE);
              object.position.set(0.425, -5.78, -4.87);
              scene.add(object);
              setLoaded(true);
            });
          });
          const controls = new OrbitControls(camera, gl.domElement);
        }}
      >
        <ambientLight color="#222" />
        <directionalLight color="#fff" intensity={0.8} position={[1, 2, 4]} />
        <directionalLight
          color="#fff"
          intensity={0.3}
          position={[-1, -2, -4]}
        />
        <PianoKeyboard player={player} />
      </Canvas>
    </>
  );
};
