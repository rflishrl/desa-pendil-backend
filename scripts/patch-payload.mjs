import fs from 'fs';
import path from 'path';

function patchUndici(dir) {
  const undiciPath = path.resolve(dir, 'lib/web/cache/cachestorage.js');
  if (fs.existsSync(undiciPath)) {
    let content = fs.readFileSync(undiciPath, 'utf8');
    if (content.includes('webidl.illegalConstructor()')) {
      content = content.replace('webidl.illegalConstructor()', '// webidl.illegalConstructor()');
      fs.writeFileSync(undiciPath, content);
      console.log('Patched undici in ' + dir);
    }
  }
}

patchUndici('node_modules/undici');
patchUndici('node_modules/payload/node_modules/undici');

// Fix payload loadEnv for Next.js 15/16 named export
const loadEnvPath = path.resolve('node_modules/payload/dist/bin/loadEnv.js');
if (fs.existsSync(loadEnvPath)) {
  let content = fs.readFileSync(loadEnvPath, 'utf8');
  if (content.includes('const { loadEnvConfig } = nextEnvImport;')) {
    content = content.replace(
      'import nextEnvImport from \'@next/env\';',
      'import * as nextEnvNamespace from \'@next/env\';\nimport nextEnvImport from \'@next/env\';'
    );
    content = content.replace(
      'const { loadEnvConfig } = nextEnvImport;',
      'const loadEnvConfig = nextEnvNamespace.loadEnvConfig || nextEnvImport?.loadEnvConfig || nextEnvNamespace.default?.loadEnvConfig;'
    );
    fs.writeFileSync(loadEnvPath, content);
    console.log('Patched payload loadEnv');
  }
}
