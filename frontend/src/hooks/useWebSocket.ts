import { useEffect, useState } from 'react';
import { websocketService } from '../services/websocket';
import { WebhookEvent } from '../types';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<WebhookEvent[]>([]);

  useEffect(() => {
    // Connect to WebSocket
    websocketService.connect();

    // Check connection status periodically
    const checkConnection = () => {
      setIsConnected(websocketService.isConnected());
    };

    const interval = setInterval(checkConnection, 1000);
    checkConnection(); // Initial check

    // Subscribe to webhook events
    const unsubscribe = websocketService.onWebhookEvent((event) => {
      setEvents(prev => [event, ...prev.slice(0, 99)]); // Keep last 100 events
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
      websocketService.disconnect();
    };
  }, []);

  const clearEvents = () => {
    setEvents([]);
  };

  return {
    isConnected,
    events,
    clearEvents,
  };
}