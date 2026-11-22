# 代码示例

这里存放文章配套代码和学习实验。简单的 JavaScript / Node.js 示例共用根目录工具；需要服务、模型或构建流程的项目，在自己的目录安装和运行。

## 开始运行

使用 Node.js 22.16+ 和 pnpm 10.34.5。在仓库根目录执行：

```sh
cd code
pnpm install --frozen-lockfile
pnpm run run javascript/数组转树.js
pnpm run run nodejs/eventEmitter/index.js
```

`pnpm run run <文件>` 用于运行单个 JS / TS 示例。浏览器 DOM 示例需要在浏览器中打开，不能直接用 Node.js 运行。各章节保留数字前缀，便于对照文章。

## 目录与运行入口

- `javascript/`：数组方法、Promise、并发、深拷贝等单文件实验，使用根目录工具。
- `nodejs/`：模块、事件、流、Worker、Source Map 实验，使用根目录工具。`stream/` 会启动 HTTP 服务；部分调试示例用于演示异常或 CommonJS，需要按源码上下文运行，并非统一测试套件。
- `nodejs/fanyi/`：独立的模型翻译工具。在此目录执行 `pnpm install --frozen-lockfile`、`pnpm start`。模型配置见 `fanyi.config.mts`，运行前配置 `.env`。
- `ai/`：工具调用、MCP、RAG、记忆。独立安装，详见 [AI 示例说明](ai/README.md)。对应文章在 [AI 应用](../AI应用/README.md)。
- `engineering/Websocket/`：轮询、SSE、WebSocket、Socket.IO，独立安装，详见 [通信示例说明](engineering/Websocket/README.md)。对应文章：[WebSocket](../工程能力/项目实践/Websocket/websocket.md)。
- `vue/vue-impl/`：独立的 pnpm workspace。在此目录执行 `pnpm install --frozen-lockfile`、`pnpm dev`，随后通过本地静态服务打开 `test/` 下的 HTML 验证响应式实现。测试页依赖构建输出，不能只打开源码。

## 依赖边界

根目录只保留 `tsx`、TypeScript、Node 类型、RxJS 和 Source Map。AI、翻译、WebSocket、Vue 分别维护自己的 `package.json` 与锁文件，不必为运行简单实验安装模型或前端框架依赖。

这里没有新增覆盖所有项目的 workspace，以便按需安装。新增完整项目应自带配置和启动说明；新增纯语言实验可继续使用根工具。

## 环境变量与运行数据

- 本地 `.env` 不提交。AI 和翻译的启动命令兼容原来的 `code/.env`，各自目录的 `.env` 优先。不要把真实密钥复制到示例文件。
- `dist/`、`node_modules/` 为本地产物，不提交。
- `response-tool.json`、`response.md`、`ebook-rag-manifest*.json` 为运行结果或索引状态。已有文件保留；新产物忽略，不作为跨机器复用的输入。
- AI 文档素材位于对应 RAG 案例的 `static/`。迁移数据库、文档或模型后，应重新建立对应索引。

## 目录迁移

原 `JS/` → `javascript/`，`AIAgent/aiagent/` → `ai/`，`工程实践/` → `engineering/`。`nodejs/` 路径保留；`Vue/` → `vue/`。
