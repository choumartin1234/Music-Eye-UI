import io from 'socket.io-client';
import { useState, useEffect } from 'react';

export const useInteractor = () => {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
    }
  }, []);
  return { connected };
};
