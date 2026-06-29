import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { db } from '../db/db';
import { loadCurriculum } from '../lib/curriculum';
import PathNode from '../components/path/PathNode';
import UnitDivider from '../components/path/UnitDivider';
import DiamondDisplay from '../components/ui/DiamondDisplay';
import UnitIntroGeneric from '../components/questions/UnitIntroGeneric';
import PageBg from '../components/ui/PageBg';
import { UNIT_INTROS } from '../data/unitIntros';
import type { Unit, NodeProgress } from '../types';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollToNode = (location.state as { scrollToNode?: string } | null)?.scrollToNode;
  const currentUser = useStore((s) => s.currentUser);
  const [progressMap, setProgressMap] = useState<Record<string, NodeProgress>>({});
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [introUnit, setIntroUnit] = useState<Unit | null>(null);
  const didScrollRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 15000); // safety fallback
    loadCurriculum().then((u) => { setUnits(u); setLoading(false); }).finally(() => clearTimeout(timer));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    db.progress
      .where('userId')
      .equals(currentUser.id)
      .toArray()
      .then((rows) => {
        const map: Record<string, NodeProgress> = {};
        rows.forEach((r) => { map[r.nodeId] = r; });
        setProgressMap(map);
      });
  }, [currentUser]);

  // Scroll to the node the user just came from
  useEffect(() => {
    if (!scrollToNode || didScrollRef.current || loading) return;
    const el = document.querySelector(`[data-node-id="${scrollToNode}"]`);
    if (el) {
      didScrollRef.current = true;
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    }
  }, [scrollToNode, loading, units]);

  if (loading) {
    return (
      <div dir="rtl" className="h-full flex items-center justify-center">
        <p className="text-gray-500">در حال بارگذاری...</p>
      </div>
    );
  }

  if (!currentUser) {
    navigate('/');
    return null;
  }

  // Exclude intro nodes from the path — intro is shown via UnitDivider book button
  const allNodes = units.flatMap((u) =>
    u.nodes.filter((n) => n.type !== 'intro').map((n) => ({ ...n, unitColor: u.color }))
  );

  const isNodeCompleted = (nodeId: string) => !!progressMap[nodeId]?.completed;
  const isNodeUnlocked = (nodeId: string): boolean => {
    const idx = allNodes.findIndex((n) => n.id === nodeId);
    if (idx === 0) return true;
    return isNodeCompleted(allNodes[idx - 1].id);
  };

  const firstIncompleteNodeId = allNodes.find((n) => !isNodeCompleted(n.id))?.id ?? null;

  const greetHour = new Date().getHours();
  const greetText = greetHour < 12 ? 'صبح بخیر' : greetHour < 17 ? 'روز بخیر' : 'شب بخیر';

  const introData = introUnit ? UNIT_INTROS[introUnit.letter] : null;

  return (
    <div dir="rtl" className="min-h-full relative pb-24 overflow-hidden">
      <PageBg variant="blue" />

      {/* Unit intro overlay — shown for any unit */}
      {introUnit && introData && (
        <UnitIntroGeneric
          data={introData}
          onComplete={() => setIntroUnit(null)}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/70 backdrop-blur-sm shadow-sm px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">{greetText}،</p>
            <h1 className="text-xl font-extrabold text-gray-800">{currentUser.name} 👋</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-600 font-bold px-3 py-1 rounded-full text-sm">
              🔥 {currentUser.streakDays.toLocaleString('fa-IR')}
            </span>
            <DiamondDisplay count={currentUser.diamonds} />
          </div>
        </div>
      </div>

      {/* Path */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-5 pt-6">
        {units.length === 0 ? (
          <p className="text-gray-400 text-center py-10">محتوایی یافت نشد</p>
        ) : (
          units.map((unit) => {
            const lessonNodes = unit.nodes.filter((n) => n.type !== 'intro');
            const introAvailable = !!UNIT_INTROS[unit.letter];

            return (
              <React.Fragment key={unit.id}>
                <div className="w-full">
                  <UnitDivider
                    letter={unit.letter}
                    color={unit.color}
                    unitNumber={unit.order}
                    onPlayIntro={introAvailable ? () => setIntroUnit(unit) : undefined}
                  />
                </div>

                {lessonNodes.map((node) => {
                  const unlocked = isNodeUnlocked(node.id);
                  const completed = isNodeCompleted(node.id);
                  const isCurrent = node.id === firstIncompleteNodeId && unlocked;

                  return (
                    <div key={node.id} data-node-id={node.id}>
                      <PathNode
                        node={node}
                        isUnlocked={unlocked}
                        isCurrent={isCurrent}
                        isCompleted={completed}
                        unitColor={unit.color}
                        onClick={() => {
                          if (unlocked || completed) navigate(`/lesson/${node.id}`);
                        }}
                      />
                    </div>
                  );
                })}

                <div className="w-1 h-6 bg-gray-200 rounded-full" />
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Home;
