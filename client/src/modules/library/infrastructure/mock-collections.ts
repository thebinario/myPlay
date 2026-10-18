import type {
  Course,
  CourseModule,
  CourseSection,
  Document,
  Lesson,
  Material,
} from '@/core/domain/library';
import {
  Collection,
  collectionProgress,
  collectionTotalDuration,
  countCourseDocuments,
  courseProgress,
  courseTotalDuration,
} from '@/core/domain/collection';

/**
 * Fixtures que simulam estruturas de pasta reais e heterogêneas (profundidade
 * variável, aulas como pasta ou arquivo, materiais só com PDF, várias
 * codificações do mesmo vídeo). Espelham o path analisado em
 * `docs/HIERARCHY.md` e alimentam UI/Storybook antes da ligação real por IPC.
 *
 * Cobrem as formas relevantes: coleções com **um** e com **vários** cursos,
 * cursos **com seções** e **sem seções** (módulos diretos), e cursos **só com
 * PDFs** (sem vídeos).
 *
 * Hierarquia: `Coleção → Curso → Seção → Módulo → Aula/Conteúdo`.
 */

const CREATED_AT = '2026-01-01T00:00:00.000Z';
const SOURCE_ID = 'demo-courses';

const VIDEOS = {
  bunny: '/media/videos/big-buck-bunny.mp4',
  tears: '/media/videos/tears-of-steel.mp4',
  sintel: '/media/videos/sintel.mp4',
} as const;

type LessonSeed = Omit<Lesson, 'moduleId' | 'order'>;

let materialSeq = 0;

function mat(title: string, file: string, fileSize: string): Material {
  materialSeq += 1;
  return {
    id: `mat-${materialSeq}`,
    title,
    type: 'pdf',
    fileSize,
    url: `/media/docs/${file}`,
  };
}

function pdf(
  id: string,
  title: string,
  totalPages: number,
  file: string,
  lastReadPage = 0,
): Document {
  return {
    id,
    type: 'document',
    title,
    description: title,
    category: 'Material',
    totalPages,
    lastReadPage,
    fileUrl: `/media/docs/${file}`,
    tags: ['PDF'],
    createdAt: CREATED_AT,
  };
}

function lesson(
  id: string,
  title: string,
  videoUrl: string,
  duration: number,
  completed: boolean,
  materials: Material[] = [],
): LessonSeed {
  return { id, title, videoUrl, duration, completed, materials };
}

function buildModule(params: {
  id: string;
  courseId: string;
  sectionId?: string;
  title: string;
  order: number;
  lessons: LessonSeed[];
  documents?: Document[];
}): CourseModule {
  return {
    id: params.id,
    courseId: params.courseId,
    ...(params.sectionId ? { sectionId: params.sectionId } : {}),
    title: params.title,
    order: params.order,
    lessons: params.lessons.map((seed, index) => ({
      ...seed,
      moduleId: params.id,
      order: index + 1,
    })),
    documents: params.documents ?? [],
  };
}

function section(params: {
  id: string;
  courseId: string;
  title: string;
  order: number;
  modules: CourseModule[];
}): CourseSection {
  return params;
}

function buildCourse(params: {
  id: string;
  title: string;
  description: string;
  category: string;
  provider: string;
  collectionId: string;
  coverUrl: string;
  tags: string[];
  /** Curso organizado em seções → módulos (estrutura de pasta com agrupamentos). */
  sections?: CourseSection[];
  /** Curso sem seções: módulos diretos (seção implícita colapsada). */
  modules?: CourseModule[];
  /** Documentos no nível do curso (PDFs sem módulo correspondente). */
  documents?: Document[];
  lastAccessedAt: string;
}): Course {
  const modules = params.sections
    ? params.sections.flatMap((item) => item.modules)
    : (params.modules ?? []);
  const base: Course = {
    id: params.id,
    sourceId: SOURCE_ID,
    type: 'course',
    title: params.title,
    description: params.description,
    category: params.category,
    provider: params.provider,
    collectionId: params.collectionId,
    coverUrl: params.coverUrl,
    totalDuration: 0,
    progress: 0,
    pdfCount: 0,
    documents: params.documents ?? [],
    modules,
    ...(params.sections ? { sections: params.sections } : {}),
    tags: params.tags,
    createdAt: CREATED_AT,
    lastAccessedAt: params.lastAccessedAt,
  };
  return {
    ...base,
    totalDuration: courseTotalDuration(base),
    progress: courseProgress(base),
    pdfCount: countCourseDocuments(base),
  };
}

