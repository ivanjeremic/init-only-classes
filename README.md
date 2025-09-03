# Init-only Classes for JavaScript (`initializer` + `init`)

This repo hosts a strawperson proposal for **init-only classes**:
- Declare a class as init-only by defining an instance method `initializer(...args)` (and **no** `constructor`).
- Create it with a new **`init ClassName(args)`** expression.
- Hard errors when misused: `new` on init-only or `init` on normal classes.
- Async supported by `async initializer` or `async [Symbol.init]`.

See **Explainer.md** for motivation, semantics, examples, and open questions.
