import { ReactiveEffect } from "./effect.js";
import { ReactiveFlags } from "./reactive.js";
import { isRef } from "./ref.js";

// 遍历嵌套属性，循环引用只访问一次
function traverse(value, depth = Infinity, seen = new Set()) {
  if (!value || typeof value !== "object" || depth <= 0 || seen.has(value)) return value;
  seen.add(value);
  if (isRef(value)) {
    traverse(value.value, depth - 1, seen);
  } else {
    Object.keys(value).forEach(key => traverse(value[key], depth - 1, seen));
  }
  return value;
}

export function watch(source, callback, options: any = {}) {
  return doWatch(source, callback, options);
}

export function watchEffect(source, options: any = {}) {
  return doWatch(source, null, options);
}

function doWatch(source, callback, options) {
  let cleanup;
  let oldValue;
  let initialized = false;
  const onCleanup = fn => cleanup = fn;
  const runCleanup = () => {
    const fn = cleanup;
    cleanup = undefined;
    fn?.();
  };
  const isReactive = value => !!value?.[ReactiveFlags.IS_REACTIVE];
  const multiple = Array.isArray(source) && !isReactive(source);
  const forceTrigger = isReactive(source) || (multiple && source.some(isReactive));
  const read = value => {
    if (isRef(value)) return value.value;
    if (isReactive(value)) return traverse(value, options.deep === false ? 1 : Infinity);
    if (typeof value === "function") return value();
    return value;
  };
  let getter = callback
    ? () => multiple ? source.map(read) : read(source)
    : () => {
      runCleanup();
      return source(onCleanup);
    };
  if (callback && options.deep) {
    const baseGetter = getter;
    getter = () => traverse(baseGetter(), typeof options.deep === "number" ? options.deep : Infinity);
  }
  const job = () => {
    if (!_effect.active) return;
    if (!callback) {
      _effect.run();
      return;
    }
    const newValue = _effect.run();
    const changed = multiple
      ? newValue.some((value, index) => !Object.is(value, oldValue?.[index]))
      : !Object.is(newValue, oldValue);
    if (!initialized || options.deep || forceTrigger || changed) {
      runCleanup();
      const previous = oldValue;
      oldValue = newValue;
      initialized = true;
      callback(newValue, previous, onCleanup);
      if (options.once) _effect.stop();
    }
  };
  // 当前没有组件更新队列，默认同步执行，post 使用微任务合并更新
  let pending = false;
  const scheduler = options.flush === "post" ? () => {
    if (pending) return;
    pending = true;
    Promise.resolve().then(() => {
      pending = false;
      job();
    });
  } : job;
  const _effect = new ReactiveEffect(getter, scheduler);
  _effect.onStop = runCleanup;
  if (!callback || options.immediate) {
    job();
  } else {
    oldValue = _effect.run();
    initialized = true;
  }
  return () => _effect.stop();
}
