<script setup lang="ts">
import { computed, ref, reactive, onMounted, onUnmounted } from "vue";
import { withBase } from "vitepress";
import { data } from "../graph.data.mts";
import { createLayout, stepLayout } from "../graph-layout";
const query = ref(""),
  selected = ref(""),
  scale = ref(1);
const offset = ref({ x: 0, y: 0 });
const svg = ref<SVGSVGElement>();
const sorted = [...data.nodes].sort((a, b) => a.id.localeCompare(b.id));
const initial = createLayout(sorted, data.edges);
for (let step = 0; step < 400; step++) stepLayout(initial, data.edges);
const nodes = reactive(initial);
type Node = (typeof nodes)[number];
const lookup = new Map(nodes.map((n) => [n.id, n]));
let drag:
  | {
      pointer: number;
      x: number;
      y: number;
      ox: number;
      oy: number;
      node?: Node;
    }
  | undefined;
const dragging = ref(false);
let frame = 0,
  last = 0,
  ticks = 0;
let reduced = false;
let media: MediaQueryList | undefined;
function animate(now: number) {
  if (now - last < 16) {
    frame = requestAnimationFrame(animate);
    return;
  }
  last = now;
  const movement = stepLayout(
    nodes,
    data.edges,
    Math.max(0.15, 1 - ticks / 180),
  );
  ticks++;
  frame = ticks < 180 && movement > 0.03 ? requestAnimationFrame(animate) : 0;
}
function settle() {
  if (reduced) {
    for (let i = 0; i < 100; i++) stepLayout(nodes, data.edges, 0.5);
    return;
  }
  ticks = 0;
  if (!frame) {
    last = performance.now();
    frame = requestAnimationFrame(animate);
  }
}
function motionChange() {
  reduced = media?.matches || false;
  if (reduced) {
    cancelAnimationFrame(frame);
    frame = 0;
    settle();
  }
}
onMounted(() => {
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  media = matchMedia("(prefers-reduced-motion: reduce)");
  motionChange();
  media.addEventListener("change", motionChange);
  if (!reduced) settle();
});
onUnmounted(() => {
  window.removeEventListener("pointermove", move);
  window.removeEventListener("pointerup", up);
  window.removeEventListener("pointercancel", up);
  cancelAnimationFrame(frame);
  media?.removeEventListener("change", motionChange);
});
const active = computed(() => lookup.get(selected.value));
const neighbors = computed(
  () =>
    new Set(
      data.edges.flatMap((e) =>
        e.from === selected.value
          ? [e.to]
          : e.to === selected.value
            ? [e.from]
            : [],
      ),
    ),
);
const related = computed(() => nodes.filter((n) => neighbors.value.has(n.id)));
function dim(n: Node) {
  return (
    (query.value &&
      !n.title.toLowerCase().includes(query.value.toLowerCase())) ||
    (selected.value && n.id !== selected.value && !neighbors.value.has(n.id))
  );
}
function point(e: PointerEvent) {
  const matrix = svg.value?.getScreenCTM();
  return matrix
    ? new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse())
    : new DOMPoint();
}
function down(e: PointerEvent) {
  if (e.button !== 0 || drag) return;
  const p = point(e),
    id = (e.target as Element)
      .closest("[data-node]")
      ?.getAttribute("data-node");
  const node = id ? lookup.get(id) : undefined;
  if (node) {
    selected.value = node.id;
    node.pinned = true;
    node.vx = node.vy = 0;
  }
  drag = {
    pointer: e.pointerId,
    x: p.x,
    y: p.y,
    ox: node?.x ?? offset.value.x,
    oy: node?.y ?? offset.value.y,
    node,
  };
  dragging.value = true;
  svg.value?.setPointerCapture(e.pointerId);
}
function move(e: PointerEvent) {
  if (!drag || drag.pointer !== e.pointerId) return;
  const p = point(e);
  if (drag.node) {
    drag.node.x = drag.ox + (p.x - drag.x) / scale.value;
    drag.node.y = drag.oy + (p.y - drag.y) / scale.value;
    drag.node.vx = drag.node.vy = 0;
    if (!reduced) settle();
  } else
    offset.value = { x: drag.ox + p.x - drag.x, y: drag.oy + p.y - drag.y };
}
function up(e: PointerEvent) {
  if (
    e.type === "lostpointercapture" &&
    (e.target !== svg.value || e.buttons !== 0)
  )
    return;
  if (drag?.pointer !== e.pointerId) return;
  drag = undefined;
  dragging.value = false;
  if (svg.value?.hasPointerCapture(e.pointerId))
    svg.value.releasePointerCapture(e.pointerId);
  settle();
}
function reset() {
  scale.value = 1;
  offset.value = { x: 0, y: 0 };
  selected.value = "";
  query.value = "";
  nodes.forEach((n) => {
    n.pinned = false;
  });
  settle();
}
function label(n: Node) {
  return n.title.length > 18 ? n.title.slice(0, 18) + "…" : n.title;
}
</script>
<template>
  <main class="knowledge-graph">
    <header>
      <div>
        <h1>知识图谱</h1>
        <p>{{ nodes.length }} 篇文章 · {{ data.edges.length }} 条链接</p>
      </div>
      <input
        v-model="query"
        type="search"
        placeholder="查找文章…"
        aria-label="查找文章"
      />
    </header>
    <div class="graph-workspace">
      <section class="graph-stage" aria-label="知识关系图">
        <div class="graph-controls">
          <button @click="scale = Math.min(3, scale + 0.2)" aria-label="放大">
            ＋</button
          ><button
            @click="scale = Math.max(0.5, scale - 0.2)"
            aria-label="缩小"
          >
            −</button
          ><button @click="reset">复位</button>
        </div>
        <svg
          ref="svg"
          viewBox="0 0 1000 800"
          :class="{ dragging }"
          @pointerdown="down"
          @pointermove="move"
          @pointerup="up"
          @pointercancel="up"
          @lostpointercapture="up"
          @wheel.prevent="
            scale = Math.max(0.5, Math.min(3, scale - $event.deltaY * 0.001))
          "
        >
          <g
            :transform="`translate(${offset.x} ${offset.y}) translate(500 400) scale(${scale}) translate(-500 -400)`"
          >
            <line
              v-for="e in data.edges"
              :key="e.from + e.to"
              :x1="lookup.get(e.from)!.x"
              :y1="lookup.get(e.from)!.y"
              :x2="lookup.get(e.to)!.x"
              :y2="lookup.get(e.to)!.y"
              :class="{ connected: selected === e.from || selected === e.to }"
            />
            <g
              v-for="n in nodes"
              :key="n.id"
              :data-node="n.id"
              tabindex="0"
              role="button"
              :aria-label="n.title"
              :aria-pressed="selected === n.id"
              :class="{ dim: dim(n), chosen: selected === n.id }"
              :transform="`translate(${n.x} ${n.y})`"
              @click="selected = n.id"
              @keydown.enter="selected = n.id"
              @keydown.space.prevent="selected = n.id"
            >
              <circle class="node-hit" r="15" />
              <circle
                class="node-dot"
                :r="n.radius + (selected === n.id ? 1 : 0)"
              />
              <text :y="n.radius + 17" text-anchor="middle">
                {{ label(n) }}
              </text>
              <title>{{ n.title }}</title>
            </g>
          </g>
        </svg>
        <p class="graph-help">拖动节点调整位置 · 拖动空白处平移 · 滚轮缩放</p>
      </section>
      <aside>
        <template v-if="active"
          ><small>{{ active.group }}</small>
          <h2>{{ active.title }}</h2>
          <a class="graph-read" :href="withBase(active.url)">阅读文章 ↗</a>
          <h3>
            关联文章 <span>{{ related.length }}</span>
          </h3>
          <p v-if="!related.length">这篇文章暂时没有站内链接。</p>
          <button v-for="n in related" :key="n.id" @click="selected = n.id">
            {{ n.title }} <span>→</span>
          </button></template
        ><template v-else
          ><small>目录</small>
          <h2>文章关联</h2>
          <p>连线来自文章中的链接。节点越大，关联越多。</p>
          <h3>{{ query ? "搜索结果" : "全部文章" }}</h3>
          <button
            v-for="n in nodes.filter(
              (n) =>
                !query || n.title.toLowerCase().includes(query.toLowerCase()),
            )"
            :key="n.id"
            @click="selected = n.id"
          >
            {{ n.title }} <span>→</span>
          </button>
          <p
            v-if="
              query &&
              !nodes.some((n) =>
                n.title.toLowerCase().includes(query.toLowerCase()),
              )
            "
          >
            没有匹配的文章。
          </p></template
        >
      </aside>
    </div>
  </main>
