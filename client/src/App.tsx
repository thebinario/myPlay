import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/common/Sidebar';
import { LibraryView } from './components/library/LibraryView';
import { CourseDetailsView } from './components/course/CourseDetailsView';
import { CourseEditorView } from './components/editor/CourseEditorView';
import { VideoPlayerView } from './components/player/VideoPlayerView';
import { MoviePlayerView } from './components/player/MoviePlayerView';
import { MiniPlayer } from './components/player/MiniPlayer';
import { PdfViewer } from './components/pdf/PdfViewer';
import { HomeView } from './components/home/HomeView';
import { SearchView } from './components/search/SearchView';
import { SettingsView } from './components/settings/SettingsView';
import { NavigationTab, Course } from './types/library';
import { useLibrary } from './services/LibraryContext';

type PlayerSnapshot = { currentTime: number; isPlaying: boolean };

interface PlaybackSession {
  kind: 'lesson' | 'movie';
  courseId?: string;
  lessonId?: string;
  movieId?: string;
  time: number;
  isPlaying: boolean;
}

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

  // Catálogo: fonte única de verdade (repositório + assinatura de mudanças)
  const { repository, items, courses, movies, documents } = useLibrary();
  const docs = documents;

  // Sessão de reprodução ativa (tela cheia) e seu estado minimizado (mini player)
  const [session, setSession] = useState<PlaybackSession | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  // Posição de retomada transitória aplicada à tela cheia ao expandir o mini player.
  const [resumeTime, setResumeTime] = useState<number | undefined>(undefined);
  const playerSnapshotRef = useRef<PlayerSnapshot>({ currentTime: 0, isPlaying: false });
  const handlePlayerProgress = useCallback((snapshot: PlayerSnapshot) => {
    playerSnapshotRef.current = snapshot;
  }, []);

  // Consome a posição de retomada apenas no primeiro render da tela cheia
  useEffect(() => {
    if (currentTab === 'player' && resumeTime !== undefined) {
      const id = window.setTimeout(() => setResumeTime(undefined), 0);
      return () => window.clearTimeout(id);
    }
  }, [currentTab, resumeTime]);

  const selectedCourse = selectedCourseId
    ? (items.find((i) => i.id === selectedCourseId && i.type === 'course') as Course | undefined)
    : undefined;

  const selectedDoc = selectedDocId ? docs.find((d) => d.id === selectedDocId) : undefined;

  const selectedMovie = selectedMovieId ? movies.find((m) => m.id === selectedMovieId) : undefined;

  // ── Mídia exibida no mini player ─────────────────────────────────────────────
  const miniCourse = session?.courseId
    ? (items.find((i) => i.id === session.courseId && i.type === 'course') as Course | undefined)
    : undefined;
  const miniMovie = session?.movieId ? movies.find((m) => m.id === session.movieId) : undefined;
  const miniLesson =
    miniCourse && session?.lessonId
      ? miniCourse.modules.flatMap((m) => m.lessons).find((l) => l.id === session.lessonId)
      : undefined;
  const showMiniPlayer = !!session && isMinimized && !!(miniLesson || miniMovie);

  const minimizeActiveSession = useCallback(() => {
    const snapshot = playerSnapshotRef.current;
    setSession((prev) =>
      prev ? { ...prev, time: snapshot.currentTime, isPlaying: snapshot.isPlaying } : prev,
    );
    setIsMinimized(true);
  }, []);

  // ── Navegação ──────────────────────────────────────────────────────────────
  const handleNavigate = (tab: NavigationTab) => {
    // Sair da tela do player minimiza a reprodução (continua no mini player)
    if (currentTab === 'player' && session) {
      minimizeActiveSession();
    }
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
    const course = items.find((i) => i.id === courseId && i.type === 'course') as
      Course | undefined;
    const lesson = course?.modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
    const time = lesson
      ? repository.getPlaybackPosition(courseId, lessonId) || lesson.lastPlaybackPosition || 0
      : 0;
    setSelectedCourseId(courseId);
    setSelectedLessonId(lessonId);
    setSelectedMovieId(null);
    setSession({ kind: 'lesson', courseId, lessonId, time, isPlaying: false });
    setResumeTime(undefined);
    setIsMinimized(false);
    setCurrentTab('player');
  };

  const handleOpenMovie = (movieId: string) => {
    // Filmes abrem como player standalone (sem curso)
    const movie = movies.find((m) => m.id === movieId);
    const time = movie ? Math.floor((movie.progress / 100) * (movie.duration || 1)) : 0;
    setSelectedMovieId(movieId);
    setSelectedCourseId(null);
    setSelectedLessonId(null);
    setSession({ kind: 'movie', movieId, time, isPlaying: false });
    setResumeTime(undefined);
    setIsMinimized(false);
    setCurrentTab('player');
  };

  // Voltar do player → minimiza em vez de encerrar a reprodução
  const handleBackFromLessonPlayer = () => {
    minimizeActiveSession();
    setCurrentTab('course-details');
  };

  const handleBackFromMoviePlayer = () => {
    minimizeActiveSession();
    setCurrentTab('home');
  };

  // Clique no mini player → restaura a tela cheia retomando a posição
  const handleExpandMiniPlayer = () => {
    if (!session) return;
    const snapshot = playerSnapshotRef.current;
    setSession({ ...session, time: snapshot.currentTime, isPlaying: snapshot.isPlaying });
    setResumeTime(snapshot.currentTime);
    if (session.kind === 'lesson' && session.courseId && session.lessonId) {
      setSelectedCourseId(session.courseId);
      setSelectedLessonId(session.lessonId);
      setSelectedMovieId(null);
    } else if (session.movieId) {
      setSelectedMovieId(session.movieId);
      setSelectedCourseId(null);
      setSelectedLessonId(null);
    }
    setIsMinimized(false);
    setCurrentTab('player');
  };

  const handleCloseMiniPlayer = () => {
    setSession(null);
    setResumeTime(undefined);
    setIsMinimized(false);
  };

  const handleEditCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setCurrentTab('editor');
  };

  const handleOpenDocument = (docId: string) => {
    setSelectedDocId(docId);
    setCurrentTab('pdf-viewer');
  };

  const handleSaveEditedCourse = (_updatedCourse: Course) => {
    // O catálogo é atualizado pelo repositório (emit) e reflete via useLibrary().
  };

  const handleToggleLesson = (courseId: string, lessonId: string) => {
    repository.toggleLessonCompletion(courseId, lessonId);
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
            onBack={handleBackFromLessonPlayer}
            onCompleteLesson={(lessonId) => handleToggleLesson(selectedCourse.id, lessonId)}
            resumeTime={resumeTime}
            autoPlay={session?.kind === 'lesson' ? session.isPlaying : false}
            onProgress={handlePlayerProgress}
          />
        )}

        {/* Player para filmes standalone */}
        {currentTab === 'player' && selectedMovie && !selectedCourse && (
          <MoviePlayerView
            movie={selectedMovie}
            onBack={handleBackFromMoviePlayer}
            resumeTime={resumeTime}
            autoPlay={session?.kind === 'movie' ? session.isPlaying : false}
            onProgress={handlePlayerProgress}
          />
        )}

        {currentTab === 'pdf-viewer' && selectedDoc && (
          <PdfViewer document={selectedDoc} onBack={handleBackToHome} />
        )}

        {currentTab === 'settings' && <SettingsView />}
      </main>

      {showMiniPlayer && miniLesson && (
        <MiniPlayer
          title={miniLesson.title}
          subtitle={miniCourse?.title}
          videoUrl={miniLesson.videoUrl}
          thumbnailUrl={miniCourse?.coverUrl}
          duration={miniLesson.duration || 900}
          initialTime={session?.time}
          autoPlay={session?.isPlaying}
          accentColor="#A594FF"
          onExpand={handleExpandMiniPlayer}
          onClose={handleCloseMiniPlayer}
          onProgress={handlePlayerProgress}
        />
      )}

      {showMiniPlayer && miniMovie && (
        <MiniPlayer
          title={miniMovie.title}
          subtitle={miniMovie.category}
          videoUrl={miniMovie.videoUrl}
          thumbnailUrl={miniMovie.coverUrl}
          duration={miniMovie.duration || 1}
          initialTime={session?.time}
          autoPlay={session?.isPlaying}
          accentColor="#10B981"
          onExpand={handleExpandMiniPlayer}
          onClose={handleCloseMiniPlayer}
          onProgress={handlePlayerProgress}
        />
      )}
    </div>
  );
};

export default App;
