import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { db } from '../db/db';
import { syncProfileToCloud } from '../lib/sync';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';
import JalaliDatePicker from '../components/ui/JalaliDatePicker';
import Mascot from '../components/ui/Mascot';

const AVATARS = ['🦁', '🐯', '🐸', '🐧', '🦊', '🐼'];

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const setCurrentUser = useStore((s) => s.setCurrentUser);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [errors, setErrors] = useState<{ name?: string; username?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: { name?: string; username?: string } = {};
    if (!name.trim()) errs.name = 'نام الزامی است';
    if (!username.trim()) errs.username = 'نام کاربری الزامی است';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      // Check username uniqueness in Supabase
      if (navigator.onLine) {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.trim())
          .maybeSingle();
        if (data) {
          setErrors({ username: 'این نام کاربری قبلاً گرفته شده' });
          setLoading(false);
          return;
        }
      } else {
        const existing = await db.profiles.where('username').equals(username.trim()).first();
        if (existing) {
          setErrors({ username: 'این نام کاربری قبلاً گرفته شده' });
          setLoading(false);
          return;
        }
      }

      const profile: UserProfile = {
        id: crypto.randomUUID(),
        name: name.trim(),
        username: username.trim(),
        birthDate: birthDate || undefined,
        avatarUrl: selectedAvatar,
        joinedAt: new Date().toISOString(),
        diamonds: 0,
        streakDays: 0,
        lastActiveDate: undefined,
        totalScore: 0,
      };
      await db.profiles.add(profile);
      setCurrentUser(profile);
      syncProfileToCloud(profile).catch(() => {});
      navigate('/home');
    } catch {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-full bg-gradient-to-b from-violet-50 to-amber-50 flex flex-col items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="mb-3 flex justify-center"><Mascot size={110} expression="happy" /></div>
          <h1 className="text-3xl font-extrabold text-violet-700">به تیچی خوش اومدی!</h1>
          <p className="text-gray-500 mt-2">بیا باهم آشنا بشیم</p>
        </div>

        <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
          {/* Avatar picker */}
          <div>
            <label className="block text-gray-700 font-bold mb-2 text-sm">آواتار خودت رو انتخاب کن</label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  className={`text-3xl w-12 h-12 rounded-2xl flex items-center justify-center transition-all
                    ${selectedAvatar === av
                      ? 'bg-violet-200 ring-2 ring-violet-500 scale-110'
                      : 'bg-gray-100 hover:bg-violet-50'
                    }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-gray-700 font-bold mb-1 text-sm">
              اسمت چیه؟ <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: علی"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg
                         focus:outline-none focus:border-violet-500 transition-colors"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Username */}
          <div>
            <label className="block text-gray-700 font-bold mb-1 text-sm">
              نام کاربری <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="مثلاً: ali123"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg
                         focus:outline-none focus:border-violet-500 transition-colors"
              dir="ltr"
            />
            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
          </div>

          {/* Birth date */}
          <div>
            <label className="block text-gray-700 font-bold mb-1 text-sm">تاریخ تولد (اختیاری)</label>
            <JalaliDatePicker value={birthDate} onChange={(iso) => setBirthDate(iso)} />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.96 }}
            className="btn-primary w-full mt-2"
          >
            {loading ? 'در حال ذخیره...' : 'بزن بریم! 🚀'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default Onboarding;
