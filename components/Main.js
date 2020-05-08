import React, { useMemo, useState, useEffect } from 'react';
import { PlayerContext, Player, usePlayer } from '../utils/player';
import { Piano } from './Piano';
import { useInteractor } from '../utils/interactor';
import { Button, Slider } from 'antd';
import { AudioOutlined, PauseOutlined, RightOutlined } from '@ant-design/icons';

const Control = () => {
  const player = usePlayer();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    if (player) {
      if (playing) player.start();
      else player.pause();
    }
  }, [playing]);
  useEffect(() => {
    const id = setInterval(() => {
      if (player.ended) {
        setPlaying(false);
      } else {
        setProgress(Math.floor(player.currentTime * 10) / 10);
      }
    }, 100);
  }, [playing]);
  return (
    <div
      style={{
        position: 'absolute',
        left: 'calc(50vw - 160px)',
        bottom: 20,
        width: 320,
        height: 50,
        zIndex: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(255, 255, 255, .3)',
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{ width: 200 }}
        onMouseOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <Slider
          step={0.1}
          value={progress}
          max={player.maxTime}
          onChange={(val) => {
            setPlaying(false);
            player.moveTo(val);
          }}
          tipFormatter={(value) => {
            const t = Math.floor(value);
            const ss = ('00' + (t % 60)).slice(-2);
            const mm = ('00' + Math.floor(t / 60)).slice(-2);
            const hh = ('00' + Math.floor(t / 60 / 60)).slice(-2);
            return (hh !== '00' ? `${hh}:` : '') + `${mm}:${ss}`;
          }}
        />
      </div>
      <Button
        type="primary"
        danger={playing}
        size="large"
        shape="circle"
        style={{
          transition: 'all .3s ease',
          marginLeft: 6,
        }}
        onClick={() => setPlaying(!playing)}
      >
        {playing ? <PauseOutlined /> : <RightOutlined />}
      </Button>
      <Button
        size="large"
        shape="circle"
        style={{
          marginLeft: 8,
          transition: 'all .3s ease',
          ...(recording
            ? {
                color: '#1890ff',
                borderColor: '#1890ff',
                backgroundColor: '#BBDEFB',
              }
            : {}),
        }}
        onClick={() => setRecording(!recording)}
      >
        <AudioOutlined />
      </Button>
    </div>
  );
};
const Main = () => {
  const { connected } = useInteractor();
  const player = useMemo(() => new Player(), []);
  return (
    <PlayerContext.Provider value={player}>
      <>
        <Piano />
        <Control />
      </>
    </PlayerContext.Provider>
  );
};

export default Main;
