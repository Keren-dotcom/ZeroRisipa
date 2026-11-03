import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import logo from '../assets/logo.png';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Calculate password strength dynamically based on the provided script logic
  const calculateStrength = (val) => {
    if (!val) return 0;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    return score;
  };

  const score = calculateStrength(password);

  const getStrengthLabel = () => {
    if (!password || score === 0) return { text: 'Password Strength', color: 'text-outline' };
    if (score === 1) return { text: 'Weak', color: 'text-tertiary font-semibold' };
    if (score === 2) return { text: 'Moderate', color: 'text-primary font-medium' };
    if (score === 3) return { text: 'Strong', color: 'text-primary font-semibold' };
    return { text: 'Very Strong', color: 'text-secondary font-bold' };
  };

  const getBarClass = (index) => {
    const base = "h-full w-1/4 rounded-full transition-colors duration-300 ";
    if (!password || score < index) return base + "bg-outline-variant";
    if (score === 1) return base + "bg-tertiary";
    if (score === 2) return base + "bg-primary-container";
    if (score === 3) return base + "bg-primary";
    return base + "bg-secondary";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setIsLoading(true);

    try {
      await axiosClient.post('/auth/register', { email, password });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Email might already exist.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body-md text-body-md min-h-screen antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      <main className="w-full min-h-screen flex flex-col justify-center items-center px-gutter-sm md:px-gutter py-margin-sm md:py-margin bg-surface-container-lowest">
        <div className="flex flex-col w-full">
          <div className="w-full flex flex-col items-center justify-center py-space-sm sm:py-space-md">
            
            <div className="w-full max-w-[420px] px-space-md sm:px-0 flex flex-col items-center">
              
              <div className="flex flex-col items-center text-center mb-space-md">
                <div className="w-full flex justify-center items-center mb-space-xs transition-transform duration-300 hover:scale-105">
                  <img src={logo} alt="PantryZero Logo" className="h-36 sm:h-40 w-auto max-w-[280px] object-contain mx-auto mb-2" />
                </div>
                <p className="font-headline-sm text-headline-sm text-on-surface-variant font-medium tracking-normal mt-space-xs">Create a new account</p>
              </div>
              
              {error && <p className="text-red-600 mb-4 font-semibold w-full text-center">{error}</p>}
              
              <form className="w-full flex flex-col gap-3.5" onSubmit={handleSubmit}>
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface font-semibold tracking-wide" htmlFor="email">
                    Email address&nbsp;<span className="text-tertiary">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">mail</span>
                    <input className="w-full h-12 pl-11 pr-4 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-xl transition-all duration-200 outline-none focus:bg-surface-container-lowest focus:shadow-[0_0_0_3px_rgba(0,107,44,0.18)] placeholder:text-outline-variant" id="email" name="email" placeholder="name@example.com" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface font-semibold tracking-wide" htmlFor="password">
                    Password&nbsp;<span className="text-tertiary">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">lock</span>
                    <input className="w-full h-12 pl-11 pr-11 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-xl transition-all duration-200 outline-none focus:bg-surface-container-lowest focus:shadow-[0_0_0_3px_rgba(0,107,44,0.18)] placeholder:text-outline-variant" id="password" minLength="8" name="password" placeholder="At least 8 characters" required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button aria-label="Toggle password visibility" className="absolute right-3 p-1.5 rounded-full text-outline hover:text-on-surface transition-colors focus:outline-none" type="button" onClick={() => setShowPassword(!showPassword)}>
                      <span className="material-symbols-outlined text-[20px] block">{showPassword ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                  
                  {/* Dynamic Health Bar restored from logic requirements */}
                  <div className="flex items-center justify-between mt-1">
                    <span className={`font-label-sm text-label-sm ${getStrengthLabel().color}`}>{getStrengthLabel().text}</span>
                    <span className="font-label-sm text-label-sm text-outline">{score} / 4</span>
                  </div>
                  <div className="w-full h-1.5 flex gap-1 mt-1">
                    <div className={getBarClass(1)}></div>
                    <div className={getBarClass(2)}></div>
                    <div className={getBarClass(3)}></div>
                    <div className={getBarClass(4)}></div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface font-semibold tracking-wide" htmlFor="confirmPassword">
                    Confirm password&nbsp;<span className="text-tertiary">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">lock</span>
                    <input className="w-full h-12 pl-11 pr-11 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-xl transition-all duration-200 outline-none focus:bg-surface-container-lowest focus:shadow-[0_0_0_3px_rgba(0,107,44,0.18)] placeholder:text-outline-variant" id="confirmPassword" minLength="8" name="confirmPassword" placeholder="Repeat your password" required type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    <button aria-label="Toggle confirm password visibility" className="absolute right-3 p-1.5 rounded-full text-outline hover:text-on-surface transition-colors focus:outline-none" type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <span className="material-symbols-outlined text-[20px] block">{showConfirmPassword ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                </div>
                
                <button className="w-full mt-3 h-12 bg-primary hover:bg-on-primary-fixed-variant active:scale-[0.99] text-on-primary font-label-lg text-label-lg font-bold rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-70" disabled={isLoading} type="submit">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-on-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign up</span>
                      <span className="material-symbols-outlined text-[19px] transition-transform duration-200 group-hover:translate-x-1">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>
              
              <div className="flex items-center justify-center gap-1.5 mt-6 pt-3">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Already have an account?</span>
                <Link className="font-label-md text-label-md text-primary font-bold hover:text-on-primary-fixed-variant hover:underline transition-colors flex items-center" to="/login">Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}