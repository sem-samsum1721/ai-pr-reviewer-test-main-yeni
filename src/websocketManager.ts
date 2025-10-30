// src/websocketManager.ts

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http'; // Node'un http sunucusu tipini import et

let wssInstance: WebSocketServer | null = null;

/**
 * WebSocket sunucusunu başlatır ve değişkene atar.
 * Bu fonksiyon src/index.ts içinden çağrılmalıdır.
 * @param server Node.js http.Server objesi
 */
export function initializeWebSocket(server: Server): WebSocketServer {
  // Socket.IO ile çakışmayı önlemek için ayrı bir path kullanıyoruz
  wssInstance = new WebSocketServer({ server, path: '/ws', clientTracking: true });
  
  wssInstance.on('connection', (ws: WebSocket) => {
    console.log('WebSocket istemcisi bağlandı.');
    ws.send(JSON.stringify({ status: 'CONNECTED', message: 'Analiz sunucusuna bağlandınız.' }));
  });

  console.log('WebSocket sunucusu HTTP sunucusu üzerinde /ws path’i ile başlatıldı.');
  return wssInstance;
}

/**
 * Tüm bağlı istemcilere bir JSON mesajı yayınlar.
 * @param message Gönderilecek JSON objesi (otomatik olarak string'e çevrilir)
 */
export function sendToWebSocket(message: object) {
  if (!wssInstance) {
    console.warn('WebSocket sunucusu henüz başlatılmadı veya hiçbir istemci bağlı değil.');
    return;
  }

  const data = JSON.stringify(message);
  // Set üzerinde güvenli şekilde dolaşarak yayın yap
  for (const socket of wssInstance.clients) {
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    } catch (err) {
      console.warn('WS broadcast error for a client:', err);
    }
  }
}