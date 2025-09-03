# TC39 Proposal: Init-Only Classes via `initializer()` and `init` Expression

**Stage**: 0 – Strawperson (draft for discussion)

**Champions**: *Seeking champions*

**Authors**: Ivan Jeremic (@ivanjeremic)

**Repo**: [init-only-classes](https://github.com/ivanjeremic/init-only-classes)

---

## Summary

This proposal introduces **init-only classes** in JavaScript. These are classes that:

* Declare an instance method named `initializer(...args)` instead of a constructor.
* Cannot define both `initializer` and `constructor` (syntax error if both appear).
* Can **only** be instantiated using a new `init ClassName(args)` expression.
* Throw hard errors if someone tries to use `new` on an init-only class or `init` on a normal class.

Init-only classes support:

* Lazy, parameterized initialization.
* Async initialization with built-in concurrency control.
* Configurable re-initialization policies.
* Per-realm semantics with predictable behavior.

---

## Motivation

Many applications need one-time or service-style objects (e.g., configuration roots, caches, app singletons) that are not created repeatedly. Today developers emulate this with:

* ES modules (which are one-time but eager and parameterless),
* Factories (ad hoc, no standard errors or concurrency semantics),
* Hand-written singletons (boilerplate heavy, error-prone),
* Dependency injection frameworks (non-standard, often overkill).

`init` and init-only classes offer:

* **Clarity**: no accidental `new` where only one instance should exist.
* **Safety**: explicit errors for misuse.
* **Async correctness**: concurrent initialization calls coalesce automatically.
* **Interoperability**: works with private fields, decorators, modules, bundlers, and TypeScript.

---

## Goals

* A concise, declarative way to define classes that must be initialized, not constructed repeatedly.
* Familiar class syntax with minimal new concepts.
* Clear errors for misuse (`new` on init-only, `init` on normal).
* Lazy instantiation with optional async initialization.
* Configurable reinitialization policies (default, strict, or reinit).
* Per-realm semantics with no global leakage.

## Non-Goals

* Replacing ES modules’ existing one-time evaluation model.
* Providing a full lifecycle model beyond initialization (e.g., disposal).
* Supporting arbitrary global singletons shared across realms.

---

## Prior Art

* **Kotlin**: `object` keyword provides singleton objects.
* **Swift**: `static let shared = …` idiom for global singletons.
* **C#**: `Lazy<T>` for deferred initialization.
* **JavaScript**: ES modules as one-time, parameterless singletons; factories and service patterns in frameworks like Angular.

These patterns inspired the need for standardized language support with clear semantics.

---

## High-Level Design

### Init-only class declaration

```js
class App {
  initializer({ port }) { this.port = port; }
  start() { console.log(`App on ${this.port}`); }
}
```

* Declaring an `initializer` method marks the class as init-only.
* `constructor` and `initializer` cannot coexist.
* Engine enforces init-only semantics automatically.

### Init expression

```js
const app = init App({ port: 3000 });
```

* First call allocates the instance and calls `initializer(...args)`.
* Later calls return the same instance (policy configurable).

### Misuse errors

* `new App()` → **TypeError**: *Use `init App(...)` instead.*
* `init User()` on a normal class → **TypeError**: *Use `new User(...)` instead.*

### Re-initialization policy

```js
class Config {
  static [Symbol.initPolicy] = 'strict'; // 'return-first' | 'strict' | 'reinit'
  initializer(opts) { this.opts = opts; }
}
```

* **`return-first`** (default): return the first instance, ignore later args.
* **`strict`**: throw on any subsequent `init` call.
* **`reinit`**: allow explicit `reset()` to replace instance (optional).

### Async initialization

```js
class DB {
  async initializer(url) {
    this.conn = await connect(url);
  }
}
const db = await init DB('postgres://…');
```

* Concurrent `init` calls share the same in-flight promise.
* After resolution, subsequent `init` calls return the instance synchronously.

### Instance access

```js
App.instance  // returns the instance or throws if uninitialized
```

---

## Detailed Semantics

### Static Semantics

* Class with `initializer` → init-only.
* Syntax error if both `initializer` and `constructor` exist.
* Engine synthesizes a constructor automatically; user cannot override it.

### Runtime Semantics

* `init C(...args)`:

  * If memoized instance exists → return or throw per policy.
  * Else allocate instance, call `initializer`, memoize result.
  * If `initializer` returns a promise, memoize in-flight promise until it resolves.

* `new C(...)` on init-only → **TypeError**.

* `init C(...)` on normal → **TypeError**.

### Realms

* Memoization is per realm; workers/iframes have separate instances.

### Inheritance

* Init-only status does **not** propagate; subclasses must declare `initializer` explicitly.
* `Symbol.superArgs` may customize argument forwarding to `super()`.

### Decorators & Private Fields

* Unchanged; init-only semantics orthogonal to field initialization and decorators.

---

## Comparison with Alternatives

| Feature                      | ES Modules | Factories | Singleton Class (manual) | Init-only Classes |
| ---------------------------- | ---------- | --------- | ------------------------ | ----------------- |
| Lazy instantiation           | ❌          | ✅         | ✅                        | ✅                 |
| Parameterized initialization | ❌          | ✅         | ✅                        | ✅                 |
| Enforced single instance     | ❌          | ❌         | ❌                        | ✅                 |
| Built-in async coalescing    | ❌          | ❌         | ❌                        | ✅                 |
| Standardized error handling  | ❌          | ❌         | ❌                        | ✅                 |
| Works across realms          | ✅          | ✅         | ✅                        | ✅                 |

---

## Examples

### Basic

```js
class App {
  initializer({ port }) { this.port = port; }
}
const a1 = init App({ port: 3000 });
const a2 = init App({ port: 4000 }); // returns same instance
```

### Strict policy

```js
class Settings {
  static [Symbol.initPolicy] = 'strict';
  initializer(opts) { this.opts = opts; }
}
init Settings({ env: 'prod' });
init Settings({ env: 'dev' }); // throws
```

### Async init

```js
class DB {
  async initializer(url) {
    this.conn = await connect(url);
  }
}
await init DB('postgres://…');
```

### Misuse errors

```js
class Service { initializer() {} }
new Service();  // TypeError: Use init Service(...)

class User {}
init User();    // TypeError: Use new User(...)
```

---

## Interop with Modules

* Modules are one-time, parameterless, eager.
* Init-only classes provide lazy, parameterized, async-safe initialization.

---

## TypeScript Typings (Non-normative)

```ts
declare function init<C extends abstract new (...a: any) => any>(
  ctor: C,
  ...args: ConstructorParameters<C>
): InstanceType<C> | Promise<InstanceType<C>>;
```

* Lint rules can forbid `new` on classes with `initializer`.

---

## Polyfill Strategy

* Mark classes with `initializer` as init-only via metadata.
* Provide `init()` helper that enforces rules and memoization.
* Proxy constructors to throw on `new` if init-only.

---

## Open Questions

1. Should `Symbol.superArgs` default to forwarding all args or none?
2. Should `reinit` policy be standardized now or later?
3. Should `initializer` support decorators for policy config?

---

## Security & Performance

* Instances live for the realm lifetime unless reset explicitly.
* Async initialization coalesces to prevent races.

---

## Changelog

* v0.1: Initial draft with `initializer`, `init`, async support, policies, inheritance rules.
