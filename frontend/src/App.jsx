import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChoreProvider } from './context/ChoreContext';
import { HouseholdProvider, useHousehold } from './context/HouseholdContext';
import ChoreDetailsPage from './pages/ChoreDetailsPage';
import HouseholdPage from './pages/HouseholdPage';
import CalendarPage from './pages/CalendarPage';
import LoginPage from './pages/LoginPage';
import NoHouseholdPage from './pages/NoHouseholdPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import AwardsPage from './pages/AwardsPage';

function HouseholdRoute() {
  const { user } = useAuth();
  const { hasHousehold, loading } = useHousehold();

  if (loading) {
    return <main className="app-page">Loading household...</main>;
  }

  return user?.householdId || hasHousehold ? (
    <HouseholdPage />
  ) : (
    <Navigate to="/no-household" replace />
  );
}

function CalendarRoute() {
  const { user } = useAuth();
  const { hasHousehold, loading } = useHousehold();

  if (loading) {
    return <main className="app-page">Loading household...</main>;
  }

  return user?.householdId || hasHousehold ? (
    <CalendarPage />
  ) : (
    <Navigate to="/no-household" replace />
  );
}

function ProtectedRoute({ children }) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return null;
  }

  return user ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChoreProvider>
          <HouseholdProvider>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/no-household"
                element={
                  <ProtectedRoute>
                    <NoHouseholdPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/household"
                element={
                  <ProtectedRoute>
                    <HouseholdRoute />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <CalendarRoute />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chores/:choreId"
                element={
                  <ProtectedRoute>
                    <ChoreDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/awards"
                element={
                  <ProtectedRoute>
                    <AwardsPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </HouseholdProvider>
        </ChoreProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
