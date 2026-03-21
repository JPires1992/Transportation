import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bus, Users, Settings, LogOut, LayoutDashboard, Map, Route, Heart } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header className="bg-gradient-to-br from-dark-lighter to-[#2a2a0a] p-8 text-center border-b-4 border-primary relative">
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2 drop-shadow-lg">
          🚌 Urban Transport System
        </h1>
        <p className="text-gray-400 text-lg">Public Transport Management & Monitoring</p>
        
        {user && (
          <div className="absolute top-4 right-4 flex items-center gap-4 text-sm text-gray-400">
            <span className="hidden md:inline">Logged in as: <span className="text-primary font-semibold">{user.name}</span></span>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-dark font-bold rounded hover:bg-primary-hover transition-colors"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </header>

      {user && (
        <nav className="bg-dark-lighter border-b-2 border-primary">
          <ul className="flex flex-wrap">
            <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" active={isActive('/')} />
            <NavItem to="/vehicles" icon={<Bus size={20} />} label="Vehicles" active={isActive('/vehicles')} />
            <NavItem to="/lines" icon={<Map size={20} />} label="Bus Lines" active={isActive('/lines')} />
            <NavItem to="/trips" icon={<Route size={20} />} label="Trips" active={isActive('/trips')} />
            <NavItem to="/preferences" icon={<Heart size={20} />} label="Preferences" active={isActive('/preferences')} />
            <NavItem to="/users" icon={<Users size={20} />} label="Users" active={isActive('/users')} />
            <NavItem to="/admin" icon={<Settings size={20} />} label="Admin" active={isActive('/admin')} />
          </ul>
        </nav>
      )}
    </>
  );
};

const NavItem = ({ to, icon, label, active }) => (
  <li className="flex-1 min-w-[120px]">
    <Link 
      to={to} 
      className={`
        w-full flex flex-col md:flex-row items-center justify-center gap-2 p-4 text-gray-300 
        hover:bg-primary hover:text-dark transition-colors border-r border-dark-border last:border-none
        ${active ? 'bg-primary text-dark font-bold' : ''}
      `}
    >
      {icon}
      <span>{label}</span>
    </Link>
  </li>
);

export default Navbar;

