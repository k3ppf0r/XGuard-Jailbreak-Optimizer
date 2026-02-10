#!/bin/bash

# XGuard越狱优化器启动脚本

echo "🚀 启动XGuard越狱优化器"

# 检查Python虚拟环境
if [ ! -d "xguard_env" ]; then
    echo "❌ 虚拟环境不存在,请先创建虚拟环境"
    exit 1
fi

# 激活虚拟环境并安装依赖
echo "🔧 激活虚拟环境并检查依赖..."
source xguard_env/bin/activate

# 安装后端依赖(如果requirements.txt存在)
if [ -f "backend/requirements.txt" ]; then
    echo "📦 安装后端依赖..."
    pip install -r backend/requirements.txt -q
fi

# 启动后端服务
echo "🚀 启动后端API服务..."
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# 等待后端启动
echo "⏳ 等待后端服务启动..."
sleep 5

# 启动前端服务
echo "🌐 启动前端开发服务器..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ 服务启动完成!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "后端API: http://localhost:8000"
echo "前端界面: http://localhost:5173"
echo "API文档: http://localhost:8000/docs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "按Ctrl+C停止服务"

# 优雅关闭函数
cleanup() {
    echo ''
    echo '🛑 正在停止服务...'
    
    # 发送SIGTERM信号给后端(让FastAPI lifespan处理清理)
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        echo "  ⏹ 停止后端服务 (PID: $BACKEND_PID)"
        kill -TERM $BACKEND_PID 2>/dev/null
        # 等待后端优雅关闭(最多5秒)
        for i in {1..5}; do
            if ! kill -0 $BACKEND_PID 2>/dev/null; then
                break
            fi
            sleep 1
        done
        # 如果还未关闭,强制结束
        kill -9 $BACKEND_PID 2>/dev/null
    fi
    
    # 停止前端服务
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "  ⏹ 停止前端服务 (PID: $FRONTEND_PID)"
        kill -TERM $FRONTEND_PID 2>/dev/null
        sleep 1
        kill -9 $FRONTEND_PID 2>/dev/null
    fi
    
    echo '✅ 所有服务已停止'
    exit 0
}

# 捕获中断信号
trap cleanup INT TERM

# 等待用户中断
wait
