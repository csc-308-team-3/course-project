import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ChoreProvider } from './context/ChoreContext';
import LoginPage from './pages/LoginPage';
import HouseholdPage from './pages/HouseholdPage';
import RegisterPage from './pages/RegisterPage';
import ChoreDetailsPage from './pages/ChoreDetailsPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <ChoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/household" element={<HouseholdPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/chores/:choreId" element={<ChoreDetailsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </BrowserRouter>
    </ChoreProvider>
  );
}

export default App;