"""
XGuard越狱攻击优化器 - FastAPI主服务
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from typing import Dict, Any
import concurrent.futures
import functools

from core.xguard_detector import XGuardDetector
from core.target_llm import create_target_llm
from core.optimizer import JailbreakOptimizer
from models.schemas import (
    DetectRequest,
    OptimizationRequest,
    DetectResponse,
    OptimizationResult,
    ErrorResponse
)
from utils.websocket_manager import ws_manager


# 全局变量
detector: XGuardDetector = None
thread_pool = concurrent.futures.ThreadPoolExecutor(max_workers=2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global detector
    
    # 启动时加载模型
    print("Initializing XGuard detector...")
    detector = XGuardDetector()
    print("XGuard detector ready!")
    
    yield
    
    # 关闭时清理资源
    print("Shutting down...")


# 创建FastAPI应用
app = FastAPI(
    title="XGuard Jailbreak Optimizer",
    description="基于XGuard的越狱攻击优化器API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",           # Swagger UI 文档地址,改为 None 可关闭
    redoc_url="/redoc",         # ReDoc 文档地址,改为 None 可关闭
    openapi_url="/openapi.json" # OpenAPI 规范地址,改为 None 可关闭
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/")
async def root():
    """健康检查"""
    return {
        "status": "running",
        "service": "XGuard Jailbreak Optimizer",
        "version": "1.0.0"
    }


@app.post("/api/optimizer/start")
async def start_optimization(request: OptimizationRequest):
    """
    启动越狱攻击优化任务（后台异步执行）
    """
    try:
        # 创建LLM实例
        # 所有目标都需要优化LLM
        target_llm = create_target_llm(
            api_key=request.api_key,
            model_name=request.model_name,
            base_url=request.base_url
        )
        
        # goal1/goal2需要下游LLM
        downstream_llm = None
        if request.objective in ["goal1", "goal2"]:
            if not request.downstream_api_key:
                raise HTTPException(
                    status_code=400,
                    detail="goal1/goal2需要下游模型API密钥"
                )
            
            downstream_llm = create_target_llm(
                api_key=request.downstream_api_key,
                model_name=request.downstream_model_name or request.model_name,
                base_url=request.downstream_base_url
            )
        
        # 创建优化器(带进度回调)
        async def progress_callback(data: Dict[str, Any]):
            await ws_manager.broadcast_progress(data)
        
        optimizer = JailbreakOptimizer(
            detector=detector,
            target_llm=target_llm,
            downstream_llm=downstream_llm,
            max_iterations=request.max_iterations,
            progress_callback=progress_callback
        )
        
        # 后台异步执行优化任务,HTTP立即返回
        async def run_optimization_task():
            try:
                loop = asyncio.get_event_loop()
                # 在线程池中执行优化（避免阻塞事件循环）
                result = await optimizer.optimize(
                    malicious_intent=request.malicious_intent,
                    objective=request.objective,
                    candidates_per_iteration=request.candidates_per_iteration
                )
                # 广播最终结果
                await ws_manager.broadcast_result(result)
            except Exception as e:
                error_msg = f"Optimization failed: {str(e)}"
                print(f"[ERROR] {error_msg}")
                import traceback
                traceback.print_exc()
                await ws_manager.broadcast_error(error_msg)
        
        asyncio.create_task(run_optimization_task())
        
        return {"status": "started", "message": "优化任务已启动"}
    
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Failed to start optimization: {str(e)}"
        raise HTTPException(status_code=500, detail=error_msg)


@app.post("/api/detect/prompt")
async def detect_prompt(request: DetectRequest):
    """
    检测单个prompt的安全性
    """
    try:
        if not request.content:
            raise HTTPException(status_code=400, detail="content is required")
        
        result = detector.check_prompt_safety(request.content)
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/detect/response")
async def detect_response(request: DetectRequest):
    """
    检测AI响应的安全性
    """
    try:
        if not request.prompt or not request.response:
            raise HTTPException(
                status_code=400,
                detail="prompt and response are required"
            )
        
        result = detector.check_response_safety(
            request.prompt,
            request.response
        )
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/detect/reasoning")
async def analyze_reasoning(request: DetectRequest):
    """
    获取详细的reasoning分析
    """
    try:
        if not request.prompt or not request.response:
            raise HTTPException(
                status_code=400,
                detail="prompt and response are required"
            )
        
        result = detector.analyze_reasoning(
            request.prompt,
            request.response
        )
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/progress")
async def websocket_progress(websocket: WebSocket):
    """
    WebSocket端点: 实时推送优化进度
    """
    await ws_manager.connect(websocket)
    try:
        # 保持连接,接收客户端心跳
        while True:
            data = await websocket.receive_text()
            # 可以处理客户端发送的控制命令
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)


@app.get("/api/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "detector_loaded": detector is not None,
        "active_ws_connections": len(ws_manager.active_connections)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
