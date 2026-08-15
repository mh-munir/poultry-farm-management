const fs = require('fs');
const buf = fs.readFileSync('src/i18n/en.ts');
const issues = [];
for (let i = 0; i < buf.length; i++) {
    const code = buf[i];
    if (code > 127) {
        issues.push({pos: i, code});
    }
}
console.log('Non-ASCII bytes:', issues.length);
if (issues.length > 0) {
    for (const issue of issues.slice(0, 20)) {
        console.log(`Pos ${issue.pos}: 0x${issue.code.toString(16).toUpperCase().padStart(2, '0')}`);
    }
}
