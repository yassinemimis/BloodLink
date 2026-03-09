import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { initDarkMode } from './store/useDarkMode';

// ✅ تطبيق dark mode قبل render لتجنب الوميض
initDarkMode();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);