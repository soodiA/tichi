import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { searchProfilesByUsername, ensureAnonSession, syncProfileToCloud } from '../lib/sync';
import PageBg from '../components/ui/PageBg';

interface Profile {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  diamonds: number;
}

const Avatar: React.FC<{ profile: Profile }> = ({ profile }) => {
  const isUrl = profile.avatar_url?.startsWith('data:') || profile.avatar_url?.startsWith('http');
  return (
    <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
      {isUrl ? (
        <img src={profile.avatar_url!} alt="avatar" className="w-full h-full object-cover" />
      ) : (
        <span>{profile.avatar_url || '🐼'}</span>
      )}
    </div>
  );
};

const ProfileCard: React.FC<{
  profile: Profile;
  isAdded: boolean;
  onAdd: (id: string) => void;
  delay: number;
}> = ({ profile, isAdded, onAdd, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="card flex items-center gap-3"
  >
    <Avatar profile={profile} />
    <div className="flex-1 min-w-0">
      <p className="font-bold text-gray-800 truncate">{profile.name}</p>
      <p className="text-gray-400 text-sm truncate">@{profile.username}</p>
    </div>
    <div className="flex items-center gap-1 text-amber-500 text-sm font-bold flex-shrink-0">
      🪙 {profile.diamonds.toLocaleString('fa-IR')}
    </div>
    <button
      onClick={() => onAdd(profile.id)}
      disabled={isAdded}
      className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-all
        ${isAdded
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-violet-600 text-white active:scale-95'
        }`}
    >
      {isAdded ? '✓' : 'افزودن'}
    </button>
  </motion.div>
);

const Friends: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);

  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [results, setResults] = useState<Profile[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(true);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [addError, setAddError] = useState(false);
  const [addErrorCode, setAddErrorCode] = useState('');

  // friendships RLS requires user_id = auth.uid(), and `profiles` rows of other
  // users are hidden from direct selects. So: key friendships by the auth uid
  // (not the local profile id) and read candidates via the public RPC.
  const getAuthUid = async (): Promise<string | null> => {
    await ensureAnonSession();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  };

  // Load existing friendships, then load suggestions
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    (async () => {
      const uid = await getAuthUid();
      if (!uid || cancelled) { setSuggestLoading(false); return; }
      setAuthUid(uid);

      const { data: friendData } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', uid);
      const friendIds = new Set<string>((friendData ?? []).map((r: any) => r.friend_id));
      if (cancelled) return;
      setAdded(friendIds);

      const everyone = (await searchProfilesByUsername('', true)) as Profile[];
      const byId = new Map(everyone.map((p) => [p.id, p]));
      const candidates = (ids: Iterable<string>) =>
        [...new Set(ids)]
          .filter((id) => id !== uid && id !== currentUser.id && !friendIds.has(id))
          .map((id) => byId.get(id))
          .filter((p): p is Profile => !!p);
      const shuffle = <T,>(arr: T[]) => {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      };

      // 1) friends of my friends (needs the policy to allow reading them; empty otherwise)
      let fof: Profile[] = [];
      if (friendIds.size > 0) {
        const { data: fofData } = await supabase
          .from('friendships')
          .select('friend_id')
          .in('user_id', [...friendIds]);
        fof = shuffle(candidates((fofData ?? []).map((r: any) => r.friend_id)));
      }
      // 2) top up with random people
      const picked = new Set(fof.map((p) => p.id));
      const random = shuffle(candidates(everyone.map((p) => p.id)).filter((p) => !picked.has(p.id)));
      if (cancelled) return;
      setSuggestions([...fof, ...random].slice(0, 10));
      setSuggestLoading(false);
    })();

    return () => { cancelled = true; };
  }, [currentUser]);

  const doSearch = useCallback(async () => {
    const q = search.trim();
    if (!q || !currentUser) return;
    setLoading(true);
    setSearchDone(true);
    setResults([]);

    // Search by username via a SECURITY DEFINER RPC: a direct
    // `.from('profiles').select(...)` is blocked by RLS (`auth.uid() = id`)
    // for any profile that isn't the current user's own row, so this never
    // found other users. See `searchProfilesByUsername` in src/lib/sync.ts.
    const data = await searchProfilesByUsername(q);
    setResults((data as Profile[]).filter((p) => p.id !== currentUser.id && p.id !== authUid));
    setLoading(false);
  }, [search, currentUser]);

  const handleAdd = async (friendId: string) => {
    if (!currentUser || added.has(friendId)) return;
    const uid = authUid ?? (await getAuthUid());
    if (!uid) { setAddError(true); return; }
    setAddError(false);
    // friendships.user_id has an FK to profiles(id): make sure this device's
    // auth uid actually has a cloud profile row before inserting.
    await syncProfileToCloud(currentUser);
    setAdded((prev) => new Set([...prev, friendId]));
    const { error } = await supabase.from('friendships').upsert({
      user_id: uid,
      friend_id: friendId,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.error('[friends] add failed', error);
      setAddErrorCode(error.code ?? error.message);
      setAdded((prev) => { const n = new Set(prev); n.delete(friendId); return n; });
      setAddError(true);
    }
  };

  const clearSearch = () => {
    setSearch('');
    setResults([]);
    setSearchDone(false);
  };

  return (
    <div dir="rtl" className="min-h-screen relative pb-24 overflow-hidden">
      <PageBg variant="green" />
      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-6 pb-4 bg-white/70 backdrop-blur-sm shadow-sm">
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

      <div className="relative z-10 px-5 pt-5">
        {/* Search bar */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (!e.target.value) clearSearch(); }}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              placeholder="جستجو با نام کاربری..."
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base
                         focus:outline-none focus:border-violet-500 transition-colors pr-11"
            />
            <svg className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400"
              width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </div>
          <button
            onClick={doSearch}
            disabled={loading || !search.trim()}
            className="px-5 py-3 rounded-2xl bg-violet-600 text-white font-bold active:scale-95 transition-transform disabled:opacity-50"
          >
            جستجو
          </button>
        </div>

        {addError && (
          <p className="text-center text-red-500 text-sm font-bold mb-3">افزودن دوست انجام نشد، دوباره تلاش کن {addErrorCode && <span dir="ltr">({addErrorCode})</span>}</p>
        )}

        {/* Search results */}
        {loading && (
          <p className="text-center text-gray-400 py-6 animate-pulse">در حال جستجو...</p>
        )}

        {!loading && searchDone && results.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400">کاربری با این نام کاربری پیدا نشد</p>
            <button onClick={clearSearch} className="mt-3 text-violet-600 text-sm font-bold">پیشنهادها رو ببین</button>
          </div>
        )}

        {!loading && searchDone && results.length > 0 && (
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-500 text-sm font-bold">نتایج جستجو</p>
              <button onClick={clearSearch} className="text-violet-500 text-sm font-bold">بازگشت</button>
            </div>
            {results.map((p, i) => (
              <ProfileCard key={p.id} profile={p} isAdded={added.has(p.id)} onAdd={handleAdd} delay={i * 0.05} />
            ))}
          </div>
        )}

        {/* Suggestions */}
        {!searchDone && (
          <>
            <p className="text-gray-500 text-sm font-bold mb-3">
              {suggestLoading ? 'در حال بارگذاری...' : 'پیشنهاد دوستان'}
            </p>
            {suggestLoading && (
              <div className="flex flex-col gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="card h-16 animate-pulse bg-gray-100" />
                ))}
              </div>
            )}
            {!suggestLoading && suggestions.length === 0 && (
              <p className="text-center text-gray-400 py-6 text-sm">کاربری برای پیشنهاد پیدا نشد</p>
            )}
            <div className="flex flex-col gap-3">
              {suggestions.map((p, i) => (
                <ProfileCard key={p.id} profile={p} isAdded={added.has(p.id)} onAdd={handleAdd} delay={i * 0.05} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Friends;
