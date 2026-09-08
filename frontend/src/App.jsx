import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Scan, BookOpen, Clock, Settings as SettingsIcon, LogOut, UserCheck } from 'lucide-react';
import { cn } from './lib/utils';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ScanPage from './pages/ScanPage';
import ResultsPage from './pages/ResultsPage';
import RulesLibrary from './pages/RulesLibrary';
import History from './pages/History';
import Settings from './pages/Settings';

function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Scan, label: 'Scan Product', path: '/scan' },
    { icon: Clock, label: 'History', path: '/history' },
    { icon: BookOpen, label: 'Rules Library', path: '/rules' },
    { icon: SettingsIcon, label: 'Settings', path: '/settings' },
  ];

  return (
    <aside className="w-72 bg-card/50 backdrop-blur-xl border-r border-border/10 h-full flex flex-col relative overflow-hidden transition-colors duration-500">
      <div className="absolute top-0 left-0 w-full h-64 bg-primary/10 blur-3xl rounded-full -translate-y-1/2 pointer-events-none"></div>
      
      <div className="h-20 flex items-center px-8 border-b border-border/10 z-10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mr-3 shadow-lg shadow-primary/20">
          <Scan className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight text-foreground">PackSure <span className="text-primary font-light">AI</span></span>
      </div>
      
      <nav className="flex-1 py-6 px-4 space-y-2 z-10 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ease-out group",
                isActive 
                  ? "bg-primary/20 text-foreground shadow-inner shadow-primary/10 border border-primary/20" 
                  : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground border border-transparent"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 mr-4 transition-transform duration-300 group-hover:scale-110", 
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {item.label}
              
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
              )}
            </Link>
          );
        })}
      </nav>
      
      {/* Officer Profile & Session Box */}
      <div className="p-4 z-10 flex flex-col gap-3 border-t border-border/10">
        {user && (
          <div className="p-3 rounded-2xl bg-card/80 border border-border/40 backdrop-blur-md flex items-center gap-3">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20 flex-shrink-0"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm ring-2 ring-primary/20 flex-shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : 'O'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-foreground truncate">{user.name || 'Legal Officer'}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <UserCheck className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                <span className="truncate">{user.role || 'Inspector'}</span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></div>
          Secure Session Active
        </div>
      </div>
    </aside>
  );
}

function AppLayout() {
  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden selection:bg-primary/30 transition-colors duration-500">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
        <div className="relative z-10 h-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/results/:id" element={<ResultsPage />} />
            <Route path="/rules" element={<RulesLibrary />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

