import { useAuth } from '../context/AuthContext';
import { User } from 'lucide-react';

const Users = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-primary border-b-2 border-dark-border pb-4">User Profile</h2>
      
      <div className="bg-dark-lighter border border-dark-border rounded-lg p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-dark">
            <User size={40} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">{user?.name}</h3>
            <p className="text-gray-400">User ID: {user?.id}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 py-4 border-b border-dark-border">
            <span className="text-gray-500">Email</span>
            <span className="col-span-2 text-gray-200">{user?.email}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 py-4 border-b border-dark-border">
            <span className="text-gray-500">Phone</span>
            <span className="col-span-2 text-gray-200">{user?.phone || 'Not provided'}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 py-4 border-b border-dark-border">
            <span className="text-gray-500">Member Since</span>
            <span className="col-span-2 text-gray-200">{new Date(user?.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="mt-8 p-4 bg-dark border border-dark-border rounded text-sm text-gray-400 text-center">
          Full user management functionality is restricted to system administrators.
        </div>
      </div>
    </div>
  );
};

export default Users;

