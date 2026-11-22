import { activeEffectScope } from "./effectScope.js";

export let activeEffect: ReactiveEffect | null = null;

// 每次执行依赖收集前先做清理操作
function cleanupEffect(effect: ReactiveEffect) {
  // 每次执行 effect 之前应该清理 effect 依赖的属性
  const { deps } = effect;
  // 清理 effect
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(effect);
  }
  // 清理数组
  effect.deps.length = 0;
}

export class ReactiveEffect {
  // 表示 运行态
  public active = true;
  // 依赖
  public deps = [];

  public parent = null;
  public onStop;
  constructor(
    public fn,
    public scheduler,
  ) {
    if (activeEffectScope?.active) activeEffectScope.effects.push(this);
  }

  run() {
    if (!this.active) {
      return this.fn();
    }
    // 激活状态(处理 effect 嵌套情况)
    try {
      this.parent = activeEffect;
      activeEffect = this;
      cleanupEffect(this);
      return this.fn();
    } finally {
      activeEffect = this.parent;
      this.parent = null;
    }
  }

  stop() {
    if (this.active) {
      cleanupEffect(this);
      this.active = false;
      this.onStop?.();
    }
  }
}

export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler);
  _effect.run();

  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}

const targetMap = new WeakMap();

export function track(target, key) {
  // 只有在 effect 执行期间，才收集依赖
  if (!activeEffect) {
    return;
  }

  let depsMap = targetMap.get(target);

  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  let dep = depsMap.get(key);

  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }

  // 同一个 effect 不重复收集
  const shouldTrack = !dep.has(activeEffect);

  if (shouldTrack) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}

export function trigger(target, key, newVal, oldVal) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }

  const dep = depsMap.get(key);

  if (dep) {
    const effects = [...dep];
    effects.forEach((effect) => {
      // 防止 Math.random 改变后一直执行
      if (effect.active && activeEffect !== effect) {
        if (!effect.scheduler) {
          effect.run();
        } else {
          effect.scheduler();
        }
      }
    });
  }
}
