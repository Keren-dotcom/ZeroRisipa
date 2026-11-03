import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient, { getErrorMessage } from '../api/axiosClient';
import logo from '../assets/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await axiosClient.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.access_token);
      navigate('/pantry');
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid email or password'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body-md text-body-md min-h-screen antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      <main className="w-full min-h-screen flex flex-col justify-center items-center px-gutter-sm md:px-gutter py-margin-sm md:py-margin bg-surface-container-lowest">
        <div className="flex flex-col w-full items-center justify-center">
          <div className="w-full max-w-4xl flex flex-col items-center">
            
            <div className="w-full flex justify-center items-end relative overflow-hidden h-72 md:h-80 select-none">
              <img alt="Fresh organic groceries" className="w-full h-full object-contain object-bottom pointer-events-none transition-transform duration-700 hover:scale-[1.02]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBRqHnMIdKHwZmTDUuaU6sJ2tA1DH45HyBEff4fvAp5pq5WwP0zehBRhs7AF2ZV0FhxCxuRQIrP1pQZvXbRcYcIS5tGlxe0DzdQsIm5TGeoECB9M0NB4U3kaNdvASdBhfzbOF8JFW21SYu_f6y2TjuOh581l6jl0478CLOlsd32tWi_jhy-r2phwLhiNo_GC6Dezs-O_KDRDm7X_y79UxfNex7v5aapygHofyVrByEW" />
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface-container-lowest to-transparent pointer-events-none"></div>
            </div>
            
            <div className="w-full max-w-md flex flex-col items-center px-space-md md:px-0 pt-space-md pb-space-xl">
              <div className="flex flex-col items-center text-center mb-space-lg">
                <div className="w-full max-w-xs flex justify-center mb-space-xs">
                  <img alt="PantryZero - Zero Waste Pantry Optimizer" className="w-full max-h-36 object-contain" src={logo} />
                </div>
                <p className="font-body-sm text-body-sm text-[#1b4332] tracking-wide font-semibold">Nothing is lost, everything is transformed</p>
              </div>
              
              {error && <p className="text-red-600 mb-4 font-semibold">{error}</p>}
              
              <form className="w-full flex flex-col gap-space-md" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-md text-label-md text-on-surface flex items-center justify-between" htmlFor="email">
                    <span>Email address</span>
                  </label>
                  <div className="relative flex items-center group">
                    <span className="material-symbols-outlined absolute left-4 text-outline pointer-events-none group-focus-within:text-primary transition-colors">mail</span>
                    <input className="w-full h-12 pl-12 pr-4 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline transition-all duration-200 outline-none focus:bg-surface-container-lowest focus:shadow-md" id="email" placeholder="name@example.com" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-md text-label-md text-on-surface" htmlFor="password">Password</label>
                  <div className="relative flex items-center group">
                    <span className="material-symbols-outlined absolute left-4 text-outline pointer-events-none group-focus-within:text-primary transition-colors">lock</span>
                    <input className="w-full h-12 pl-12 pr-12 bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface placeholder:text-outline transition-all duration-200 outline-none focus:bg-surface-container-lowest focus:shadow-md" id="password" placeholder="••••••••" required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button aria-label="Toggle password visibility" className="absolute right-3.5 text-outline hover:text-on-surface p-1 rounded-full focus:outline-none transition-colors" onClick={() => setShowPassword(!showPassword)} type="button">
                      <span className="material-symbols-outlined text-headline-sm">{showPassword ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                </div>
                
                <button className="w-full h-12 mt-space-xs rounded-full bg-primary text-on-primary font-label-lg text-label-lg shadow-sm hover:bg-primary-container active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-space-xs group disabled:opacity-70" disabled={isLoading} type="submit">
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-headline-sm">progress_activity</span>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <span className="material-symbols-outlined text-headline-sm transition-transform duration-200 group-hover:translate-x-1">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>
              
              <div className="mt-space-lg flex items-center justify-center gap-space-xs text-center">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Don't have an account?</span>
                <Link className="font-label-md text-label-md text-primary hover:text-primary-container font-semibold transition-colors focus:outline-none" to="/register">Sign up</Link>
              </div>
              
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}