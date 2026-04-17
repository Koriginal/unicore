# UniCore

[简体中文](README.zh-CN.md)

UniCore is an offline-first, localized rebuild of Claude Code, focused on local deployment, Bun workflow, and stable CLI operation. It is designed to work seamlessly with various Anthropic/OpenAI-compatible gateways for local or private LLM integration.

## 0. Quick Install & Update (Recommended)

Run the following command in your terminal to install or update UniCore:

```bash
curl -fsSL https://raw.githubusercontent.com/Koriginal/unicore/main/scripts/get-unicore.sh | bash
```

## Quick Navigation
- [1. Deployment (From Zero)](#1-deployment-from-zero)
- [2. Core Features](#2-core-features)
- [3. Startup Modes](#3-startup-modes)
- [4. Usage Commands](#4-usage-commands)
- [5. Model & Provider Management](#5-model--provider-management)
- [6. Plugin System (/plugin)](#6-plugin-system-plugin)
- [7. Buddy (Terminal Pet) System](#7-buddy-terminal-pet-system)
- [Detailed Disclaimer](./DISCLAIMER.md)

---

## 1. Deployment (From Zero)

### 1.1 Requirements
- macOS / Linux
- `git`
- Bun `>= 1.3.x` (Recommended)

```bash
bun --version
```

If Bun is missing:
```bash
curl -fsSL https://bun.sh/install | bash
```

### 1.2 Clone and Install
```bash
git clone https://github.com/Koriginal/unicore.git
cd unicore
./scripts/bunw.sh install
```

### 1.3 Build
```bash
./scripts/bunw.sh run build
```

---

## 2. Core Features
- **Fully Offline & Private**: Removed cloud-login constraints. All configurations and session histories are stored locally in `~/.unicore`.
- **Multi-Provider & Multi-Model Management**: Seamlessly configure multiple providers (e.g., Aliyun, OpenRouter, local Ollama) in a single system. Bind multiple models to each provider and switch instantly using `/model`.
- **Robust Plugin Ecosystem**: Includes an interactive `/plugin` marketplace to quickly expand your Agent's capabilities.

---

## 3. Startup Modes

### 2.1 Recommended (Build + Start)
```bash
./scripts/bunw.sh run start
```

### 2.2 Start Built Output (No Rebuild)
```bash
./scripts/bunw.sh run start:built
```

### 2.3 Development & Debug
```bash
# Hot-reload mode
npm run dev
# Start with debug logging
./scripts/bunw.sh run start:built -- --debug-to-stderr
```

---

## 4. Usage Commands

### 3.1 Core Commands
- `/setup`: Interactive model setup wizard (Highly Recommended for first run)
- `/status`: Inspect current gateway, model, auth, and session status
- `/project`: Switch project directory (with recent project picker)
- `/skills`: List built-in and project-specific capabilities
- `/model`: Quickly switch the model for the current session

### 3.2 Utilities
- `/doctor`: Run health check for the environment
- `/clear`: Clear conversation context
- `/init`: Scan codebase and initialize `UNICORE.md` instructions
- `/compact`: Manually compress context to save tokens

---

## 5. Model & Provider Management

UniCore supports managing multiple model providers and their sub-models within a single unified system.

### 5.1 Interactive Setup Wizard (Recommended)
Type `/setup` to launch the interactive wizard.
You can choose from presets (Anthropic, Ollama, DeepSeek) or configure any custom OpenAI-compatible gateway. Once configured, the provider and all its registered models are persisted locally.

### 5.2 Seamless Model Switching
Use the `/model` command. The system aggregates and displays all models from all the providers you configured in `/setup`. Once you select a model, UniCore instantly swaps the underlying API Key and Base URL automatically.

### 5.3 Network Diagnostics
If you experience API timeouts or failures, run `/assistant probe` to test gateway connectivity and compatibility.

---

## 6. Plugin System (/plugin)

UniCore features a robust plugin architecture to extend agent capabilities.

- **Browse Plugins**: Type `/plugin` to open the interactive marketplace.
- **Install Plugins**: `/plugin install <plugin_name>`
- **Manage**: Toggle or remove installed plugins directly within the `/plugin` UI.

---

## 7. Buddy (Terminal Pet) System

UniCore includes an interactive terminal pet (Buddy) to accompany your coding journey.

- [Buddy System Guide](./BUDDY_SYSTEM.md)

---

## Disclaimer & Credits

> [!CAUTION]
> **Legal Notice**: This project is for **Research and Educational purposes ONLY**. It is a reconstructed version based on the leaked **Claude Code** source code (referencing `instructkr/claude-code`) and is **NOT** an official product. Please read the [Full Disclaimer](./DISCLAIMER.md) before use.

Special thanks to all the open-source and closed-source projects that inspire AI developer experiences.
