const { execFileSync } = require('node:child_process');

// `npm pack --json` de um núcleo com dependências empacotadas passa de 1 MB
// (limite padrão do child_process), o que abortava o release com ENOBUFS.
const MAX_CAPTURED_OUTPUT = 64 * 1024 * 1024;

function createNpmRunner({ execPath = process.execPath, npmCli = process.env.npm_execpath } = {}) {
  return function runNpm(args, cwd, capture = false) {
    if (!npmCli) throw new Error('Execute pela entrada npm run desktop:release.');
    return execFileSync(execPath, [npmCli, ...args], {
      cwd,
      encoding: 'utf8',
      maxBuffer: MAX_CAPTURED_OUTPUT,
      stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    });
  };
}

module.exports = { createNpmRunner, MAX_CAPTURED_OUTPUT };
