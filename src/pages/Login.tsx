import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { ensureAnonSession, findProfileByUsername, pullProfileAndProgressFromCloud } from '../lib/sync';
import { verifyPassword } from '../lib/password';
import Mascot from '../components/ui/Mascot';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const setCurrentUser = useStore((s) => s.setCurrentUser);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('نام کاربری و رمز عبور رو وارد کن');
      return;
    }
    setLoading(true);
    try {
      const found = await findProfileByUsername(username.trim());
      if (!found) {
        setError('کاربری با این نام کاربری پیدا نشد');
        setLoading(false);
        return;
      }
      if (!found.passwordHash) {
        setError('این حساب رمز عبور ندارد و از این طریق قابل ورود نیست');
        setLoading(false);
        return;
      }
      const ok = await verifyPassword(password, found.passwordHash);
      if (!ok) {
        setError('رمز عبور اشتباهه');
        setLoading(false);
        return;
      }

      // Establish an anonymous session for this browser, then pull the
      // EXISTING profile + progress down locally (does not create a new row).
      await ensureAnonSession();
      const profile = await pullProfileAndProgressFromCloud(found.id);
      if (!profile) {
        setError('مشکلی در دریافت اطلاعات پیش اومد، دوباره تلاش کن');
        setLoading(false);
        return;
      }

      setCurrentUser(profile);
      navigate('/home');
    } catch (err) {
      console.error('[login] failed', err);
      setError('مشکلی پیش اومد، دوباره تلاش کن');
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
          <h1 className="text-3xl font-extrabold text-violet-700">خوش برگشتی!</h1>
          <p className="text-gray-500 mt-2">با نام کاربری و رمزت وارد شو</p>
        </div>

        <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
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
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-1 text-sm">
              رمز عبور <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="رمز عبورت"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg
                         focus:outline-none focus:border-violet-500 transition-colors"
              dir="ltr"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.96 }}
            className="btn-primary w-full mt-2"
          >
            {loading ? 'در حال ورود...' : 'ورود 🔑'}
          </motion.button>

          <Link
            to="/onboarding"
            className="text-center text-violet-600 font-bold text-sm mt-1 hover:underline"
          >
            حساب ندارم / ثبت‌نام
          </Link>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
