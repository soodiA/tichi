import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';

const Splash: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentUser) {
        navigate('/home');
      } else {
        navigate('/onboarding');
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [currentUser, navigate]);

  return (
    <div
      dir="rtl"
      className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-violet-100 to-amber-50 gap-6"
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        className="text-8xl select-none"
      >
        🦉
      </motion.div>

      <motion.h1
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-6xl font-extrabold text-violet-700 tracking-wide"
        style={{ fontFamily: 'Vazirmatn, sans-serif' }}
      >
        تیچی
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="text-gray-500 text-lg font-medium"
      >
        یادگیری شاد فارسی
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="flex gap-2 mt-4"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-violet-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default Splash;
