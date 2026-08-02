const fs = require('fs');
const path = require('path');

function walk(dir){
  let results=[];
  fs.readdirSync(dir).forEach(f=>{
    const p=path.join(dir,f);
    const stat=fs.statSync(p);
    if(stat && stat.isDirectory()){
      if(f==='node_modules' || f==='.next' || f==='.git') return;
      results=results.concat(walk(p));
    } else {
      results.push(p);
    }
  });
  return results;
}

const files = walk(process.cwd());
const suspect=[];
for(const file of files){
  if(!file.endsWith('.tsx') && !file.endsWith('.jsx') && !file.endsWith('.ts') && !file.endsWith('.js')) continue;
  const content = fs.readFileSync(file,'utf8');
  if(content.includes('ResponsiveTable') && content.includes('overflow-hidden')){
    suspect.push(file.replace(process.cwd()+path.sep,''));
  }
}
console.log(JSON.stringify(suspect,null,2));
