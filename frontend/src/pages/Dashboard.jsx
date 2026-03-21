import { useState, useEffect } from 'react';
import api from '../services/api';
import { Bus, Activity, CheckCircle, AlertCircle, Clock, Map } from 'lucide-react';
import LiveMap from '../components/LiveMap';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeVehicles: 0,
    inServiceVehicles: 0,
    systemStatus: 'checking'
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehiclesRes, healthRes] = await Promise.all([
          api.get('/vehicles'),
          api.get('/health').catch(() => ({ data: { status: 'error' } }))
        ]);

        const vehicles = vehiclesRes.data.vehicles || [];
        
        setStats({
          totalVehicles: vehicles.length,
          activeVehicles: vehicles.filter(v => v.status === 'active' || v.status === 'in_service').length,
          inServiceVehicles: vehicles.filter(v => v.status === 'in_service').length,
          systemStatus: healthRes.data.status
        });

        // Generate recent activity from vehicle data (simulated for now since we don't have an activity log endpoint)
        const activities = vehicles
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)
          .map(v => ({
            id: v.id,
            text: `Vehicle ${v.plate} added to fleet`,
            time: new Date(v.created_at).toLocaleString(),
            type: 'vehicle'
          }));
        
        setRecentActivity(activities);
      } catch (error) {
        console.error('Error fetching dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="text-center p-8 text-primary">Loading dashboard data...</div>;

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-primary border-b-2 border-dark-border pb-4">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Vehicles" 
          value={stats.totalVehicles} 
          icon={<Bus className="text-primary" size={24} />} 
        />
        <StatCard 
          title="Active Vehicles" 
          value={stats.activeVehicles} 
          icon={<CheckCircle className="text-green-500" size={24} />} 
        />
        <StatCard 
          title="In Service" 
          value={stats.inServiceVehicles} 
          icon={<Activity className="text-blue-500" size={24} />} 
        />
        <StatCard 
          title="System Status" 
          value={stats.systemStatus === 'ok' ? 'Online' : 'Offline'} 
          icon={<AlertCircle className={stats.systemStatus === 'ok' ? "text-green-500" : "text-red-500"} size={24} />} 
          isText
        />
      </div>

      <div className="bg-dark-lighter border border-dark-border rounded-lg p-6">
        <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <Map size={20} /> Real-Time Fleet Tracking
        </h3>
        <p className="text-gray-400 mb-4 text-sm">Live positions of all active vehicles (Simulated)</p>
        <LiveMap />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-dark-lighter border border-dark-border rounded-lg p-6 hover:border-primary transition-colors">
          <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <Clock size={20} /> Recent Activity
          </h3>
          
          {recentActivity.length === 0 ? (
            <div className="text-gray-500 text-center py-8 border-2 border-dashed border-dark-border rounded">
              No recent activity
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 bg-dark rounded border-l-4 border-primary">
                  <div className="flex-1">
                    <p className="text-gray-200">{activity.text}</p>
                    <p className="text-sm text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-dark-lighter border border-dark-border rounded-lg p-6 hover:border-primary transition-colors">
          <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <Activity size={20} /> Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <QuickActionButton to="/vehicles" label="Add Vehicle" />
            <QuickActionButton to="/users" label="Manage Users" />
            <QuickActionButton to="/admin" label="System Health" />
            <QuickActionButton to="/vehicles" label="View Fleet" />
            <QuickActionButton to="/lines" label="Bus Lines" />
            <QuickActionButton to="/trips" label="My Trips" />
            <QuickActionButton to="/preferences" label="Preferences" />
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, isText }) => (
  <div className="bg-dark-lighter border-2 border-dark-border rounded-lg p-6 hover:border-primary hover:-translate-y-1 transition-all shadow-lg">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-gray-400 font-medium">{title}</h3>
      {icon}
    </div>
    <div className={`text-3xl font-bold ${isText ? (value === 'Online' ? 'text-green-500' : 'text-red-500') : 'text-primary drop-shadow-glow'}`}>
      {value}
    </div>
  </div>
);

import { Link } from 'react-router-dom';

const QuickActionButton = ({ to, label }) => (
  <Link 
    to={to}
    className="flex items-center justify-center p-4 bg-dark border border-dark-border rounded hover:bg-primary hover:text-dark font-semibold transition-colors"
  >
    {label}
  </Link>
);

export default Dashboard;

