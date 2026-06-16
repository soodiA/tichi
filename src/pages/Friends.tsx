import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface SampleFriend {
  id: string;
  name: string;
  username: string;
  avatar: string;
  diamonds: number;
}

const SAMPLE_FRIENDS: SampleFriend[] = [
  { id: '1', name: 'سارا', username: 'sara_s', avatar: '🐸', diamonds: 230 },
  { id: '2', name: 'امیر', username: 'amir99', avatar: '🦁', diamonds: 185 },
  { id: '3', name: 'نیلوفر', username: 'nilou_f', avatar: '🐧', diamonds: 410 },
  { id: '4', name: 'رضا', username: 'reza_2024', avatar: '🐯', diamonds: 95 },
];

const Friends: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [added, setAdded] = useState<Set<string>>(new Set());

  const filtered = SAMPLE_FRIENDS.filter(
    (f) =>
      f.name.includes(search) ||
      f.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (id: string) => {
    setAdded((prev) => new Set([...prev, id]));
  };

  return (
    <div dir="rtl" className="min-h-full bg-bg pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4 bg-white shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'scaleX(-1)' }}>
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h1 className="text-xl font-extrabold text-gray-800">دوستان</h1>
      </div>

      <div className="px-5 pt-5">
        {/* Search */}
        <div className="relative mb-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو با نام یا نام کاربری..."
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base
                       focus:outline-none focus:border-violet-500 transition-colors pr-11"
          />
          <svg
            className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </div>

        {/* Friends list */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-8">کاربری پیدا نشد</p>
          ) : (
            filtered.map((friend, i) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="card flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-2xl flex-shrink-0">
                  {friend.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{friend.name}</p>
                  <p className="text-gray-400 text-sm truncate">@{friend.username}</p>
                </div>
                <div className="flex items-center gap-1 text-blue-500 text-sm font-bold ml-2 flex-shrink-0">
                  💎 {friend.diamonds.toLocaleString('fa-IR')}
                </div>
                <button
                  onClick={() => handleAdd(friend.id)}
                  disabled={added.has(friend.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all
                    ${added.has(friend.id)
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-violet-600 text-white active:scale-95'
                    }`}
                >
                  {added.has(friend.id) ? '✓' : 'افزودن'}
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Friends;
