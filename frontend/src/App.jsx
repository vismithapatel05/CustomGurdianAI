import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-navy-950 font-sans">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid #334155',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#1e293b' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#1e293b' } },
          }}
        />
        <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <main>
          {currentPage === 'landing' ? (
            <LandingPage onStart={() => setCurrentPage('dashboard')} />
          ) : (
            <DashboardPage />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
