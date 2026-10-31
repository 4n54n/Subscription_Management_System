const fs = require('fs');
const path = require('path');
const results = [];

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!full.includes('node_modules') && !full.includes('.git') && !full.includes('dist')) scanDir(full);
    } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach(function(line, i) {
        // Detect fetch() with hardcoded external http URL
        if (/fetch\s*\(/.test(line) && line.indexOf('http') !== -1) {
          results.push({ file: full.replace(/.*BrightLoop_Workspace-on-oracle./, ''), line: i+1, type: 'fetch-call', code: line.trim().substring(0, 120) });
        }
        // Detect any external URL string literal
        var re = /(https?:\/\/[a-zA-Z0-9._\-\/:%?=&#@+]+)/g;
        var match;
        while ((match = re.exec(line)) !== null) {
          var url = match[1];
          if (url.indexOf('localhost') === -1 && url.indexOf('127.0.0.1') === -1) {
            results.push({ file: full.replace(/.*BrightLoop_Workspace-on-oracle./, ''), line: i+1, type: 'url', url: url, code: line.trim().substring(0, 120) });
          }
        }
      });
    }
  }
}

scanDir(path.resolve('packages/frontend/core/src'));
scanDir(path.resolve('packages/frontend/component/src'));
scanDir(path.resolve('packages/backend/server/src'));

// Deduplicate by URL
var seen = {};
var deduped = results.filter(function(r) {
  if (!r.url) return true; // keep all fetch calls
  if (seen[r.url]) return false;
  seen[r.url] = true;
  return true;
});

console.log(JSON.stringify(deduped, null, 2));
console.log('\nTOTAL RESULTS: ' + deduped.length);
