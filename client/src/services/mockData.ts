import { Course, Movie, Document, LibraryItem } from '../types/library';

export const MOCK_COURSES: Course[] = [
  {
    id: 'course-react-desktop',
    type: 'course',
    title: 'Arquitetura Desktop Moderna com Tauri & React',
    description: 'Aprenda a construir aplicativos desktop de alta performance utilizando React, TypeScript, Rust e Tauri com TDD e design minimalista.',
    category: 'Desenvolvimento',
    coverUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    totalDuration: 14400, // 4h
    progress: 45,
    tags: ['React', 'Tauri', 'TypeScript', 'Desktop'],
    createdAt: '2026-02-10T10:00:00Z',
    lastAccessedAt: '2026-10-14T19:30:00Z',
    modules: [
      {
        id: 'mod-1',
        courseId: 'course-react-desktop',
        title: 'Módulo 1: Fundamentos e Arquitetura',
        order: 1,
        lessons: [
          {
            id: 'les-1-1',
            moduleId: 'mod-1',
            title: '1.1 Visão Geral e Comparação com Electron',
            duration: 900, // 15m
            completed: true,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            order: 1,
            materials: [
              {
                id: 'mat-1',
                title: 'Apostila Arquitetura Tauri vs Electron.pdf',
                type: 'pdf',
                fileSize: '2.4 MB',
                url: '/materials/tauri-vs-electron.pdf'
              },
              {
                id: 'mat-2',
                title: 'Repositório de Exemplos e Boilerplate',
                type: 'code',
                url: 'https://github.com/example/tauri-starter'
              }
            ]
          },
          {
            id: 'les-1-2',
            moduleId: 'mod-1',
            title: '1.2 Configuração do Ambiente e Hot Reload',
            duration: 1200, // 20m
            completed: true,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            order: 2,
            materials: [
              {
                id: 'mat-3',
                title: 'Guia de Instalação no macOS e Linux.pdf',
                type: 'pdf',
                fileSize: '1.1 MB',
                url: '/materials/macos-linux-setup.pdf'
              }
            ]
          },
          {
            id: 'les-1-3',
            moduleId: 'mod-1',
            title: '1.3 IPC: Comunicação Frontend e Backend Seguro',
            duration: 1500, // 25m
            completed: false,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            order: 3,
            materials: [
              {
                id: 'mat-4',
                title: 'Diagrama de Fluxo de Mensagens IPC',
                type: 'note',
                url: '/materials/ipc-flow.md'
              }
            ]
          }
        ]
      },
      {
        id: 'mod-2',
        courseId: 'course-react-desktop',
        title: 'Módulo 2: Interface Minimalista e Design System',
        order: 2,
        lessons: [
          {
            id: 'les-2-1',
            moduleId: 'mod-2',
            title: '2.1 Paleta Escura #0D111B e Contraste Violeta #A594FF',
            duration: 1080, // 18m
            completed: false,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            order: 1,
            materials: [
              {
                id: 'mat-5',
                title: 'Tokens de Cores e Tipografia.pdf',
                type: 'pdf',
                fileSize: '850 KB',
                url: '/materials/design-tokens.pdf'
              }
            ]
          },
          {
            id: 'les-2-2',
            moduleId: 'mod-2',
            title: '2.2 Componentes Compactos e Sidebar de Alta Densidade',
            duration: 1320, // 22m
            completed: false,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
            order: 2,
            materials: []
          }
        ]
      }
    ]
  },
  {
    id: 'course-tdd-react',
    type: 'course',
    title: 'Testes Automatizados com Vitest & React Testing Library',
    description: 'Domine a metodologia TDD (Red, Green, Refactor) construindo aplicações reais e à prova de regressão.',
    category: 'Engenharia',
    coverUrl: 'https://images.unsplash.com/photo-1516116211227-bbc677464010?w=600&auto=format&fit=crop&q=80',
    totalDuration: 18000,
    progress: 75,
    tags: ['TDD', 'Vitest', 'Testing Library', 'Jest'],
    createdAt: '2026-01-15T08:00:00Z',
    lastAccessedAt: '2026-10-12T14:15:00Z',
    modules: [
      {
        id: 'mod-tdd-1',
        courseId: 'course-tdd-react',
        title: 'Módulo 1: O Ciclo Red-Green-Refactor',
        order: 1,
        lessons: [
          {
            id: 'les-tdd-1',
            moduleId: 'mod-tdd-1',
            title: '1.1 O mindset de testar comportamento vs implementação',
            duration: 1200,
            completed: true,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
            order: 1,
            materials: [
              {
                id: 'mat-tdd-1',
                title: 'Cheat Sheet Vitest.pdf',
                type: 'pdf',
                fileSize: '650 KB',
                url: '/materials/vitest-cheatsheet.pdf'
              }
            ]
          },
          {
            id: 'les-tdd-2',
            moduleId: 'mod-tdd-1',
            title: '1.2 Consultas semânticas: getByRole e getByText',
            duration: 1400,
            completed: true,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
            order: 2,
            materials: []
          }
        ]
      }
    ]
  },
  {
    id: 'course-ui-ux',
    type: 'course',
    title: 'Design System Escuro & Microinterações',
    description: 'Criação de interfaces premium com foco em legibilidade, contraste e feedback tátil em desktops.',
    category: 'Design',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    totalDuration: 10800,
    progress: 0,
    tags: ['UI/UX', 'Figma', 'CSS', 'Design System'],
    createdAt: '2026-03-01T12:00:00Z',
    modules: [
      {
        id: 'mod-ui-1',
        courseId: 'course-ui-ux',
        title: 'Módulo 1: Fundações de Cores e Tokens',
        order: 1,
        lessons: [
          {
            id: 'les-ui-1',
            moduleId: 'mod-ui-1',
            title: '1.1 O papel do preto puro vs superfícies escuras',
            duration: 900,
            completed: false,
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
            order: 1,
            materials: []
          }
        ]
      }
    ]
  }
];

