import { init } from '../polyfill/index.js';

function delay(ms){ return new Promise(r => setTimeout(r, ms)); }

class DB {
  async initializer(url) {
    await delay(50);
    this.url = url;
    this.ready = true;
  }
}

const p1 = init(DB, 'postgres://db');
const p2 = init(DB, 'ignored-later');
console.log('same promise?', p1 === p2);
const db = await p1;
console.log('db.ready?', db.ready, 'url', db.url);
