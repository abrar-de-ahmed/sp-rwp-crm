// Polyfill for Node.js util.inspect.custom which doesn't exist in Edge Runtime
if (typeof globalThis !== 'undefined' && typeof (globalThis as any).Symbol !== 'undefined') {
  if (!(Symbol as any).for) {
    (Symbol as any).for = (key: string) => key;
  }
  if (!(Symbol as any).custom) {
    (Symbol as any).custom = Symbol.for('nodejs.util.inspect.custom');
  }
}
