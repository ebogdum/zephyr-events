'use strict';

const zephyrEvents = require('../dist/zephyr-events.js');
const { zephyrEventsFast } = require('../dist/zephyr-events.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
	if (condition) {
		passed++;
	} else {
		failed++;
		console.error(`  FAIL: ${message}`);
	}
}

function assertEqual(actual, expected, message) {
	assert(actual === expected, `${message} — expected ${expected}, got ${actual}`);
}

function test(name, fn) {
	try {
		fn();
	} catch (err) {
		failed++;
		console.error(`  FAIL: ${name} — threw: ${err.message}`);
	}
}

// ─── on / emit basics ───

test('on() registers handler and emit() fires it', () => {
	const e = zephyrEvents();
	let count = 0;
	e.on('test', () => { count++; });
	e.emit('test', {});
	assertEqual(count, 1, 'handler should fire once');
});

test('on() returns unsubscribe function', () => {
	const e = zephyrEvents();
	let count = 0;
	const unsub = e.on('test', () => { count++; });
	assertEqual(typeof unsub, 'function', 'on() should return a function');
	e.emit('test', {});
	unsub();
	e.emit('test', {});
	assertEqual(count, 1, 'handler should not fire after unsub');
});

test('emit() passes event data to handler', () => {
	const e = zephyrEvents();
	let received = null;
	e.on('test', (data) => { received = data; });
	const payload = { id: 42 };
	e.emit('test', payload);
	assert(received === payload, 'handler should receive exact event object');
});

test('multiple handlers fire in registration order', () => {
	const e = zephyrEvents();
	const order = [];
	e.on('test', () => order.push(1));
	e.on('test', () => order.push(2));
	e.on('test', () => order.push(3));
	e.emit('test', {});
	assertEqual(order.join(','), '1,2,3', 'handlers fire in order');
});

test('emit() to unregistered event does not throw', () => {
	const e = zephyrEvents();
	e.emit('nonexistent', {});
	assert(true, 'no throw on unregistered event');
});

// ─── off() ───

test('off() with handler removes specific handler', () => {
	const e = zephyrEvents();
	let count = 0;
	const handler = () => { count++; };
	e.on('test', handler);
	e.off('test', handler);
	e.emit('test', {});
	assertEqual(count, 0, 'removed handler should not fire');
});

test('off() without handler removes all handlers for type', () => {
	const e = zephyrEvents();
	let count = 0;
	e.on('test', () => { count++; });
	e.on('test', () => { count++; });
	e.off('test');
	e.emit('test', {});
	assertEqual(count, 0, 'no handlers should fire');
});

test('off() cleans up map entries', () => {
	const e = zephyrEvents();
	e.on('test', () => {});
	e.off('test');
	assert(!e.all.has('test'), 'all map should not have entry after off()');
});

test('off() on unregistered event does not throw', () => {
	const e = zephyrEvents();
	e.off('nonexistent');
	assert(true, 'no throw on off() for unregistered event');
});

test('unsubscribe cleans up map entries when last handler removed', () => {
	const e = zephyrEvents();
	const unsub = e.on('test', () => {});
	unsub();
	assert(!e.all.has('test'), 'all map should not have entry after last unsub');
});

// ─── wildcard ───

test('wildcard handler receives all events', () => {
	const e = zephyrEvents();
	const received = [];
	e.on('*', (type, data) => { received.push({ type, data }); });
	e.emit('foo', 1);
	e.emit('bar', 2);
	assertEqual(received.length, 2, 'wildcard should fire for both events');
	assertEqual(received[0].type, 'foo', 'first event type');
	assertEqual(received[0].data, 1, 'first event data');
	assertEqual(received[1].type, 'bar', 'second event type');
	assertEqual(received[1].data, 2, 'second event data');
});

test('wildcard does not double-fire on emit("*")', () => {
	const e = zephyrEvents();
	let count = 0;
	e.on('*', () => { count++; });
	e.emit('*', {});
	assertEqual(count, 1, 'wildcard handler should fire exactly once for emit("*")');
});

test('wildcard handler can be removed with off()', () => {
	const e = zephyrEvents();
	let count = 0;
	const handler = () => { count++; };
	e.on('*', handler);
	e.off('*', handler);
	e.emit('test', {});
	assertEqual(count, 0, 'removed wildcard should not fire');
});

// ─── race-condition safety ───

test('handler removing itself during emit does not skip next handler', () => {
	const e = zephyrEvents();
	const order = [];
	const selfRemover = () => {
		order.push('self');
		e.off('test', selfRemover);
	};
	e.on('test', selfRemover);
	e.on('test', () => order.push('next'));
	e.emit('test', {});
	assertEqual(order.join(','), 'self,next', 'both handlers should fire');
});

test('handler adding new handler during emit does not fire new handler', () => {
	const e = zephyrEvents();
	let newFired = false;
	e.on('test', () => {
		e.on('test', () => { newFired = true; });
	});
	e.emit('test', {});
	assert(!newFired, 'newly added handler should not fire in same emit cycle');
});

