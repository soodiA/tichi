import React from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import Splash from './pages/Splash';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Lesson from './pages/Lesson';
import LessonComplete from './pages/LessonComplete';
import Profile from './pages/Profile';
import Friends from './pages/Friends';

const NAV_ROUTES = ['/home', '/profile', '/friends'];

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    path: '/home',
    label: 'خانه',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'پروفایل',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    ),
  },
  {
    path: '/friends',
    label: 'دوستان',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.49 5.48c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-3.6 13.9v-4.4h-.8v-2.8c0-.7.6-1.3 1.3-1.3h6.2c.7 0 1.3.6 1.3 1.3v2.8h-.8v4.4h-7.2z" />
        <path d="M6.5 13.5c.83 0 1.5-.67 1.5-1.5S7.33 10.5 6.5 10.5 5 11.17 5 12s.67 1.5 1.5 1.5zM6.5 14.5c-1.67 0-5 .84-5 2.5V18h10v-1c0-1.66-3.33-2.5-5-2.5z" />
      </svg>
    ),
  },
];

const BottomNav: React.FC = () => {
  const location = useLocation();

  if (!NAV_ROUTES.some((r) => location.pathname === r)) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50
                 flex justify-around items-center py-2 px-2"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
    >
      {navItems.map((item) => {
        const active = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-0.5 flex-1 py-1 rounded-xl transition-colors
              ${active ? 'text-violet-600' : 'text-gray-400'}`}
          >
            <motion.div
              animate={{ scale: active ? 1.15 : 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {item.icon}
            </motion.div>
            <span className="text-xs font-bold">{item.label}</span>
            {active && (
              <motion.div
                layoutId="nav-indicator"
                className="w-1 h-1 rounded-full bg-violet-600"
              />
            )}
          </Link>
        );
      })}
    </div>
  );
};

const App: React.FC = () => {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-full max-w-md mx-auto relative">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/home" element={<Home />} />
          <Route path="/lesson/:nodeId" element={<Lesson />} />
          <Route path="/lesson-complete" element={<LessonComplete />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/friends" element={<Friends />} />
        </Routes>
      </AnimatePresence>
      <BottomNav />
    </div>
  );
};

export default App;
