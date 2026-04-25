import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { LandingPage } from './pages/LandingPage';
import { CreateDuelPage } from './pages/CreateDuelPage';
import { AnalyzingPage } from './pages/AnalyzingPage';
import { ResultsPage } from './pages/ResultsPage';
import { HistoryPage } from './pages/HistoryPage';
import { ExplorePage } from './pages/ExplorePage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthPage } from './pages/AuthPage';
import LeaderboardPage from './pages/LeaderboardPage';

export default function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />

        <Route path="/duel" element={<CreateDuelPage />} />
        <Route path="/duel/analyzing" element={<AnalyzingPage />} />
        <Route path="/results/:id?" element={<ResultsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

