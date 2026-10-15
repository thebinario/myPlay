import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/common/Sidebar';
import { LibraryView } from './components/library/LibraryView';
import { CourseDetailsView } from './components/course/CourseDetailsView';
import { CourseEditorView } from './components/editor/CourseEditorView';
import { VideoPlayerView } from './components/player/VideoPlayerView';
import { MoviePlayerView } from './components/player/MoviePlayerView';
import { PdfViewer } from './components/pdf/PdfViewer';
import { HomeView } from './components/home/HomeView';
import { SearchView } from './components/search/SearchView';
import { NavigationTab, Course, Document, LibraryItem } from './types/library';
import {
  MOCK_LIBRARY,
  MOCK_MOVIES,
  mockLibraryService,
} from './services/mockData';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [items, setItems] = useState<LibraryItem[]>(() => MOCK_LIBRARY);

  const selectedCourse = selectedCourseId
    ? (items.find(i => i.id === selectedCourseId && i.type === 'course') as Course | undefined)
    : undefined;

  const docs = items.filter(i => i.type === 'document') as Document[];
  const selectedDoc = selectedDocId ? docs.find(d => d.id === selectedDocId) : undefined;

  const courses = items.filter(i => i.type === 'course') as Course[];
  const movies = items.filter(i => i.type === 'movie') as typeof MOCK_MOVIES;
  const selectedMovie = selectedMovieId
    ? movies.find(m => m.id === selectedMovieId)
    : undefined;

  // ── Navegação ──────────────────────────────────────────────────────────────
  const handleNavigate = (tab: NavigationTab) => {
    setCurrentTab(tab);
    if (!['course-details', 'editor', 'player', 'pdf-viewer'].includes(tab)) {
      setSelectedCourseId(null);
      setSelectedLessonId(null);
      setSelectedDocId(null);
      setSelectedMovieId(null);
    }
  };

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setCurrentTab('course-details');
  };

  const handleBackToLibrary = () => {
    setSelectedCourseId(null);
    setSelectedLessonId(null);
    setSelectedDocId(null);
    setSelectedMovieId(null);
    setCurrentTab('library');
  };

  const handleBackToHome = () => {
    setSelectedCourseId(null);
    setSelectedLessonId(null);
    setSelectedDocId(null);
    setSelectedMovieId(null);
    setCurrentTab('home');
  };

  const handlePlayLesson = (courseId: string, lessonId: string) => {
    setSelectedCourseId(courseId);
    setSelectedLessonId(lessonId);
    setCurrentTab('player');
  };

  const handleOpenMovie = (movieId: string) => {
    // Filmes abrem como player standalone (sem curso)
    setSelectedMovieId(movieId);
    setCurrentTab('player');
  };

  const handleEditCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setCurrentTab('editor');
  };

  const handleOpenDocument = (docId: string) => {
    setSelectedDocId(docId);
    setCurrentTab('pdf-viewer');
  };

  const handleSaveEditedCourse = (updatedCourse: Course) => {
    setItems(prev => prev.map(item => (item.id === updatedCourse.id ? { ...updatedCourse } : item)));
  };

  const handleToggleLesson = (courseId: string, lessonId: string) => {
    const updated = mockLibraryService.toggleLessonCompletion(courseId, lessonId);
    if (updated) {
      setItems(prev => prev.map(item => (item.id === courseId ? { ...updated } : item)));
    }
  };

  // Atalho global Ctrl+K / Cmd+K → abre pesquisa
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCurrentTab('search');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div
      className="app-container"
      style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#0D111B' }}
    >
      <Sidebar currentTab={currentTab} onNavigate={handleNavigate} />

      <main className="main-content" style={{ flex: 1, height: '100vh', overflowY: 'auto' }}>
        {currentTab === 'home' && (
          <HomeView
            courses={courses}
            movies={movies}
            documents={docs}
            onSelectCourse={handleSelectCourse}
            onOpenMovie={handleOpenMovie}
            onOpenDocument={handleOpenDocument}
            onExploreLibrary={() => handleNavigate('library')}
            onSearchOpen={() => handleNavigate('search')}
          />
        )}

        {currentTab === 'library' && (
          <LibraryView
            items={items}
            onSelectCourse={handleSelectCourse}
            onOpenDocument={handleOpenDocument}
          />
        )}

        {currentTab === 'search' && (
          <SearchView
            onOpenCourse={handleSelectCourse}
            onOpenLesson={handlePlayLesson}
            onOpenMovie={handleOpenMovie}
            onOpenDocument={handleOpenDocument}
          />
        )}

        {currentTab === 'course-details' && selectedCourse && (
          <CourseDetailsView
            course={selectedCourse}
            onBack={handleBackToLibrary}
            onToggleLesson={handleToggleLesson}
            onPlayLesson={handlePlayLesson}
            onEditCourse={handleEditCourse}
          />
        )}

        {currentTab === 'editor' && selectedCourse && (
          <CourseEditorView
            initialCourse={selectedCourse}
            onSave={handleSaveEditedCourse}
            onBack={() => setCurrentTab('course-details')}
          />
        )}

        {/* Player para aulas de cursos */}
        {currentTab === 'player' && selectedCourse && selectedLessonId && (
          <VideoPlayerView
            course={selectedCourse}
            initialLessonId={selectedLessonId}
            onBack={() => setCurrentTab('course-details')}
            onCompleteLesson={lessonId => handleToggleLesson(selectedCourse.id, lessonId)}
          />
        )}

        {/* Player para filmes standalone */}
        {currentTab === 'player' && selectedMovie && !selectedCourse && (
          <MoviePlayerView
            movie={selectedMovie}
            onBack={handleBackToHome}
          />
        )}

        {currentTab === 'pdf-viewer' && selectedDoc && (
          <PdfViewer
            document={selectedDoc}
            onBack={handleBackToHome}
          />
        )}

        {currentTab === 'settings' && (
          <div style={{ padding: '40px', color: '#94A3B8' }}>
            <h1 style={{ color: '#FFFFFF', fontSize: '24px', marginBottom: '12px' }}>
              Configurações
            </h1>
            <p>Gerenciamento de bibliotecas, pastas e preferências do sistema na entrega 4.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
