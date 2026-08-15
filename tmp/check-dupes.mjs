import fs from 'fs';
const lines = fs.readFileSync('src/i18n/en.ts', 'utf8').split('\n');
const nestedKeys = new Map();
let currentNested = null;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('export const en = {')) continue;
    const indent = (lines[i].match(/^(\s*)/) || ['', ''])[1].length;
    if (indent === 2 && line.endsWith(': {')) {
        currentNested = line.slice(0, -2);
        nestedKeys.set(currentNested, new Set());
    } else if (indent === 2 && line.endsWith('},')) {
        currentNested = null;
    } else if (indent === 4 && currentNested && line.includes(':')) {
        const key = line.split(':')[0].trim();
        if (nestedKeys.get(currentNested).has(key)) {
            console.log(`Duplicate key ${key} in ${currentNested} at line ${i+1}`);
        }
        nestedKeys.get(currentNested).add(key);
    }
}
