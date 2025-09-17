#!/bin/bash

# Zotero微信HTML清理插件构建脚本

echo "开始构建Zotero微信HTML清理插件..."

# 检查是否在正确的目录
if [ ! -f "manifest.json" ]; then
    echo "错误: 请在插件根目录运行此脚本"
    exit 1
fi

# 创建构建目录
BUILD_DIR="build"
XPI_NAME="wx-html-cleaner.xpi"

# 清理之前的构建
if [ -d "$BUILD_DIR" ]; then
    rm -rf "$BUILD_DIR"
fi

if [ -f "$XPI_NAME" ]; then
    rm "$XPI_NAME"
fi

echo "清理完成，开始打包..."

# 创建XPI文件（实际上是ZIP格式）
zip -r "$XPI_NAME" . \
    -x "*.git*" \
    -x "build.sh" \
    -x "build/*" \
    -x "*.DS_Store" \
    -x "*.md" \
    -x "node_modules/*" \
    -x "*.log"

if [ $? -eq 0 ]; then
    echo "✅ 构建成功!"
    echo "📦 XPI文件: $XPI_NAME"
    echo "📊 文件大小: $(du -h "$XPI_NAME" | cut -f1)"
    echo ""
    echo "安装方法:"
    echo "1. 打开Zotero 7"
    echo "2. 进入 工具 → 插件"
    echo "3. 点击齿轮图标 → 从文件安装插件"
    echo "4. 选择 $XPI_NAME 文件"
    echo "5. 重启Zotero"
else
    echo "❌ 构建失败!"
    exit 1
fi