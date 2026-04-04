const { execSync } = require('child_process');

function formatNumber(num) {
	if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
	if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
	if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
	return num.toString();
}

const benchScript = `
const VARIANT = process.argv[2];
const zephyrEvents = require('./dist/zephyr-events.js');
const { zephyrEventsFast } = require('./dist/zephyr-events.js');
const factory = VARIANT === 'fast' ? zephyrEventsFast : zephyrEvents;

function bench(setup, fn, iterations) {
	setup();
	for (let i = 0; i < 10000; i++) fn();
	const start = process.hrtime.bigint();
	for (let i = 0; i < iterations; i++) fn();
	const end = process.hrtime.bigint();
	const totalMs = Number(end - start) / 1e6;
	return iterations / (totalMs / 1000);
}

const results = {};
let e;

results['Creation'] = bench(() => {}, () => { factory(); }, 500000);

results['Emit (1 handler)'] = bench(() => {
	e = factory(); e.on('test', () => {});
}, () => { e.emit('test', { id: 1 }); }, 500000);

results['Emit (10 handlers)'] = bench(() => {
	e = factory(); for (let i = 0; i < 10; i++) e.on('test', () => {});
}, () => { e.emit('test', { id: 1 }); }, 200000);

results['Emit (100 handlers)'] = bench(() => {
	e = factory(); for (let i = 0; i < 100; i++) e.on('test', () => {});
}, () => { e.emit('test', { id: 1 }); }, 50000);

results['Wildcard Emit'] = bench(() => {
	e = factory(); e.on('*', () => {});
}, () => { e.emit('test', { id: 1 }); }, 500000);

results['Emit (no wildcards)'] = bench(() => {
	e = factory(); e.on('test', () => {});
}, () => { e.emit('test', { id: 1 }); }, 500000);

results['On + Unsub cycle'] = bench(() => {
	e = factory();
}, () => { const u = e.on('test', () => {}); u(); }, 500000);

results['Off (specific)'] = bench(() => {
	e = factory();
}, () => { const h = () => {}; e.on('test', h); e.off('test', h); }, 500000);

results['Mixed ops'] = bench(() => {
	e = factory();
}, () => {
	const h = () => {};
	const u = e.on('mixed', h);
	e.emit('mixed', { v: 1 });
	u();
}, 200000);

console.log(JSON.stringify(results));
`;

const fs = require('fs');
const tmpFile = require('path').join(__dirname, '_bench_tmp.js');
fs.writeFileSync(tmpFile, benchScript);

function runVariant(variant) {
	const out = execSync(`node ${tmpFile} ${variant}`, { encoding: 'utf8', timeout: 30000 });
	return JSON.parse(out.trim());
}

console.log('\nZephyr Events — Safe vs Fast (isolated processes)');
console.log('='.repeat(68));
console.log(`Node ${process.version} | ${process.platform} ${process.arch}`);
console.log('Running 3 iterations per variant for stability...\n');

const RUNS = 3;
const safeRuns = [];
const fastRuns = [];

for (let i = 0; i < RUNS; i++) {
	safeRuns.push(runVariant('safe'));
	fastRuns.push(runVariant('fast'));
}

function median(arr) {
	const sorted = arr.slice().sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)];
}

function medianResults(runs) {
	const keys = Object.keys(runs[0]);
	const out = {};
	for (const k of keys) {
		out[k] = median(runs.map(r => r[k]));
	}
	return out;
}

const safe = medianResults(safeRuns);
const fast = medianResults(fastRuns);

const pad = (s, n) => String(s).padStart(n);

console.log(`${'Benchmark'.padEnd(22)} | ${'Safe'.padStart(10)} | ${'Fast'.padStart(10)} | ${'Δ'.padStart(8)}`);
console.log('-'.repeat(68));

for (const key of Object.keys(safe)) {
	const s = safe[key];
	const f = fast[key];
	const delta = ((f - s) / s * 100).toFixed(1);
	const sign = f > s ? '+' : '';
	console.log(
		`${key.padEnd(22)} | ${pad(formatNumber(s), 10)} | ${pad(formatNumber(f), 10)} | ${pad(sign + delta + '%', 8)}`
	);
}

console.log('-'.repeat(68));
console.log('\n(median of 3 runs per variant, each in isolated V8 process)');

fs.unlinkSync(tmpFile);
