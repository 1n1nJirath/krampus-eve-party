import React from 'react';
import { Crown, Map, RotateCcw, Trophy } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { TEAM_ORDER } from '../../data/initialData';
import { SafeActionButton } from '../SafeActionButton';

export const FinaleWorkspace: React.FC = () => {
  const {
    state,
    setGameStage,
    setShowLeaderboardOverlay,
    resetAllGameData,
  } = useGame();

  const { teams, round } = state;
  const championId = round.lastMan?.winnerTeamId;

  const rankedTeams = [...TEAM_ORDER].sort((a, b) => {
    if (a === championId) return -1;
    if (b === championId) return 1;
    return teams[b].coins - teams[a].coins;
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-red-950/60 border-2 border-amber-400/60 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-black text-amber-300 uppercase">
              <Crown className="w-4 h-4" />
              <span>FINALE & JUDGMENT CEREMONY</span>
            </div>
            <h2 className="text-xl font-black text-white mt-0.5">
              คำพิพากษาแห่งครามปุส & ตารางสรุปแชมป์
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SafeActionButton
              type="button"
              loadingText="กำลังเปิด Finale..."
              onClick={() => setGameStage('FINALE')}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg"
            >
              <Trophy className="w-4 h-4" />
              <span>🏆 แสดงหน้า Finale บนจอ /display</span>
            </SafeActionButton>

            <SafeActionButton
              type="button"
              showSpinner={false}
              onClick={() => setShowLeaderboardOverlay(!state.showLeaderboardOverlay)}
              className={`px-3.5 py-2 rounded-xl font-black text-xs border transition ${
                state.showLeaderboardOverlay
                  ? 'bg-emerald-500 text-slate-950 border-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              {state.showLeaderboardOverlay ? 'ซ่อน Leaderboard Overlay' : 'เปิด Leaderboard Overlay'}
            </SafeActionButton>

            <SafeActionButton
              type="button"
              showSpinner={false}
              onClick={() => setGameStage('WORLD_MAP')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1"
            >
              <Map className="w-3.5 h-3.5" />
              <span>กลับ World Map</span>
            </SafeActionButton>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rankedTeams.map((tid, idx) => {
            const t = teams[tid];
            const isWinner = tid === championId || (idx === 0 && !championId);
            return (
              <div
                key={tid}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                  isWinner
                    ? 'bg-amber-950/50 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-mono font-black text-amber-300 shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{t.icon}</span>
                      <span className="font-black text-base text-white truncate">{t.name}</span>
                      {tid === championId && (
                        <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black shrink-0">
                          LMS CHAMPION
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t.shields > 0 ? `Nice List (🛡️×${t.shields})` : 'Naughty List (0 🛡️)'}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-black text-lg text-amber-300">
                    {t.coins.toLocaleString()} ฿
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Danger Zone Reset */}
      <div className="rounded-2xl bg-red-950/25 border border-red-800/60 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-red-300">🔄 รีเซ็ตระบบเพื่อเริ่มรอบงานใหม่ทั้งหมด</div>
          <div className="text-xs text-slate-400">
            คืนค่า 1,000 ฿, 3 เกราะ, ล้างสถานะด่านและกลับสู่หน้า Lobby เริ่มต้น (ถามยืนยันก่อนทำงาน)
          </div>
        </div>
        <SafeActionButton
          type="button"
          showSpinner={false}
          onClick={() => {
            if (
              window.confirm(
                'ยืนยันการรีเซ็ตเหรียญ 1,000 ฿ และเกราะ 3 ดวงของทุกทีมกลับเป็นค่าเริ่มต้นทั้งหมดหรือไม่?'
              )
            ) {
              resetAllGameData();
            }
          }}
          className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-black text-xs flex items-center gap-1.5 shadow"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>รีเซ็ตเกมใหม่ทั้งหมด</span>
        </SafeActionButton>
      </div>
    </div>
  );
};
