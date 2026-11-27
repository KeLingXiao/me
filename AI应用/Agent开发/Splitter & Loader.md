# Splitter 和 Loader

> 本章会用到的包:

- @langchain/core
- @langchain/classic
- @langchain/community
- @langchain/textsplitters

# 文本处理方案

这里我们从实际出发, 如果你面临一个 AI 知识库 的业务问题 你会如何解决, 具体问题如下: 我上传一本 pdf 给 AI 后我在对 AI 进行, 我们不仅想让 AI 通过 上传的文档来回答 并且 还要求 AI 提供信息源 你会如何实现这个功能呢?

## 方案1: 一次性读取后上传

最简单的一个方案就是 直接将 文档内容 一次性读取出来 后发送给 AI, 下面是一段伪代码
这种方案简单可行, 但是随着文档不断增加 我们将会迎来第几个问题

- 上下文窗口溢出: 他会占据上下文窗口也就越来越多,==若一个文档的 token 总量占用 >= Context Window 则会溢出 我们无法将其放入模型 Context 中==
- 大量重复或无关信息: 一个文档中肯定有包含一些重复或无用的信息, 若将这些也直接一股脑地交给 LLLM 那么将会耗费更多时间进行 推理,响应 同时还会处理大量重复性共工作 是否有方法可以让我们提前处理文档, 在用户提问时即可直接使用呢? 这就是 [RAG 设计思想](./RAG.md) 简单理解为 将数据处理并保存到数据库

```ts
const bookContent = await readBook("./csapp.pdf");

// 构建 Prompt
const prompt = `
Book content:
${bookContent}

Question:
What is virtual memory?
`;

const res = await model.invoke(prompt);
```

## 我们所会遇到的所有问题都归咎于

1. Context Window 上下文窗口: 模型一次推理过程中能够处理的 token 数量上限

# Document

## Document Loader 是什么?
