/**
 * Todo PR precisa subir a versão do app e registrar a entrada no CHANGELOG.
 *
 *   node scripts/check-release-bump.cjs <ref-da-base>   (ex.: origin/master)
 */
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const FORMAT = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-beta\.(0|[1-9]\d*))?$/;

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

function checkReleaseBump({ baseVersion, headVersion, changelog }) {
  if (!parse(headVersion)) {
    return [`A versão "${headVersion}" não segue o formato X.Y.Z ou X.Y.Z-beta.N.`];
  }
  const errors = [];
  if (parse(baseVersion) && compareVersions(headVersion, baseVersion) <= 0) {
    errors.push(
      `client/package.json: a versão ${headVersion} precisa ser maior que ${baseVersion} (versão da base).`,
    );
  }
  const escaped = headVersion.replace(/[.]/g, '\\.');
  if (!new RegExp(`^## \\[${escaped}\\]`, 'm').test(changelog)) {
    errors.push(`CHANGELOG.md: falta a seção "## [${headVersion}]" com as notas desta versão.`);
  }
  return errors;
}

function main() {
  const baseRef = process.argv[2];
  if (!baseRef) throw new Error('Informe a referência da base, por exemplo origin/master.');
  const clientRoot = path.resolve(__dirname, '..');
  const repoRoot = path.resolve(clientRoot, '..');
  const basePackage = execFileSync('git', ['show', `${baseRef}:client/package.json`], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const errors = checkReleaseBump({
    baseVersion: JSON.parse(basePackage).version,
    headVersion: require(path.join(clientRoot, 'package.json')).version,
    changelog: readFileSync(path.join(repoRoot, 'CHANGELOG.md'), 'utf8'),
  });
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('Versão e CHANGELOG atualizados.');
}

module.exports = { checkReleaseBump, compareVersions };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
