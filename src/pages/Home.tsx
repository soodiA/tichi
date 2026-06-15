import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { db } from '../db/db';
import { UNITS } from '../data/curriculum';
import PathNode from '../components/path/PathNode';
import UnitDivider from '../components/path/UnitDivider';
import DiamondDisplay from '../components/ui/DiamondDisplay';
import type { NodeProgress } from '../types';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const [progressMap, setProgressMap] = useState<Record<string, NodeProgress>>({});

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

  if (!currentUser) {
    return (
      <div dir="rtl" className="h-full flex items-center justify-center">
        <p className="text-gray-500">در حال بارگذاری...</p>
      </div>
    );
  }

  // Build flat node list to check unlock logic
  const allNodes = UNITS.flatMap((u) => u.nodes.map((n) => ({ ...n, unitColor: u.color })));

  const isNodeCompleted = (nodeId: string) => !!progressMap[nodeId]?.completed;

  const isNodeUnlocked = (nodeId: string): boolean => {
    const idx = allNodes.findIndex((n) => n.id === nodeId);
    if (idx === 0) return true;
    const prev = allNodes[idx - 1];
    return isNodeCompleted(prev.id);
  };

  const firstIncompleteNodeId = allNodes.find((n) => !isNodeCompleted(n.id))?.id ?? null;

  const greetHour = new Date().getHours();
  const greetText =
    greetHour < 12 ? 'صبح بخیر' : greetHour < 17 ? 'روز بخیر' : 'شب بخیر';

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
        {UNITS.map((unit) => (
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
                    if (unlocked || completed) {
                      navigate(`/lesson/${node.id}`);
                    }
                  }}
                />
              );
            })}

            <div className="w-1 h-6 bg-gray-200 rounded-full" />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Home;
