// DOM fixture for ui.test.js: loads the real index.html body into jsdom and
// stubs the canvas metrics the camera reads, BEFORE any UI module evaluates.
// Imported as a side-effect module so it runs ahead of the other imports.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// jsdom-served modules get an http import.meta.url, so resolve against cwd.
const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));

const cv = document.getElementById('field');
cv.getBoundingClientRect = () => ({ width: 900, height: 300, left: 0, top: 0, right: 900, bottom: 300, x: 0, y: 0 });
window.devicePixelRatio = 1;

// Tests drive frame() manually with controlled clocks.
globalThis.requestAnimationFrame = () => 0;
