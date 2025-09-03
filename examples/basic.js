import { init, guardNewForInitOnly } from '../polyfill/index.js';

class App {
  initializer({ port }) {
    this.port = port;
  }
  start() { console.log(`App on ${this.port}`); }
}

// Optional: wrap to guard 'new' at runtime in this demo
const AppGuarded = guardNewForInitOnly(App);

const a1 = init(AppGuarded, { port: 3000 });
const a2 = init(AppGuarded, { port: 4000 });
console.log('same?', a1 === a2);
a1.start();

try {
  // Should throw
  // eslint-disable-next-line no-new
  new AppGuarded({ port: 1234 });
} catch (e) {
  console.log('Expected error:', e.message);
}
