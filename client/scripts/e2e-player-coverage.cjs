// @ts-check
/* global window, document -- usados apenas dentro de page.evaluate (renderer) */
/**
 * E2E do player com mídia local real no Electron (AGENTS.md §4).
 *
 * Valida que a conclusão de uma aula é decidida pelo backend a partir da
 * cobertura real (≥ 90% reproduzido):
 *   1. Pular (seek) até o fim NÃO conclui a aula; o status mostra "Fim do vídeo".
 *   2. Reproduzir continuamente (16x) conclui a aula com `completionSource = watched`.
 *
 * Pré-requisitos: `npm run desktop:core`, `npm run build` e `npm run desktop:rebuild`.
 * Os vídeos de `public/media/videos` são COPIADOS para uma biblioteca temporária;
 * os originais nunca são alterados.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { _electron: electron } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE_VIDEO = path.join(ROOT, 'public', 'media', 'videos', 'big-buck-bunny.mp4');

function assert(condition, message) {
  if (!condition) throw new Error(`E2E falhou: ${message}`);
}

function prepareLibrary() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'midoteca-e2e-'));
  const dataDir = path.join(base, 'data');
  const library = path.join(base, 'library');
  const moduleDir = path.join(library, 'Curso E2E', 'Modulo 1');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(moduleDir, { recursive: true });
  fs.copyFileSync(FIXTURE_VIDEO, path.join(moduleDir, '01 - Assistida.mp4'));
  fs.copyFileSync(FIXTURE_VIDEO, path.join(moduleDir, '02 - Pulada.mp4'));
  return { base, dataDir, library };
}

/** @param {import('playwright').Page} page */
async function invoke(page, method, params) {
  return page.evaluate(
    ([m, p]) => /** @type {any} */ (window).midoteca.invoke(m, p),
    /** @type {const} */ ([method, params ?? {}]),
  );
}

/** @param {import('playwright').Page} page */
async function waitFor(page, predicate, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await predicate();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`E2E: tempo esgotado aguardando ${label}`);
    await page.waitForTimeout(500);
  }
}

/** @param {import('playwright').Page} page */
async function dismissOnboarding(page) {
  const skip = page.getByRole('button', { name: 'Configurar depois' });
  if (await skip.isVisible({ timeout: 3_000 }).catch(() => false)) await skip.click();
}

/** @param {import('playwright').Page} page */
async function openLesson(page, courseId, lessonTitle) {
  await dismissOnboarding(page);
  try {
    await page.getByTestId(`home-course-${courseId}`).click({ timeout: 30_000 });
  } catch (error) {
    const shot = path.join(os.tmpdir(), 'midoteca-e2e-failure.png');
    await page.screenshot({ path: shot });
    console.error(`captura da tela: ${shot}`);
    throw error;
  }
  await page.getByLabel(`Assistir aula ${lessonTitle}`).click();
  await page.getByTestId('player-video').waitFor();
  await waitFor(
    page,
    () => page.evaluate(() => {
      const video = /** @type {HTMLVideoElement | null} */ (
        document.querySelector('[data-testid="player-video"]')
      );
      return !!video && video.readyState >= 2 && video.duration > 0;
    }),
    30_000,
    'metadados do vídeo',
  );
}

async function main() {
  assert(fs.existsSync(FIXTURE_VIDEO), `vídeo de teste ausente: ${FIXTURE_VIDEO}`);
  const { base, dataDir, library } = prepareLibrary();
  const app = await electron.launch({
    args: [path.join(ROOT, 'electron', 'main.cjs')],
    env: { ...process.env, MIDOTECA_DATA_DIR: dataDir, MIDOTECA_DEV_URL: '' },
  });

  try {
    const page = await app.firstWindow();
    await page.waitForFunction(() => 'midoteca' in window);

    await invoke(page, 'settings.set', { key: 'onboarding_completed', value: true });
    const source = await invoke(page, 'sources.add', { rootPath: library });
    await invoke(page, 'indexing.scan', { sourceId: source.id });
    const courses = await invoke(page, 'catalog.listCourses', { sourceId: source.id });
    const courseId = courses.items[0].id;
    const tree = await invoke(page, 'catalog.getCourseTree', { courseId });
    const lessons = tree.modules.flatMap((m) => m.lessons);
    const watched = lessons.find((l) => /Assistida/.test(l.title));
    const skipped = lessons.find((l) => /Pulada/.test(l.title));
    assert(watched && skipped, 'aulas da biblioteca temporária não foram catalogadas');
    // Posição inicial mínima para o curso aparecer em "Continue assistindo".
    await invoke(page, 'progress.savePlayback', { lessonId: watched.id, positionMs: 1_000 });
    await page.reload();

    // ── Cenário 1: seek até o fim não conclui ───────────────────────────────
    await openLesson(page, courseId, skipped.title);
    await page.evaluate(() => {
      const video = /** @type {HTMLVideoElement} */ (
        document.querySelector('[data-testid="player-video"]')
      );
      video.muted = true;
      void video.play();
      setTimeout(() => {
        video.currentTime = video.duration - 1;
      }, 1_500);
    });
    await page.getByTestId('player-ended').waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1_500);
    const skippedProgress = await invoke(page, 'progress.getPlayback', { lessonId: skipped.id });
    assert(skippedProgress?.completedAt === null, 'seek até o fim marcou a aula como concluída');
    assert((skippedProgress?.watchedRatio ?? 0) < 0.1, 'o salto foi contado como assistido');
    assert(
      (await page.getByTestId('player-status').textContent()) === 'Fim do vídeo',
      'status deveria ser "Fim do vídeo"',
    );
    console.log('✓ seek até o fim não conclui', skippedProgress);

    // ── Cenário 2: reprodução contínua conclui ──────────────────────────────
    await page.reload();
    await openLesson(page, courseId, watched.title);
    await page.evaluate(() => {
      const video = /** @type {HTMLVideoElement} */ (
        document.querySelector('[data-testid="player-video"]')
      );
      video.muted = true;
      video.currentTime = 0;
      video.playbackRate = 16;
      void video.play();
    });
    const completed = await waitFor(
      page,
      async () => {
        const progress = await invoke(page, 'progress.getPlayback', { lessonId: watched.id });
        return progress?.completedAt ? progress : null;
      },
      120_000,
      'conclusão decidida pelo backend',
    );
    assert(completed.completionSource === 'watched', 'origem da conclusão deveria ser "watched"');
    assert(completed.watchedRatio >= 0.9, 'cobertura abaixo de 90% concluiu a aula');
    console.log('✓ reprodução contínua conclui', {
      watchedRatio: completed.watchedRatio,
      completionSource: completed.completionSource,
    });
  } finally {
    await app.close();
    fs.rmSync(base, { recursive: true, force: true });
  }
}

main().then(
  () => console.log('MIDOTECA_E2E player-coverage OK'),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
