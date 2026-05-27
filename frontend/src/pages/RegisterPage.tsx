import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import './LoginPage.css'; // We can reuse the same auth container styles
import './RegisterPage.css';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'RESTAURANT'>('CUSTOMER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const firstName = name.split(' ')[0] || '';
      const lastName = name.split(' ').slice(1).join(' ') || '';
      await register(email, password, role, firstName, lastName);
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Failed to register');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel animate-fade-in">
        <div className="auth-header text-center">
          <div className="brand-icon">✨</div>
          <h2>Join CraveDrop</h2>
          <p className="text-muted">Create a new account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input 
              id="name"
              type="text" 
              className="input-field" 
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              className="input-field" 
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              className="input-field" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <div className="form-group">
            <label>I am a...</label>
            <div className="role-selector">
              <label className={`role-option ${role === 'CUSTOMER' ? 'selected' : ''}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="CUSTOMER" 
                  checked={role === 'CUSTOMER'} 
                  onChange={() => setRole('CUSTOMER')} 
                />
                Customer
              </label>
              <label className={`role-option ${role === 'RESTAURANT' ? 'selected' : ''}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="RESTAURANT" 
                  checked={role === 'RESTAURANT'} 
                  onChange={() => setRole('RESTAURANT')} 
                />
                Restaurant
              </label>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary w-100 mt-4"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        
        <div className="auth-footer text-center mt-4 text-muted">
          Already have an account? <Link to="/login" className="text-primary">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