// ─── all map ───

test('all map reflects registered handlers', () => {
	const e = zephyrEvents();
	const handler = () => {};
	e.on('test', handler);
	const handlers = e.all.get('test');
	assert(Array.isArray(handlers), 'all.get should return array');
	assertEqual(handlers.length, 1, 'should have one handler');
	assert(handlers[0] === handler, 'should contain the registered handler');
});

test('pre-populated all map is used', () => {
	const all = new Map();
	let count = 0;
	const handler = () => { count++; };
	all.set('test', [handler]);
	const e = zephyrEvents(all);
	e.emit('test', {});
	assertEqual(count, 1, 'pre-populated handler should fire');
});

test('shared all map between emitters', () => {
	const all = new Map();
	const e1 = zephyrEvents(all);
	const e2 = zephyrEvents(all);
	let count = 0;
	e1.on('test', () => { count++; });
	e2.emit('test', {});
	assertEqual(count, 1, 'shared map should allow cross-emitter events');
});

// ─── symbol event types ───

test('symbol event types work', () => {
	const e = zephyrEvents();
	const sym = Symbol('myEvent');
	let fired = false;
	e.on(sym, () => { fired = true; });
	e.emit(sym, {});
	assert(fired, 'symbol event should fire');
});

// ─── edge cases ───

test('same handler registered twice fires twice', () => {
	const e = zephyrEvents();
	let count = 0;
	const handler = () => { count++; };
	e.on('test', handler);
	e.on('test', handler);
	e.emit('test', {});
	assertEqual(count, 2, 'duplicate handler should fire twice');
});

test('off() with unregistered handler is a no-op', () => {
	const e = zephyrEvents();
	e.on('test', () => {});
	e.off('test', () => {}); // different function reference
	assertEqual(e.all.get('test').length, 1, 'original handler should remain');
});

test('emit with undefined event data', () => {
	const e = zephyrEvents();
	let received = 'sentinel';
	e.on('test', (data) => { received = data; });
	e.emit('test', undefined);
	assertEqual(received, undefined, 'handler receives undefined');
});

// ─── regression: shared map + wildcard (F1) ───

test('wildcard registered on one emitter fires when emitted via another sharing the map (F1)', () => {
	const all = new Map();
	const e1 = zephyrEvents(all);
	const e2 = zephyrEvents(all);
	let fired = 0;
	e1.on('*', () => { fired++; });
	e2.emit('foo', { x: 1 });
	assertEqual(fired, 1, 'cross-emitter wildcard should fire via shared map');
});

test('typed handler registered on one emitter fires wildcard on another (F1, both dirs)', () => {
	const all = new Map();
	const e1 = zephyrEvents(all);
	const e2 = zephyrEvents(all);
	const seen = [];
	e2.on('*', (type, data) => { seen.push([type, data]); });
	e1.emit('bar', 7);
	assertEqual(seen.length, 1, 'wildcard on e2 should see e1 emit');
	assertEqual(seen[0][0], 'bar', 'wildcard receives correct type');
	assertEqual(seen[0][1], 7, 'wildcard receives correct data');
});

test('fast variant: cross-emitter wildcard via shared map fires (F1)', () => {
	const all = new Map();
	const e1 = zephyrEventsFast(all);
	const e2 = zephyrEventsFast(all);
	let fired = 0;
	e1.on('*', () => { fired++; });
	e2.emit('foo', {});
	assertEqual(fired, 1, 'fast cross-emitter wildcard should fire');
});

// ─── regression: emit('*') argument contract (F3) ───

test('emit("*", data) calls wildcard handler with ("*", data), not (data, undefined) (F3)', () => {
	const e = zephyrEvents();
	let gotType = 'sentinel';
	let gotData = 'sentinel';
	e.on('*', (type, data) => { gotType = type; gotData = data; });
	const payload = { payload: 99 };
	e.emit('*', payload);
	assertEqual(gotType, '*', 'wildcard type arg should be "*"');
	assert(gotData === payload, 'wildcard data arg should be the payload');
});

test('emit("*") still fires wildcard exactly once (F3 keeps no-double-fire)', () => {
	const e = zephyrEvents();
	let count = 0;
	e.on('*', () => { count++; });
	e.emit('*', {});
	assertEqual(count, 1, 'wildcard fires exactly once for emit("*")');
});

test('fast variant: emit("*", data) calls wildcard with ("*", data) (F3)', () => {
	const e = zephyrEventsFast();
	let gotType, gotData;
	const payload = { p: 1 };
	e.on('*', (type, data) => { gotType = type; gotData = data; });
	e.emit('*', payload);
	assertEqual(gotType, '*', 'fast wildcard type arg should be "*"');
	assert(gotData === payload, 'fast wildcard data arg should be the payload');
});

// ─── results ───

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (0 < failed) {
	process.exit(1);
}
