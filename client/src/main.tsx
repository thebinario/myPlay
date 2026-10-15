import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LibraryProvider } from './services/LibraryContext';
import { MockLibraryService } from './services/mockData';
import { localStorageLibraryStorage } from './services/libraryStorage';
import './index.css';

// Composition root: repositório persistente (sobrevive a recarregamentos).
const repository = new MockLibraryService(localStorageLibraryStorage);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LibraryProvider repository={repository}>
      <App />
    </LibraryProvider>
  </React.StrictMode>,
);
