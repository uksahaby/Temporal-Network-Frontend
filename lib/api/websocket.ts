import { EventEmitter } from "events";

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface ConnectionStatus {
  connected: boolean;
  lastConnected?: Date;
  errors: number;
}

export interface WebSocketOptions {
  url: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

class NetworkWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private options: WebSocketOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private heartbeatInterval: number | null = null;
  private connectionStatus: ConnectionStatus;
  private messageQueue: WebSocketMessage[] = [];
  private isReconnecting = false;

  constructor(options: WebSocketOptions) {
    super();
    this.options = {
      reconnectAttempts: 10,
      reconnectDelay: 3000,
      heartbeatInterval: 30000,
      debug: process.env.NODE_ENV === "development",
      ...options,
    };

    this.maxReconnectAttempts = this.options.reconnectAttempts || 10;
    this.connectionStatus = {
      connected: false,
      errors: 0,
    };

    this.connect();
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.options.url);
      this.setupEventHandlers();
    } catch (error) {
      this.handleError(error as Error);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      if (this.options.debug) {
        console.log("WebSocket connected");
      }

      this.connectionStatus = {
        connected: true,
        lastConnected: new Date(),
        errors: 0,
      };

      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.startHeartbeat();

      // Process queued messages
      this.processMessageQueue();

      this.emit("connected", this.connectionStatus);
      this.emit("status", this.connectionStatus);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    this.ws.onclose = (event) => {
      if (this.options.debug) {
        console.log("WebSocket disconnected:", event.code, event.reason);
      }

      this.connectionStatus.connected = false;
      this.stopHeartbeat();

      // Don't reconnect if closed normally
      if (event.code !== 1000 && !this.isReconnecting) {
        this.scheduleReconnect();
      }

      this.emit("disconnected", { code: event.code, reason: event.reason });
      this.emit("status", this.connectionStatus);
    };

    this.ws.onerror = (error) => {
      this.handleError(error as any);
      this.connectionStatus.errors++;
      this.emit("error", error);
      this.emit("status", this.connectionStatus);
    };
  }

  private handleMessage(message: WebSocketMessage) {
    if (this.options.debug) {
      console.log("WebSocket message received:", message.type, message.data);
    }

    // Emit message by type
    this.emit(message.type, message.data);

    // Also emit generic message event
    this.emit("message", message);

    // Handle specific message types
    switch (message.type) {
      case "progress":
        this.emit("upload-progress", message.data);
        break;
      case "processing":
        this.emit("processing-update", message.data);
        break;
      case "metrics":
        this.emit("metrics-update", message.data);
        break;
      case "network-update":
        this.emit("network-data", message.data);
        break;
      case "error":
        this.emit("server-error", message.data);
        break;
      case "heartbeat":
        // Reset reconnect attempts on heartbeat
        this.reconnectAttempts = 0;
        break;
    }
  }

  private handleError(error: Error) {
    console.error("WebSocket error:", error);
    this.emit("error", error);
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      this.emit("reconnect-failed");
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = Math.min(
      this.options.reconnectDelay! * Math.pow(1.5, this.reconnectAttempts - 1),
      30000,
    );

    if (this.options.debug) {
      console.log(
        `Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`,
      );
    }

    setTimeout(() => {
      if (!this.connectionStatus.connected) {
        this.connect();
      }
    }, delay);
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: "heartbeat",
          data: { timestamp: Date.now() },
          timestamp: Date.now(),
        });
      }
    }, this.options.heartbeatInterval || 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private processMessageQueue() {
    while (
      this.messageQueue.length > 0 &&
      this.ws?.readyState === WebSocket.OPEN
    ) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * Send a message through WebSocket
   */
  send(message: WebSocketMessage): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error("Failed to send WebSocket message:", error);
        this.messageQueue.push(message);
        return false;
      }
    } else {
      this.messageQueue.push(message);
      return false;
    }
  }

  /**
   * Subscribe to network updates
   */
  subscribeToNetwork(networkId: string): boolean {
    return this.send({
      type: "subscribe",
      data: { networkId, channel: "network" },
      timestamp: Date.now(),
    });
  }

  /**
   * Subscribe to metrics updates
   */
  subscribeToMetrics(networkId: string): boolean {
    return this.send({
      type: "subscribe",
      data: { networkId, channel: "metrics" },
      timestamp: Date.now(),
    });
  }

  /**
   * Subscribe to processing updates
   */
  subscribeToProcessing(taskId: string): boolean {
    return this.send({
      type: "subscribe",
      data: { taskId, channel: "processing" },
      timestamp: Date.now(),
    });
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribe(channel: string, id: string): boolean {
    return this.send({
      type: "unsubscribe",
      data: { id, channel },
      timestamp: Date.now(),
    });
  }

  /**
   * Request network data snapshot
   */
  requestSnapshot(networkId: string, time: number): boolean {
    return this.send({
      type: "snapshot",
      data: { networkId, time },
      timestamp: Date.now(),
    });
  }

  /**
   * Request metrics calculation
   */
  requestMetrics(networkId: string, metrics: string[]): boolean {
    return this.send({
      type: "calculate-metrics",
      data: { networkId, metrics },
      timestamp: Date.now(),
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(code?: number, reason?: string) {
    this.stopHeartbeat();
    this.messageQueue = [];

    if (this.ws) {
      this.ws.close(code || 1000, reason);
      this.ws = null;
    }

    this.connectionStatus.connected = false;
    this.emit("disconnected", { code, reason });
    this.emit("status", this.connectionStatus);
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get ready state
   */
  getReadyState(): number {
    return this.ws?.readyState || WebSocket.CLOSED;
  }

  /**
   * Clear message queue
   */
  clearQueue(): void {
    this.messageQueue = [];
  }
}

// Create singleton instance
let instance: NetworkWebSocket | null = null;

export const getWebSocket = (
  options?: Partial<WebSocketOptions>,
): NetworkWebSocket => {
  if (!instance) {
    instance = new NetworkWebSocket({
      url: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws",
      ...options,
    });
  }
  return instance;
};

// Helper functions
export const connectWebSocket = (
  options?: Partial<WebSocketOptions>,
): NetworkWebSocket => {
  return getWebSocket(options);
};

export const disconnectWebSocket = (): void => {
  if (instance) {
    instance.disconnect();
    instance = null;
  }
};

export const sendWebSocketMessage = (message: WebSocketMessage): boolean => {
  if (instance) {
    return instance.send(message);
  }
  return false;
};
