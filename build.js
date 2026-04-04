const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'dist');
const inputFile = path.join(outputDir, 'index.js');

if (!fs.existsSync(inputFile)) {
	console.error('TypeScript compilation failed - no output file');
	process.exit(1);
}

const compiled = fs.readFileSync(inputFile, 'utf8');

// Extract both function bodies from compiled output.
const defaultMatch = compiled.match(/(function zephyrEvents\b[\s\S]*?\n\})/);
const fastMatch = compiled.match(/(function zephyrEventsFast\b[\s\S]*?\n\})/);
if (!defaultMatch || !fastMatch) {
	console.error('Could not extract zephyrEvents functions from compiled output');
	process.exit(1);
}
const functionBody = defaultMatch[1].trim();
const fastBody = fastMatch[1].trim();

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