export const MOCK_MOVIES: Movie[] = [
  {
    id: 'movie-open-source',
    type: 'movie',
    title: 'The Code: A História do Software Livre',
    description: 'Documentário cinematográfico sobre a revolução do código aberto e a evolução dos sistemas operacionais.',
    category: 'Documentário',
    coverUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    duration: 5400, // 1h 30m
    progress: 30,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    tags: ['Linux', 'Open Source', 'História'],
    createdAt: '2026-01-20T18:00:00Z'
  },
  {
    id: 'movie-future-ai',
    type: 'movie',
    title: 'Fronteiras da Computação',
    description: 'Exploração dos avanços em hardware neural e arquiteturas modernas de processamento local.',
    category: 'Tecnologia',
    coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
    duration: 6200,
    progress: 0,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
    tags: ['AI', 'Hardware', 'Inovação'],
    createdAt: '2026-02-05T20:00:00Z'
  }
];

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'doc-clean-architecture',
    type: 'document',
    title: 'Clean Architecture para Aplicações Frontend.pdf',
    description: 'Guia de desacoplamento, inversão de controle e estruturação de serviços independentes.',
    category: 'Livros',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    totalPages: 120,
    lastReadPage: 34,
    fileUrl: '/materials/clean-architecture.pdf',
    tags: ['Arquitetura', 'Clean Code'],
    createdAt: '2026-01-10T11:00:00Z'
  },
  {
    id: 'doc-tauri-spec',
    type: 'document',
    title: 'Tauri Security Principles & Capabilities.pdf',
    description: 'Documento de especificação de segurança e sandbox para desenvolvimento em Tauri v2.',
    category: 'Manuais',
    coverUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
    totalPages: 48,
    lastReadPage: 12,
    fileUrl: '/materials/tauri-spec.pdf',
    tags: ['Segurança', 'Tauri', 'Rust'],
    createdAt: '2026-02-18T15:30:00Z'
  }
];

export const MOCK_LIBRARY: LibraryItem[] = [
  ...MOCK_COURSES,
  ...MOCK_MOVIES,
  ...MOCK_DOCUMENTS
];

export class MockLibraryService {
  private items: LibraryItem[] = JSON.parse(JSON.stringify(MOCK_LIBRARY));

  getItems(type: 'all' | 'course' | 'movie' | 'document' = 'all'): LibraryItem[] {
    if (type === 'all') return this.items;
    return this.items.filter(item => item.type === type);
  }

  getCourseById(id: string): Course | undefined {
    const item = this.items.find(i => i.id === id && i.type === 'course');
    return item as Course | undefined;
  }

  toggleLessonCompletion(courseId: string, lessonId: string): Course | undefined {
    const course = this.getCourseById(courseId);
    if (!course) return undefined;

    let totalLessons = 0;
    let completedLessons = 0;

    course.modules.forEach(module => {
      module.lessons.forEach(lesson => {
        if (lesson.id === lessonId) {
          lesson.completed = !lesson.completed;
        }
        totalLessons += 1;
        if (lesson.completed) {
          completedLessons += 1;
        }
      });
    });

    course.progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    return course;
  }

  searchItems(query: string, type: 'all' | 'course' | 'movie' | 'document' = 'all'): LibraryItem[] {
    const lower = query.toLowerCase().trim();
    const baseItems = this.getItems(type);
    if (!lower) return baseItems;

    return baseItems.filter(item => {
      const matchTitle = item.title.toLowerCase().includes(lower);
      const matchDesc = item.description.toLowerCase().includes(lower);
      const matchCategory = item.category.toLowerCase().includes(lower);
      const matchTags = item.tags.some(t => t.toLowerCase().includes(lower));
      return matchTitle || matchDesc || matchCategory || matchTags;
    });
  }
}

export const mockLibraryService = new MockLibraryService();
