const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'app');
const componentsDir = path.join(__dirname, '..', 'components');

function walk(directory, callback) {
  fs.readdirSync(directory).forEach(file => {
    const filepath = path.join(directory, file);
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, callback);
    } else if (filepath.endsWith('.tsx')) {
      callback(filepath);
    }
  });
}

function processFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Uniform Border Radius
  content = content.replace(/\brounded-2xl\b/g, 'rounded-lg');
  content = content.replace(/\brounded-xl\b/g, 'rounded-lg');

  // Dictionary of exact word replacements
  const dict = {
    'bg-zinc-950': 'bg-zinc-50 dark:bg-zinc-900',
    'bg-[#0a0a0b]': 'bg-white dark:bg-zinc-900',
    'bg-zinc-900': 'bg-zinc-100 dark:bg-zinc-800',
    'bg-zinc-900/60': 'bg-zinc-100/60 dark:bg-zinc-800/60',
    'bg-zinc-800/20': 'bg-zinc-200/50 dark:bg-zinc-700/30',
    'bg-zinc-800/50': 'bg-zinc-200/80 dark:bg-zinc-700/50',
    'border-zinc-800/50': 'border-zinc-200 dark:border-zinc-700/50',
    'border-zinc-800': 'border-zinc-200 dark:border-zinc-700',
    'text-zinc-100': 'text-zinc-900 dark:text-zinc-100',
    'text-zinc-300': 'text-zinc-700 dark:text-zinc-300',
    'text-zinc-400': 'text-zinc-600 dark:text-zinc-400',
    'text-zinc-500': 'text-zinc-500 dark:text-zinc-400',
    'text-white': 'text-zinc-900 dark:text-white',
    'text-zinc-950': 'text-zinc-50 dark:text-zinc-950',
  };

  // Create a regex that matches any of the keys exactly. Sort by length descending to match longest first.
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
  const regex = new RegExp(keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).map(k => `(?<!\\S)${k}(?!\\S)`).join('|'), 'g');

  content = content.replace(regex, match => dict[match]);

  // Fix buttons: if we have bg-emerald-xxx or bg-amber-xxx followed by text-zinc-900 dark:text-white, revert to text-white
  // Also text-transparent bg-clip-text
  content = content.replace(/(bg-(?:emerald|amber|red)-[0-9]+.*?|text-transparent.*?)\btext-zinc-900 dark:text-white\b/g, '$1text-white');

  fs.writeFileSync(filepath, content, 'utf8');
}

walk(dir, processFile);
if(fs.existsSync(componentsDir)) walk(componentsDir, processFile);

console.log('Refactor complete');
