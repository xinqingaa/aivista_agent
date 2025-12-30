#!/bin/bash

echo "🚀 AiVista 后端环境初始化脚本"
echo "================================"
echo ""

# 检查 pnpm 是否安装
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm 未安装，正在全局安装..."
    npm install -g pnpm
    if [ $? -ne 0 ]; then
        echo "❌ pnpm 安装失败，请手动安装：npm install -g pnpm"
        exit 1
    fi
    echo "✅ pnpm 安装成功"
else
    echo "✅ pnpm 已安装: $(pnpm --version)"
fi

echo ""
echo "📦 安装项目依赖..."
pnpm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo ""
echo "📝 配置环境变量..."

# 检查 .env 文件是否存在
if [ ! -f .env ]; then
    echo "创建 .env 文件..."
    cp .env.example .env
    
    # 替换 API Key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's/DASHSCOPE_API_KEY=your_dashscope_api_key_here/DASHSCOPE_API_KEY=sk-80cda2f2a44b4578b637b2dad2ab7b42/' .env
    else
        # Linux
        sed -i 's/DASHSCOPE_API_KEY=your_dashscope_api_key_here/DASHSCOPE_API_KEY=sk-80cda2f2a44b4578b637b2dad2ab7b42/' .env
    fi
    
    # 验证文件创建成功
    if [ -f .env ]; then
        echo "✅ .env 文件已创建"
        if grep -q "sk-80cda2f2a44b4578b637b2dad2ab7b42" .env; then
            echo "✅ API Key 已配置"
        else
            echo "⚠️  警告：API Key 可能未正确配置，请手动检查 .env 文件"
        fi
    else
        echo "❌ .env 文件创建失败"
    fi
    echo "✅ .env 文件已创建并配置 API Key"
else
    echo "⚠️  .env 文件已存在，跳过创建"
    echo "💡 如需更新 API Key，请手动编辑 .env 文件"
fi

echo ""
echo "✅ 环境初始化完成！"
echo ""
echo "📋 下一步："
echo "   1. 检查 .env 文件中的 API Key 是否正确"
echo "   2. 运行: pnpm run start:dev"
echo "   3. 访问: http://localhost:3000/api/agent/chat"
echo ""

