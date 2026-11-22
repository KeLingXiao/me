# 双向通信示例

在本目录安装：

```sh
pnpm install --frozen-lockfile
pnpm run run 1.query/app.mts
```

各编号目录对应轮询、长轮询、iframe、SSE、WebSocket、Socket.IO 的独立实验。每次运行一个案例，浏览器打开源码中 `listen` 指定的端口；多个案例可能占用相同端口。

```sh
pnpm run run 4.eventSource/app.mts
pnpm run run 5.ws/index.mts
pnpm run run 6.socketio/index.mts
```

`5.ws` 的 WebSocket 服务端监听 8888，页面静态服务可另开终端运行 `pnpm run run 5.ws/static.mts`，访问 8000。Socket.IO 案例监听 3000，浏览器客户端脚本由 Socket.IO 服务提供，不依赖根目录的安装路径。

文章：[WebSocket 与通信方式](../../../工程能力/项目实践/Websocket/websocket.md)。
