import { useAuthStore } from '@/store/useAuthStore';

/** Сообщение, которое мы шлём / получаем по сокету */
export type WSMessage<T = unknown> = {
  event: string;
  data: T;
};

/** Подпись обработчика входящих событий */
export type WSEventHandler<T = unknown> = (data: T) => void;

class WebSocketClient {
  /** Singleton‑экземпляр */
  private static _instance: WebSocketClient;

  /** Текущий `WebSocket` */
  private socket: WebSocket | null = null;

  /** id доски, к которой сейчас подключены */
  private boardId: string | null = null;

  /** Список подписок: { event: Set<handlers> } */
  private subscriptions = new Map<string, Set<WSEventHandler>>();

  /** id таймера ping‑pong */
  private heartbeatId: number | null = null;

  /** id таймера реконнекта */
  private reconnectId: number | null = null;

  private constructor() {} // приватный ctor

  /** Получить singleton */
  static get instance(): WebSocketClient {
    if (!this._instance) this._instance = new WebSocketClient();
    return this._instance;
  }

  /** Подключиться к серверу для указанной доски */
  connect(boardId: string) {
    // если уже подключены к этой же доске — выходим
    if (this.socket && this.boardId === boardId) return;

    // если было старое соединение — закрываем
    if (this.socket) this.socket.close();

    // Убедимся, что boardId - строка
    this.boardId = String(boardId);
    console.log(`Connecting to WebSocket for board ${this.boardId}`);
    this.openSocket();
  }

  /** Отключиться от сервера и очистить все ресурсы */
  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
    this.cleanup();
    this.boardId = null;
    this.subscriptions.clear();
  }

  /** Отправить сообщение */
  send<T = unknown>(msg: WSMessage<T>) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    }
  }

  /** Подписаться на событие (card_created, card_moved …) */
  subscribe<T = unknown>(event: string, handler: WSEventHandler<T>) {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
    }
    this.subscriptions.get(event)!.add(handler);
    
    // Return a safe unsubscribe function that checks if the subscription set exists
    return () => {
      const handlers = this.subscriptions.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  private openSocket() {
    const token = useAuthStore.getState().token;
    const url = `${import.meta.env.VITE_WS_URL}/${this.boardId}?token=${token}`;
    console.log(`Opening WebSocket connection to: ${url}`);
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log(`WebSocket connection established for board ${this.boardId}`);
      // запускаем heartbeat (ping‑pong)
      this.heartbeatId = window.setInterval(() => {
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ event: 'ping', data: Date.now() }));
        }
      }, 25_000);
    };

    this.socket.onmessage = (e) => {
      try {
        const msg: WSMessage = JSON.parse(e.data);
        console.log(`WebSocket message received: ${msg.event}`, msg.data);
        const handlers = this.subscriptions.get(msg.event);
        if (handlers) handlers.forEach((cb) => cb(msg.data));
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    this.socket.onclose = (event) => {
      console.log(`WebSocket connection closed for board ${this.boardId}. Code: ${event.code}, Reason: ${event.reason}`);
      this.cleanup();
      // пытаемся переподключиться раз в 3 сек
      this.reconnectId = window.setTimeout(() => this.openSocket(), 3_000);
    };

    this.socket.onerror = (error) => {
      console.error(`WebSocket error for board ${this.boardId}:`, error);
      this.socket?.close();
    };
  }

  private cleanup() {
    if (this.heartbeatId) {
      clearInterval(this.heartbeatId);
      this.heartbeatId = null;
    }
    if (this.reconnectId) {
      clearTimeout(this.reconnectId);
      this.reconnectId = null;
    }
    this.socket = null;
  }
}

export const wsClient = WebSocketClient.instance;

/** Отправка любого WS‑сообщения */
export function sendWS<T = unknown>(msg: WSMessage<T>) {
  wsClient.send(msg);
}

/** Подписка на событие */
export function subscribeWS<T = unknown>(event: string, cb: WSEventHandler<T>) {
  return wsClient.subscribe(event, cb);
}
