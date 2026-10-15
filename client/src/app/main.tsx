import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import { LibraryProvider } from '@/features/library/presentation/LibraryProvider';
import { MockLibraryService } from '@/features/library/infrastructure/mockLibraryRepository';
import { localStorageLibraryStorage } from '@/features/library/infrastructure/libraryStorage';
import '@/index.css';

// Composition root: repositório persistente (sobrevive a recarregamentos).
const repository = new MockLibraryService(localStorageLibraryStorage);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LibraryProvider repository={repository}>
      <App />
    </LibraryProvider>
  </React.StrictMode>,
);
