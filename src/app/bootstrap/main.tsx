import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { BootstrapApp } from './BootstrapApp';
import { BootstrapProviders } from './BootstrapProviders';
import { createBootstrapQueryClient } from './query-client';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Không tìm thấy điểm khởi tạo ứng dụng.');

const queryClient = createBootstrapQueryClient();

createRoot(container).render(
  <StrictMode>
    <BootstrapProviders queryClient={queryClient}>
      <BrowserRouter>
        <BootstrapApp />
      </BrowserRouter>
    </BootstrapProviders>
  </StrictMode>,
);
