const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const mappings = [
 ['数据结构与算法/0.复杂度分析','计算机基础/数据结构与算法/复杂度分析'],
 ['数据结构与算法/1.array','计算机基础/数据结构与算法/数组'],
 ['数据结构与算法/2.linklist','计算机基础/数据结构与算法/链表'],
 ['数据结构与算法/3.stack','计算机基础/数据结构与算法/栈'],
 ['数据结构与算法/4.queue','计算机基础/数据结构与算法/队列'],
 ['数据结构与算法/5.tree','计算机基础/数据结构与算法/树'],
 ['数据结构与算法/6.heap','计算机基础/数据结构与算法/堆'],
 ['数据结构与算法/8.sort_and_find','计算机基础/数据结构与算法/排序与查找'],
 ['数据结构与算法/LeetCode/1.两数之和','计算机基础/数据结构与算法/LeetCode/两数之和'],
 ['数据结构与算法','计算机基础/数据结构与算法'],['操作系统','计算机基础/操作系统'],['网络','计算机基础/计算机网络'],
 ['前端/html-css-js-ts/JS','编程语言/JavaScript'],['前端/html-css-js-ts/TS','编程语言/TypeScript'],
 ['前端/html-css-js-ts/CSS','开发技术/前端/CSS'],['前端/html-css-js-ts/HTML','开发技术/前端/HTML'],
 ['前端/html-css-js-ts','开发技术/前端/资源'],['前端/前端框架','开发技术/前端/框架'],
 ['前端/工程化','开发技术/前端/工程化'],['前端','开发技术/前端'],
 ['语言语法/NodeJS及生态/NestJS','开发技术/后端/框架/NestJS'],
 ['语言语法/NodeJS及生态/NodeJS','开发技术/Node.js'],
 ['语言语法/NodeJS及生态','开发技术/Node.js/生态'],
 ['语言语法/CPP','编程语言/C++'],['语言语法/Java','编程语言/Java'],
 ['语言语法/Python','编程语言/Python'],['语言语法/Rust','编程语言/Rust'],
 ['后端/Docker','工程能力/部署与交付/Docker'],['后端/调试方案','工程能力/测试与调试'],
 ['后端/数据库','开发技术/数据库'],['后端','开发技术/后端'],
 ['工程实践/设计模式','工程能力/设计模式'],['工程实践/系统设计','工程能力/系统设计'],
 ['工程实践/CICD','工程能力/部署与交付/CI-CD'],['工程实践/解决方案','工程能力/项目实践'],
 ['工程实践','工程能力'],
 ['AIAgent/Agent应用开发/LLM原理.md','AI应用/模型基础/LLM原理.md'],
 ['AIAgent/Agent应用开发/专业词汇.md','AI应用/模型基础/专业词汇.md'],
 ['AIAgent/Agent应用开发','AI应用/Agent开发'],['AIAgent/VibeCoding','AI应用/VibeCoding'],['AIAgent','AI应用']
].sort((a,b)=>b[0].length-a[0].length);
const normalize = value => value.split(path.sep).join('/');
const remap = relative => { relative=normalize(relative); const match=mappings.find(([old])=>relative===old || relative.startsWith(old+'/')); return match ? match[1]+relative.slice(match[0].length) : relative; };
function safe(relative) { const target=path.resolve(root,relative); if(!target.startsWith(root+path.sep)) throw Error('Outside workspace: '+target); return target; }
const oldRoots=['数据结构与算法','操作系统','网络','前端','语言语法','后端','工程实践','AIAgent'];
const files=[]; const directories=[];
function scan(relative) { const source=safe(relative); for(const item of fs.readdirSync(source,{withFileTypes:true})) { if(item.isSymbolicLink()) throw Error('Symbolic link: '+source); const child=relative+'/'+item.name; if(item.isDirectory()) {directories.push(child);scan(child)} else files.push(child); } }
for(const folder of oldRoots) if(fs.existsSync(safe(folder))) {directories.push(folder); scan(folder)}
if(!files.length) throw Error('No source files found; migration is not repeated.');
const savedManifest=path.join(__dirname,'../.vitepress/directory-migration.json');
if(fs.existsSync(savedManifest)){const saved=JSON.parse(fs.readFileSync(savedManifest,'utf8'));files.splice(0,files.length,...Object.keys(saved.files));}
const targets=new Set();
for(const file of files) {const target=remap(file); if(target===file) throw Error('Unmapped: '+file); if(targets.has(target)||(fs.existsSync(safe(target))&&fs.existsSync(safe(file)))) throw Error('Destination collision: '+target); targets.add(target);}
const manifest=Object.fromEntries(files.map(file=>[file,remap(file)]));
fs.writeFileSync(path.join(__dirname,'../.vitepress/directory-migration.json'),JSON.stringify({mappings,files:manifest},null,2)+'\n');
function rewrite(text, oldFile, newFile) {
 const link=href=>{
  if(/^(?:[a-z]+:|#|\/)/i.test(href)) return href;
  const split=href.search(/[?#]/); const suffix=split<0?'':href.slice(split); const pathname=split<0?href:href.slice(0,split);
  let decoded; try {decoded=decodeURI(pathname)} catch{return href}
  const oldTarget=normalize(path.relative(root,path.resolve(root,path.dirname(oldFile),decoded)));
  const newTarget=remap(oldTarget);
  if(newTarget===oldTarget && oldFile===newFile) return href;
  return normalize(path.relative(path.dirname(safe(newFile)),safe(newTarget))).replace(/ /g,'%20')+suffix;
 };
 return text.split(/(^\s*```[^\n]*\n[\s\S]*?^\s*```\s*$|^\s*~~~[^\n]*\n[\s\S]*?^\s*~~~\s*$)/m).map((part,i)=>i%2?part:part.replace(/(!?\[[^\]]*\]\()([^\s)]+)(\))/g,(_,a,href,b)=>a+link(href)+b).replace(/\b(href|src)=(['"])(.*?)\2/g,(_,attr,q,href)=>attr+'='+q+link(href)+q)).join('');
}
for(const file of files) { const next=remap(file); if(!fs.existsSync(safe(file))){if(!fs.existsSync(safe(next)))throw Error('Missing file: '+file);continue;} fs.mkdirSync(path.dirname(safe(next)),{recursive:true}); fs.renameSync(safe(file),safe(next)); if(/\.md$/i.test(file)) {const old=fs.readFileSync(safe(next),'utf8');const updated=rewrite(old,file,next);if(old!==updated)fs.writeFileSync(safe(next),updated)} }
// Preserve even empty knowledge categories; remove only verified empty source folders.
for(const folder of directories) fs.mkdirSync(safe(remap(folder)),{recursive:true});
for(const folder of directories.sort((a,b)=>b.length-a.length)) if(fs.existsSync(safe(folder))&&!fs.readdirSync(safe(folder)).length) fs.rmdirSync(safe(folder));
const readme=path.join(root,'README.md');fs.writeFileSync(readme,rewrite(fs.readFileSync(readme,'utf8'),'README.md','README.md'));
for(const relative of ['计算机基础/操作系统','编程语言/JavaScript','编程语言/TypeScript','编程语言/Python','编程语言/Java','编程语言/C++','编程语言/Rust','开发技术/前端','开发技术/Node.js','开发技术/后端','开发技术/数据库','工程能力/设计模式','工程能力/系统设计','工程能力/测试与调试','工程能力/部署与交付','工程能力/项目实践','AI应用/模型基础','AI应用/Agent开发','AI应用/VibeCoding'])fs.mkdirSync(safe(relative),{recursive:true});
console.log('Moved '+files.length+' files; updated relative links and README; manifest saved.');
