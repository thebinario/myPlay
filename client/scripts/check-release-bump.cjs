/**
 * Todo PR registra suas mudanças em `## [Unreleased]` no CHANGELOG; só o PR de
 * release sobe a versão (ex.: 1.1.0-beta.3) e move as notas para a seção dela.
 *
 *   node scripts/check-release-bump.cjs <ref-da-base>   (ex.: origin/master)
 */
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const FORMAT = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-beta\.(0|[1-9]\d*))?$/;
const UNRELEASED = /^## \[Unreleased\][^\n]*\n([\s\S]*?)(?=^## \[|(?![\s\S]))/m;

function parse(version) {
  const match = FORMAT.exec(version);
  if (!match) return null;
  const [, major, minor, patch, beta] = match;
  return {
    core: [Number(major), Number(minor), Number(patch)],
    beta: beta === undefined ? null : Number(beta),
  };
}

/** < 0, 0 ou > 0, como um comparador. Uma versão estável é maior que suas betas. */
function compareVersions(a, b) {
  const left = parse(a);
  const right = parse(b);
  if (!left || !right) throw new Error(`Versão inválida: ${left ? b : a}`);
  for (let i = 0; i < 3; i += 1) {
    if (left.core[i] !== right.core[i]) return left.core[i] - right.core[i];
  }
  if (left.beta === right.beta) return 0;
  if (left.beta === null) return 1;
  if (right.beta === null) return -1;
  return left.beta - right.beta;
}

/** Corpo da seção `## [Unreleased]` (null quando a seção não existe). */
function unreleasedSection(changelog) {
  const match = UNRELEASED.exec(changelog.replace(/\r\n/g, '\n'));
  return match ? match[1].trim() : null;
}

function hasVersionSection(changelog, version) {
  return changelog.split('\n').some((line) => line.startsWith(`## [${version}]`));
}

/**
 * - PR comum: versão igual à da base e algo novo em `## [Unreleased]`.
 * - PR de release: versão maior que a da base e a seção `## [versão]` presente.
 */
function checkReleaseNotes({ baseVersion, headVersion, baseChangelog, headChangelog }) {
  if (!parse(headVersion)) {
    return [`A versão "${headVersion}" não segue o formato X.Y.Z ou X.Y.Z-beta.N.`];
  }
  const errors = [];
  const isRelease = headVersion !== baseVersion;
  if (isRelease && parse(baseVersion) && compareVersions(headVersion, baseVersion) <= 0) {
    errors.push(
      `client/package.json: a versão ${headVersion} precisa ser maior que ${baseVersion} (versão da base).`,
    );
  }

  const head = unreleasedSection(headChangelog);
  if (head === null) {
    errors.push('CHANGELOG.md: falta a seção "## [Unreleased]" no topo.');
    return errors;
  }

  if (isRelease) {
    if (!hasVersionSection(headChangelog, headVersion)) {
      errors.push(`CHANGELOG.md: falta a seção "## [${headVersion}]" com as notas desta release.`);
    }
    return errors;
  }

  const base = unreleasedSection(baseChangelog ?? '') ?? '';
  if (head === base || !/^\s*- \S/m.test(head)) {
    errors.push(
      'CHANGELOG.md: registre em "## [Unreleased]" o que este PR adiciona, altera ou corrige.',
    );
  }
  return errors;
}

function gitShow(repoRoot, ref, file) {
  try {
    return execFileSync('git', ['show', `${ref}:${file}`], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

function main() {
  const baseRef = process.argv[2];
  if (!baseRef) throw new Error('Informe a referência da base, por exemplo origin/master.');
  const clientRoot = path.resolve(__dirname, '..');
  const repoRoot = path.resolve(clientRoot, '..');
  const basePackage = gitShow(repoRoot, baseRef, 'client/package.json');
  const errors = checkReleaseNotes({
    baseVersion: basePackage ? JSON.parse(basePackage).version : '0.0.0',
    headVersion: require(path.join(clientRoot, 'package.json')).version,
    baseChangelog: gitShow(repoRoot, baseRef, 'CHANGELOG.md'),
    headChangelog: readFileSync(path.join(repoRoot, 'CHANGELOG.md'), 'utf8'),
  });
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('CHANGELOG atualizado.');
}

module.exports = { checkReleaseNotes, compareVersions };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
