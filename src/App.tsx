import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DitherLabPage } from './pages/DitherLabPage';
import { HomePage } from './pages/HomePage';
import { LogPage } from './pages/LogPage';
import { NeonRainPage } from './pages/NeonRainPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/neon-rain" element={<NeonRainPage />} />
        <Route
          path="/"
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />
        <Route
          path="/dither"
          element={
            <Layout>
              <DitherLabPage />
            </Layout>
          }
        />
        <Route
          path="/log"
          element={
            <Layout>
              <LogPage />
            </Layout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
