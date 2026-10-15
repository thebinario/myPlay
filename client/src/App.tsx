import React, { useState } from 'react';
import { Sidebar } from './components/common/Sidebar';
import { LibraryView } from './components/library/LibraryView';
import { CourseDetailsView } from './components/course/CourseDetailsView';
import { CourseEditorView } from './components/editor/CourseEditorView';
import { VideoPlayerView } from './components/player/VideoPlayerView';
import { PdfViewer } from './components/pdf/PdfViewer';
import { HomeView } from './components/home/HomeView';
import { NavigationTab, Course, Document, LibraryItem } from './types/library';
import { 
  MOCK_LIBRARY, 
  MOCK_MOVIES, 
  mockLibraryService 
} from './services/mockData';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('library');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [items, setItems] = useState<LibraryItem[]>(() => MOCK_LIBRARY);

  const selectedCourse = selectedCourseId
    ? (items.find(i => i.id === selectedCourseId && i.type === 'course') as Course | undefined)
    : undefined;

  const docs = items.filter(i => i.type === 'document') as Document[];
  const selectedDoc = selectedDocId
    ? (docs.find(d => d.id === selectedDocId))
    : undefined;

  const handleNavigate = (tab: NavigationTab) => {
    setCurrentTab(tab);
    if (tab !== 'course-details' && tab !== 'editor' && tab !== 'player' && tab !== 'pdf-viewer') {
      setSelectedCourseId(null);
      setSelectedLessonId(null);
      setSelectedDocId(null);
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
    setCurrentTab('library');
  };

  const handlePlayLesson = (courseId: string, lessonId: string) => {
    setSelectedCourseId(courseId);
    setSelectedLessonId(lessonId);
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

  const courses = items.filter(i => i.type === 'course') as Course[];
  const movies = items.filter(i => i.type === 'movie') as typeof MOCK_MOVIES;

  return (
    <div className="app-container" style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#0D111B' }}>
      {/* Compact Sidebar */}
      <Sidebar currentTab={currentTab} onNavigate={handleNavigate} />

      {/* Main Content Area */}
      <main className="main-content" style={{ flex: 1, height: '100vh', overflowY: 'auto' }}>
        {currentTab === 'home' && (
          <HomeView
            courses={courses}
            movies={movies}
            documents={docs}
            onSelectCourse={handleSelectCourse}
            onOpenDocument={handleOpenDocument}
            onExploreLibrary={() => handleNavigate('library')}
          />
        )}

        {currentTab === 'library' && (
          <LibraryView
            items={items}
            onSelectCourse={handleSelectCourse}
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

        {currentTab === 'player' && selectedCourse && selectedLessonId && (
          <VideoPlayerView
            course={selectedCourse}
            initialLessonId={selectedLessonId}
            onBack={() => setCurrentTab('course-details')}
            onCompleteLesson={(lessonId) => handleToggleLesson(selectedCourse.id, lessonId)}
          />
        )}

        {currentTab === 'pdf-viewer' && selectedDoc && (
          <PdfViewer
            document={selectedDoc}
            onBack={handleBackToLibrary}
          />
        )}

        {currentTab === 'search' && (
          <div style={{ padding: '40px', color: '#94A3B8' }}>
            <h1 style={{ color: '#FFFFFF', fontSize: '24px', marginBottom: '12px' }}>Pesquisa Universal</h1>
            <p>A tela de pesquisa avançada com filtros e indexação será disponibilizada na entrega 3B.</p>
          </div>
        )}

        {currentTab === 'settings' && (
          <div style={{ padding: '40px', color: '#94A3B8' }}>
            <h1 style={{ color: '#FFFFFF', fontSize: '24px', marginBottom: '12px' }}>Configurações</h1>
            <p>Gerenciamento de bibliotecas, pastas e preferências do sistema na entrega 4.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
