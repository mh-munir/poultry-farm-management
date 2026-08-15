import fs from 'fs';
const lines = fs.readFileSync('src/i18n/en.ts', 'utf8').split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = (line.match(/{/g) || []).length;
    const close = (line.match(/}/g) || []).length;
    const prevDepth = depth;
    depth += open - close;
    if (depth < 0) {
        console.log(`Line ${i+1}: depth went negative (${prevDepth} -> ${depth}): ${line}`);
    }
}
console.log('Final depth:', depth);
