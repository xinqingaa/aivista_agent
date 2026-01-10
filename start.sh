#!/bin/bash

# AiVista 项目启动脚本
# 用法：
#   ./start.sh backend   - 仅启动后端
#   ./start.sh frontend  - 仅启动前端（预留）
#   ./start.sh all       - 同时启动前后端

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 存储子进程 PID
PIDS=()

# 清理函数：退出时杀死所有子进程
cleanup() {
    echo -e "\n${YELLOW}正在停止服务...${NC}"
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    wait
    echo -e "${GREEN}所有服务已停止${NC}"
    exit 0
}

# 注册清理函数
trap cleanup SIGINT SIGTERM EXIT

# 启动后端服务
start_backend() {
    echo -e "${BLUE}启动后端服务...${NC}"
    cd main/server
    
    # 检查 node_modules 是否存在
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}检测到未安装依赖，正在安装...${NC}"
        npm install
    fi
    
    # 检查 .env 文件是否存在
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}警告: 未找到 .env 文件，请确保已配置环境变量${NC}"
        if [ -f ".env.example" ]; then
            echo -e "${YELLOW}提示: 可以复制 .env.example 为 .env 并填写配置${NC}"
        fi
    fi
    
    npm run start:dev &
    BACKEND_PID=$!
    PIDS+=($BACKEND_PID)
    
    echo -e "${GREEN}后端服务已启动 (PID: $BACKEND_PID)${NC}"
    echo -e "${GREEN}后端地址: http://localhost:3000${NC}"
    echo -e "${GREEN}Swagger 文档: http://localhost:3000/api-docs${NC}"
    
    cd ../..
}

# 启动前端服务
start_frontend() {
    echo -e "${BLUE}启动前端服务...${NC}"
    cd main/client
    
    # 检测前端类型（Flutter 或 Next.js）
    if [ -f "pubspec.yaml" ]; then
        # Flutter 项目
        echo -e "${GREEN}检测到 Flutter 项目${NC}"
        echo -e "${YELLOW}Flutter 启动命令预留空间${NC}"
        echo -e "${YELLOW}提示: 请在 Flutter 项目中手动运行 'flutter run'${NC}"
        # TODO: 实现 Flutter 启动逻辑
        # flutter run &
        # FRONTEND_PID=$!
        # PIDS+=($FRONTEND_PID)
    elif [ -f "package.json" ] && grep -q "next" package.json; then
        # Next.js 项目
        echo -e "${GREEN}检测到 Next.js 项目${NC}"
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}检测到未安装依赖，正在安装...${NC}"
            npm install
        fi
        npm run dev &
        FRONTEND_PID=$!
        PIDS+=($FRONTEND_PID)
        echo -e "${GREEN}前端服务已启动 (PID: $FRONTEND_PID)${NC}"
        echo -e "${GREEN}前端地址: http://localhost:3001${NC}"
    else
        echo -e "${YELLOW}未检测到支持的前端项目类型${NC}"
    fi
    
    cd ../..
}

# 主逻辑
case "${1:-all}" in
    backend)
        start_backend
        echo -e "\n${GREEN}按 Ctrl+C 停止服务${NC}"
        wait
        ;;
    frontend)
        start_frontend
        echo -e "\n${GREEN}按 Ctrl+C 停止服务${NC}"
        wait
        ;;
    all)
        start_backend
        sleep 2  # 等待后端启动
        start_frontend
        echo -e "\n${GREEN}所有服务已启动，按 Ctrl+C 停止所有服务${NC}"
        wait
        ;;
    *)
        echo -e "${RED}用法: $0 {backend|frontend|all}${NC}"
        echo -e "${YELLOW}  backend  - 仅启动后端服务${NC}"
        echo -e "${YELLOW}  frontend - 仅启动前端服务${NC}"
        echo -e "${YELLOW}  all      - 同时启动前后端服务（默认）${NC}"
        exit 1
        ;;
esac
