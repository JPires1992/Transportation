import { useState, useEffect } from 'react';
import api from '../services/api';
import { Server, Database, Trash2, RefreshCw } from 'lucide-react';

const Admin = () => {
  const [health, setHealth] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [healthRes, statsRes] = await Promise.all([
        api.get('/health').catch(() => ({ data: { status: 'error' } })),
        api.get('/cache/stats').catch(() => ({ data: { dbSize: 'N/A', info: 'Unavailable' } }))
      ]);
      setHealth(healthRes.data);
      setCacheStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching admin data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const clearCache = async () => {
    if (!window.confirm('Are you sure you want to clear the entire Redis cache? This will log out all users.')) return;
    try {
      await api.delete('/cache/clear');
      alert('Cache cleared successfully');
      window.location.reload();
    } catch (error) {
      alert('Failed to clear cache');
    }
  };

  if (loading) return <div className="text-center p-8 text-primary">Loading system status...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b-2 border-dark-border pb-4">
        <h2 className="text-3xl font-bold text-primary">System Administration</h2>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-dark border border-dark-border rounded hover:bg-primary hover:text-dark transition-colors"
        >
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Health Status */}
        <div className="bg-dark-lighter border border-dark-border rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-200 mb-6 flex items-center gap-2">
            <Server size={20} className="text-primary" /> System Health
          </h3>
          
          <div className="space-y-4">
            <HealthItem label="Overall Status" status={health?.status === 'ok' ? 'Online' : 'Error'} color={health?.status === 'ok' ? 'green' : 'red'} />
            <HealthItem label="MySQL Database" status={health?.mysql || 'Unknown'} color={health?.mysql === 'connected' ? 'green' : 'red'} />
            <HealthItem label="Redis Cache" status={health?.redis || 'Unknown'} color={health?.redis === 'connected' ? 'green' : 'red'} />
            <HealthItem label="MongoDB" status={health?.mongodb || 'Unknown'} color={health?.mongodb === 'connected' ? 'green' : 'red'} />
            <HealthItem label="Neo4j" status={health?.neo4j || 'Unknown'} color={health?.neo4j === 'connected' ? 'green' : 'red'} />
          </div>
        </div>

        {/* Cache Stats */}
        <div className="bg-dark-lighter border border-dark-border rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-200 mb-6 flex items-center gap-2">
            <Database size={20} className="text-primary" /> Cache Management
          </h3>
          
          <div className="mb-6">
            <div className="text-gray-400 mb-1">Cache Database Size</div>
            <div className="text-3xl font-bold text-primary">{cacheStats?.dbSize} keys</div>
          </div>

          <div className="bg-dark p-4 rounded border border-dark-border mb-6 overflow-auto max-h-40 text-xs font-mono text-gray-400">
            {cacheStats?.info}
          </div>

          <button 
            onClick={clearCache}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-900/20 border border-red-900/50 rounded hover:bg-red-900/50 text-red-400 transition-colors font-bold"
          >
            <Trash2 size={18} /> Clear System Cache
          </button>
        </div>
      </div>
    </div>
  );
};

const HealthItem = ({ label, status, color }) => (
  <div className="flex justify-between items-center p-3 bg-dark rounded border border-dark-border">
    <span className="text-gray-400">{label}</span>
    <span className={`font-bold px-2 py-1 rounded text-xs uppercase ${
      color === 'green' ? 'bg-green-900/30 text-green-400' : 
      color === 'red' ? 'bg-red-900/30 text-red-400' : 'bg-gray-800 text-gray-400'
    }`}>
      {status}
    </span>
  </div>
);

export default Admin;

