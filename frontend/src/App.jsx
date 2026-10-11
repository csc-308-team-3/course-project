import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ChoreProvider } from './context/ChoreContext';
import { HouseholdProvider, useHousehold } from './context/HouseholdContext';
import ChoreDetailsPage from './pages/ChoreDetailsPage';
import HouseholdPage from './pages/HouseholdPage';
import LoginPage from './pages/LoginPage';
import NoHouseholdPage from './pages/NoHouseholdPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import AwardsPage from './pages/AwardsPage';

function HouseholdRoute() {
  const { hasHousehold } = useHousehold();

  return hasHousehold ? (
    <HouseholdPage />
  ) : (
    <Navigate to="/no-household" replace />
  );
}

function App() {
  return (
    <ChoreProvider>
      <HouseholdProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/no-household" element={<NoHouseholdPage />} />
            <Route path="/household" element={<HouseholdRoute />} />
            <Route path="/chores/:choreId" element={<ChoreDetailsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/awards" element={<AwardsPage />} />
          </Routes>
        </BrowserRouter>
      </HouseholdProvider>
    </ChoreProvider>
  );
}

export default App;