function buildCollection(
  params: Omit<Collection, 'type' | 'courseCount' | 'totalDuration' | 'progress'>,
): Collection {
  const base: Collection = {
    ...params,
    type: 'collection',
    courseCount: params.courses.length,
    totalDuration: 0,
    progress: 0,
  };
  return {
    ...base,
    totalDuration: collectionTotalDuration(base),
    progress: collectionProgress(base),
  };
}

// ─── Coleção 01 - Tecnologia ─────────────────────────────────────────────────

const COL_TEC = 'col-tecnologia';
const COURSE_LOGICA = 'course-logica';
const COURSE_HTML_CSS = 'course-html-css';

const logica = buildCourse({
  id: COURSE_LOGICA,
  title: 'Curso 01 - Lógica de Programação',
  description: 'Fundamentos de lógica e algoritmos com aulas gravadas e apostilas.',
  category: 'Programação Front-end',
  provider: 'Udemy',
  collectionId: COL_TEC,
  coverUrl:
    'https://images.unsplash.com/photo-1516116211227-bbc677464010?w=600&auto=format&fit=crop&q=80',
  tags: ['Programação Front-end', 'Udemy', 'Lógica'],
  lastAccessedAt: '2026-10-10T18:00:00Z',
  sections: [
    section({
      id: 'sec-logica-aulas',
      courseId: COURSE_LOGICA,
      title: 'Aulas',
      order: 1,
      modules: [
        buildModule({
          id: 'mod-logica-aulas',
          courseId: COURSE_LOGICA,
          sectionId: 'sec-logica-aulas',
          title: 'Aulas',
          order: 1,
          lessons: [
            lesson('les-logica-1', 'Aula 01 - Vídeo', VIDEOS.bunny, 720, true),
            lesson('les-logica-2', 'Aula 02 - Vídeo', VIDEOS.tears, 540, true),
            lesson('les-logica-3', 'Aula 03 - Vídeo', VIDEOS.sintel, 600, false),
            lesson('les-logica-4', 'Aula 04 - Gravação da Aula', VIDEOS.bunny, 900, false),
            lesson('les-logica-5', 'Aula 05 - Gravação da Aula', VIDEOS.tears, 880, false),
          ],
        }),
      ],
    }),
    section({
      id: 'sec-logica-materiais',
      courseId: COURSE_LOGICA,
      title: 'Materiais',
      order: 2,
      modules: [
        buildModule({
          id: 'mod-logica-apostilas',
          courseId: COURSE_LOGICA,
          sectionId: 'sec-logica-materiais',
          title: 'Apostilas',
          order: 1,
          lessons: [],
          documents: [
            pdf('doc-logica-intro', 'Apostila 01 - Introdução.pdf', 24, 'think-python.pdf', 24),
            pdf('doc-logica-exerc', 'Apostila 02 - Exercícios Práticos.pdf', 18, 'think-stats.pdf'),
            pdf('doc-logica-guia', 'Apostila 04 - Guia de Estudo.pdf', 32, 'pro-git.pdf'),
          ],
        }),
      ],
    }),
  ],
});

