const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'dist');
const inputFile = path.join(outputDir, 'index.js');

if (!fs.existsSync(inputFile)) {
	console.error('TypeScript compilation failed - no output file');
	process.exit(1);
}

const compiled = fs.readFileSync(inputFile, 'utf8');

// Extract a top-level `function <name>(...) { ... }` declaration by matching
// braces, skipping any braces that appear inside string/template/comment tokens.
// Brace-matching is robust against inner column-0 braces (formatters, template
// literals) that a newline heuristic would truncate on.
function extractFunction(source, name) {
	const decl = new RegExp('function\\s+' + name + '\\b');
	const startMatch = decl.exec(source);
	if (!startMatch) return null;
	const start = startMatch.index;

	// Advance to the opening brace of the function body.
	let i = source.indexOf('{', start);
	if (-1 === i) return null;

	let depth = 0;
	for (; i < source.length; i++) {
		const ch = source[i];

		// Skip string / template literals wholesale.
		if ("'" === ch || '"' === ch || '`' === ch) {
			const quote = ch;
			i++;
			while (i < source.length && source[i] !== quote) {
				if ('\\' === source[i]) i++; // skip escaped char
				i++;
			}
			continue;
		}

		// Skip comments.
		if ('/' === ch && '/' === source[i + 1]) {
			i = source.indexOf('\n', i);
			if (-1 === i) i = source.length;
			continue;
		}
		if ('/' === ch && '*' === source[i + 1]) {
			const close = source.indexOf('*/', i + 2);
			i = -1 === close ? source.length : close + 1;
			continue;
		}

		if ('{' === ch) {
			depth++;
		} else if ('}' === ch) {
			depth--;
			if (0 === depth) {
				return source.slice(start, i + 1);
			}
		}
	}
	return null;
}

// Extract both function bodies from compiled output.
const functionBody = extractFunction(compiled, 'zephyrEvents');
const fastBody = extractFunction(compiled, 'zephyrEventsFast');
if (!functionBody || !fastBody) {
	console.error('Could not extract zephyrEvents functions from compiled output');
	process.exit(1);
}

// ESM: export default + named export
const esmCode = `export default ${functionBody}\nexport ${fastBody}\n`;
fs.writeFileSync(path.join(outputDir, 'zephyr-events.mjs'), esmCode);

// CJS: module.exports with .default and .zephyrEventsFast
const cjsCode = [
	'"use strict";',
	`module.exports = ${functionBody}`,
	'module.exports.default = module.exports;',
	`module.exports.zephyrEventsFast = ${fastBody}`,
	''
].join('\n');
fs.writeFileSync(path.join(outputDir, 'zephyr-events.js'), cjsCode);

// UMD: universal module
const umdCode = `(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = global || self, factory(global));
}(this, (function (exports) {
	'use strict';
	${functionBody}
	${fastBody}
	exports.zephyrEvents = zephyrEvents;
	exports.zephyrEventsFast = zephyrEventsFast;
})));
`;
fs.writeFileSync(path.join(outputDir, 'zephyr-events.umd.js'), umdCode);

console.log('Built:');
const formats = ['zephyr-events.js', 'zephyr-events.mjs', 'zephyr-events.umd.js'];
for (const file of formats) {
	const size = fs.statSync(path.join(outputDir, file)).size;
	console.log(`  ${size}B: ${file}`);
}
