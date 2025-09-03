# Explainer: Init-only Classes and `init` Expression

**Stage**: 0 (Strawperson)

This explainer mirrors the proposal text and focuses on motivation and ergonomics.

## TL;DR
```js
class App {
  initializer({ port }) { this.port = port; }
}
const app = init App({ port: 3000 }); // never use `new` for init-only classes
```

## Why not modules/factories?
Modules are eager and parameterless. Factories are ad-hoc and don’t prevent misuse. Init-only classes are **lazy, parameterized, typed**, and **enforce** correct usage with clear errors.

## Async
Make `initializer` `async`, or define `async [Symbol.init]()` to run after allocation. Concurrent `init` calls coalesce to one in-flight promise.

## Policies
`static [Symbol.initPolicy] = 'return-first' | 'strict' | 'reinit'`.
