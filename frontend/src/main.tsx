import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

/**
 * Ponto de entrada do Vite.
 * O StrictMode fica ligado: os efeitos que nao podem rodar duas vezes
 * (troca do code do OAuth, bootstrap da sessao) tem guarda propria.
 */

const container = document.getElementById('root');

if (!container) {
  throw new Error('Elemento #root nao encontrado no index.html.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
