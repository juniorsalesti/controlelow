import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusSquare, 
  LogOut, 
  Settings, 
  BarChart3, 
  AlertTriangle,
  Menu,
  X,
  TrendingUp
} from 'lucide-react';
import { logout } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
}

const SidebarItem = ({ icon: Icon, label, href, active }: SidebarItemProps) => (
  <Link
    to={href}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
      active 
        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" 
        : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
    )}
  >
    <Icon className={cn("w-5 h-5", active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
    <span className="font-medium">{label}</span>
  </Link>
);

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: TrendingUp, label: 'Alertas', href: '/alerts' },
    { icon: Settings, label: 'Configurações', href: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 h-screen">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              M
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Command Center</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <SidebarItem 
              key={item.href} 
              {...item} 
              active={location.pathname === item.href} 
            />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 px-2 py-3 mb-4">
            <img 
              src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} 
              alt={user?.displayName || 'User'} 
              className="w-10 h-10 rounded-full border border-slate-200"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate dark:text-white">{user?.displayName}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden flex-col w-full">
        <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between sticky top-0 z-50">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold tracking-tight">
              M
            </div>
            <span className="font-bold text-lg dark:text-white">Command Center</span>
          </Link>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
            {isMobileMenuOpen ? <X className="dark:text-white" /> : <Menu className="dark:text-white" />}
          </button>
        </header>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-16 left-0 w-full bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 z-40 p-4"
            >
              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg",
                      location.pathname === item.href 
                        ? "bg-blue-50 text-blue-600" 
                        : "text-slate-600"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sair</span>
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
