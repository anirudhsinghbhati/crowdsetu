import { useEffect, useRef } from 'react';
import { useLiveStore } from '../store/live';
import { subscribeMockLive, startMockLiveStream, stopMockLiveStream } from '../api/mock';
import type { LiveMessage } from '../api/types';

const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === undefined
    ? true
    : import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.VITE_USE_MOCK === true;

export function useLive() {
  const { isConnected, setConnected, handleMessage, lastMessageTimestamp } = useLiveStore();
  const reconnectTimeoutRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (USE_MOCK) {
      // Mock mode: start simulated ticker and subscribe
      startMockLiveStream();
      setConnected(true);

      const unsubscribe = subscribeMockLive((msg: LiveMessage) => {
        handleMessage(msg);
      });

      return () => {
        unsubscribe();
        stopMockLiveStream();
        setConnected(false);
      };
    }

    // Real WebSocket mode: /ws/live with 2s auto-reconnect
    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isUnmounted) {
            setConnected(true);
          }
        };

        ws.onmessage = (event) => {
          try {
            const data: LiveMessage = JSON.parse(event.data);
            handleMessage(data);
          } catch {
            // Ignore malformed message
          }
        };

        ws.onclose = () => {
          if (!isUnmounted) {
            setConnected(false);
            // Schedule reconnect after 2 seconds
            reconnectTimeoutRef.current = window.setTimeout(connectWebSocket, 2000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (!isUnmounted) {
          setConnected(false);
          reconnectTimeoutRef.current = window.setTimeout(connectWebSocket, 2000);
        }
      }
    };

    connectWebSocket();

    return () => {
      isUnmounted = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      setConnected(false);
    };
  }, [setConnected, handleMessage]);

  return {
    isConnected,
    lastMessageTimestamp,
  };
}
