#!/bin/bash

# MihomoProxy 快速开始脚本

echo "==================================="
echo "MihomoProxy 快速开始"
echo "==================================="
echo ""

# 检查系统
check_system() {
    echo "正在检测操作系统..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        SYSTEM="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        SYSTEM="macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        SYSTEM="windows"
    else
        SYSTEM="unknown"
    fi
    echo "检测到系统: $SYSTEM"
}

# 检查依赖
check_dependencies() {
    echo ""
    echo "检查依赖..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js 未安装"
        echo "请安装 Node.js 18+: https://nodejs.org/"
        exit 1
    fi
    echo "✓ Node.js $(node --version) 已安装"
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        echo "❌ npm 未安装"
        exit 1
    fi
    echo "✓ npm $(npm --version) 已安装"
    
    # 检查 Rust
    if ! command -v rustc &> /dev/null; then
        echo "❌ Rust 未安装"
        echo "请安装 Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        exit 1
    fi
    echo "✓ Rust $(rustc --version | cut -d' ' -f2) 已安装"
}

# 安装依赖
install_deps() {
    echo ""
    echo "安装前端依赖..."
    npm install
    
    if [ $? -eq 0 ]; then
        echo "✓ 前端依赖安装成功"
    else
        echo "❌ 前端依赖安装失败"
        exit 1
    fi
}

# 开发模式
dev_mode() {
    echo ""
    echo "启动开发模式..."
    echo "==================================="
    echo "提示："
    echo "1. 应用窗口将打开"
    echo "2. 修改代码后应用会自动重载"
    echo "3. 按 Ctrl+C 停止开发服务器"
    echo "==================================="
    echo ""
    
    npm run tauri dev
}

# 构建生产版本
build_prod() {
    echo ""
    echo "构建生产版本..."
    npm run tauri build
    
    if [ $? -eq 0 ]; then
        echo "✓ 构建成功！"
        echo "构建产物位于: src-tauri/target/release/"
    else
        echo "❌ 构建失败"
        exit 1
    fi
}

# 显示帮助
show_help() {
    echo "用法: ./quickstart.sh [命令]"
    echo ""
    echo "命令:"
    echo "  dev     启动开发模式"
    echo "  build   构建生产版本"
    echo "  help    显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./quickstart.sh dev"
    echo "  ./quickstart.sh build"
}

# 主流程
main() {
    check_system
    check_dependencies
    install_deps
    
    case "${1:-dev}" in
        dev)
            dev_mode
            ;;
        build)
            build_prod
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo "未知命令: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
