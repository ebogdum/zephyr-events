# Zephyr Events — Tiny TypeScript Event Emitter

A lightweight, type-safe event emitter for TypeScript and JavaScript. Zero dependencies, under 2KB, with built-in race-condition safety that larger alternatives like EventEmitter3 and Node.js EventEmitter lack.

[![npm version](https://img.shields.io/npm/v/zephyr-events.svg)](https://www.npmjs.com/package/zephyr-events)
[![npm downloads](https://img.shields.io/npm/dm/zephyr-events.svg)](https://www.npmjs.com/package/zephyr-events)
[![bundle size](https://img.shields.io/bundlephobia/minzip/zephyr-events)](https://bundlephobia.com/package/zephyr-events)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/npm/l/zephyr-events.svg)](https://github.com/ebogdum/zephyr-events/blob/main/LICENSE)

## Why Zephyr Events?

Most event emitter libraries break when handlers modify the listener list during emission — a handler that calls `off()` on itself can skip the next handler, or adding a new listener mid-emit can cause infinite loops. Zephyr Events solves this with snapshot-based iteration, making it safe for real-world use in UI frameworks, state machines, and plugin systems.

- **Under 2KB** — 1.9KB ESM, zero dependencies, tree-shakeable
- **Race-condition safe** — handlers can subscribe, unsubscribe, or clear during emit without side effects
- **Fast mode** — `zephyrEventsFast` drops snapshot safety for up to 82% faster emit
- **Full TypeScript support** — generic event maps, strict handler signatures, IDE autocompletion
- **Universal builds** — ESM, CommonJS, and UMD for browsers, Node.js, and bundlers
- **Wildcard listeners** — subscribe to all events with `*`
- **Shared state** — pass a handler map between emitters for cross-module communication

## Installation

```bash
npm install zephyr-events
```

```bash
yarn add zephyr-events
```

```bash
pnpm add zephyr-events
```

## Quick Start

### TypeScript Event Emitter

```typescript
import zephyrEvents from 'zephyr-events';

// Define your event types
type AppEvents = {
  'user:login': { id: number; name: string }
  'user:logout': { id: number }
  'error': Error
}

const emitter = zephyrEvents<AppEvents>();

// Subscribe — returns an unsubscribe function for easy cleanup
const unsubscribe = emitter.on('user:login', (user) => {
  console.log(`Welcome, ${user.name}`);
});

// Emit with full type checking
emitter.emit('user:login', { id: 1, name: 'Alice' });

// Clean up when done
unsubscribe();
```

### Fast Mode

When handlers never modify the listener list during emit, use `zephyrEventsFast` for maximum throughput:

```typescript
import { zephyrEventsFast } from 'zephyr-events';

const emitter = zephyrEventsFast<AppEvents>();
// Same API — on(), off(), emit(), all
```

### JavaScript Event Emitter

```javascript
const zephyrEvents = require('zephyr-events');
const { zephyrEventsFast } = require('zephyr-events');

const emitter = zephyrEvents();       // safe (snapshot)
const fast = zephyrEventsFast();       // fast (no snapshot)

emitter.on('message', (data) => {
  console.log('Received:', data);
});

emitter.emit('message', { text: 'Hello' });
```

## API Reference

### `zephyrEvents<Events>(all?)`

Creates a new typed event emitter with snapshot-safe emission. Optionally accepts an existing handler map to share event state between emitters.

```typescript
const emitter = zephyrEvents<{
  message: string
  data: { value: number }
}>();

// Share handlers between emitters
const shared = new Map();
const emitterA = zephyrEvents(shared);
const emitterB = zephyrEvents(shared);
```

### `zephyrEventsFast<Events>(all?)`

Creates a non-snapshot event emitter. Same API as `zephyrEvents`, but `emit()` iterates the live handler array instead of a copy. Up to 82% faster for single-handler emit. Use when handlers do not add/remove listeners during emission.

```typescript
import { zephyrEventsFast } from 'zephyr-events';

const emitter = zephyrEventsFast<{ tick: number }>();
```

### `emitter.on(type, handler): Unsubscribe`

Registers an event handler. Returns an unsubscribe function for automatic cleanup — no need to keep a reference to the handler.

```typescript
// Type-safe subscription
const unsub = emitter.on('message', (msg) => {
  console.log(msg);
});

// Wildcard listener — receives every event
emitter.on('*', (type, event) => {
  console.log(`[${String(type)}]`, event);
});

// Unsubscribe when no longer needed
unsub();
```

### `emitter.off(type, handler?)`

Removes a specific handler, or all handlers for an event type.

```typescript
// Remove a specific handler
emitter.off('message', myHandler);

// Remove all handlers for an event type
emitter.off('message');
```

### `emitter.emit(type, event)`

Emits an event to all registered handlers. Handlers run synchronously from a snapshot, so the listener list can be safely modified during emission.

```typescript
emitter.emit('message', 'Hello World!');
emitter.emit('data', { value: 42 });
```

### `emitter.all`

The underlying `Map<EventType, Handler[]>` that stores all registered handlers. Can be inspected, serialized, or shared between emitter instances.

## Use Cases

### Event Bus for React Components

```typescript
import zephyrEvents from 'zephyr-events';

type UIEvents = {
  'modal:open': { id: string }
  'modal:close': { id: string }
  'toast': { message: string; severity: 'info' | 'error' }
}

// Create a shared event bus
export const uiBus = zephyrEvents<UIEvents>();

// In a React component — clean up on unmount
useEffect(() => {
  const unsub = uiBus.on('toast', (toast) => {
    showToast(toast.message, toast.severity);
  });
  return unsub;
}, []);
```

### Pub/Sub in Node.js Microservices

```typescript
import zephyrEvents from 'zephyr-events';

type ServiceEvents = {
  'order:created': { orderId: string; total: number }
  'order:shipped': { orderId: string; trackingId: string }
  'inventory:low': { sku: string; remaining: number }
}

const events = zephyrEvents<ServiceEvents>();

// Multiple subscribers
events.on('order:created', sendConfirmationEmail);
events.on('order:created', updateAnalytics);
events.on('inventory:low', notifyWarehouse);

// Audit logging with wildcard
events.on('*', (type, data) => {
  logger.info({ event: type, payload: data });
});
```

### Plugin System

```typescript
import zephyrEvents from 'zephyr-events';

type PluginEvents = {
  'init': { config: Record<string, unknown> }
  'transform': { input: string }
  'destroy': undefined
}

function createPluginHost() {
  const emitter = zephyrEvents<PluginEvents>();

  return {
    register(plugin: (on: typeof emitter.on) => void) {
      plugin(emitter.on.bind(emitter));
    },
    emit: emitter.emit.bind(emitter),
  };
}
```

## Race-Condition Safety

Unlike most event emitters, Zephyr Events handles listener modification during emission safely. Each `emit()` call iterates over a snapshot of the handler list, so adding or removing handlers mid-emit never causes skipped handlers or infinite loops:

```typescript
const emitter = zephyrEvents();

// Safe: handler removes itself during emit
emitter.on('data', function once(data) {
  emitter.off('data', once);
  process(data); // next handler still fires
});

// Safe: handler adds new listeners during emit
emitter.on('init', () => {
  emitter.on('init', () => {
    // this will NOT fire during the current emit cycle
  });
});
```

## Comparison with Other Event Emitters

| Feature | Zephyr Events | mitt | EventEmitter3 | Node.js EventEmitter |
|---------|:---:|:---:|:---:|:---:|
| Bundle size | ~2KB | ~200B | ~7KB | Built-in |
| TypeScript types | Native | Native | Bundled | `@types/node` |
| Race-condition safe | Yes | No | No | No |
| Fast (no-snapshot) mode | Yes | No | No | No |
| Wildcard listeners | Yes | Yes | No | No |
| Unsubscribe function | Yes | No | No | No |
| Shared handler maps | Yes | Yes | No | No |
| Zero dependencies | Yes | Yes | Yes | N/A |
| Tree-shakeable ESM | Yes | Yes | Yes | No |

## Performance Benchmarks

Tested on Apple Silicon M-series (ARM64), Node.js v25.2.1. Median of 3 runs in isolated V8 processes. Run `node benchmark-compare.js` to reproduce.

### Safe vs Fast

| Operation | Safe (snapshot) | Fast (no snapshot) | Delta |
|-----------|----------------:|-------------------:|------:|
| **Emit (1 handler)** | 41.6M ops/s | 75.1M ops/s | **+81%** |
| **Emit (10 handlers)** | 13.6M ops/s | 16.2M ops/s | **+19%** |
| **Emit (100 handlers)** | 1.9M ops/s | 2.1M ops/s | **+9%** |
| **Wildcard emit** | 38.4M ops/s | 63.5M ops/s | **+65%** |
| **Emit (no wildcards)** | 32.9M ops/s | 49.9M ops/s | **+52%** |
| **On + unsub cycle** | 11.2M ops/s | 11.2M ops/s | 0% |
| **Off (specific handler)** | 11.8M ops/s | 11.8M ops/s | 0% |
| **Mixed (on/emit/unsub)** | 8.3M ops/s | 9.1M ops/s | **+9%** |

All benchmarks use proper setup/run separation with warmup passes. No-op handlers measure emitter overhead only — real-world throughput depends on handler complexity.

## Bundle Formats

Zephyr Events ships three bundle formats for maximum compatibility:

| Format | File | Use case |
|--------|------|----------|
| ESM | `dist/zephyr-events.mjs` | Modern bundlers (Vite, Rollup, webpack 5+) |
| CommonJS | `dist/zephyr-events.js` | Node.js `require()`, older bundlers |
| UMD | `dist/zephyr-events.umd.js` | Script tags, AMD loaders, legacy environments |

## Requirements

- **Node.js** >= 18
- **TypeScript** >= 4.7 (for type features; runtime has no TS dependency)
- Works in all modern browsers (ES2020+ support)

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Acknowledgments

Zephyr Events is a modernization of [mitt](https://github.com/developit/mitt) by [Jason Miller](https://github.com/developit). Built on the same simple API with added type safety, race-condition handling, and universal module support.

## License

[MIT](LICENSE)

Original mitt: MIT (c) [Jason Miller](https://github.com/developit)