const htmlCss = buildCourse({
  id: COURSE_HTML_CSS,
  title: 'Curso 02 - HTML e CSS com Projeto',
  description: 'Do zero ao projeto final, com módulos práticos e materiais de apoio.',
  category: 'Programação Front-end',
  provider: 'Alura',
  collectionId: COL_TEC,
  coverUrl:
    'https://images.unsplash.com/photo-1547658719-da2b51169166?w=600&auto=format&fit=crop&q=80',
  tags: ['Programação Front-end', 'Alura', 'HTML', 'CSS'],
  lastAccessedAt: '2026-10-08T14:30:00Z',
  sections: [
    section({
      id: 'sec-html-fundamentos',
      courseId: COURSE_HTML_CSS,
      title: '01 - Fundamentos',
      order: 1,
      modules: [
        buildModule({
          id: 'mod-html-conceitos',
          courseId: COURSE_HTML_CSS,
          sectionId: 'sec-html-fundamentos',
          title: 'Módulo 01 - Conceitos',
          order: 1,
          lessons: [
            lesson('les-html-c1', 'Aula 01 - Apresentação', VIDEOS.tears, 600, true, [
              mat('Apostila 01 - Introdução.pdf', 'think-python.pdf', '1.2 MB'),
            ]),
            lesson(
              'les-html-c2',
              'Aula 02 - Exercícios',
              '/media/videos/big-buck-bunny.mp4',
              420,
              true,
              [
                mat('Apostila 02 - Exercícios Práticos.pdf', 'think-stats.pdf', '0.9 MB'),
                mat('Apostila 03 - Material Complementar.pdf', 'pro-git.pdf', '1.5 MB'),
              ],
            ),
          ],
        }),
        buildModule({
          id: 'mod-html-pratica',
          courseId: COURSE_HTML_CSS,
          sectionId: 'sec-html-fundamentos',
          title: 'Módulo 02 - Prática',
          order: 2,
          lessons: [
            lesson('les-html-p1', 'Aula 01 - Prática Guiada', VIDEOS.sintel, 660, false, [
              mat('Apostila 01 - Introdução.pdf', 'think-python.pdf', '1.2 MB'),
            ]),
            lesson('les-html-p2', 'Aula 02 - Exercícios', VIDEOS.bunny, 400, false, [
              mat('Apostila 02 - Exercícios Práticos.pdf', 'think-stats.pdf', '0.9 MB'),
            ]),
          ],
        }),
      ],
    }),
    section({
      id: 'sec-html-projeto',
      courseId: COURSE_HTML_CSS,
      title: '02 - Projeto Final',
      order: 2,
      modules: [
        buildModule({
          id: 'mod-html-revisao',
          courseId: COURSE_HTML_CSS,
          sectionId: 'sec-html-projeto',
          title: 'Módulo 01 - Revisão',
          order: 1,
          lessons: [
            lesson('les-html-r1', 'Aula 01 - Revisão Geral', VIDEOS.bunny, 540, false, [
              mat('Apostila 03 - Material Complementar.pdf', 'pro-git.pdf', '1.5 MB'),
              mat('Apostila 04 - Guia de Estudo.pdf', 'think-stats.pdf', '1.1 MB'),
              mat('Apostila 05 - Resumo.pdf', 'think-python.pdf', '0.7 MB'),
            ]),
          ],
        }),
        buildModule({
          id: 'mod-html-entrega',
          courseId: COURSE_HTML_CSS,
          sectionId: 'sec-html-projeto',
          title: 'Módulo 02 - Entrega',
          order: 2,
          lessons: [
            lesson('les-html-e1', 'Aula 01 - Entrega do Projeto', VIDEOS.tears, 480, false, [
              mat('Apostila 01 - Introdução.pdf', 'think-python.pdf', '1.2 MB'),
              mat('Apostila 02 - Exercícios Práticos.pdf', 'think-stats.pdf', '0.9 MB'),
              mat('Apostila 03 - Material Complementar.pdf', 'pro-git.pdf', '1.5 MB'),
            ]),
          ],
        }),
      ],
    }),
    section({
      id: 'sec-html-aovivo',
      courseId: COURSE_HTML_CSS,
      title: '03 - Ao Vivo',
      order: 3,
      modules: [
        buildModule({
          id: 'mod-html-aovivo',
          courseId: COURSE_HTML_CSS,
          sectionId: 'sec-html-aovivo',
          title: 'Aulas',
          order: 1,
          lessons: [lesson('les-html-live', 'Aula 03 - Vídeo', VIDEOS.sintel, 620, false)],
          documents: [pdf('doc-html-resumo', 'Apostila 05 - Resumo.pdf', 12, 'think-python.pdf')],
        }),
      ],
    }),
  ],
});

// ─── Coleção 02 - Negócios e Criativo ────────────────────────────────────────

const COL_NEG = 'col-negocios';
const COURSE_DESIGN = 'course-design';
const COURSE_MARKETING = 'course-marketing';

