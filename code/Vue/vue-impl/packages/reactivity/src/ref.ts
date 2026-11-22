import { track, trigger } from "./effect.js";
import { reactive } from "./reactive.js";

class RefImpl {
  public __v_isRef = true;
  public _value;

  constructor(public _rawValue) {
    this._value = reactive(_rawValue);
  }

  get value() {
    track(this, "value");
    return this._value;
  }

  set value(newValue) {
    if (Object.is(newValue, this._rawValue)) return;
    const oldValue = this._rawValue;
    this._rawValue = newValue;
    this._value = reactive(newValue);
    trigger(this, "value", newValue, oldValue);
  }
}

export function isRef(value) {
  return !!value?.__v_isRef;
}

export function ref(value?) {
  return isRef(value) ? value : new RefImpl(value);
}

export function unref(value) {
  return isRef(value) ? value.value : value;
}

class ObjectRefImpl {
  public __v_isRef = true;

  constructor(public object, public key, public defaultValue) {}

  get value() {
    const value = this.object[this.key];
    return value === undefined ? this.defaultValue : value;
  }

  set value(newValue) {
    this.object[this.key] = newValue;
  }
}

export function toRef(source, key?, defaultValue?) {
  if (isRef(source)) return source;
  // getter 形式只提供读取能力
  if (typeof source === "function") {
    return { __v_isRef: true, get value() { return source(); } };
  }
  if (arguments.length === 1) return ref(source);
  const value = source[key];
  return isRef(value) ? value : new ObjectRefImpl(source, key, defaultValue);
}

export function toRefs(object) {
  const result: any = Array.isArray(object) ? new Array(object.length) : {};
  Object.keys(object).forEach(key => result[key] = toRef(object, key));
  return result;
}

export function proxyRefs(object) {
  return new Proxy(object, {
    get(target, key, receiver) {
      return unref(Reflect.get(target, key, receiver));
    },
    set(target, key, value, receiver) {
      const oldValue = Reflect.get(target, key, receiver);
      // 普通值赋给 ref 时，更新内部 value
      if (isRef(oldValue) && !isRef(value)) {
        oldValue.value = value;
        return true;
      }
      return Reflect.set(target, key, value, receiver);
    },
  });
}
