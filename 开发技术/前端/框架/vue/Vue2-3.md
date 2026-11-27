# Vue 的理解

1. 声明式框架: Vue 核心特点就是 **声明式** 框架(不关心过程), 声明式更加关注 结果, 命令式关注 过程
2. MVVM 模式: 简化数据到视图的思想, Vue/React 知识借鉴了 MVVM 思想而不是完全遵守

- MVC: 用户请求 先通过 Controller(控制器) 将 数据库查询 等操作放到 Service(业务层), Model(模型层) 则是 Service 操作的数据模型, 最后 Service 在更新 View(视图层)
- 共同解决的: 职责划分, 分层管理

3. 虚拟DOM(Virtual DOM):

- 传统更新页面 拼接完整字符串 后 在通过 innerHTML 全部重新渲染, 添加虚拟DOM通过 Diff 算法进行差异性对比在进行更新 即可实现页面减少 回流和重绘 以及 真实 操作DOM的次数
- 通过虚拟DOM可以实现跨平台

4. 编译时和运行时

- Vue 渲染核心就是 ==render 函数== 将虚拟DOM转换为真实DOM
- 编译时 作用就通过 模板的方式 将其编译为 虚拟DOM

5. 组件化

- 实现高内聚,低耦合 与 单向数据流
- 组件化开发大幅提升 复用性, 测试性 与 效率
- 降低更新范围 只重新渲染对应组件

6. 渐进式框架

# 谈谈你对 SPA 的理解

1. 分类:

- SPA:
- MPA:

# 为何需要虚拟 DOM

常用的框架 React/Vue 都引入了 VirtualDOM, 为了就是降低 操作 真实 DOM 的次数 提升 效率

1. 什么是虚拟DOM: 虚拟DOM就是 通过 对象 来描述一个 DOM 节点的方式. 解决的第一个问题就是 直接操作 DOM 效率低 而 操作 JS 效率高 则我们将操作方改编为 JS 层面 以此提升效率, 解决的第二个问题就是 虚拟 DOM 不依赖于平台的 所以可以实现跨平台

```ts
// 效率低
for (let i = 0; i < 1e6; i++) {
  document.body.appendChild(document.createElement("div"));
}

// 效率高
for (let i = 0; i < 1e6; i++) {
  console.log(i);
}
```

2. VDOM 是如何生成的: Vue 中编写的模板通常都会被编译器编译为 `render 函数`, 通过 `执行 render 函数` 来生成 `Virtual DOM` 后续执行 patch 方法 转换为真实DOM
3. VDOM 如何做 DIFF:

- 挂载过程结束后 会记录第一次生成的 VNode -> oildVNode
- 数据发生变化后 会让组件重新 render, 此时就生成新的 VNode -> newVNode
- 使用 oldVNode 和 newVNode 做 diff 操作 将更新部分 落实到 真实 DOM 上(实现了 最小化更新 高效更新视图)

下面是简单的 伪代码

```ts
let oldVnode = render();

function patch(newNode) {
  // diff olvVnode newVnode
  // create realy dom
}
```

# 谈谈你对 组件化的理解

组件化或模块化最终目的 都是 提高复用性和组合性

1. 组件

- WebComponent 组件化组成: 模板, 属性, 事件, 插槽, 生命周期

2. 组件化好处: 高内聚, 低耦合, 可组合

- 组件化开发 可以大幅提高 可复用性/测试性 以及提升开发效率
- 降低更新范围, 只重新渲染变化组件

3. Vue2/3

- 每个组件都是一个 watcher/effect
- 数据变化会重新执行 watcher/effect
- 组件划分不合理时 渲染更新也会不合理(太多组件会导致 watcher/effect 过多产生性能浪费)

# Vue 通过数据劫持可以精确探测数据变化 为何 还需要 虚拟 DOM 进行 DIFF 操作呢?

Vue 的设计是 ==组件级 watcher/effect== 每个组件都属一个 watcher/effect 没有采用一个属性对应一个 watcher/effect 因为这样设计可以有效减少 watcher/effect 的数量 降低性能损耗. 由于没有每个属性都有对应的 `watcher/effect` 所以需要 DOMDiff 来进行 差异检测 最后 组件进行更新

# Vue2/3 响应式的理解

## 如何实现响应式 & 弊端

Vue2 采用 `Object.defineProperty` API 来实现数据劫持, 相关实现方法是 [defineReactive](https://github.com/vuejs/vue/blob/9e88707940088cb1f4cd7dd210c9168a50dc347c/src/core/observer/index.ts#L128) 而 Object.defineProperty 只能对已存在属性进行劫持 无法对新增或删除属性进行劫持 所以 Vue2 额外实现了 `$set/$delete`, 还有一个问题就是 无法对数组进行劫持, 所以 Vue2 采用 函数劫持/重写数组方法 的形式来实现 劫持

这里我们实现了一个简单的 [defineReactive](../../../../code/vue/1.Responsive/vue2-defineReactiveV1.ts) 函数, 由于需要重写 `getter/setter` 所以性能差, 另外对数组 实现函数劫持, 另外 对于 ES6 Map/Set 数据结构不支持

Vue3 采用 `ES6 Proxy` 天生支持 对 新增/删除 等属性 进行劫持
