const fs = require('node:fs');
const path = require('node:path');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function prepareDesktopRelease({ clientRoot, version, runNpm }) {
  const coreRoot = path.resolve(clientRoot, '../midoteca');
  const releaseRoot = path.join(clientRoot, 'release');
  const coreStage = path.join(releaseRoot, 'core');
  const appStage = path.join(releaseRoot, 'app');
  for (const directory of [coreStage, appStage, path.join(releaseRoot, 'artifacts')]) {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.mkdirSync(directory, { recursive: true });
  }

  for (const file of ['package.json', 'package-lock.json', 'dist']) {
    fs.cpSync(path.join(coreRoot, file), path.join(coreStage, file), { recursive: true });
  }
  // Bundle the production tree installed from the committed core lockfile.
  // No native scripts run here: Electron Builder rebuilds the addon for Electron.
  runNpm(['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], coreStage);
  const core = readJson(path.join(coreStage, 'package.json'));
  core.bundleDependencies = Object.keys(core.dependencies);
  delete core.devDependencies;
  delete core.scripts;
  writeJson(path.join(coreStage, 'package.json'), core);
  const packed = JSON.parse(
    runNpm(['pack', '--json', '--ignore-scripts', '--pack-destination', appStage], coreStage, true),
  )[0];
  if (!packed.bundled.includes('better-sqlite3')) {
    throw new Error('O pacote do núcleo não contém a dependência SQLite.');
  }

  const app = readJson(path.join(clientRoot, 'package.json'));
  app.version = version;
  app.dependencies['@midoteca/core'] = `file:${packed.filename}`;
  delete app.devDependencies;
  delete app.scripts;
  if (!app.main || !fs.existsSync(path.join(clientRoot, app.main))) {
    throw new Error('O package.json precisa apontar para o entrypoint Electron existente.');
  }
  writeJson(path.join(appStage, 'package.json'), app);
  fs.copyFileSync(
    path.join(clientRoot, 'package-lock.json'),
    path.join(appStage, 'package-lock.json'),
  );
  for (const directory of ['electron', 'dist']) {
    fs.cpSync(path.join(clientRoot, directory), path.join(appStage, directory), {
      recursive: true,
    });
  }
  runNpm(
    ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'],
    appStage,
  );
  runNpm(['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], appStage);
  if (fs.lstatSync(path.join(appStage, 'node_modules/@midoteca/core')).isSymbolicLink()) {
    throw new Error('O pacote de distribuição não pode depender de um symlink para o núcleo.');
  }
  console.log(`Release ${version} preparada em ${appStage}`);
}

module.exports = { prepareDesktopRelease };
