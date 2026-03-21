import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-dark text-gray-200 font-sans">
      <Navbar />
      <main className="container mx-auto p-6 max-w-7xl fade-in">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

