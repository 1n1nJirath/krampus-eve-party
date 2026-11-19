import React from 'react';
import { BookOpen, Eye, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { SafeActionButton } from '../SafeActionButton';

export interface StepConfig {
  label: string;
  sublabel?: string;
  onClick: () => void;
  disabled?: boolean;
  loadingText?: string;
}

interface RoundStepperBarProps {
  activeStep: 1 | 2 | 3 | 4;
  step1: StepConfig;
  step2: StepConfig;
  step3: StepConfig;
  step4: StepConfig;
  briefingOpen?: boolean;
  onToggleBriefing?: () => void;
  secondaryStep3Action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

export const RoundStepperBar: React.FC<RoundStepperBarProps> = ({
  activeStep,
  step1,
  step2,
  step3,
  step4,
  briefingOpen,
  onToggleBriefing,
  secondaryStep3Action,
}) => {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-700/80 p-3 shadow-lg space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-mono font-extrabold text-slate-300 uppercase tracking-wider">
          ลำดับควบคุมรอบ (1 ➔ 2 ➔ 3 ➔ 4)
        </span>
        {onToggleBriefing && (
          <SafeActionButton
            type="button"
            showSpinner={false}
            onClick={onToggleBriefing}
            className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] flex items-center gap-1.5 transition ${
              briefingOpen
                ? 'bg-amber-400 text-slate-950 border-white shadow'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{briefingOpen ? 'ปิด Demo กติกา ➔ Standby' : '📖 เปิด Demo กติกาขึ้นจอ'}</span>
          </SafeActionButton>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
        {/* Step 1: Neutral Standby */}
        <SafeActionButton
          type="button"
          disabled={step1.disabled}
          loadingText={step1.loadingText || 'กำลังโหลด...'}
          onClick={step1.onClick}
          className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between gap-1 ${
            step1.disabled
              ? 'bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed'
              : activeStep === 1
              ? 'bg-slate-800 border-slate-300 text-white shadow'
              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-black">
            <RotateCcw className="w-4 h-4 text-slate-300 shrink-0" />
            <span>{step1.label}</span>
          </div>
          {step1.sublabel && (
            <span className="text-[11px] text-slate-400 leading-tight">{step1.sublabel}</span>
          )}
        </SafeActionButton>

        {/* Step 2: Emerald Start / Go */}
        <SafeActionButton
          type="button"
          disabled={step2.disabled}
          loadingText={step2.loadingText || 'กำลังเปิด...'}
          onClick={step2.onClick}
          className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between gap-1 ${
            step2.disabled
              ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-500/50 cursor-not-allowed'
              : activeStep === 2
              ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-300 text-white ring-2 ring-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
              : 'bg-emerald-700/80 hover:bg-emerald-600 border-emerald-500/70 text-white'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-black">
            <Play className="w-4 h-4 fill-current shrink-0" />
            <span>{step2.label}</span>
          </div>
          {step2.sublabel && (
            <span className="text-[11px] text-emerald-100/80 leading-tight">
              {step2.sublabel}
            </span>
          )}
        </SafeActionButton>

        {/* Step 3: Amber Lock / Reveal */}
        <div className="flex flex-col gap-1">
          <SafeActionButton
            type="button"
            disabled={step3.disabled}
            loadingText={step3.loadingText || 'กำลังประมวลผล...'}
            onClick={step3.onClick}
            className={`flex-1 p-3 rounded-xl border-2 text-left transition flex flex-col justify-between gap-1 ${
              step3.disabled
                ? 'bg-amber-950/25 border-amber-900/40 text-amber-500/40 cursor-not-allowed'
                : activeStep === 3
                ? 'bg-amber-500 hover:bg-amber-400 border-white text-slate-950 ring-2 ring-amber-300/60 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                : 'bg-amber-600/85 hover:bg-amber-500 border-amber-400/70 text-slate-950'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-black">
              {step3.label.includes('ล็อก') ? (
                <Pause className="w-4 h-4 fill-current shrink-0" />
              ) : (
                <Eye className="w-4 h-4 shrink-0" />
              )}
              <span>{step3.label}</span>
            </div>
            {step3.sublabel && (
              <span
                className={`text-[11px] leading-tight ${
                  step3.disabled ? 'text-amber-500/40' : 'text-slate-900 font-semibold'
                }`}
              >
                {step3.sublabel}
              </span>
            )}
          </SafeActionButton>
          {secondaryStep3Action && (
            <SafeActionButton
              type="button"
              showSpinner={false}
              disabled={secondaryStep3Action.disabled}
              onClick={secondaryStep3Action.onClick}
              className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[10px] font-bold text-center transition"
            >
              {secondaryStep3Action.label}
            </SafeActionButton>
          )}
        </div>

        {/* Step 4: Sky Next Question */}
        <SafeActionButton
          type="button"
          disabled={step4.disabled}
          loadingText={step4.loadingText || 'กำลังไปข้อถัดไป...'}
          onClick={step4.onClick}
          className={`p-3 rounded-xl border-2 text-left transition flex flex-col justify-between gap-1 ${
            step4.disabled
              ? 'bg-sky-950/25 border-sky-900/40 text-sky-500/40 cursor-not-allowed'
              : activeStep === 4
              ? 'bg-sky-500 hover:bg-sky-400 border-white text-slate-950 ring-2 ring-sky-300/60 shadow-[0_0_20px_rgba(14,165,233,0.4)]'
              : 'bg-sky-700/80 hover:bg-sky-600 border-sky-400/70 text-white'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-black">
            <SkipForward className="w-4 h-4 shrink-0" />
            <span>{step4.label}</span>
          </div>
          {step4.sublabel && (
            <span
              className={`text-[11px] leading-tight ${
                activeStep === 4 ? 'text-slate-900 font-semibold' : 'text-sky-100/80'
              }`}
            >
              {step4.sublabel}
            </span>
          )}
        </SafeActionButton>
      </div>
    </div>
  );
};
