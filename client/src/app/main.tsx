import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import { LibraryProvider } from '@/modules/library/presentation/LibraryProvider';
import { MockLibraryService } from '@/modules/library/infrastructure/mock-library-repository';
import { localStorageLibraryStorage } from '@/modules/library/infrastructure/library-storage';
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
