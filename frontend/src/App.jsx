import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ChoreBoard from './pages/ChoreBoard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/board" element={<ChoreBoard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;