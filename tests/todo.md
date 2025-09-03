# Tests TODO
- Parse-time SyntaxError for `constructor` + `initializer` (requires parser plugin to test).
- Runtime errors: `new` on init-only, `init` on normal.
- Async coalescing: concurrent `init` returns same promise.
- Policy behavior via Symbol.initPolicy.
