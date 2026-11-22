// @ts-check
const path = require('node:path');

/**
 * Comandos do `npm run dev` como executáveis reais, sem shell. No Windows, o
 * Node recusa executar os atalhos `.cmd` de `node_modules/.bin` sem shell
 * (EINVAL) e não resolve `npm` sem extensão (ENOENT); por isso o Electron é
 * chamado pelo binário do pacote, e npm/Vite pelo Node com o script JS.
 *
 * @param {{ root: string; execPath?: string; npmCli?: string }} options
 */
function createDevCommands({
  root,
  execPath = process.execPath,
  npmCli = process.env.npm_execpath,
}) {
  const fromRoot = (request) => require.resolve(request, { paths: [root] });
  return {
    /** @param {string[]} args */
    electron(args) {
      /** O pacote `electron` exporta o caminho do executável. */
      const command = /** @type {string} */ (require(fromRoot('electron')));
      return { command, args };
    },
    /** @param {string[]} args */
    npm(args) {
      if (!npmCli) throw new Error('Execute pela entrada npm run dev.');
      return { command: execPath, args: [npmCli, ...args] };
    },
    /** @param {string[]} args */
    vite(args) {
      const cli = path.join(path.dirname(fromRoot('vite/package.json')), 'bin', 'vite.js');
      return { command: execPath, args: [cli, ...args] };
    },
  };
}

module.exports = { createDevCommands };
