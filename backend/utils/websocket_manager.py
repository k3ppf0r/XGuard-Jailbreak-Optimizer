"""
WebSocket连接管理器
用于实时推送优化进度
"""
from fastapi import WebSocket
from typing import List, Dict, Any
import json


class WebSocketManager:
    """WebSocket连接管理器"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        """接受新连接"""
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """断开连接"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"WebSocket disconnected. Remaining connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """发送消息给指定连接"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            print(f"Error sending message: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: Dict[str, Any]):
        """广播消息给所有连接"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                print(f"Error broadcasting to connection: {e}")
                disconnected.append(connection)
        
        # 清理失效连接
        for conn in disconnected:
            self.disconnect(conn)
    
    async def broadcast_progress(self, progress_data: Dict[str, Any]):
        """广播优化进度"""
        message = {
            "type": "progress",
            "data": progress_data
        }
        print(f"[WebSocket] 广播进度数据: iteration={progress_data.get('iteration')}, candidate_index={progress_data.get('candidate_index')}, connections={len(self.active_connections)}")
        await self.broadcast(message)
    
    async def broadcast_result(self, result_data: Dict[str, Any]):
        """广播最终结果"""
        message = {
            "type": "result",
            "data": result_data
        }
        await self.broadcast(message)
    
    async def broadcast_error(self, error_message: str):
        """广播错误信息"""
        message = {
            "type": "error",
            "message": error_message
        }
        await self.broadcast(message)


# 全局WebSocket管理器实例
ws_manager = WebSocketManager()
