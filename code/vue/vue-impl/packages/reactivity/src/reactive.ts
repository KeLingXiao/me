import { isObject } from "@vue/shared/src/index.js";
import { mutableHandlers } from "./baseHandler.js";

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
}

const reactiveMap = new WeakMap<object, object>();
export function reactive(target) {
  // 非对象类型不做处理
  if (!isObject(target)) {
    return target;
  }

  // 代理缓存 防止重复代理 reactive(reactive(obj))
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target;
  }

  // 防止同个对象重复代理
  if (reactiveMap.has(target)) {
    return reactiveMap.get(target);
  }

  const proxy = new Proxy(target, mutableHandlers);
  reactiveMap.set(target, proxy);
  return proxy;
}
