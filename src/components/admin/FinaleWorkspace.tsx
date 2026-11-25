import React, { useState } from 'react';
import { Crown, Map, RotateCcw, Trophy, Clipboard, Download, Check } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { computeFinaleSharedRanking } from '../../logic/adminFlowLogic';
import { SafeActionButton } from '../SafeActionButton';
import { TeamSouthParkAvatar } from '../SouthParkArt';

export const FinaleWorkspace: React.FC = () => {
  const {
    state,
    setGameStage,
    setShowLeaderboardOverlay,
    resetAllGameData,
  } = useGame();

  const { teams, round } = state;
  const championId = round.lastMan?.winnerTeamId;
  const finaleRanked = computeFinaleSharedRanking(state);

  const [copied, setCopied] = useState(false);

  const handleCopySummary = () => {
    const lines = [
      '🎄🏆 สรุปอันดับสุดท้าย "THE KRAMPUS EVE" 👹🏆',
      '==========================================',
    ];
    finaleRanked.forEach(({ team: t, rank, ordinalLabel }) => {
      const medal =
        rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';
      lines.push(`${medal} ${ordinalLabel}: ${t.icon} ${t.name}`);
    });
    lines.push('==========================================');
    lines.push('ขอบคุณผู้กล้าทุกคนที่ร่วมเอาชีวิตรอดในคืนคริสต์มาสอีฟ!');

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadJson = () => {
    const data = {
      event: 'THE KRAMPUS EVE',
      timestamp: new Date().toISOString(),
      championId,
      championName: championId ? teams[championId]?.name : finaleRanked[0]?.team.name || null,
      finalRankings: finaleRanked.map(({ team: t, rank, ordinalLabel }) => ({
        rank,
        rankLabel: ordinalLabel,
        teamId: t.id,
        name: t.name,
        icon: t.icon,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `krampus-eve-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

            <button
              type="button"
              onClick={handleCopySummary}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs border flex items-center gap-1.5 transition ${
                copied
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/50'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกลงคลิปบอร์ดแล้ว!' : '📋 สรุปผลลง LINE/Discord'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/50 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>💾 ดาวน์โหลด JSON</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {finaleRanked.map(({ team: t, rank, ordinalLabel }) => {
            const isWinner = rank === 1;
            return (
              <div
                key={t.id}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                  isWinner
                    ? 'bg-amber-950/50 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`px-2.5 min-w-[3rem] h-12 rounded-xl border-2 flex items-center justify-center font-mono font-black text-xs shrink-0 whitespace-nowrap ${
                      isWinner
                        ? 'bg-amber-400 text-slate-950 border-white'
                        : 'bg-slate-900 border-slate-700 text-amber-300'
                    }`}
                  >
                    {ordinalLabel}
                  </span>
                  <TeamSouthParkAvatar slotNumber={t.number} className="w-12 h-12 shrink-0" />
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{t.icon}</span>
                    <span className="font-black text-lg text-white truncate">{t.name}</span>
                  </div>
                </div>

                {isWinner && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-xs font-black shrink-0">
                    🏆 CHAMPION
                  </span>
                )}
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
