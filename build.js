const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'dist');
const inputFile = path.join(outputDir, 'index.js');

if (!fs.existsSync(inputFile)) {
	console.error('TypeScript compilation failed - no output file');
	process.exit(1);
}

const compiled = fs.readFileSync(inputFile, 'utf8');

// Extract the function body by removing the CJS wrapper lines.
// The compiled output looks like:
//   "use strict";
//   Object.defineProperty(exports, "__esModule", { value: true });
//   exports.default = zephyrEvents;
//   function zephyrEvents(...) { ... }
const functionMatch = compiled.match(/(function zephyrEvents[\s\S]+)$/);
if (!functionMatch) {
	console.error('Could not extract zephyrEvents function from compiled output');
	process.exit(1);
}
const functionBody = functionMatch[1].trim();

// ESM: export default
const esmCode = `export default ${functionBody}\n`;
fs.writeFileSync(path.join(outputDir, 'zephyr-events.mjs'), esmCode);

// CJS: module.exports with .default for interop
const cjsCode = [
	'"use strict";',
	`module.exports = ${functionBody}`,
	'module.exports.default = module.exports;',
	''
].join('\n');
fs.writeFileSync(path.join(outputDir, 'zephyr-events.js'), cjsCode);

// UMD: universal module
const umdCode = `(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = global || self, global.zephyrEvents = factory());
}(this, (function () {
	'use strict';
	${functionBody}
	return zephyrEvents;
})));
`;
fs.writeFileSync(path.join(outputDir, 'zephyr-events.umd.js'), umdCode);

console.log('Built:');
const formats = ['zephyr-events.js', 'zephyr-events.mjs', 'zephyr-events.umd.js'];
for (const file of formats) {
	const size = fs.statSync(path.join(outputDir, file)).size;
	console.log(`  ${size}B: ${file}`);
}