const design = buildCourse({
  id: COURSE_DESIGN,
  title: 'Curso 04 - Design Gráfico',
  description: 'Princípios de design, prática guiada e projeto de encerramento.',
  category: 'Design',
  provider: 'Domestika',
  collectionId: COL_NEG,
  coverUrl:
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
  tags: ['Design', 'Domestika'],
  lastAccessedAt: '2026-10-05T09:15:00Z',
  sections: [
    section({
      id: 'sec-design-aovivo',
      courseId: COURSE_DESIGN,
      title: 'Ao Vivo',
      order: 1,
      modules: [
        buildModule({
          id: 'mod-design-aovivo',
          courseId: COURSE_DESIGN,
          sectionId: 'sec-design-aovivo',
          title: 'Aulas',
          order: 1,
          lessons: [lesson('les-design-live', 'Aula 03 - Vídeo', VIDEOS.bunny, 620, false)],
          documents: [pdf('doc-design-resumo', 'Apostila 05 - Resumo.pdf', 14, 'think-python.pdf')],
        }),
      ],
    }),
    section({
      id: 'sec-design-semana1',
      courseId: COURSE_DESIGN,
      title: 'Semana 01',
      order: 2,
      modules: [
        buildModule({
          id: 'mod-design-u1',
          courseId: COURSE_DESIGN,
          sectionId: 'sec-design-semana1',
          title: 'Unidade 01 - Fundamentos',
          order: 1,
          lessons: [
            lesson('les-design-1', 'Aula 01 - Apresentação', VIDEOS.tears, 600, true, [
              mat('Apostila 01 - Introdução.pdf', 'think-python.pdf', '1.2 MB'),
            ]),
            lesson('les-design-2', 'Aula 02 - Exercícios', VIDEOS.sintel, 420, true, [
              mat('Apostila 02 - Exercícios Práticos.pdf', 'think-stats.pdf', '0.9 MB'),
            ]),
          ],
        }),
        buildModule({
          id: 'mod-design-u2',
          courseId: COURSE_DESIGN,
          sectionId: 'sec-design-semana1',
          title: 'Unidade 02 - Prática',
          order: 2,
          lessons: [
            lesson('les-design-3', 'Aula 01 - Prática Guiada', VIDEOS.bunny, 660, false, [
              mat('Apostila 01 - Introdução.pdf', 'think-python.pdf', '1.2 MB'),
            ]),
            lesson('les-design-4', 'Aula 02 - Exercícios', VIDEOS.tears, 400, false),
          ],
        }),
      ],
    }),
    section({
      id: 'sec-design-semana2',
      courseId: COURSE_DESIGN,
      title: 'Semana 02',
      order: 3,
      modules: [
        buildModule({
          id: 'mod-design-r1',
          courseId: COURSE_DESIGN,
          sectionId: 'sec-design-semana2',
          title: 'Unidade 01 - Revisão',
          order: 1,
          lessons: [
            lesson('les-design-5', 'Aula 01 - Revisão Geral', VIDEOS.sintel, 540, false, [
              mat('Apostila 03 - Material Complementar.pdf', 'pro-git.pdf', '1.5 MB'),
            ]),
          ],
        }),
        buildModule({
          id: 'mod-design-r2',
          courseId: COURSE_DESIGN,
          sectionId: 'sec-design-semana2',
          title: 'Unidade 02 - Entrega',
          order: 2,
          lessons: [
            lesson('les-design-6', 'Aula 01 - Entrega do Projeto', VIDEOS.bunny, 480, false, [
              mat('Apostila 04 - Guia de Estudo.pdf', 'think-stats.pdf', '1.1 MB'),
            ]),
          ],
        }),
      ],
    }),
  ],
});