</template>
<style scoped>
.knowledge-graph {
  max-width: 1480px;
  margin: auto;
  padding: 40px 32px;
}
.knowledge-graph header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
}
h1 {
  font-size: 26px;
  font-weight: 650;
  letter-spacing: -0.04em;
}
header p,
aside p {
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.8;
}
header input {
  border: 1px solid var(--vp-c-divider);
  padding: 9px 12px;
  border-radius: 5px;
  width: 230px;
  font-size: 13px;
}
.graph-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px;
  border-top: 1px solid var(--vp-c-divider);
}
.graph-stage {
  position: relative;
  min-width: 0;
  background: var(--vp-c-bg);
}
svg {
  width: 100%;
  height: calc(100dvh - 260px);
  min-height: 600px;
  touch-action: none;
  cursor: grab;
}
line {
  stroke: var(--vp-c-divider);
  stroke-width: 1;
}
.connected {
  stroke: var(--vp-c-brand-1);
  stroke-width: 1.6;
}
.node-dot {
  fill: var(--vp-c-text-3);
  stroke: var(--vp-c-bg);
  stroke-width: 2;
}
.chosen .node-dot {
  fill: var(--vp-c-brand-1);
}
text {
  font-size: 13px;
  fill: var(--vp-c-text-2);
}
[data-node] {
  cursor: grab;
  transition: opacity 0.15s;
}
.dim {
  opacity: 0.25;
}
.graph-controls {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  gap: 4px;
}
.graph-controls button {
  font-size: 12px;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  border-radius: 4px;
}
.graph-help {
  position: absolute;
  bottom: 12px;
  left: 20px;
  font-size: 11px;
  color: var(--vp-c-text-3);
}
aside {
  padding: 24px;
  border-left: 1px solid var(--vp-c-divider);
  max-height: calc(100dvh - 260px);
  overflow: auto;
}
aside small {
  font-size: 11px;
  color: var(--vp-c-text-3);
}
aside h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 8px 0 16px;
  line-height: 1.6;
}
aside h3 {
  font-size: 12px;
  margin: 28px 0 10px;
  font-weight: 600;
}
aside h3 span {
  color: var(--vp-c-text-3);
  margin-left: 6px;
}
aside button {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 0;
  border-bottom: 1px solid var(--vp-c-divider);
  text-align: left;
  font-size: 12px;
  line-height: 1.6;
}
aside button:hover,
.graph-read {
  color: var(--vp-c-brand-1);
}
.graph-read {
  font-size: 13px;
}
@media (max-width: 760px) {
  .knowledge-graph {
    padding: 24px 16px;
  }
  .knowledge-graph header {
    align-items: flex-start;
    flex-direction: column;
  }
  header input {
    width: 100%;
  }
  .graph-workspace {
    grid-template-columns: 1fr;
  }
  svg {
    height: auto;
    aspect-ratio: 1.25;
    min-height: 0;
  }
  aside {
    border-left: 0;
    border-top: 1px solid var(--vp-c-divider);
    max-height: 340px;
  }
}
.node-hit {
  fill: transparent;
  stroke: none;
}
.dragging,
.dragging [data-node] {
  cursor: grabbing;
}
text {
  user-select: none;
  paint-order: stroke;
  stroke: var(--vp-c-bg);
  stroke-width: 3px;
  stroke-linejoin: round;
}
.graph-stage {
  overflow: hidden;
  padding-bottom: 24px;
}
.graph-controls {
  z-index: 1;
}
.graph-stage line {
  opacity: 0.7;
}
.graph-stage line.connected {
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  [data-node] {
    transition: none;
  }
}
[data-node]:focus {
  outline: none;
}
[data-node]:focus-visible .node-dot {
  stroke: var(--vp-c-brand-1);
  stroke-width: 3;
}
</style>
