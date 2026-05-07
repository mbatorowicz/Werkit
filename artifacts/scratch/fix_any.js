const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('c:\\Users\\mbato\\OneDrive\\Desktop\\Apps\\Werkit\\src\\app\\api', (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    if (content.includes('catch (err: any)')) {
      content = content.replace(/catch \(err: any\)/g, 'catch (err: unknown)');
      
      // replace err.message -> (err instanceof Error ? err.message : String(err))
      content = content.replace(/err\.message/g, '(err instanceof Error ? err.message : String(err))');
      
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log('Fixed:', filePath);
    }
  }
});
