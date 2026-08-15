const fs = require('fs');
const buf = fs.readFileSync('src/i18n/en.ts');
const lines = buf.toString('utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('\r')) {
        console.log(`Line ${i+1} has CR without LF`);
    }
}
console.log('Total lines:', lines.length);
