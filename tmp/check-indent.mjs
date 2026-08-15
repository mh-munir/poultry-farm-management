import fs from 'fs';
const lines = fs.readFileSync('src/i18n/en.ts', 'utf8').split('\n');
const targets = ['email:', 'address:', 'feedChickCompany:', 'taxNumberExample:', 'totalAmount:'];
for (let i = 0; i < lines.length; i++) {
    for (const t of targets) {
        if (lines[i].includes(t)) {
            const spaces = (lines[i].match(/^(\s*)/) || ['', ''])[1].length;
            console.log(`Line ${i+1} (indent ${spaces}): ${lines[i].trim()}`);
        }
    }
}
