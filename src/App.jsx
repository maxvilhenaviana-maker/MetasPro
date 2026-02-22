import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';

const PrivateRoute = ({ children }) => {
  const tokens = localStorage.getItem('auth_tokens');
  return tokens ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={<PrivateRoute><div className="p-10"><h1>Página Principal em Construção</h1></div></PrivateRoute>} 
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}