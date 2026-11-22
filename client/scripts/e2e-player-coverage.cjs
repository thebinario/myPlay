// @ts-check
/* global window, document -- usados apenas dentro de page.evaluate (renderer) */
/**
 * E2E do player com mídia local real no Electron (AGENTS.md §4).
 *
 * Valida que a conclusão de uma aula é decidida pelo backend a partir da
 * cobertura real (≥ 90% reproduzido) e a detecção de conteúdo duplicado:
 *   1. Pular (seek) até o fim NÃO conclui a aula; o status mostra "Fim do vídeo".
 *   2. Reproduzir continuamente (16x) conclui a aula com `completionSource = watched`.
 *   3. As duas aulas (cópias do mesmo vídeo) formam um grupo `exact`; a aula não
 *      vista mostra "Já assistido em…" e reaproveita a conclusão (`duplicate`).
 *   4. Uma frase da legenda (.srt), buscada sem acentos na Pesquisa, aparece em
 *      "Trechos encontrados" e abre o vídeo no tempo do trecho.
 *   5. Um vídeo com fala e sem legenda é transcrito localmente (Whisper): o texto
 *      falado é encontrado pela busca e aparece como legenda "gerada
 *      automaticamente" no menu CC. Use MIDOTECA_AI_CACHE para reaproveitar o
 *      modelo baixado entre execuções.
 *   6. "Perguntar à biblioteca" responde com o modelo local a partir da aula
 *      falada (defina MIDOTECA_LLM_MODEL com um GGUF pequeno para acelerar).
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
const CORE = path.resolve(ROOT, '..', 'midoteca');
const SPEECH_WAV = path.join(CORE, 'test', 'fixtures', 'speech-pt.wav');

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
  fs.writeFileSync(
    path.join(moduleDir, '01 - Assistida.pt-BR.srt'),
    '1\n00:01:15,000 --> 00:01:19,000\nConfiguração do ambiente de produção\n',
  );
  // Vídeo curto com fala em português (sem legenda) para a transcrição local.
  const speechDir = path.join(library, 'Curso Fala', 'Modulo 1');
  fs.mkdirSync(speechDir, { recursive: true });
  const ffmpeg = require(require.resolve('ffmpeg-static', { paths: [CORE] }));
  require('node:child_process').execFileSync(ffmpeg, [
    '-v', 'error', '-y',
    '-f', 'lavfi', '-i', 'color=c=navy:s=640x360:r=24',
    '-i', SPEECH_WAV,
    '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
    path.join(speechDir, '01 - Aula falada.mp4'),
  ]);
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
  // "Configurar depois" leva à Biblioteca; o curso em andamento fica no Início.
  await page.getByRole('button', { name: 'Início', exact: true }).click();
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

    // ── Cenário 3: as duas aulas são cópias do mesmo vídeo ──────────────────
    const groups = await waitFor(
      page,
      async () => {
        const found = await invoke(page, 'media.listDuplicateGroups', {});
        return found.length > 0 ? found : null;
      },
      180_000,
      'análise de duplicatas em segundo plano',
    );
    assert(groups.length === 1 && groups[0].kind === 'exact', 'grupo de cópias idênticas esperado');
    const probed = groups[0].members.every((member) => member.durationMs > 590_000);
    assert(probed, 'o probe deveria catalogar a duração real do vídeo');
    console.log('✓ cópias idênticas detectadas e duração catalogada pelo ffprobe');

    await page.reload();
    await dismissOnboarding(page);
    await page.getByTestId(`home-course-${courseId}`).click();
    const notice = page.getByTestId('watched-elsewhere');
    await notice.waitFor({ timeout: 30_000 });
    assert(/Já assistido em/.test((await notice.textContent()) ?? ''), 'aviso de duplicata ausente');
    await notice.getByRole('button', { name: 'Marcar como vista' }).click();
    const reused = await waitFor(
      page,
      async () => {
        const progress = await invoke(page, 'progress.getPlayback', { lessonId: skipped.id });
        return progress?.completedAt ? progress : null;
      },
      15_000,
      'conclusão reaproveitada da duplicata',
    );
    assert(reused.completionSource === 'duplicate', 'origem deveria ser "duplicate"');
    console.log('✓ conclusão reaproveitada da aula duplicada');

    // ── Cenário 4: busca no texto da legenda abre o vídeo no tempo do trecho ──
    await waitFor(
      page,
      async () => (await invoke(page, 'search.content', { text: 'ambiente' })).length > 0,
      60_000,
      'extração da legenda em segundo plano',
    );
    await page.getByRole('button', { name: 'Pesquisa', exact: true }).click();
    await page.getByLabel('Campo de pesquisa').fill('configuracao do ambiente');
    const hit = page.getByRole('button', { name: /Assistida · 01:15/ });
    await hit.waitFor({ timeout: 15_000 });
    await hit.click();
    await page.getByTestId('player-video').waitFor();
    const startedAt = await waitFor(
      page,
      () =>
        page.evaluate(() => {
          const video = /** @type {HTMLVideoElement | null} */ (
            document.querySelector('[data-testid="player-video"]')
          );
          return video && video.readyState >= 1 ? video.currentTime : null;
        }),
      30_000,
      'player aberto no trecho',
    );
    assert(Math.abs(startedAt - 75) < 3, `player deveria abrir em ~75s, abriu em ${startedAt}s`);
    console.log('✓ trecho da legenda encontrado sem acento e aberto no tempo exato');
    // A transcrição espera a reprodução parar (prioridade do player): pausa o vídeo.
    await page.evaluate(() => {
      /** @type {HTMLVideoElement | null} */ (
        document.querySelector('[data-testid="player-video"]')
      )?.pause();
    });

    // ── Cenário 5: transcrição local (Whisper) vira legenda e texto pesquisável ──
    const transcribed = await waitFor(
      page,
      async () => {
        const found = await invoke(page, 'search.content', { text: 'ambiente de producao' });
        return found.find((item) => item.sourceKind === 'transcript') ?? null;
      },
      600_000,
      'transcrição local da aula falada',
    );
    const speechLessonId = transcribed.lessonId;
    const speechTracks = await invoke(page, 'subtitles.forLesson', { lessonId: speechLessonId });
    assert(
      speechTracks.some((track) => track.generated && track.cues.length > 0),
      'a aula falada deveria ter uma legenda gerada',
    );
    await page.getByRole('button', { name: 'Pesquisa', exact: true }).click();
    await page.getByLabel('Campo de pesquisa').fill('ambiente de producao');
    await page.getByRole('button', { name: /Aula falada · / }).first().click();
    await page.getByTestId('player-video').waitFor();
    await page.getByRole('button', { name: /legendas e idiomas \(cc\)/i }).click();
    await page.getByText('Português (gerada automaticamente)').click();
    await page.evaluate(() => {
      const video = /** @type {HTMLVideoElement} */ (
        document.querySelector('[data-testid="player-video"]')
      );
      video.muted = true;
      video.currentTime = 2;
      void video.play();
    });
    const overlay = page.getByTestId('subtitles-display');
    await overlay.waitFor({ timeout: 15_000 });
    const shown = (await overlay.textContent()) ?? '';
    assert(/ambiente|aula/i.test(shown), `legenda gerada inesperada: "${shown}"`);
    console.log('✓ transcrição local exibida como legenda e encontrada pela busca:', shown);

    // ── Cenário 6: pergunta à biblioteca respondida pelo modelo local (RAG) ──
    await page.evaluate(() => {
      /** @type {HTMLVideoElement | null} */ (
        document.querySelector('[data-testid="player-video"]')
      )?.pause();
    });
    await page.getByRole('button', { name: 'Pesquisa', exact: true }).click();
    await page.getByLabel('Campo de pesquisa').fill('Como configurar o ambiente de produção?');
    await page.getByRole('button', { name: 'Perguntar à biblioteca' }).click();
    const answer = page.getByTestId('assistant-answer');
    await answer.waitFor({ timeout: 300_000 });
    await page
      .getByRole('button', { name: 'Parar' })
      .waitFor({ state: 'detached', timeout: 300_000 });
    const answerText = (await answer.textContent()) ?? '';
    assert(answerText.trim().length > 20, 'resposta do assistente vazia');
    assert(!/não encontrei/i.test(answerText), 'o assistente deveria encontrar a aula falada');
    console.log('✓ assistente local respondeu com base na biblioteca:', answerText.slice(0, 120));
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
