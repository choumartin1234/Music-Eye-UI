import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Recorder } from '../utils/recorder';
import { PlayerContext, Player, usePlayer } from '../utils/player';
import { Piano } from './Piano';
import io from 'socket.io-client';
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
  notification,
} from 'antd';
import {
  AudioOutlined,
  PauseOutlined,
  RightOutlined,
  UnorderedListOutlined,
  UploadOutlined,
  LoadingOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import axios from '../utils/axios';
import moment from 'moment';

function usePlaylist() {
  const [data, setData] = useState([]);
  const [updated, setUpdated] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!loading) {
      setLoading(true);
      let loaded = false;
      let intervalId;
      axios
        .get('/api/playlist')
        .then(({ data }) => {
          setData(data);
          loaded = true;
        })
        .catch(() => {
          loaded = true;
        });
      intervalId = setInterval(() => {
        if (loaded) {
          clearInterval(intervalId);
          setLoading(false);
        }
      }, 500);
    }
  }, [updated]);
  const refetch = () => setUpdated(Date.now());
  return {
    playlist: data,
    refetch,
    loading,
  };
}

const Playlist = ({ reset }) => {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState(null);
  const [percent, setPercent] = useState(null);
  const player = usePlayer();
  const { playlist, refetch, loading } = usePlaylist();
  useEffect(() => {
    if (visible) refetch();
  }, [visible]);
  useEffect(() => {
    if (selected) {
      const item = playlist.find((item) => item.id === selected);
      if (player.selected !== selected && item && item.url) {
        player.selected = selected;
        axios
          .get(item.url, { withCredentials: false })
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
      }
    } else if (playlist.length) {
      setSelected(playlist[0].id);
    }
  }, [selected, playlist]);
  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
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
            <Button type="link" onClick={refetch} disabled={loading}>
              <SyncOutlined spin={loading} />
            </Button>
            <div>
              <Upload
                name="file"
                action="/api/upload"
                beforeUpload={(file) => {
                  const isMp3 = file.name.endsWith('.mp3');
                  const isWav = file.name.endsWith('.wav');
                  if (!isMp3 && !isWav) {
                    message.error('只能上传 mp3/wav 文件哦！');
                    return false;
                  }
                  const isSmall = file.size / 1024 / 1024 < 10;
                  if (!isSmall) {
                    message.error('文件不能超过 10 MB。');
                    return false;
                  }
                  return true;
                }}
                onChange={(info) => {
                  if (info.event) {
                    const percent = info.event.percent;
                    setPercent(percent);
                  }
                  const status = info.file.status;
                  if (status === 'done') {
                    message.success('文件上传成功');
                    setPercent(null);
                    refetch();
                  } else if (status === 'error') {
                    message.error('文件上传失败');
                    setPercent(null);
                  }
                }}
                withCredentials={true}
                showUploadList={false}
              >
                <Button>
                  <UploadOutlined /> 上传音频文件
                </Button>
              </Upload>
            </div>
            {percent !== null && (
              <div
                style={{
                  marginLeft: 8,
                  fontWeight: 400,
                  color: 'rgba(0, 0, 0, .5)',
                }}
              >
                {Math.floor(percent * 100) / 100}%
              </div>
            )}
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
          maxHeight: 400,
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
                        if (item.waiting || item.running || item.error) return;
                        if (player.muted) {
                          message.warn('录音时不能这样做哟');
                          return;
                        }
                        setSelected(item.id);
                        setVisible(false);
                      }}
                    >
                      {item.name}
                      {item.public && (
                        <Tag color="magenta" style={{ marginLeft: 12 }}>
                          公开
                        </Tag>
                      )}
                      {item.waiting && (
                        <Tag color="blue" style={{ marginLeft: 12 }}>
                          等待处理 <LoadingOutlined />
                        </Tag>
                      )}
                      {item.running && (
                        <Tag color="orange" style={{ marginLeft: 12 }}>
                          正在处理 <LoadingOutlined />
                        </Tag>
                      )}

                      {item.error && (
                        <Tag color="red" style={{ marginLeft: 12 }}>
                          处理出错
                        </Tag>
                      )}
                    </a>
                  }
                  description={item.description}
                />
                {item.createdAt && (
                  <div style={{ color: 'rgba(0, 0, 0, .5)' }}>
                    {moment(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  </div>
                )}
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
  const [recordingTime, setRecordingTime] = useState();
  const socketRef = useRef();
  const recorder = useMemo(() => new Recorder(), []);
  useEffect(() => {
    setPlaying(false);
    player.reset();
  }, [reset]);
  useEffect(() => {
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
  }, [playing, maxTime]);
  useEffect(() => {
    if (recording) {
      player.setMuted(true);
      setRecordingTime(undefined);
      const socket = io('/user', {
        transports: ['websocket'],
      });
      socketRef.current = socket;

      let timeoutId;

      socket.on('update', (url) => {
        console.log('update');
        axios.get(url, { withCredentials: false }).then(({ data }) => {
          if (data) {
            player.updateNotes(data);
          }
        });
      });
      socket.on('next', (token) => {
        if (!token) {
          message.error('当前算力不足，请稍后再试');
          setRecording(false);
          return;
        }
        let startTime;
        recorder
          .start((blob, last) => {
            console.log('data ', last, blob);
            const file = new File([blob], `${Date.now()}.webm`);
            const formData = new FormData();
            formData.append('file', file);
            axios.post('/api/upload', formData, {
              params: {
                multipart: token,
                ...(last ? { last: 1 } : {}),
              },
              headers: {
                'content-type': 'multipart/form-data',
              },
            });
            const delta = Math.round((Date.now() - startTime) / 1000);
            const ss = ('00' + (delta % 60)).slice(-2);
            const mm = ('00' + Math.floor(delta / 60)).slice(-2);
            if (delta >= 90) {
              setRecording(false);
            }
            setRecordingTime(`${mm}:${ss}`);
          })
          .then((success) => {
            if (!success) {
              setRecording(false);
              return;
            }
            startTime = Date.now();
            setRecordingTime('00:00');
            notification.info({
              key: 'recording_start',
              message: '录音开始！',
              description: (
                <div>
                  <div>
                    我们将为您实时生成乐谱，但是存在一定延迟 (约 15
                    秒)。在录音结束前，播放器将处于静音状态。您只能看到图形化的音符。您可以在结束后观看回放，聆听乐音。
                  </div>
                  <div>
                    由于算力限制，<strong>目前最长允许录音 90 秒</strong>。
                  </div>
                </div>
              ),
              placement: 'topLeft',
              duration: 30,
            });

            player.updateNotes([]);
            player.reset();
            setPlaying(false);

            timeoutId = setTimeout(() => {
              setPlaying(true);
            }, 15 * 1000);
          });
      });

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        notification.close('recording_start');
      };
    } else {
      player.setMuted(false);
      setRecordingTime(undefined);
      recorder.stop();
    }
  }, [recording]);
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
        {recording && recordingTime ? (
          <div
            style={{
              width: '100%',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 1,
              color: 'white',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {recordingTime}
          </div>
        ) : (
          <Slider
            step={0.1}
            value={progress}
            max={maxTime}
            disabled={recording}
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
        )}
      </div>
      <Button
        type="primary"
        danger={playing}
        size="large"
        shape="circle"
        disabled={recording}
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
        title={`确认要${recording ? '关闭' : '开启'}实时录音模式吗？`}
        okText="确认"
        cancelText="取消"
        onConfirm={() => {
          if (typeof MediaRecorder === 'undefined') {
            message.error(
              '您的浏览器不支持录音模式，建议换用最新版 Chrome 浏览器',
            );
            return;
          }
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
