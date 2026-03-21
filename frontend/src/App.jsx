import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import BusLines from './pages/BusLines';
import Users from './pages/Users';
import Admin from './pages/Admin';
import Trips from './pages/Trips';
import Preferences from './pages/Preferences';
import PlanTrip from './pages/PlanTrip';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/lines" element={<BusLines />} />
            <Route path="/trips" element={<Trips />} />
            <Route path="/plan-trip" element={<PlanTrip />} />
            <Route path="/preferences" element={<Preferences />} />
            <Route path="/users" element={<Users />} />
            <Route path="/admin" element={<Admin />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
