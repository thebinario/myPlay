const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { prepareDesktopRelease } = require('./prepare-desktop-release.cjs');
const { verifyDesktopRelease } = require('./verify-desktop-release.cjs');

const clientRoot = path.resolve(__dirname, '..');

function releaseOptions() {
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const version = args[0] || process.env.RELEASE_VERSION;
  const channel = args[1] || process.env.RELEASE_CHANNEL;
  const numeric = '(0|[1-9][0-9]*)';
  const format = new RegExp(`^${numeric}\\.${numeric}\\.${numeric}(-beta\\.${numeric})?$`);
  if (!format.test(version || '') || !['beta', 'stable'].includes(channel)) {
    throw new Error('Informe versão X.Y.Z ou X.Y.Z-beta.N e canal beta ou stable.');
  }
  if ((channel === 'beta') !== version.includes('-beta.')) {
    throw new Error('O canal beta exige -beta.N; stable exige versão X.Y.Z.');
  }
  return { version, channel };
}

function runNpm(args, cwd, capture = false) {
  const cli = process.env.npm_execpath;
  if (!cli) throw new Error('Execute pela entrada npm run desktop:release.');
  return execFileSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
}

async function main() {
  const release = releaseOptions();
  if (process.argv.includes('--validate')) {
    console.log(JSON.stringify(release));
    return;
  }
  runNpm(['run', 'build'], path.resolve(clientRoot, '../midoteca'));
  runNpm(['run', 'build'], clientRoot);
  prepareDesktopRelease({ clientRoot, ...release, runNpm });
  const electronVersion = require('electron/package.json').version;
  const builderCli = path.join(
    path.dirname(require.resolve('electron-builder/package.json')),
    'cli.js',
  );
  const args = [builderCli, '--config', 'electron-builder.yml', '--publish', 'never'];
  args.push(`--config.electronVersion=${electronVersion}`);
  if (process.platform === 'win32') args.push('--win', '--x64');
  if (process.argv.includes('--dir')) args.push('--dir');
  execFileSync(process.execPath, args, {
    cwd: clientRoot,
    stdio: 'inherit',
    env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' },
  });
  verifyDesktopRelease({ clientRoot, ...release, electronVersion });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
