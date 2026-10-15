import React, { useState } from 'react';
import { Sidebar } from './components/common/Sidebar';
import { LibraryView } from './components/library/LibraryView';
import { CourseDetailsView } from './components/course/CourseDetailsView';
import { HomeView } from './components/home/HomeView';
import { NavigationTab, Course, LibraryItem } from './types/library';
import { 
  MOCK_LIBRARY, 
  MOCK_MOVIES, 
  MOCK_DOCUMENTS, 
  mockLibraryService 
} from './services/mockData';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('library');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [items, setItems] = useState<LibraryItem[]>(() => MOCK_LIBRARY);

  const selectedCourse = selectedCourseId
    ? (items.find(i => i.id === selectedCourseId && i.type === 'course') as Course | undefined)
    : undefined;

  const handleNavigate = (tab: NavigationTab) => {
    setCurrentTab(tab);
    if (tab !== 'course-details') {
      setSelectedCourseId(null);
    }
  };

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setCurrentTab('course-details');
  };

  const handleBackToLibrary = () => {
    setSelectedCourseId(null);
    setCurrentTab('library');
  };

  const handleToggleLesson = (courseId: string, lessonId: string) => {
    const updated = mockLibraryService.toggleLessonCompletion(courseId, lessonId);
    if (updated) {
      setItems(prev => prev.map(item => (item.id === courseId ? { ...updated } : item)));
    }
  };

  const courses = items.filter(i => i.type === 'course') as Course[];
  const movies = items.filter(i => i.type === 'movie') as typeof MOCK_MOVIES;
  const docs = items.filter(i => i.type === 'document') as typeof MOCK_DOCUMENTS;

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
            onExploreLibrary={() => handleNavigate('library')}
          />
        )}

        {currentTab === 'library' && (
          <LibraryView
            items={items}
            onSelectCourse={handleSelectCourse}
          />
        )}

        {currentTab === 'course-details' && selectedCourse && (
          <CourseDetailsView
            course={selectedCourse}
            onBack={handleBackToLibrary}
            onToggleLesson={handleToggleLesson}
          />
        )}

        {currentTab === 'search' && (
          <div style={{ padding: '40px', color: '#94A3B8' }}>
            <h1 style={{ color: '#FFFFFF', fontSize: '24px', marginBottom: '12px' }}>Pesquisa Universal</h1>
            <p>A tela de pesquisa avançada com filtros e indexação será disponibilizada na entrega 3.</p>
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
