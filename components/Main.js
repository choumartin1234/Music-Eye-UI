import React, { useMemo, useState, useEffect } from 'react';
import { PlayerContext, Player, usePlayer } from '../utils/player';
import { Piano } from './Piano';
import { useInteractor } from '../utils/interactor';
import {
  Tag,
  Button,
  Slider,
  Popconfirm,
  Modal,
  Upload,
  Empty,
  List,
  message,
} from 'antd';
import {
  AudioOutlined,
  PauseOutlined,
  RightOutlined,
  UnorderedListOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import axios from '../utils/axios';

function usePlaylist() {
  const [data, setData] = useState([]);
  const [updated, setUpdated] = useState(0);
  useEffect(() => {
    axios.get('/api/playlist').then(({ data }) => setData(data));
  }, [updated]);
  const refetch = () => setUpdated(Date.now());
  return {
    playlist: data,
    refetch,
  };
}

const Playlist = ({ reset }) => {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState(null);
  const player = usePlayer();
  const { playlist } = usePlaylist();
  useEffect(() => {
    if (selected) {
      axios
        .get(`/doc/${selected}.json`)
        .then(({ data }) => {
          if (data) {
            reset();
            setTimeout(() => {
              player.updateNotes(data);
            }, 50);
          }
        })
        .catch((err) => {
          console.error(err);
          message.error('乐谱不存在');
        });
    } else if (playlist.length) {
      setSelected(playlist[0].id);
    }
  }, [selected, playlist]);
  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 25,
      }}
    >
      <Modal
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            播放列表
            <div style={{ marginLeft: 16 }}>
              <Upload
                name="file"
                action="/api/upload"
                beforeUpload={(file) => {
                  const isAudio = /^audio\//.test(file.type);
                  if (!isAudio) {
                    message.error('只能上传音频文件哦！');
                  }
                  const isSmall = file.size / 1024 / 1024 < 5;
                  if (!isSmall) {
                    message.error('文件不能超过 5 MB。');
                  }
                  return isAudio && isSmall;
                }}
                onChange={(info) => {}}
                showUploadList={false}
              >
                <Button>
                  <UploadOutlined /> 上传音频文件
                </Button>
              </Upload>
            </div>
          </div>
        }
        visible={visible}
        footer={null}
        onCancel={() => setVisible(false)}
        bodyStyle={{
          paddingTop: 8,
          paddingBottom: 12,
          paddingLeft: 0,
          paddingRight: 0,
          maxHeight: 320,
          overflow: 'auto',
        }}
      >
        {playlist.length ? (
          <List
            itemLayout="horizontal"
            dataSource={playlist}
            renderItem={(item) => (
              <List.Item
                style={{
                  paddingLeft: 24,
                  paddingRight: 24,
                  ...(item.id === selected
                    ? { backgroundColor: 'rgba(0, 0, 0, .05)' }
                    : {}),
                }}
              >
                <List.Item.Meta
                  title={
                    <a
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => {
                        setSelected(item.id);
                        setVisible(false);
                      }}
                    >
                      {item.name}
                      {item.public && (
                        <Tag color="volcano" style={{ marginLeft: 12 }}>
                          公开
                        </Tag>
                      )}
                    </a>
                  }
                  description={item.description}
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty
            description="暂无数据"
            style={{ marginTop: 15, marginBottom: 30 }}
          />
        )}
      </Modal>
      <Button
        shape="circle"
        size="large"
        ghost
        onClick={() => setVisible(true)}
      >
        <UnorderedListOutlined />
      </Button>
    </div>
  );
};

const Control = ({ reset }) => {
  const player = usePlayer();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    setPlaying(false);
    player.reset();
  }, [reset]);
  useEffect(() => {
    const maxTime = player.maxTime;
    const id = setInterval(() => {
      if (player) {
        if (playing) player.start();
        else player.pause();
      }
      if (maxTime !== player.maxTime) {
        setMaxTime(player.maxTime);
      }
      if (player.ended) {
        setPlaying(false);
        player.reset();
      } else {
        setProgress(Math.floor(player.currentTime * 10) / 10);
      }
    }, 100);
    return () => clearInterval(id);
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
          max={maxTime}
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
      <Popconfirm
        placement="top"
        title="确认要开启实时录音模式吗？"
        okText="确认"
        cancelText="取消"
        onConfirm={() => {
          setRecording(!recording);
        }}
      >
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
        >
          <AudioOutlined />
        </Button>
      </Popconfirm>
    </div>
  );
};
const Main = () => {
  const { connected } = useInteractor();
  const player = useMemo(() => new Player(), []);
  const [reset, setReset] = useState(0);
  return (
    <PlayerContext.Provider value={player}>
      <>
        <Piano />
        <Control reset={reset} />
        <Playlist reset={() => setReset(Date.now())} />
      </>
    </PlayerContext.Provider>
  );
};

export default Main;
