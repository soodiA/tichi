import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { db } from '../db/db';
import { loadCurriculum } from '../lib/curriculum';
import PathNode from '../components/path/PathNode';
import UnitDivider from '../components/path/UnitDivider';
import DiamondDisplay from '../components/ui/DiamondDisplay';
import type { Unit, NodeProgress } from '../types';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const [progressMap, setProgressMap] = useState<Record<string, NodeProgress>>({});
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurriculum().then((u) => { setUnits(u); setLoading(false); });
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

  if (!currentUser || loading) {
    return (
      <div dir="rtl" className="h-full flex items-center justify-center">
        <p className="text-gray-500">در حال بارگذاری...</p>
      </div>
    );
  }

  const allNodes = units.flatMap((u) => u.nodes.map((n) => ({ ...n, unitColor: u.color })));

  const isNodeCompleted = (nodeId: string) => !!progressMap[nodeId]?.completed;
  const isNodeUnlocked = (nodeId: string): boolean => {
    const idx = allNodes.findIndex((n) => n.id === nodeId);
    if (idx === 0) return true;
    return isNodeCompleted(allNodes[idx - 1].id);
  };

  const firstIncompleteNodeId = allNodes.find((n) => !isNodeCompleted(n.id))?.id ?? null;

  const greetHour = new Date().getHours();
  const greetText = greetHour < 12 ? 'صبح بخیر' : greetHour < 17 ? 'روز بخیر' : 'شب بخیر';

  return (
    <div dir="rtl" className="min-h-full bg-bg pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg shadow-sm px-5 pt-5 pb-3">
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
      <div className="flex flex-col items-center gap-4 px-5 pt-6">
        {units.length === 0 ? (
          <p className="text-gray-400 text-center py-10">محتوایی یافت نشد</p>
        ) : (
          units.map((unit) => (
            <React.Fragment key={unit.id}>
              <div className="w-full">
                <UnitDivider letter={unit.letter} color={unit.color} unitNumber={unit.order} />
              </div>

              {unit.nodes.map((node) => {
                const unlocked = isNodeUnlocked(node.id);
                const completed = isNodeCompleted(node.id);
                const isCurrent = node.id === firstIncompleteNodeId && unlocked;

                return (
                  <PathNode
                    key={node.id}
                    node={node}
                    isUnlocked={unlocked}
                    isCurrent={isCurrent}
                    isCompleted={completed}
                    unitColor={unit.color}
                    onClick={() => {
                      if (unlocked || completed) navigate(`/lesson/${node.id}`);
                    }}
                  />
                );
              })}

              <div className="w-1 h-6 bg-gray-200 rounded-full" />
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
};

export default Home;
