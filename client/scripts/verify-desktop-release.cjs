const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function packagedExecutable(artifacts) {
  if (process.platform === 'win32') return path.join(artifacts, 'win-unpacked/Midoteca.exe');
  if (process.platform === 'darwin') {
    const directory = process.arch === 'arm64' ? 'mac-arm64' : 'mac';
    return path.join(artifacts, directory, 'Midoteca.app/Contents/MacOS/Midoteca');
  }
  return path.join(artifacts, 'linux-unpacked/midoteca-desktop');
}

function verifyDesktopRelease({ clientRoot, version, channel, electronVersion }) {
  const artifacts = path.join(clientRoot, 'release/artifacts');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'midoteca-release-'));
  const reportFile = path.join(temporary, 'smoke.json');
  const env = {
    ...process.env,
    MIDOTECA_SMOKE: '1',
    MIDOTECA_DATA_DIR: temporary,
    MIDOTECA_SMOKE_REPORT: reportFile,
  };
  delete env.ELECTRON_RUN_AS_NODE;
  try {
    const result = spawnSync(packagedExecutable(artifacts), [], {
      env,
      encoding: 'utf8',
      timeout: 60_000,
      windowsHide: true,
    });
    if (result.error || result.status !== 0) {
      throw new Error(`Falha no executável empacotado: ${result.error || result.stderr}`);
    }
    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    if (report.applicationVersion !== version || report.electronVersion !== electronVersion) {
      throw new Error('A versão do executável ou do Electron difere da versão solicitada.');
    }
    if (!report.ok || !fs.existsSync(path.join(temporary, 'midoteca.db'))) {
      throw new Error('O executável não confirmou RPC e SQLite reais.');
    }
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }

  writeEvidence({ artifacts, version, channel, electronVersion });
  console.log(`Smoke do executável ${version}: RPC e SQLite reais OK.`);
}

function writeEvidence({ artifacts, version, channel, electronVersion }) {
  const files = [];
  if (process.platform === 'win32' && !process.argv.includes('--dir')) {
    for (const target of ['setup', 'portable']) {
      const file = `Midoteca-${version}-${target}-x64.exe`;
      fs.accessSync(path.join(artifacts, file));
      files.push(file);
    }
  }
  const info = {
    version,
    channel,
    electronVersion,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    commit: process.env.GITHUB_SHA || null,
    packagedSmoke: 'passed',
  };
  fs.writeFileSync(path.join(artifacts, 'build-info.json'), `${JSON.stringify(info, null, 2)}\n`);
  files.push('build-info.json');
  const checksums = files.map((file) => {
    const hash = createHash('sha256')
      .update(fs.readFileSync(path.join(artifacts, file)))
      .digest('hex');
    return `${hash}  ${file}`;
  });
  fs.writeFileSync(path.join(artifacts, 'SHA256SUMS'), `${checksums.join('\n')}\n`);
}

module.exports = { verifyDesktopRelease };
