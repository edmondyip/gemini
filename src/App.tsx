import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DitherLabPage } from './pages/DitherLabPage';
import { HomePage } from './pages/HomePage';
import { LogPage } from './pages/LogPage';

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dither" element={<DitherLabPage />} />
          <Route path="/log" element={<LogPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