const marketing = buildCourse({
  id: COURSE_MARKETING,
  title: 'Curso 03 - Boas Práticas de Marketing',
  description: 'Introdução, conteúdo prático e considerações finais.',
  category: 'Marketing Digital',
  provider: 'Hotmart',
  collectionId: COL_NEG,
  coverUrl:
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
  tags: ['Marketing Digital', 'Hotmart'],
  lastAccessedAt: '2026-09-28T20:00:00Z',
  sections: [
    section({
      id: 'sec-mkt-intro',
      courseId: COURSE_MARKETING,
      title: '01 - Introdução',
      order: 1,
      modules: [
        buildModule({
          id: 'mod-mkt-intro',
          courseId: COURSE_MARKETING,
          sectionId: 'sec-mkt-intro',
          title: 'Aulas',
          order: 1,
          lessons: [
            lesson('les-mkt-1', 'Aula 01 - Boas-vindas', VIDEOS.bunny, 300, true, [
              mat('Apostila 01 - Introdução.pdf', 'think-python.pdf', '1.2 MB'),
            ]),
          ],
        }),
      ],
    }),
    section({
      id: 'sec-mkt-conteudo',
      courseId: COURSE_MARKETING,
      title: '02 - Conteúdo',
      order: 2,
      modules: [
        buildModule({
          id: 'mod-mkt-conteudo',
          courseId: COURSE_MARKETING,
          sectionId: 'sec-mkt-conteudo',
          title: 'Aulas',
          order: 1,
          lessons: [
            lesson('les-mkt-2', 'Aula 01 - Aula Prática', VIDEOS.tears, 720, false, [
              mat('Apostila 02 - Exercícios Práticos.pdf', 'think-stats.pdf', '0.9 MB'),
            ]),
          ],
        }),
      ],
    }),
    section({
      id: 'sec-mkt-encerramento',
      courseId: COURSE_MARKETING,
      title: '03 - Encerramento',
      order: 3,
      modules: [
        buildModule({
          id: 'mod-mkt-encerramento',
          courseId: COURSE_MARKETING,
          sectionId: 'sec-mkt-encerramento',
          title: 'Aulas',
          order: 1,
          lessons: [
            lesson('les-mkt-3', 'Aula 01 - Considerações Finais', VIDEOS.sintel, 360, false, [
              mat('Apostila 04 - Guia de Estudo.pdf', 'think-stats.pdf', '1.1 MB'),
              mat('Apostila 05 - Resumo.pdf', 'think-python.pdf', '0.7 MB'),
            ]),
          ],
        }),
      ],
    }),
  ],
});

// ─── Coleção 03 - Curso Único (uma única pasta de curso) ─────────────────────

const COL_UNICO = 'col-curso-unico';
const COURSE_UNICO = 'course-unico';

const cursoUnico = buildCourse({
  id: COURSE_UNICO,
  title: 'Curso 05 - Design de Interfaces',
  description: 'Coleção com um único curso, organizado em seções e módulos.',
  category: 'Design',
  provider: 'Domestika',
  collectionId: COL_UNICO,
  coverUrl:
    'https://images.unsplash.com/photo-1541462608143-67571c6738dd?w=600&auto=format&fit=crop&q=80',
  tags: ['Design', 'Domestika'],
  lastAccessedAt: '2026-10-12T11:00:00Z',
  sections: [
    section({
      id: 'sec-unico-fundamentos',
      courseId: COURSE_UNICO,
      title: '01 - Fundamentos',
      order: 1,
      modules: [
        buildModule({
          id: 'mod-unico-conceitos',
          courseId: COURSE_UNICO,
          sectionId: 'sec-unico-fundamentos',
          title: 'Módulo 01 - Conceitos',
          order: 1,
          lessons: [
            lesson('les-unico-1', 'Aula 01 - Introdução', VIDEOS.sintel, 540, true, [
              mat('Apostila 01 - Introdução.pdf', 'think-python.pdf', '1.1 MB'),
            ]),
            lesson('les-unico-2', 'Aula 02 - Exercícios', VIDEOS.bunny, 480, false),
          ],
          documents: [pdf('doc-unico-guia', 'Apostila 02 - Guia.pdf', 20, 'pro-git.pdf')],
        }),
      ],
    }),
    section({
      id: 'sec-unico-pratica',
      courseId: COURSE_UNICO,
      title: '02 - Prática',
      order: 2,
      modules: [
        buildModule({
          id: 'mod-unico-projeto',
          courseId: COURSE_UNICO,
          sectionId: 'sec-unico-pratica',
          title: 'Módulo 01 - Projeto',
          order: 1,
          lessons: [
            lesson('les-unico-3', 'Aula 01 - Projeto Guiado', VIDEOS.tears, 900, false, [
              mat('Apostila 03 - Projeto.pdf', 'think-stats.pdf', '2.0 MB'),
            ]),
          ],
        }),
      ],
    }),
  ],
});

// ─── Coleção 04 - Formatos Alternativos (sem seções / só PDF) ────────────────

const COL_FORMATOS = 'col-formatos';
const COURSE_SEM_SECAO = 'course-sem-secao';
const COURSE_SO_PDF = 'course-so-pdf';

