# AI 示例

在本目录执行：

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# 填写模型服务配置后运行
pnpm tool
pnpm run run 2.mcp/mcp-server.mts
pnpm run run 3.rag/2.rag.mts seed
pnpm run rag:book
```

Windows PowerShell 可用 `Copy-Item .env.example .env`。命令应从本目录执行；启动脚本先加载旧 `code/.env`，再加载本目录 `.env`。`.env.example` 只包含变量名，不含密钥。

- `1.tool/`：模型工具调用；运行时可能调用模型 API 并生成响应文件。
- `2.mcp/`：MCP 服务端、客户端和适配器。客户端示例需要对应服务已启动，地址和权限见具体源码。
- `3.rag/`：向量检索实验；Milvus 示例需要可连接的 Milvus 服务以及嵌入模型。`2.rag.mts` 提供 `seed`、`ingest <file>`、`search <问题>`、`ask <问题>`、`schema` 命令。
- `4.rag-book/`：电子书检索；素材放在该目录的 `static/`，索引状态写入同目录 manifest。启动后输入 `help` 查看交互命令。
- `5.memory/`：记忆示例。运行前检查源码中的模型和服务配置。

这些是学习实验，不会在安装时自动启动服务、调用模型或建立索引。切换模型、素材或数据库后，不应直接沿用其他环境的 manifest。
