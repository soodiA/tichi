import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import DiamondDisplay from '../components/ui/DiamondDisplay';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);

  if (!currentUser) {
    return (
      <div dir="rtl" className="h-full flex items-center justify-center">
        <p className="text-gray-500">کاربری یافت نشد</p>
      </div>
    );
  }

  const joinedDate = new Date(currentUser.joinedAt).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div dir="rtl" className="min-h-full bg-bg pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-violet-100 to-bg pt-10 pb-6 px-5 flex items-start justify-between">
        <div className="flex flex-col items-center gap-3 flex-1">
          <div className="w-24 h-24 rounded-full bg-violet-200 flex items-center justify-center text-5xl shadow-lg">
            {currentUser.avatarUrl || '🦉'}
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-gray-800">{currentUser.name}</h1>
            <p className="text-violet-500 font-medium text-sm">@{currentUser.username}</p>
            <p className="text-gray-400 text-xs mt-1">عضویت: {joinedDate}</p>
          </div>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow text-gray-500"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
        </button>
      </div>

      {/* Stats */}
      <div className="px-5 mt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center">
            <div className="text-3xl mb-1">🔥</div>
            <p className="text-2xl font-extrabold text-orange-500">
              {currentUser.streakDays.toLocaleString('fa-IR')}
            </p>
            <p className="text-gray-400 text-xs">روز پشت سر هم</p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-1">💎</div>
            <p className="text-2xl font-extrabold text-blue-600">
              {currentUser.diamonds.toLocaleString('fa-IR')}
            </p>
            <p className="text-gray-400 text-xs">الماس</p>
          </div>
        </div>

        <div className="card mt-3 text-center">
          <DiamondDisplay count={currentUser.totalScore} />
          <p className="text-gray-400 text-xs mt-1">امتیاز کل</p>
        </div>
      </div>

      {/* Friends section */}
      <div className="px-5 mt-5">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-700 text-lg">دوستان</h2>
            <span className="text-gray-400 text-sm">۰ دوست</span>
          </div>
          <button
            onClick={() => navigate('/friends')}
            className="w-full btn-secondary text-base py-3"
          >
            افزودن دوست
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
