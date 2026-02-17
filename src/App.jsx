import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import History from './pages/History';
import Analytics from './pages/Analytics';
import NavBar from './components/NavBar';
import { AnalysisProvider } from './context/AnalysisContext';
import './App.css';

function App({ initialLoading }) {
  return (
    <AnalysisProvider initialLoading={initialLoading}>
      <BrowserRouter>
        <div className="app-shell">
          <NavBar />
          <main className="app-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/history" element={<History />} />
              <Route path="/analytics" element={<Analytics />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AnalysisProvider>
  );
}

export default App;
