import { createRoot } from 'react-dom/client';
import { I18nProvider } from '../app/i18n';
import { About } from './About';
import '../styles/index.css';

createRoot(document.getElementById('root')!).render(
  <I18nProvider>
      <About />
    </I18nProvider>,
);
