export let activeEffectScope;

export class EffectScope {
  public active = true;
  public effects = [];
  public scopes = [];
  public cleanups = [];

  constructor(detached = false) {
    // 非独立作用域随父作用域一起停止
    if (!detached && activeEffectScope) {
      activeEffectScope.scopes.push(this);
    }
  }

  run(fn) {
    if (!this.active) return;
    const parent = activeEffectScope;
    try {
      activeEffectScope = this;
      return fn();
    } finally {
      activeEffectScope = parent;
    }
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this.effects.forEach(effect => effect.stop());
    this.scopes.forEach(scope => scope.stop());
    this.cleanups.forEach(cleanup => cleanup());
    this.effects.length = this.scopes.length = this.cleanups.length = 0;
  }
}

export function effectScope(detached = false) {
  return new EffectScope(detached);
}

export function getCurrentScope() {
  return activeEffectScope;
}

export function onScopeDispose(fn) {
  if (activeEffectScope) activeEffectScope.cleanups.push(fn);
}
