import { Link, NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';

const linkClass = ({ isActive }) =>
    `px-space-md py-space-sm rounded-full font-label-md transition-colors ${isActive ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-variant'
    }`;

export default function NavBar() {
    return (
        <nav className="grid grid-cols-[1fr_auto_1fr] items-center px-gutter-sm md:px-gutter py-space-sm bg-surface-container-lowest border-b border-outline-variant">
            <Link to="/recipes" className="flex items-center gap-space-sm font-headline-sm text-on-surface">
                <img src={logo} alt="PantryZero logo" className="w-9 h-9 rounded-full object-cover" />
                <span className="hidden sm:inline">PantryZero</span>
            </Link>

            <div className="flex gap-space-xs">
                <NavLink to="/pantry" className={linkClass}>Pantry</NavLink>
                <NavLink to="/recipes" className={linkClass}>Recipes</NavLink>
            </div>

            <button
                type="button"
                aria-label="Profile"
                className="justify-self-end w-7 h-7 rounded-full bg-primary grid place-items-center"
            >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-white" strokeWidth="2.2">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
                </svg>
            </button>
        </nav>
    );
}