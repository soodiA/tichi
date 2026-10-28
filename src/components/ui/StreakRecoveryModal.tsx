import React from 'react';

interface StreakRecoveryModalProps {
  streakDays: number;
  missed: number;
  cost: number;
  coins: number;
  onPayCoins: () => void;
  onReset: () => void;
}

const StreakRecoveryModal: React.FC<StreakRecoveryModalProps> = ({
  streakDays,
  missed,
  cost,
  coins,
  onPayCoins,
  onReset,
}) => {
  const fa = (n: number) => n.toLocaleString('fa-IR');
  const canPayCoins = coins >= cost;

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6 text-center">
        <div className="text-5xl mb-2">🔥</div>
        <h2 className="text-lg font-extrabold text-gray-800 mb-2">استریکت در خطره!</h2>
        <p className="text-gray-600 text-sm leading-7 mb-4">
          {fa(missed)} روز درس نخوندی و استریک {fa(streakDays)} روزه‌ات داره از بین می‌ره.
          برای نگه داشتنش {fa(cost)} سکه بده ({fa(missed)} روز × {fa(cost / missed)} سکه).
        </p>

        <button
          onClick={onPayCoins}
          disabled={!canPayCoins}
          className="w-full py-3 rounded-2xl font-bold text-white bg-amber-500 disabled:bg-gray-300 mb-2"
        >
          🪙 پرداخت {fa(cost)} سکه
        </button>
        {!canPayCoins && (
          <p className="text-xs text-red-500 mb-2">موجودی سکه‌ات {fa(coins)} است و کافی نیست.</p>
        )}

        {/* Design only: real-money payment is not wired to a gateway yet. */}
        <button
          disabled
          className="w-full py-3 rounded-2xl font-bold text-white bg-green-500 opacity-40 cursor-not-allowed mb-1"
        >
          پرداخت {fa((cost / 40) * 2000)} تومان
        </button>
        <p className="text-xs text-gray-400 mb-3">پرداخت آنلاین به‌زودی فعال می‌شود</p>

        <button onClick={onReset} className="w-full py-2 text-sm font-bold text-gray-500">
          استریک صفر شود
        </button>
      </div>
    </div>
  );
};

export default StreakRecoveryModal;
