import React, { useState } from 'react';
import { Cog, EyeOff, Map, Shuffle, Users } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { SafeActionButton } from '../SafeActionButton';
import { RoundStepperBar } from './RoundStepperBar';

interface Game3ToyFactoryWorkspaceProps {
  onAdvanceToGame4: () => void;
  onOpenTeamsSettings: () => void;
}

export const Game3ToyFactoryWorkspace: React.FC<Game3ToyFactoryWorkspaceProps> = ({
  onAdvanceToGame4,
  onOpenTeamsSettings,
}) => {
  const {
    state,
    startToyFactoryGame,
    selectToyFactoryDataset,
    startToyFactoryActionPhase,
    resumeToyFactoryFromBuffer,
    enterToyFactoryRevealPhase,
    judgeToyFactorySlot,
    revealToyFactoryMystery,
    finalizeToyFactoryRound,
    nextToyFactoryRound,
    updateToyFactoryDataset,
    finishToyFactoryGame,
    startLastManStandingGame,
    updateRoundConfig,
    startTimer,
    lockRound,
    revealRound,
    resetRoundSubmissions,
  } = useGame();

  const { round, teams } = state;
  const [subTab, setSubTab] = useState<'LIVE' | 'EDIT'>('LIVE');

  const isOnAir = round.gameStage === 'QUIXORT' && Boolean(round.toyFactory);
  const isFreestyleOnAir =
    round.gameStage === 'QUIXORT' && !round.toyFactory && round.id.startsWith('free-');
  const tf = round.toyFactory;
  const datasets = state.toyFactoryDatasets || [];
  const pair = tf?.pairings?.[tf.roundIndex - 1];
  const activeDs = datasets.find((d) => d.id === tf?.selectedDatasetId);
  const wrongCount = tf?.revealSlots?.filter((s) => s.verdict === 'WRONG').length ?? 0;

  const isStandbyTopicSelect =
    isOnAir && tf?.phase === 'TOPIC_SELECT' && round.status === 'IDLE';
  const isWaitingForDatasetPick =
    isOnAir && tf?.phase === 'TOPIC_SELECT' && round.status === 'ACTIVE';

  const handleNext = () => {
    if (!tf) return;
    if (tf.roundIndex >= tf.pairings.length) {
      finishToyFactoryGame();
    } else {
      nextToyFactoryRound();
    }
  };

  const activeStep: 1 | 2 | 3 | 4 = !tf
    ? 1
    : isStandbyTopicSelect || tf.phase === 'PREP_10S' || tf.phase === 'SHUFFLE_BUFFER_10S'
    ? 2
    : isWaitingForDatasetPick
    ? 2
    : tf.phase === 'ACTION' || (tf.phase === 'REVEAL_JUDGE' && !round.rewardsApplied)
    ? 3
    : 4;

  return (
    <div className="space-y-4">
      {/* Header + Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cog className="w-5 h-5 text-purple-400" />
          <h2 className="text-base md:text-lg font-black text-white">
            เกมที่ 3: The Toy Factory Chaos (4 รอบ)
          </h2>
          {isOnAir && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400 text-purple-200 text-[10px] font-mono font-black">
              รอบ {tf?.roundIndex}/{tf?.pairings.length} • {tf?.phase}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTeamsSettings}
            className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>รายชื่อสมาชิก</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setSubTab('LIVE')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition ${
                subTab === 'LIVE'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🎮 Live Control
            </button>
            <button
              type="button"
              onClick={() => setSubTab('EDIT')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition ${
                subTab === 'EDIT'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              📝 Edit Datasets (5 ชุด)
            </button>
          </div>
        </div>
      </div>

      {subTab === 'LIVE' ? (
        !isOnAir || !tf || !pair ? (
          <div className="space-y-4">
            {isFreestyleOnAir && (
              <div className="space-y-3 rounded-2xl bg-slate-900 border border-amber-500/50 p-4">
                <div className="text-xs font-mono font-black text-amber-300 uppercase">
                  ⚡ FREESTYLE ON AIR • {round.title}
                </div>
                <RoundStepperBar
                  activeStep={
                    round.status === 'IDLE' ? 2 : round.status === 'REVEALED' ? 4 : 3
                  }
                  step1={{
                    label: '1. Standby / ล้างคำตอบ',
                    onClick: resetRoundSubmissions,
                  }}
                  step2={{
                    label: '2. ▶️ เปิดโจทย์ & จับเวลา',
                    disabled: round.status === 'ACTIVE',
                    onClick: () => startTimer(),
                  }}
                  step3={{
                    label:
                      round.status === 'ACTIVE'
                        ? '3. ⏸️ ล็อกคำตอบ'
                        : '3. ✨ เฉลย & คิดคะแนน',
                    disabled: round.status === 'IDLE' || round.status === 'REVEALED',
                    onClick: round.status === 'ACTIVE' ? lockRound : () => revealRound(),
                  }}
                  step4={{
                    label: '4. ⏭️ รอบถัดไป (Standby)',
                    onClick: resetRoundSubmissions,
                  }}
                />
              </div>
            )}
            <div className="rounded-2xl bg-purple-950/35 border-2 border-purple-400/60 p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-base font-black text-white">
                  พร้อมเริ่มเกมที่ 3: สุ่มจับคู่ทีมจัดเรียง vs ทีมถือข้อมูล (4 รอบ)
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  กดปุ่มด้านขวาเพื่อสุ่มจับคู่ 4 รอบ และเข้าสู่โหมด 🟡 STANDBY (ล็อกปุ่มเลือกหัวข้อไว้จนกว่า Host จะกดเริ่ม)
                </p>
              </div>
              <SafeActionButton
                type="button"
                loadingText="กำลังสุ่มจับคู่..."
                onClick={startToyFactoryGame}
                className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm shadow-lg transition shrink-0"
              >
                🎲 เริ่มเกมที่ 3 (เข้าโหมด STANDBY)
              </SafeActionButton>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active Pairing & Shuffle Status Strip */}
            <div className="rounded-2xl bg-slate-900 border border-purple-500/40 p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/50 text-emerald-200 font-black">
                  🏃 ทีมเรียง: {teams[pair.sortingTeamId].icon} {teams[pair.sortingTeamId].name}
                </span>
                <span className="text-slate-500 font-bold">vs</span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-950 border border-amber-500/50 text-amber-200 font-black">
                  📜 ทีมถือโพย: {teams[pair.holdingTeamId].icon} {teams[pair.holdingTeamId].name}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 ${
                    tf.shuffleUsedThisRound
                      ? 'bg-red-950 border border-red-500/50 text-red-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <Shuffle className="w-3 h-3" />
                  <span>{tf.shuffleUsedThisRound ? 'ใช้ Shuffle รอบนี้แล้ว' : 'Shuffle พร้อมใช้'}</span>
                </span>

                <SafeActionButton
                  type="button"
                  showSpinner={false}
                  onClick={() => {
                    if (window.confirm('สุ่มจับคู่เริ่มเกมที่ 3 ใหม่ตั้งแต่รอบที่ 1?')) {
                      startToyFactoryGame();
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/40 font-bold"
                >
                  🎲 สุ่มคู่ใหม่
                </SafeActionButton>
              </div>
            </div>

            {/* 4-Step Linear Wizard */}
            <RoundStepperBar
              activeStep={activeStep}
              briefingOpen={Boolean(round.briefingOpen)}
              onToggleBriefing={() => updateRoundConfig({ briefingOpen: !round.briefingOpen })}
              step1={{
                label: '1. Standby / คู่ปัจจุบัน',
                sublabel: isStandbyTopicSelect ? 'กำลัง Standby (ปุ่ม /play ล็อกอยู่)' : `รอบ ${tf.roundIndex}/4`,
                onClick: () =>
                  updateRoundConfig({
                    briefingOpen: false,
                    status: tf.phase === 'TOPIC_SELECT' ? 'IDLE' : round.status,
                  }),
              }}
              step2={{
                label:
                  tf.phase === 'TOPIC_SELECT'
                    ? isWaitingForDatasetPick
                      ? '2. ⏳ รอทีมเรียงเลือกหัวข้อ...'
                      : '2. ▶️ ปลดล็อกให้เลือกหัวข้อ'
                    : tf.phase === 'PREP_10S'
                    ? '2. ▶️ ครบ 20 วิ: เริ่มจับเวลาหลัก!'
                    : tf.phase === 'SHUFFLE_BUFFER_10S'
                    ? '2. ▶️ ครบ Buffer: เดินเวลาต่อ!'
                    : '2. ⏱️ กำลังเดินเวลาหลัก',
                sublabel:
                  tf.phase === 'TOPIC_SELECT'
                    ? 'ปลดล็อกให้ทีมจัดเรียงจิ้มโจทย์บนมือถือ'
                    : tf.phase === 'PREP_10S'
                    ? 'หลังทีมถือโพยเช็กข้อมูล 20 วิครบ (ซ่อนอัตโนมัติ)'
                    : tf.phase === 'SHUFFLE_BUFFER_10S'
                    ? 'หลังสลับคนถือโพย 10 วิครบ'
                    : 'ช่วงทีมจัดเรียงวิ่งล่าคำตอบ',
                disabled:
                  isWaitingForDatasetPick ||
                  tf.phase === 'ACTION' ||
                  tf.phase === 'REVEAL_JUDGE',
                onClick: () => {
                  if (tf.phase === 'TOPIC_SELECT') {
                    startTimer();
                  } else if (tf.phase === 'PREP_10S') {
                    startToyFactoryActionPhase();
                  } else if (tf.phase === 'SHUFFLE_BUFFER_10S') {
                    resumeToyFactoryFromBuffer();
                  }
                },
              }}
              step3={{
                label:
                  tf.phase === 'REVEAL_JUDGE'
                    ? round.rewardsApplied
                      ? '3. ✓ คิดเงินรอบนี้แล้ว'
                      : '3. 💰 คิดเงิน & คำสาปรอบนี้'
                    : '3. ⏸️ เข้าหน้าตรวจคำตอบ',
                sublabel:
                  tf.phase === 'ACTION'
                    ? 'หยุดเวลา & ตรวจลำดับซ้ายไปขวา'
                    : tf.phase === 'REVEAL_JUDGE'
                    ? `ผิดสะสม ${wrongCount} จุด (-${wrongCount * 100} ฿)`
                    : 'เข้าได้เมื่อเข้าสู่ช่วง Action',
                disabled:
                  (tf.phase !== 'ACTION' && tf.phase !== 'REVEAL_JUDGE') ||
                  (tf.phase === 'REVEAL_JUDGE' && Boolean(round.rewardsApplied)),
                onClick: () => {
                  if (tf.phase === 'ACTION') {
                    enterToyFactoryRevealPhase();
                  } else if (tf.phase === 'REVEAL_JUDGE') {
                    finalizeToyFactoryRound();
                  }
                },
              }}
              step4={{
                label:
                  tf.roundIndex >= tf.pairings.length
                    ? '4. 🏁 จบเกมที่ 3 ➔ กลับ Lobby & สรุปคะแนน'
                    : `4. ⏭️ รอบที่ ${tf.roundIndex + 1} (Standby)`,
                sublabel:
                  tf.roundIndex >= tf.pairings.length
                    ? 'กลับหน้า Lobby พร้อมเปิด Popup ตารางคะแนนสะสม'
                    : 'กลับเข้าโหมด Standby รอบถัดไป',
                onClick: handleNext,
              }}
            />

            {/* Phase Specific Workspace */}
            {tf.phase === 'TOPIC_SELECT' && (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-amber-300">
                      {isStandbyTopicSelect
                        ? '🟡 STANDBY — กด Step 2 เพื่อให้ทีมจัดเรียงเห็น & เลือกชุดข้อมูล'
                        : '🟢 ปลดล็อกแล้ว — รอทีมจัดเรียงเลือกบนมือถือ (หรือ Host กดเลือกแทนด้านล่าง)'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {datasets.map((ds) => {
                    const used = tf.usedDatasetIds.includes(ds.id);
                    return (
                      <div
                        key={ds.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                          used
                            ? 'bg-slate-950/40 border-slate-800 opacity-50'
                            : 'bg-slate-950 border-slate-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white truncate">{ds.title}</div>
                          <div className="text-[11px] text-amber-300 truncate">{ds.direction}</div>
                        </div>
                        <SafeActionButton
                          type="button"
                          showSpinner={false}
                          disabled={used || isStandbyTopicSelect}
                          onClick={() => selectToyFactoryDataset(pair.sortingTeamId, ds.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-[11px] shrink-0"
                        >
                          {used ? 'ใช้แล้ว' : 'เลือกแทน'}
                        </SafeActionButton>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(tf.phase === 'PREP_10S' ||
              tf.phase === 'ACTION' ||
              tf.phase === 'SHUFFLE_BUFFER_10S') && (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono text-purple-300 font-bold">
                      HOST SECRET VIEW — รายชื่อคนถือข้อมูลรอบนี้
                    </div>
                    {activeDs && (
                      <div className="text-sm font-black text-white">
                        {activeDs.title} • <span className="text-amber-300">{activeDs.direction}</span>
                      </div>
                    )}
                  </div>
                  <SafeActionButton
                    type="button"
                    showSpinner={false}
                    onClick={finishToyFactoryGame}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1"
                  >
                    <Map className="w-3 h-3" />
                    <span>กลับ World Map</span>
                  </SafeActionButton>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {tf.assignments.map((a, idx) => (
                    <div
                      key={`${a.itemId}-${idx}`}
                      className={`p-2.5 rounded-xl border text-xs ${
                        a.isMystery
                          ? 'bg-purple-950/40 border-purple-400/70'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="font-bold text-amber-300 truncate">👤 {a.memberName}</div>
                      <div className="font-black text-white mt-0.5 truncate">
                        {a.isMystery ? `❓ [${a.label}]` : a.label}
                      </div>
                      <div className="text-[11px] font-mono text-emerald-300 mt-0.5">
                        ค่าจริง: {a.realValue}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tf.phase === 'REVEAL_JUDGE' && (
              <div className="rounded-2xl bg-slate-900 border border-amber-500/50 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-amber-300">
                    📋 กดตรวจลำดับจากซ้ายไปขวา (ผิดสะสม: {wrongCount} จุด = -{wrongCount * 100} ฿)
                  </span>
                  {activeDs && (
                    <span className="text-xs text-slate-300 font-bold">{activeDs.direction}</span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {tf.revealSlots.map((slot) => (
                    <div
                      key={slot.index}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                        slot.verdict === 'CORRECT'
                          ? 'bg-emerald-950/60 border-emerald-400'
                          : slot.verdict === 'WRONG'
                          ? 'bg-red-950/60 border-red-500'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-black text-white truncate">
                          #{slot.index + 1} {slot.isMystery ? `❓ [${slot.label}]` : slot.label}{' '}
                          <span className="text-amber-300">({slot.realValue})</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          คนถือ: {slot.holderName}
                          {slot.isMystery && slot.mysteryClue ? ` • ใบ้: ${slot.mysteryClue}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {slot.isMystery && !slot.revealed && (
                          <SafeActionButton
                            type="button"
                            showSpinner={false}
                            onClick={() => revealToyFactoryMystery(slot.index)}
                            className="px-2 py-1 rounded bg-amber-400 text-black font-black"
                          >
                            🔦 เปิด ???
                          </SafeActionButton>
                        )}
                        <SafeActionButton
                          type="button"
                          showSpinner={false}
                          onClick={() => judgeToyFactorySlot(slot.index, 'CORRECT')}
                          className={`px-2 py-1 rounded font-black ${
                            slot.verdict === 'CORRECT'
                              ? 'bg-emerald-500 text-black'
                              : 'bg-slate-800 text-emerald-300'
                          }`}
                        >
                          ✓ ถูก
                        </SafeActionButton>
                        <SafeActionButton
                          type="button"
                          showSpinner={false}
                          onClick={() => judgeToyFactorySlot(slot.index, 'WRONG')}
                          className={`px-2 py-1 rounded font-black ${
                            slot.verdict === 'WRONG'
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-800 text-red-300'
                          }`}
                        >
                          ✗ ผิด
                        </SafeActionButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        /* EDIT DATASETS SUB-TAB */
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
          <div className="text-xs font-black text-purple-300">
            📚 แก้ไขคลังชุดข้อมูลเกมที่ 3 (5 ชุด — ติ๊ก ??? และใส่คำใบ้ขอบเขตได้)
          </div>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {datasets.map((ds, dIdx) => (
              <div
                key={ds.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={ds.title}
                    onChange={(e) => updateToyFactoryDataset(ds.id, { title: e.target.value })}
                    placeholder={`หัวข้อที่ ${dIdx + 1}`}
                    className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                  />
                  <input
                    type="text"
                    value={ds.direction}
                    onChange={(e) => updateToyFactoryDataset(ds.id, { direction: e.target.value })}
                    placeholder="ทิศทางการเรียง"
                    className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-amber-300"
                  />
                </div>
                <div className="space-y-1">
                  {ds.items.map((item, iIdx) => (
                    <div key={item.id} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="w-5 text-slate-400 font-mono">#{iIdx + 1}</span>
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => {
                          const nextItems = ds.items.map((it) =>
                            it.id === item.id ? { ...it, label: e.target.value } : it
                          );
                          updateToyFactoryDataset(ds.id, { items: nextItems });
                        }}
                        className="flex-1 min-w-[120px] px-2 py-1 rounded bg-slate-900 border border-slate-800 text-white"
                      />
                      <input
                        type="text"
                        value={item.realValue}
                        onChange={(e) => {
                          const nextItems = ds.items.map((it) =>
                            it.id === item.id ? { ...it, realValue: e.target.value } : it
                          );
                          updateToyFactoryDataset(ds.id, { items: nextItems });
                        }}
                        className="w-24 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300 font-mono"
                      />
                      <label className="flex items-center gap-1 text-purple-300 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(item.isMystery)}
                          onChange={(e) => {
                            const nextItems = ds.items.map((it) => ({
                              ...it,
                              isMystery: it.id === item.id ? e.target.checked : false,
                            }));
                            updateToyFactoryDataset(ds.id, { items: nextItems });
                          }}
                        />
                        <span>???</span>
                      </label>
                      {item.isMystery && (
                        <input
                          type="text"
                          value={item.mysteryClue || ''}
                          onChange={(e) => {
                            const nextItems = ds.items.map((it) =>
                              it.id === item.id ? { ...it, mysteryClue: e.target.value } : it
                            );
                            updateToyFactoryDataset(ds.id, { items: nextItems });
                          }}
                          placeholder="คำใบ้ขอบเขต..."
                          className="flex-1 min-w-[130px] px-2 py-1 rounded bg-purple-950/50 border border-purple-500/50 text-purple-200"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
