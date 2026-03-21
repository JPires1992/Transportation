import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        result = await register(formData.name, formData.email, formData.phone, formData.password);
      }

      if (result.success) {
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">🚌 Urban Transport System</h1>
        <p className="text-gray-400">Public Transport Management</p>
      </div>

      <div className="bg-dark-lighter border-2 border-primary rounded-lg p-8 w-full max-w-md shadow-[0_10px_40px_rgba(255,193,7,0.1)]">
        <div className="flex gap-2 mb-6">
          <button
            className={`flex-1 py-2 rounded text-sm font-semibold transition-colors ${isLogin ? 'bg-primary text-dark' : 'bg-dark border border-dark-border text-gray-400 hover:border-primary'}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 rounded text-sm font-semibold transition-colors ${!isLogin ? 'bg-primary text-dark' : 'bg-dark border border-dark-border text-gray-400 hover:border-primary'}`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-3 bg-dark border border-dark-border rounded text-gray-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  required={!isLogin}
                />
              </div>
              <div>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone (optional)"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full p-3 bg-dark border border-dark-border rounded text-gray-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3 bg-dark border border-dark-border rounded text-gray-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              required
            />
          </div>

          <div>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3 bg-dark border border-dark-border rounded text-gray-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-500/10 p-2 rounded border border-red-500/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-dark font-bold rounded hover:bg-primary-hover transition-all transform hover:-translate-y-1 shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:hover:transform-none"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

