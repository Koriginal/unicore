# UniCore

[English](README.md)

UniCore 是对 Claude Code 的本地化重建版本，专注于本地 deployment、Bun 工作流以及稳定的 CLI 运行体验。它特别针对本地开发环境进行了优化，支持通过各种 Anthropic/OpenAI 兼容网关接入主流大语言模型。

## 0. 一键安装与更新 (推荐)

在终端运行以下命令即可快速安装或更新 UniCore：

```bash
curl -fsSL https://raw.githubusercontent.com/Koriginal/unicore/main/scripts/get-unicore.sh | bash
```

### 卸载

从系统中移除 UniCore：
```bash
curl -fsSL https://raw.githubusercontent.com/Koriginal/unicore/main/scripts/uninstall-unicore.sh | bash
```

## 快速导航
- [1. 部署与安装](#1-部署与安装)
- [2. 核心特性](#2-核心特性)
- [3. 启动模式](#3-启动模式)
- [4. 常用命令](#4-常用命令)
- [5. 模型与多供应商管理](#5-模型与多供应商管理)
- [6. 插件系统 (/plugin)](#6-插件系统-plugin)
- [7. Buddy (终端宠物) 系统](#7-buddy-终端宠物-系统)
- [法律免责声明](./DISCLAIMER.zh-CN.md)

---

## 1. 部署与安装

### 1.1 环境要求
- macOS / Linux
- `git`
- Bun `>= 1.3.x` (推荐)

```bash
bun --version
```

若未安装 Bun：
```bash
curl -fsSL https://bun.sh/install | bash
```

### 1.2 拉取代码与依赖
```bash
git clone https://github.com/Koriginal/unicore.git
cd unicore
./scripts/bunw.sh install
```

### 1.3 构建产物
```bash
./scripts/bunw.sh run build
```

---

## 2. 核心特性
- **完全离线与私有化**：移除所有强制产品登录限制，配置和历史记录均保存在本地 `~/.unicore`。
- **多供应商与多模型管理**：支持同系统内配置多个供应商（如阿里云、OpenRouter、本地 Ollama），每个供应商可挂载多个模型，使用 `/model` 瞬间无缝切换。
- **强大的插件生态**：内置交互式 `/plugin` 市场，可快速扩展 Agent 的系统能力。

---

## 3. 启动模式

### 2.1 推荐（构建并启动）
```bash
./scripts/bunw.sh run start
```

### 2.2 启动已构建产物 (不重复构建)
```bash
./scripts/bunw.sh run start:built
```

### 2.3 开发调试模式
```bash
# 实时重载模式
npm run dev
# 带调试日志启动
./scripts/bunw.sh run start:built -- --debug-to-stderr
```

---

## 4. 常用命令

### 3.1 核心命令
- `/setup`: 模型配置向导（强烈推荐首次运行使用）
- `/status`: 查看当前网关、模型、鉴权及会话状态
- `/project`: 切换项目目录（支持最近记录选择）
- `/skills`: 查看系统内置及项目特有的技能
- `/model`: 快速切换当前会话使用的模型

### 3.2 辅助命令
- `/doctor`: 运行环境健康检查
- `/clear`: 清除会话上下文
- `/init`: 自动扫描项目并生成 `UNICORE.md` 配置
- `/compact`: 手动压缩上下文以节省 token

---

## 5. 模型与多供应商管理

UniCore 支持在一个系统中同时管理多个模型供应商及其下属的多个模型。

### 5.1 交互式配置向导 (推荐)
输入 `/setup` 进入交互界面。
您可以选择预设（如 Anthropic, Ollama）或自定义兼容 OpenAI 格式的接口。配置完毕后，该供应商及配置的所有模型将持久化保存。

### 5.2 无缝切换模型
使用 `/model` 命令。系统会聚合并展示您在 `/setup` 中配置的所有供应商及其模型列表。选择目标模型后，系统会自动为您切换所需的 API Key 和 Base URL。

### 5.3 诊断网络
如果模型回复异常，运行 `/assistant probe` 可以测试网关的连通性和接口兼容性。

---

## 6. 插件系统 (/plugin)

UniCore 拥有强大的插件系统，可以扩展 Agent 的能力。

- **浏览插件**: `/plugin` (打开交互式市场)
- **安装插件**: `/plugin install <plugin_name>`
- **管理插件**: 可以在 `/plugin` 界面中开启、关闭或删除已安装的插件。

---

## 7. Buddy (终端宠物) 系统

UniCore 内置了一个有趣的终端交互宠物 (Buddy)，在您编码时提供陪伴。

- [宠物系统指南](./BUDDY_SYSTEM.zh-CN.md)

---

## 声明与鸣谢

> [!CAUTION]
> **法律声明**：本项目**仅供学习、研究与技术交流使用**。本代码库是基于泄露的 **Claude Code** 源码（参考 `instructkr/claude-code`）的重构版本，**并非**官方产品。使用前请务必阅读[详细免责声明](./DISCLAIMER.zh-CN.md)。

感谢所有为 AI 开发者体验提供灵感的开源及闭源项目。
