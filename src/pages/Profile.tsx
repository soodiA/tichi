import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import DiamondDisplay from '../components/ui/DiamondDisplay';
import { syncProfileToCloud } from '../lib/sync';
import { supabase } from '../lib/supabase';
import { db } from '../db/db';

const AVATARS = [
  '🦉','🐸','🦁','🐧','🐯','🐼','🦊','🐰',
  '🐻','🐨','🦄','🐙','🦋','🐬','🦕','🐲',
  '🌸','⭐','🌈','🎈','🍀','🎯','🚀','🎸',
];

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const updateAvatar = useStore((s) => s.updateAvatar);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    if (currentUser) {
      await db.profiles.delete(currentUser.id).catch(() => {});
    }
    setCurrentUser(null);
    navigate('/onboarding');
  };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      updateAvatar(url);
      setShowAvatarPicker(false);
      if (currentUser) syncProfileToCloud({ ...currentUser, avatarUrl: url }).catch(() => {});
    };
    reader.readAsDataURL(file);
  };

  const handleEmojiSelect = (emoji: string) => {
    updateAvatar(emoji);
    setShowAvatarPicker(false);
    if (currentUser) syncProfileToCloud({ ...currentUser, avatarUrl: emoji }).catch(() => {});
  };

  const isPhotoUrl = currentUser.avatarUrl?.startsWith('data:') || currentUser.avatarUrl?.startsWith('http');

  return (
    <div dir="rtl" className="min-h-full bg-bg pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-violet-100 to-bg pt-10 pb-6 px-5 flex items-start justify-between">
        <div className="flex flex-col items-center gap-3 flex-1">
          {/* Avatar with edit overlay */}
          <button
            onClick={() => setShowAvatarPicker(true)}
            className="relative w-24 h-24 rounded-full bg-violet-200 flex items-center justify-center shadow-lg overflow-hidden group"
          >
            {isPhotoUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-5xl">{currentUser.avatarUrl || '🦉'}</span>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity rounded-full">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M18.6 4H5.4A2.4 2.4 0 0 0 3 6.4V17.6A2.4 2.4 0 0 0 5.4 20H18.6A2.4 2.4 0 0 0 21 17.6V6.4A2.4 2.4 0 0 0 18.6 4M7.2 6l1.44-1.6h6.72L16.8 6m1.8 11.6H5.4V7.6h13.2z" />
              </svg>
            </div>
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-gray-800">{currentUser.name}</h1>
            <p className="text-violet-500 font-medium text-sm">@{currentUser.username}</p>
            <p className="text-gray-400 text-xs mt-1">عضویت: {joinedDate}</p>
          </div>
        </div>
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

      {/* Logout */}
      <div className="px-5 mt-4 mb-2">
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-3 rounded-2xl text-red-500 font-bold text-base border-2 border-red-100 bg-red-50 active:scale-95 transition-transform"
        >
          خروج از حساب
        </button>
      </div>

      {/* Logout confirm */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" onClick={() => setShowLogoutConfirm(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl mb-3">🚪</div>
            <h2 className="font-extrabold text-gray-800 text-lg mb-2">خروج از حساب؟</h2>
            <p className="text-gray-500 text-sm mb-5">پیشرفتت توی دیتابیس ذخیره شده و بعداً میتونی برگردی.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 btn-secondary py-3">انصراف</button>
              <button onClick={handleLogout} className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold active:scale-95 transition-transform">خروج</button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar picker modal */}
      {showAvatarPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setShowAvatarPicker(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-white rounded-t-3xl p-5 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
            <h2 className="text-center font-extrabold text-gray-800 text-lg mb-4">
              تصویر پروفایل
            </h2>

            {/* Upload photo button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 bg-violet-50 border-2 border-violet-200 rounded-2xl px-4 py-3 mb-4 text-violet-700 font-bold text-base active:scale-95 transition-transform"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
              </svg>
              آپلود عکس از گوشی
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Emoji grid */}
            <p className="text-gray-500 text-sm font-medium mb-3">یا یک آواتار انتخاب کن:</p>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className={`text-3xl h-12 w-full rounded-xl flex items-center justify-center transition-all active:scale-90
                    ${currentUser.avatarUrl === emoji
                      ? 'bg-violet-200 ring-2 ring-violet-500'
                      : 'bg-gray-100 hover:bg-violet-100'
                    }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
