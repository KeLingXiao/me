import { ReactiveEffect, track, trigger } from "./effect.js";

class ComputedRefImpl {
  public __v_isRef = true;
  // 依赖变化后，下一次读取时重新计算
  public _dirty = true;
  public _value;
  public effect;

  constructor(
    getter,
    public setter,
  ) {
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
        // 通知使用计算属性的 effect 更新
        trigger(this, "value", undefined, undefined);
      }
    });
  }

  get value() {
    // 收集外层 effect 对计算属性的依赖
    track(this, "value");
    if (this._dirty) {
      this._value = this.effect.run();
      this._dirty = false;
    }
    return this._value;
  }

  set value(newValue) {
    this.setter(newValue);
  }
}

export function computed(getterOrOptions) {
  const onlyGetter = typeof getterOrOptions === "function";
  const getter = onlyGetter ? getterOrOptions : getterOrOptions.get;
  const setter = onlyGetter
    ? () => console.warn("计算属性是只读的")
    : getterOrOptions.set || (() => console.warn("计算属性是只读的"));

  return new ComputedRefImpl(getter, setter);
}
