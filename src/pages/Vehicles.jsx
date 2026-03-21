import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Info, MapPin, Search, Filter } from 'lucide-react';

const Vehicles = () => {
  const { isAdmin } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    plate: '',
    type: 'bus',
    capacity: '',
    status: 'inactive',
    route_id: ''
  });
  const [filter, setFilter] = useState('');

  const fetchVehicles = async () => {
    try {
      const response = await api.get('/vehicles');
      setVehicles(response.data.vehicles || []);
    } catch (error) {
      console.error('Error fetching vehicles', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this vehicle?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      fetchVehicles();
    } catch (error) {
      console.error('Error deleting vehicle', error);
      alert('Failed to delete vehicle');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vehicles', {
        ...formData,
        capacity: parseInt(formData.capacity)
      });
      setShowModal(false);
      setFormData({ plate: '', type: 'bus', capacity: '', status: 'inactive', route_id: '' });
      fetchVehicles();
    } catch (error) {
      console.error('Error adding vehicle', error);
      alert('Failed to add vehicle: ' + (error.response?.data?.error || error.message));
    }
  };

  const handlePositionCheck = async (id) => {
    try {
      const response = await api.get(`/vehicles/${id}/position`);
      alert(`Vehicle Position:\n\n${response.data.message}\n\n${response.data.note}`);
    } catch (error) {
      alert('Error checking position');
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.plate.toLowerCase().includes(filter.toLowerCase()) ||
    v.type.toLowerCase().includes(filter.toLowerCase()) ||
    v.status.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <div className="text-center p-8 text-primary">Loading fleet data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b-2 border-dark-border pb-4">
        <h2 className="text-3xl font-bold text-primary">Vehicle Fleet</h2>
        {isAdmin() && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-dark font-bold rounded hover:bg-primary-hover transition-colors shadow-lg hover:shadow-primary/20"
          >
            <Plus size={20} /> Add Vehicle
          </button>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Search vehicles..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-10 p-3 bg-dark border border-dark-border rounded text-gray-200 focus:border-primary focus:outline-none"
          />
        </div>
        <button className="px-4 py-2 bg-dark border border-dark-border rounded text-gray-400 hover:border-primary hover:text-primary transition-colors">
          <Filter size={20} />
        </button>
      </div>

      {filteredVehicles.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-dark-border rounded-lg text-gray-500">
          No vehicles found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-dark-lighter border border-dark-border rounded-lg p-6 hover:border-primary hover:-translate-y-1 transition-all shadow-lg group">
              <div className="flex justify-between items-start mb-4 border-b border-dark-border pb-2">
                <h3 className="text-xl font-bold text-primary group-hover:text-primary-hover">{vehicle.plate}</h3>
                <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${
                  vehicle.status === 'active' ? 'bg-blue-900 text-blue-200' :
                  vehicle.status === 'in_service' ? 'bg-green-900 text-green-200' :
                  vehicle.status === 'maintenance' ? 'bg-orange-900 text-orange-200' :
                  'bg-gray-800 text-gray-400'
                }`}>
                  {vehicle.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="space-y-2 mb-6 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <span className="capitalize">{vehicle.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Capacity:</span>
                  <span>{vehicle.capacity} passengers</span>
                </div>
                {vehicle.route_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Route:</span>
                    <span className="text-primary">{vehicle.route_id}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-dark-border">
                <button 
                  onClick={() => alert(JSON.stringify(vehicle, null, 2))}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-dark border border-dark-border rounded hover:bg-dark-border hover:text-primary transition-colors text-xs"
                >
                  <Info size={14} /> Details
                </button>
                <button 
                  onClick={() => handlePositionCheck(vehicle.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-dark border border-dark-border rounded hover:bg-dark-border hover:text-primary transition-colors text-xs"
                >
                  <MapPin size={14} /> Position
                </button>
                {isAdmin() && (
                  <button 
                    onClick={() => handleDelete(vehicle.id)}
                    className="p-2 bg-red-900/20 border border-red-900/50 rounded hover:bg-red-900/50 text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-dark-lighter border-2 border-primary rounded-lg p-8 w-full max-w-md shadow-2xl animate-fade-in">
            <h2 className="text-2xl font-bold text-primary mb-6 border-b border-dark-border pb-2">Add New Vehicle</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">License Plate</label>
                <input
                  type="text"
                  value={formData.plate}
                  onChange={(e) => setFormData({...formData, plate: e.target.value})}
                  className="w-full p-2 bg-dark border border-dark-border rounded text-gray-200 focus:border-primary focus:outline-none"
                  placeholder="e.g., AB-12-CD"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full p-2 bg-dark border border-dark-border rounded text-gray-200 focus:border-primary focus:outline-none"
                  >
                    <option value="bus">Bus</option>
                    <option value="metro">Metro</option>
                    <option value="tram">Tram</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                    className="w-full p-2 bg-dark border border-dark-border rounded text-gray-200 focus:border-primary focus:outline-none"
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full p-2 bg-dark border border-dark-border rounded text-gray-200 focus:border-primary focus:outline-none"
                  >
                    <option value="inactive">Inactive</option>
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="in_service">In Service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Route ID</label>
                  <input
                    type="text"
                    value={formData.route_id}
                    onChange={(e) => setFormData({...formData, route_id: e.target.value})}
                    className="w-full p-2 bg-dark border border-dark-border rounded text-gray-200 focus:border-primary focus:outline-none"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-dark border border-dark-border text-gray-300 rounded hover:bg-dark-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-dark font-bold rounded hover:bg-primary-hover transition-colors"
                >
                  Add Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehicles;

