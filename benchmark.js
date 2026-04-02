const zephyrEvents = require('./dist/zephyr-events.js');

function formatNumber(num) {
	if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
	if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
	if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
	return num.toString();
}

function benchmark(name, setup, fn, iterations = 100000) {
	console.log(`\n  ${name}`);
	console.log(`  Running ${formatNumber(iterations)} iterations...`);

	setup();

	// Warm up
	for (let i = 0; i < 1000; i++) fn();

	const start = process.hrtime.bigint();
	for (let i = 0; i < iterations; i++) {
		fn();
	}
	const end = process.hrtime.bigint();

	const totalMs = Number(end - start) / 1e6;
	const opsPerSecond = iterations / (totalMs / 1000);
	const timePerOp = totalMs / iterations;

	console.log(`  Total: ${totalMs.toFixed(2)}ms | ${formatNumber(opsPerSecond)} ops/sec | ${timePerOp.toFixed(4)}ms/op`);

	return { totalMs, opsPerSecond, timePerOp };
}

console.log('\nZephyr Events - Performance Benchmark');
console.log('='.repeat(50));

const results = {};

// 1. Emitter Creation
results['Creation'] = benchmark('Emitter Creation', () => {}, () => {
	zephyrEvents();
}, 500000);

// 2. Single Handler Emit
let singleEmitter;
results['Emit (1 handler)'] = benchmark('Emit (1 handler)', () => {
	singleEmitter = zephyrEvents();
	singleEmitter.on('test', () => {});
}, () => {
	singleEmitter.emit('test', { id: 1 });
}, 500000);

// 3. 10 Handlers Emit
let tenEmitter;
results['Emit (10 handlers)'] = benchmark('Emit (10 handlers)', () => {
	tenEmitter = zephyrEvents();
	for (let i = 0; i < 10; i++) {
		tenEmitter.on('test', () => {});
	}
}, () => {
	tenEmitter.emit('test', { id: 1 });
}, 100000);

// 4. 100 Handlers Emit
let hundredEmitter;
results['Emit (100 handlers)'] = benchmark('Emit (100 handlers)', () => {
	hundredEmitter = zephyrEvents();
	for (let i = 0; i < 100; i++) {
		hundredEmitter.on('test', () => {});
	}
}, () => {
	hundredEmitter.emit('test', { id: 1 });
}, 20000);

// 5. Wildcard Emit
let wcEmitter;
results['Wildcard Emit'] = benchmark('Wildcard Emit', () => {
	wcEmitter = zephyrEvents();
	wcEmitter.on('*', () => {});
}, () => {
	wcEmitter.emit('test', { id: 1 });
}, 500000);

// 6. Subscribe + Unsubscribe cycle (measures actual on/off, not array exhaustion)
let subEmitter;
results['On + Unsub cycle'] = benchmark('On + Unsub cycle', () => {
	subEmitter = zephyrEvents();
}, () => {
	const unsub = subEmitter.on('test', () => {});
	unsub();
}, 500000);

// 7. Off with specific handler (fresh each iteration)
let offEmitter;
let offHandler;
results['Off (specific)'] = benchmark('Off (specific handler)', () => {
	offEmitter = zephyrEvents();
}, () => {
	offHandler = () => {};
	offEmitter.on('test', offHandler);
	offEmitter.off('test', offHandler);
}, 500000);

// 8. Mixed realistic usage: on, emit, off
let mixedEmitter;
results['Mixed ops'] = benchmark('Mixed (on/emit/off)', () => {
	mixedEmitter = zephyrEvents();
}, () => {
	const handler = () => {};
	const unsub = mixedEmitter.on('mixed', handler);
	mixedEmitter.emit('mixed', { v: 1 });
	unsub();
}, 200000);

console.log('\n' + '='.repeat(50));
console.log('Summary:');
console.log('='.repeat(50));

for (const [name, result] of Object.entries(results)) {
	console.log(`  ${name.padEnd(22)}: ${formatNumber(result.opsPerSecond).padStart(8)} ops/sec`);
}

const peak = Math.max(...Object.values(results).map(r => r.opsPerSecond));
console.log(`\n  Peak: ${formatNumber(peak)} ops/sec`);
console.log('\nBenchmark complete.');

const fs = require('fs');
fs.writeFileSync('./benchmark-results.json', JSON.stringify({
	timestamp: new Date().toISOString(),
	nodeVersion: process.version,
	platform: process.platform,
	arch: process.arch,
	results: Object.fromEntries(
		Object.entries(results).map(([name, r]) => [
			name,
			{ opsPerSecond: Math.round(r.opsPerSecond), timePerOp: r.timePerOp }
		])
	)
}, null, 2));
