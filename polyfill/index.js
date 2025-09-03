// Reference polyfill (non-normative).
// Usage:
//   import { init, markInitOnly, SymbolInit, SymbolInitPolicy } from './polyfill/index.js';
//
// A class is "init-only" iff it defines an own instance method named "initializer".
// This polyfill also allows opting-in explicitly via markInitOnly(Class).

export const SymbolInit = Symbol.for("proposal.initOnly.initHook");
export const SymbolInitPolicy = Symbol.for("proposal.initOnly.initPolicy");

function isThenable(x) { return x && typeof x.then === 'function'; }

export function markInitOnly(C) {
  if (typeof C !== 'function') throw new TypeError("markInitOnly target must be a class/constructor");
  C.__isInitOnly = true;
  if (!Object.prototype.hasOwnProperty.call(C.prototype, 'initializer')) {
    console.warn(`[init-only] Class ${C.name || '<anonymous>'} marked init-only but has no own 'initializer' method.`);
  }
  Object.defineProperty(C, 'instance', {
    configurable: false, enumerable: false,
    get() {
      if (!C.__instance) throw new TypeError(`Class '${C.name}' not initialized. Call 'init ${C.name}(...)' first.`);
      return C.__instance;
    }
  });
  return C;
}

export function init(ctor, ...args) {
  if (typeof ctor !== 'function') throw new TypeError("init target must be a class/constructor");
  const isInitOnly = !!ctor.__isInitOnly || Object.prototype.hasOwnProperty.call(ctor.prototype, 'initializer');
  if (!isInitOnly) throw new TypeError(`Class '${ctor.name}' is not init-only. Use 'new ${ctor.name}(...)'.`);

  if (ctor.__instance) return ctor.__instance;
  if (ctor.__inFlight) return ctor.__inFlight;

  // Synthesize an empty allocation (like calling an empty constructor).
  // We cannot call user constructor; they shouldn't define one.
  const o = Reflect.construct(ctor, []);
  const initFn = o.initializer;
  if (typeof initFn !== 'function') {
    throw new TypeError(`Init-only class '${ctor.name}' must define an own instance method 'initializer'.`);
  }

  const policy = ctor[SymbolInitPolicy] || 'return-first';
  const maybe = initFn.apply(o, args);
  if (isThenable(maybe)) {
    ctor.__inFlight = Promise.resolve(maybe).then(() => {
      ctor.__inFlight = null;
      ctor.__instance = o;
      return o;
    });
    return ctor.__inFlight;
  } else {
    ctor.__instance = o;
    return o;
  }
}

// Optional: guard 'new' misuse by wrapping constructors (best-effort)
export function guardNewForInitOnly(C) {
  const handler = {
    construct(target, args, newTarget) {
      const isInitOnly = !!target.__isInitOnly || Object.prototype.hasOwnProperty.call(target.prototype, 'initializer');
      if (isInitOnly) {
        throw new TypeError(`Class '${target.name}' is init-only. Use 'init ${target.name}(...)' instead of 'new'.`);
      }
      return Reflect.construct(target, args, newTarget);
    }
  };
  return new Proxy(C, handler);
}
