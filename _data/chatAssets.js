const fs = require('fs');
const path = require('path');

const SUPPORTED_EXTENSIONS = new Set(['.png', '.gif', '.jpg', '.jpeg', '.webp']);

function collectAssetPaths(folderName) {
  const baseDir = path.join(__dirname, '..', 'assets', folderName);
  if (!fs.existsSync(baseDir)) return [];

  const results = [];
  const stack = [baseDir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        return;
      }
      if (!entry.isFile()) return;
      const ext = path.extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) return;
      const relative = path.relative(baseDir, fullPath).split(path.sep).join('/');
      results.push(`./assets/${folderName}/${relative}`);
    });
  }

  return results.sort((a, b) => a.localeCompare(b));
}

module.exports = {
  emojis: collectAssetPaths('emojis'),
  stickers: collectAssetPaths('stickers')
};