const semSecao = buildCourse({
  id: COURSE_SEM_SECAO,
  title: 'Curso 06 - Módulos sem Seção',
  description: 'Estrutura rasa: módulos direto sob o curso, sem seções intermediárias.',
  category: 'Programação Front-end',
  provider: 'Alura',
  collectionId: COL_FORMATOS,
  coverUrl:
    'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=600&auto=format&fit=crop&q=80',
  tags: ['Programação Front-end', 'Alura'],
  lastAccessedAt: '2026-10-11T08:00:00Z',
  modules: [
    buildModule({
      id: 'mod-ssecao-intro',
      courseId: COURSE_SEM_SECAO,
      title: 'Módulo 01 - Introdução',
      order: 1,
      lessons: [
        lesson('les-ssecao-1', 'Aula 01 - Boas-vindas', VIDEOS.bunny, 360, true),
        lesson('les-ssecao-2', 'Aula 02 - Conceitos', VIDEOS.sintel, 480, false),
      ],
      documents: [
        pdf('doc-ssecao-apostila', 'Apostila 01 - Introdução.pdf', 16, 'think-python.pdf'),
      ],
    }),
    buildModule({
      id: 'mod-ssecao-avancado',
      courseId: COURSE_SEM_SECAO,
      title: 'Módulo 02 - Avançado',
      order: 2,
      lessons: [lesson('les-ssecao-3', 'Aula 01 - Avançado', VIDEOS.tears, 660, false)],
      documents: [pdf('doc-ssecao-exerc', 'Apostila 02 - Exercícios.pdf', 22, 'think-stats.pdf')],
    }),
  ],
});

const soPdf = buildCourse({
  id: COURSE_SO_PDF,
  title: 'Curso 07 - Apostilas e Materiais',
  description: 'Curso sem vídeos: apenas PDFs de estudo, no módulo e no nível do curso.',
  category: 'Materiais',
  provider: 'Hotmart',
  collectionId: COL_FORMATOS,
  coverUrl:
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&auto=format&fit=crop&q=80',
  tags: ['Materiais', 'Hotmart'],
  lastAccessedAt: '2026-10-09T16:00:00Z',
  modules: [
    buildModule({
      id: 'mod-pdf-apostilas',
      courseId: COURSE_SO_PDF,
      title: 'Apostilas',
      order: 1,
      lessons: [],
      documents: [
        pdf('doc-pdf-1', 'Apostila 01 - Fundamentos.pdf', 30, 'think-python.pdf', 30),
        pdf('doc-pdf-2', 'Apostila 02 - Exercícios.pdf', 18, 'think-stats.pdf', 5),
      ],
    }),
  ],
  documents: [pdf('doc-pdf-extra', 'Guia Rápido.pdf', 8, 'pro-git.pdf')],
});

export const MOCK_COLLECTIONS: Collection[] = [
  buildCollection({
    id: COL_TEC,
    sourceId: SOURCE_ID,
    title: 'Coleção 01 - Tecnologia',
    description: 'Cursos de programação front-end de diferentes plataformas.',
    tags: ['Tecnologia'],
    createdAt: CREATED_AT,
    courses: [logica, htmlCss],
  }),
  buildCollection({
    id: COL_NEG,
    sourceId: SOURCE_ID,
    title: 'Coleção 02 - Negócios e Criativo',
    description: 'Design e marketing digital.',
    tags: ['Negócios', 'Criativo'],
    createdAt: CREATED_AT,
    courses: [design, marketing],
  }),
  buildCollection({
    id: COL_UNICO,
    sourceId: SOURCE_ID,
    title: 'Coleção 03 - Curso Único',
    description: 'Coleção com um único curso: os módulos são exibidos direto.',
    tags: ['Design'],
    createdAt: CREATED_AT,
    courses: [cursoUnico],
  }),
  buildCollection({
    id: COL_FORMATOS,
    sourceId: SOURCE_ID,
    title: 'Coleção 04 - Formatos Alternativos',
    description: 'Cursos sem seções (módulos diretos) e cursos só com PDFs.',
    tags: ['Formatos'],
    createdAt: CREATED_AT,
    courses: [semSecao, soPdf],
  }),
];

/** Cursos achatados de todas as coleções (atalho para consumidores). */
export const MOCK_COLLECTION_COURSES: Course[] = MOCK_COLLECTIONS.flatMap(
  (collection) => collection.courses,
);
