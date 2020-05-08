import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const useConnection = () => {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const socket = io({
      transports: ['websocket'],
    });
    socket.on('connect', () => {
      console.log('[Connected]');
      setConnected(true);
    });
    socket.on('disconnect', () => {
      console.log('[Disconnected]');
      setConnected(false);
    });
    return () => socket.close();
  }, []);
  return { connected };
};

const MainPage = () => {
  const { connected } = useConnection();
  return <div>Music Eye UI {connected && ' - WebSocket Connected'}</div>;
};

export default MainPage;
