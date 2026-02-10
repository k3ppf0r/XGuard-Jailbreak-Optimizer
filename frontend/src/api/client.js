/**
 * API客户端封装
 */
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 启动优化任务
 */
export const startOptimization = async (data) => {
  const response = await apiClient.post('/api/optimizer/start', data);
  return response.data;
};

/**
 * 检测prompt安全性
 */
export const detectPrompt = async (content) => {
  const response = await apiClient.post('/api/detect/prompt', { content });
  return response.data;
};

/**
 * 检测response安全性
 */
export const detectResponse = async (prompt, response) => {
  const response_data = await apiClient.post('/api/detect/response', {
    prompt,
    response,
  });
  return response_data.data;
};

/**
 * 获取reasoning分析
 */
export const analyzeReasoning = async (prompt, response) => {
  const response_data = await apiClient.post('/api/detect/reasoning', {
    prompt,
    response,
  });
  return response_data.data;
};

/**
 * 创建WebSocket连接（带自动重连）
 */
export const createWebSocket = (onMessage, onError) => {
  let ws = null;
  let heartbeat = null;
  let reconnectTimer = null;
  let isManualClose = false;

  const connect = () => {
    ws = new WebSocket('ws://localhost:8000/ws/progress');
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      // 发送心跳
      heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 30000);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch { // pong等非JSON消息忽略
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) onError(error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
      // 自动重连（非手动关闭时）
      if (!isManualClose) {
        console.log('WebSocket will reconnect in 2s...');
        reconnectTimer = setTimeout(connect, 2000);
      }
    };
  };

  connect();

  // 返回一个带close方法的对象
  return {
    close: () => {
      isManualClose = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (heartbeat) clearInterval(heartbeat);
      if (ws) ws.close();
    },
    get readyState() {
      return ws ? ws.readyState : WebSocket.CLOSED;
    }
  };
};

export default apiClient;
