import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { ensureAnonSession, getMyFriendIds, getPublicProfiles, searchProfilesByUsername, type PublicProfile } from '../lib/sync';

type Scope = 'friends' | 'all';
type Metric = 'score' | 'streak';

const MEDALS = ['🥇', '🥈', '🥉'];

const scoreOf = (p: PublicProfile) => p.total_score ?? p.diamonds ?? 0;
const streakOf = (p: PublicProfile) => p.streak_days ?? 0;

const Avatar: React.FC<{ url: string | null; size?: number }> = ({ url, size = 48 }) => {
  const isUrl = url?.startsWith('data:') || url?.startsWith('http');
  return (
    <div
      className="rounded-full bg-violet-100 flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {isUrl ? <img src={url!} alt="" className="w-full h-full object-cover" /> : <span>{url || '🐼'}</span>}
    </div>
  );
};

const Leaderboard: React.FC = () => {
  const me = useStore((s) => s.currentUser);
  const [scope, setScope] = useState<Scope>('friends');
  const [metric, setMetric] = useState<Metric>('score');
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [everyone, setEveryone] = useState<PublicProfile[]>([]);
  const [friends, setFriends] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    (async () => {
      await ensureAnonSession();
      let ids = await getMyFriendIds(me);
      if (!ids) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data } = user
          ? await supabase.from('friendships').select('friend_id').eq('user_id', user.id)
          : { data: [] as { friend_id: string }[] };
        ids = (data ?? []).map((r) => r.friend_id);
      }
      const all = await searchProfilesByUsername('', true);
      // Stats (streak/score) come from get_public_profiles; include everyone so "all" ranks too.
      const stats = await getPublicProfiles(all.map((p) => p.id));
      if (cancelled) return;
      const byId = new Map(stats.map((p) => [p.id, p]));
      const merged = all.map((p) => byId.get(p.id) ?? p);
      setFriendIds(ids);
      setEveryone(merged);
      setFriends(merged.filter((p) => ids!.includes(p.id)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [me?.id]);

  // Current user is matched by username (unique) — profile ids differ between local and cloud rows.
  const rows = useMemo(() => {
    if (!me) return [];
    const base = scope === 'friends' ? friends : everyone;
    const mine: PublicProfile = {
      id: 'me',
      name: me.name,
      username: me.username,
      avatar_url: me.avatarUrl ?? null,
      diamonds: me.diamonds,
      streak_days: me.streakDays,
      total_score: me.totalScore,
    };
    const list = [...base.filter((p) => p.username.toLowerCase() !== me.username.toLowerCase()), mine];
    const key = metric === 'score' ? scoreOf : streakOf;
    return list.sort((a, b) => key(b) - key(a) || scoreOf(b) - scoreOf(a));
  }, [scope, metric, friends, everyone, me]);

  if (!me) return null;
  const myRank = rows.findIndex((r) => r.id === 'me') + 1;
  const value = (p: PublicProfile) => (metric === 'score' ? scoreOf(p) : streakOf(p)).toLocaleString('fa-IR');

  return (
    <div dir="rtl" className="min-h-screen relative pb-24">
      <div className="relative z-10 px-5 pt-6 pb-4 bg-white/70 backdrop-blur-sm shadow-sm">
        <h1 className="text-xl font-extrabold text-gray-800">🏆 رقابت</h1>
        {!loading && (
          <p className="text-sm text-gray-500 mt-1">
            رتبه‌ی تو: <span className="font-extrabold text-violet-600">{myRank.toLocaleString('fa-IR')}</span> از {rows.length.toLocaleString('fa-IR')}
          </p>
        )}
      </div>

      <div className="relative z-10 px-5 pt-4">
        <div className="flex gap-2 mb-3">
          {([['friends', 'دوستان'], ['all', 'همه']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setScope(k)}
              className={`flex-1 py-2 rounded-2xl font-bold text-sm transition-colors ${scope === k ? 'bg-violet-600 text-white' : 'bg-white/80 text-gray-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-5">
          {([['score', '⭐ امتیاز'], ['streak', '🔥 استریک']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setMetric(k)}
              className={`flex-1 py-2 rounded-2xl font-bold text-sm transition-colors ${metric === k ? 'bg-amber-400 text-white' : 'bg-white/80 text-gray-600'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && <p className="text-center text-gray-500 py-8 animate-pulse">در حال بارگذاری...</p>}

        {!loading && scope === 'friends' && friendIds.length === 0 && (
          <p className="text-center text-gray-600 bg-white/70 rounded-2xl py-4 px-3 mb-4 text-sm">
            هنوز دوستی نداری. از صفحه‌ی دوستان چند نفر رو اضافه کن تا باهم رقابت کنید!
          </p>
        )}

        <div className="flex flex-col gap-3">
          {!loading && rows.map((p, i) => {
            const isMe = p.id === 'me';
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 10) * 0.04 }}
                className={`card flex items-center gap-3 ${isMe ? 'ring-2 ring-violet-500' : ''}`}
              >
                <div className="w-9 text-center text-xl font-extrabold text-gray-500 flex-shrink-0">
                  {i < 3 ? MEDALS[i] : (i + 1).toLocaleString('fa-IR')}
                </div>
                <Avatar url={p.avatar_url} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{p.name}{isMe && ' (تو)'}</p>
                  <p className="text-gray-400 text-sm truncate">@{p.username}</p>
                </div>
                <div className="text-left flex-shrink-0">
                  <p className={`font-extrabold ${metric === 'score' ? 'text-amber-500' : 'text-orange-500'}`}>
                    {metric === 'score' ? '⭐' : '🔥'} {value(p)}
                  </p>
                  {p.streak_days != null && metric === 'score' && (
                    <p className="text-xs text-orange-400">🔥 {streakOf(p).toLocaleString('fa-IR')}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
