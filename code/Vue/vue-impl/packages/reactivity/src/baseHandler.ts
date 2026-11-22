import { track, trigger } from "./effect.js";
import { reactive, ReactiveFlags } from "./reactive.js";

export const mutableHandlers = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) return true;
    track(target, key);
    return reactive(Reflect.get(target, key, receiver));
  },
  set(target, key, newValue, receiver) {
    let oldValue = target[key];
    const ret = Reflect.set(target, key, newValue, receiver);
    if (oldValue !== newValue) {
      trigger(target, key, newValue, oldValue);
    }
    return ret;
  },
};
