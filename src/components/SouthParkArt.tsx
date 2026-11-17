import React from 'react';
import { GameStage } from '../types/game';

/**
 * Brown furry South Park cutout Krampus with Santa hat & wooden sign
 * ("ยินดีต้อนรับเด็กดื้อ!"), gift boxes & gold coins (Lobby bottom-right)
 */
export const KrampusSignCharacter: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 260 230" className={className}>
    {/* Gold Coins Pile */}
    <g stroke="#000" strokeWidth="2.5">
      <ellipse cx="42" cy="196" rx="14" ry="6" fill="#facc15" />
      <ellipse cx="42" cy="190" rx="14" ry="6" fill="#fde047" />
      <ellipse cx="42" cy="184" rx="14" ry="6" fill="#facc15" />
      <ellipse cx="64" cy="202" rx="14" ry="6" fill="#eab308" />
      <ellipse cx="64" cy="196" rx="14" ry="6" fill="#fde047" />
      <ellipse cx="22" cy="203" rx="12" ry="5" fill="#facc15" />
    </g>

    {/* Wrapped Gift Boxes */}
    <g stroke="#000" strokeWidth="3">
      {/* Green Gift */}
      <rect x="76" y="156" width="44" height="44" rx="3" fill="#15803d" />
      <rect x="94" y="156" width="8" height="44" fill="#dc2626" />
      <rect x="76" y="174" width="44" height="8" fill="#dc2626" />
      {/* Red Gift */}
      <rect x="108" y="168" width="40" height="36" rx="3" fill="#dc2626" />
      <rect x="124" y="168" width="8" height="36" fill="#facc15" />
      <rect x="108" y="182" width="40" height="8" fill="#facc15" />
      {/* Gold Lid Box */}
      <rect x="132" y="146" width="38" height="32" rx="3" fill="#facc15" />
      <rect x="147" y="146" width="8" height="32" fill="#dc2626" />
    </g>

    {/* Tail */}
    <path
      d="M206 168 Q238 152 242 126"
      fill="none"
      stroke="#000"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <path
      d="M206 168 Q238 152 242 126"
      fill="none"
      stroke="#4a2c22"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <polygon points="242,118 250,130 235,129" fill="#4a2c22" stroke="#000" strokeWidth="2.5" />

    {/* Sign Post Stick */}
    <rect x="88" y="110" width="9" height="92" fill="#78350f" stroke="#000" strokeWidth="3" />

    {/* Krampus Legs & Feet */}
    <rect x="150" y="176" width="24" height="24" rx="4" fill="#3e241b" stroke="#000" strokeWidth="3" />
    <rect x="184" y="176" width="24" height="24" rx="4" fill="#3e241b" stroke="#000" strokeWidth="3" />

    {/* Krampus Furry Torso */}
    <path
      d="M142 126 C135 155, 138 184, 152 186 L206 186 C220 184, 224 155, 214 126 Z"
      fill="#5c382b"
      stroke="#000"
      strokeWidth="3.5"
    />
    {/* Arms holding sign */}
    <path d="M148 134 L120 124 L122 138 L146 148 Z" fill="#5c382b" stroke="#000" strokeWidth="3" />
    <circle cx="118" cy="131" r="9" fill="#3e241b" stroke="#000" strokeWidth="3" />

    {/* Wooden Sign Board */}
    <g transform="rotate(-11 94 94)">
      <rect x="38" y="64" width="108" height="62" rx="4" fill="#b48a64" stroke="#000" strokeWidth="3.5" />
      <text
        x="92"
        y="91"
        textAnchor="middle"
        fill="#000"
        fontSize="16"
        fontWeight="900"
        fontFamily="sans-serif"
      >
        ยินดีต้อนรับ
      </text>
      <text
        x="92"
        y="112"
        textAnchor="middle"
        fill="#000"
        fontSize="16"
        fontWeight="900"
        fontFamily="sans-serif"
      >
        เด็กดื้อ!
      </text>
    </g>

    {/* Horns */}
    <path d="M150 56 C134 38, 126 20, 146 16 C152 28, 158 42, 162 52 Z" fill="#451a03" stroke="#000" strokeWidth="3" />
    <path d="M208 56 C224 38, 232 20, 212 16 C206 28, 200 42, 196 52 Z" fill="#451a03" stroke="#000" strokeWidth="3" />

    {/* Pointed Ears */}
    <polygon points="134,82 114,76 132,96" fill="#5c382b" stroke="#000" strokeWidth="3" />
    <polygon points="222,82 242,76 224,96" fill="#5c382b" stroke="#000" strokeWidth="3" />

    {/* Krampus Head */}
    <ellipse cx="178" cy="90" rx="46" ry="42" fill="#5c382b" stroke="#000" strokeWidth="3.5" />

    {/* Santa Hat */}
    <path d="M142 64 C150 26, 206 26, 218 64 Z" fill="#dc2626" stroke="#000" strokeWidth="3.5" />
    <rect x="135" y="57" width="88" height="14" rx="7" fill="#ffffff" stroke="#000" strokeWidth="3.5" />
    <circle cx="226" cy="54" r="9" fill="#ffffff" stroke="#000" strokeWidth="3" />

    {/* South Park Big Eyes */}
    <ellipse cx="166" cy="90" rx="11" ry="13" fill="#ffffff" stroke="#000" strokeWidth="2.8" />
    <ellipse cx="190" cy="90" rx="11" ry="13" fill="#ffffff" stroke="#000" strokeWidth="2.8" />
    <circle cx="169" cy="90" r="3" fill="#000" />
    <circle cx="187" cy="90" r="3" fill="#000" />

    {/* Angry Eyebrows */}
    <line x1="152" y1="75" x2="173" y2="81" stroke="#000" strokeWidth="3.5" strokeLinecap="round" />
    <line x1="204" y1="75" x2="183" y2="81" stroke="#000" strokeWidth="3.5" strokeLinecap="round" />

    {/* Grinning Mouth + Fangs + Goatee */}
    <path d="M164 108 Q178 118 192 108 Z" fill="#7f1d1d" stroke="#000" strokeWidth="2.5" />
    <rect x="168" y="108" width="20" height="4" fill="#ffffff" />
    <polygon points="172,126 184,126 178,138" fill="#291711" stroke="#000" strokeWidth="2.5" />
  </svg>
);

/**
 * Full-coat Krampus Santa cutout (World Map left peeking & right standing)
 */
export const KrampusSantaCoatCharacter: React.FC<{ className?: string; flipped?: boolean }> = ({
  className = '',
  flipped = false,
}) => (
  <svg
    viewBox="0 0 180 210"
    className={className}
    style={flipped ? { transform: 'scaleX(-1)' } : undefined}
  >
    {/* Tail */}
    <path d="M128 164 Q156 150 162 132" fill="none" stroke="#000" strokeWidth="6" strokeLinecap="round" />
    <polygon points="162,124 170,136 155,135" fill="#4a2c22" stroke="#000" strokeWidth="2.5" />

    {/* Boots */}
    <ellipse cx="68" cy="192" rx="18" ry="8" fill="#1e293b" stroke="#000" strokeWidth="3" />
    <ellipse cx="112" cy="192" rx="18" ry="8" fill="#1e293b" stroke="#000" strokeWidth="3" />

    {/* Red Santa Coat Body */}
    <path d="M44 126 C36 156, 36 186, 46 188 L134 188 C144 186, 144 156, 136 126 Z" fill="#dc2626" stroke="#000" strokeWidth="3.5" />
    <rect x="84" y="128" width="12" height="58" fill="#ffffff" stroke="#000" strokeWidth="2.5" />
    <rect x="44" y="180" width="92" height="10" rx="4" fill="#ffffff" stroke="#000" strokeWidth="3" />
    {/* Arms */}
    <path d="M42 130 L26 164 L40 170 L50 144 Z" fill="#dc2626" stroke="#000" strokeWidth="3" />
    <path d="M138 130 L154 164 L140 170 L130 144 Z" fill="#dc2626" stroke="#000" strokeWidth="3" />
    <circle cx="32" cy="168" r="8" fill="#3e241b" stroke="#000" strokeWidth="3" />
    <circle cx="148" cy="168" r="8" fill="#3e241b" stroke="#000" strokeWidth="3" />

    {/* Horns */}
    <path d="M58 54 C42 36, 36 18, 56 14 C62 26, 68 40, 72 50 Z" fill="#451a03" stroke="#000" strokeWidth="3" />
    <path d="M122 54 C138 36, 144 18, 124 14 C118 26, 112 40, 108 50 Z" fill="#451a03" stroke="#000" strokeWidth="3" />

    {/* Ears */}
    <polygon points="46,84 26,78 44,98" fill="#5c382b" stroke="#000" strokeWidth="3" />
    <polygon points="134,84 154,78 136,98" fill="#5c382b" stroke="#000" strokeWidth="3" />

    {/* Head */}
    <ellipse cx="90" cy="92" rx="44" ry="40" fill="#5c382b" stroke="#000" strokeWidth="3.5" />

    {/* Santa Hat */}
    <path d="M52 66 C60 28, 120 28, 130 66 Z" fill="#dc2626" stroke="#000" strokeWidth="3.5" />
    <rect x="46" y="59" width="90" height="14" rx="7" fill="#ffffff" stroke="#000" strokeWidth="3.5" />
    <circle cx="136" cy="56" r="8" fill="#ffffff" stroke="#000" strokeWidth="3" />

    {/* Eyes */}
    <ellipse cx="78" cy="90" rx="10" ry="12" fill="#ffffff" stroke="#000" strokeWidth="2.5" />
    <ellipse cx="102" cy="90" rx="10" ry="12" fill="#ffffff" stroke="#000" strokeWidth="2.5" />
    <circle cx="80" cy="90" r="2.8" fill="#000" />
    <circle cx="100" cy="90" r="2.8" fill="#000" />

    {/* Brows & Mouth */}
    <line x1="65" y1="75" x2="85" y2="81" stroke="#000" strokeWidth="3.5" strokeLinecap="round" />
    <line x1="115" y1="75" x2="95" y2="81" stroke="#000" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M77 109 L103 109 L96 117 L84 117 Z" fill="#000" />
    <rect x="81" y="109" width="5" height="3" fill="#fff" />
    <rect x="94" y="109" width="5" height="3" fill="#fff" />
    <polygon points="84,125 96,125 90,136" fill="#291711" stroke="#000" strokeWidth="2.5" />
  </svg>
);

/**
 * Team Avatar SVG matching the 4 South Park characters from Reference Images:
 * 1: Sheep Warrior with sword | 2: Santa with gift | 3: Red Beanie Kid | 4: Blue Beanie Kid
 */
export const TeamSouthParkAvatar: React.FC<{ slotNumber: number; className?: string }> = ({
  slotNumber,
  className = 'w-20 h-20',
}) => {
  if (slotNumber === 1) {
    // Sheep Warrior
    return (
      <svg viewBox="0 0 110 110" className={className}>
        {/* Wooden Sword */}
        <line x1="88" y1="26" x2="88" y2="80" stroke="#cbd5e1" strokeWidth="8" strokeLinecap="round" />
        <line x1="88" y1="26" x2="88" y2="80" stroke="#000" strokeWidth="2" strokeLinecap="round" />
        <rect x="78" y="72" width="20" height="6" rx="2" fill="#78350f" stroke="#000" strokeWidth="2" />
        {/* Fluffy Sheep Body */}
        <ellipse cx="52" cy="82" rx="28" ry="20" fill="#e2e8f0" stroke="#000" strokeWidth="3" />
        {/* Cross Straps */}
        <line x1="34" y1="68" x2="70" y2="96" stroke="#78350f" strokeWidth="5" />
        <line x1="70" y1="68" x2="34" y2="96" stroke="#78350f" strokeWidth="5" />
        {/* Horns */}
        <path d="M30 34 C18 22, 16 40, 26 44 Z" fill="#92400e" stroke="#000" strokeWidth="2.5" />
        <path d="M74 34 C86 22, 88 40, 78 44 Z" fill="#92400e" stroke="#000" strokeWidth="2.5" />
        {/* Head */}
        <circle cx="52" cy="46" r="24" fill="#fde68a" stroke="#000" strokeWidth="3" />
        <path d="M32 34 Q52 16 72 34 Q62 24 52 32 Q42 24 32 34 Z" fill="#ffffff" stroke="#000" strokeWidth="3" />
        <ellipse cx="44" cy="46" rx="6" ry="7.5" fill="#fff" stroke="#000" strokeWidth="2" />
        <ellipse cx="60" cy="46" rx="6" ry="7.5" fill="#fff" stroke="#000" strokeWidth="2" />
        <circle cx="45" cy="46" r="2.2" fill="#000" />
        <circle cx="59" cy="46" r="2.2" fill="#000" />
        <path d="M44 59 Q52 64 60 59" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (slotNumber === 2) {
    // Santa holding gift
    return (
      <svg viewBox="0 0 110 110" className={className}>
        {/* Coat */}
        <path d="M22 100 C22 68, 86 68, 86 100 Z" fill="#dc2626" stroke="#000" strokeWidth="3" />
        <rect x="24" y="88" width="60" height="7" fill="#1e293b" stroke="#000" strokeWidth="2" />
        <rect x="49" y="86" width="10" height="11" fill="#facc15" stroke="#000" strokeWidth="2" />
        {/* Green Gift */}
        <rect x="74" y="54" width="22" height="22" rx="2" fill="#15803d" stroke="#000" strokeWidth="2.5" />
        <rect x="83" y="54" width="4" height="22" fill="#dc2626" />
        {/* Face + Beard */}
        <circle cx="54" cy="46" r="23" fill="#fde68a" stroke="#000" strokeWidth="3" />
        <path d="M32 48 C30 74, 78 74, 76 48 Q54 60 32 48 Z" fill="#ffffff" stroke="#000" strokeWidth="2.5" />
        {/* Santa Hat */}
        <path d="M32 38 C36 14, 72 14, 76 38 Z" fill="#dc2626" stroke="#000" strokeWidth="3" />
        <rect x="28" y="32" width="52" height="9" rx="4" fill="#ffffff" stroke="#000" strokeWidth="2.5" />
        <circle cx="76" cy="24" r="6" fill="#ffffff" stroke="#000" strokeWidth="2.5" />
        <ellipse cx="46" cy="44" rx="5.5" ry="7" fill="#fff" stroke="#000" strokeWidth="2" />
        <ellipse cx="62" cy="44" rx="5.5" ry="7" fill="#fff" stroke="#000" strokeWidth="2" />
        <circle cx="47" cy="44" r="2" fill="#000" />
        <circle cx="61" cy="44" r="2" fill="#000" />
      </svg>
    );
  }
  const isTeam3 = slotNumber === 3;
  // South Park Kid (Stan / Eric style)
  return (
    <svg viewBox="0 0 110 110" className={className}>
      <path d="M20 100 C20 68, 90 68, 90 100 Z" fill={isTeam3 ? '#b91c1c' : '#0284c7'} stroke="#000" strokeWidth="3" />
      <circle cx="55" cy="48" r="24" fill="#fde68a" stroke="#000" strokeWidth="3" />
      <path d="M32 40 C34 18, 76 18, 78 40 Z" fill={isTeam3 ? '#1e3a8a' : '#0369a1'} stroke="#000" strokeWidth="3" />
      <rect x="30" y="34" width="50" height="8" rx="3" fill={isTeam3 ? '#dc2626' : '#facc15'} stroke="#000" strokeWidth="2.5" />
      <circle cx="55" cy="18" r="6" fill={isTeam3 ? '#dc2626' : '#facc15'} stroke="#000" strokeWidth="2.5" />
      <ellipse cx="47" cy="48" rx="6" ry="7.5" fill="#fff" stroke="#000" strokeWidth="2" />
      <ellipse cx="63" cy="48" rx="6" ry="7.5" fill="#fff" stroke="#000" strokeWidth="2" />
      <circle cx="48" cy="48" r="2.2" fill="#000" />
      <circle cx="62" cy="48" r="2.2" fill="#000" />
      <path d="M47 61 L63 60 L58 65 L50 65 Z" fill="#000" />
    </svg>
  );
};

/**
 * Center artwork inside each of the 4 World Map vertical stage cards
 */
export const StageCardIllustration: React.FC<{
  stage: GameStage;
  status: 'CLEARED' | 'PLAYING' | 'LOCKED';
}> = ({ stage, status }) => {
  if (stage === 'POLL_MINE') {
    // 8 Wooden Doors (2x4)
    return (
      <div className="grid grid-cols-4 gap-1.5 w-full max-w-[175px] mx-auto my-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-sm bg-[#6b4423] border-2 border-black relative flex flex-col justify-between p-1 shadow-[2px_2px_0px_#000]"
          >
            <div className="w-full h-4 border border-[#3e2411] bg-[#543419]" />
            <div className="w-full h-4 border border-[#3e2411] bg-[#543419]" />
            <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#facc15] border border-black" />
          </div>
        ))}
      </div>
    );
  }

  if (stage === 'TIMEJINX') {
    // Grandfather Clock + Golden Sparkles
    return (
      <svg viewBox="0 0 120 140" className="w-28 h-32 mx-auto my-1">
        {/* Sparkles */}
        <path d="M22 46 L25 54 L33 57 L25 60 L22 68 L19 60 L11 57 L19 54 Z" fill="#fde047" />
        <path d="M98 38 L100 44 L106 46 L100 48 L98 54 L96 48 L90 46 L96 44 Z" fill="#fde047" />
        <path d="M96 86 L99 93 L106 95 L99 97 L96 104 L93 97 L86 95 L93 93 Z" fill="#fde047" />
        {/* Clock Body */}
        <rect x="38" y="34" width="44" height="92" rx="4" fill="#5c3a21" stroke="#000" strokeWidth="3" />
        <path d="M36 34 Q60 12 84 34 Z" fill="#422816" stroke="#000" strokeWidth="3" />
        <rect x="44" y="66" width="32" height="52" fill="#3a2312" stroke="#000" strokeWidth="2.5" />
        {/* Pendulum */}
        <line x1="60" y1="68" x2="60" y2="104" stroke="#facc15" strokeWidth="2.5" />
        <circle cx="60" cy="107" r="6" fill="#facc15" stroke="#000" strokeWidth="2" />
        {/* Clock Face */}
        <circle cx="60" cy="48" r="14" fill="#fef3c7" stroke="#000" strokeWidth="2.5" />
        <line x1="60" y1="48" x2="60" y2="39" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="60" y1="48" x2="68" y2="48" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Stage 3 or 4: Window + Padlock when locked, or iconic badge when playing/cleared
  return (
    <svg viewBox="0 0 130 120" className="w-32 h-28 mx-auto my-2">
      {/* Dark Window Frame behind */}
      <rect x="15" y="18" width="100" height="72" rx="4" fill="#0f293a" stroke="#000" strokeWidth="3" />
      <line x1="65" y1="18" x2="65" y2="90" stroke="#000" strokeWidth="3" />
      <line x1="15" y1="54" x2="115" y2="54" stroke="#000" strokeWidth="3" />

      {status === 'LOCKED' ? (
        <g>
          <path d="M46 50 L46 34 C46 18, 84 18, 84 34 L84 50" fill="none" stroke="#94a3b8" strokeWidth="10" strokeLinecap="round" />
          <path d="M46 50 L46 34 C46 18, 84 18, 84 34 L84 50" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <rect x="38" y="48" width="54" height="50" rx="6" fill="#94a3b8" stroke="#000" strokeWidth="3.5" />
          <circle cx="65" cy="68" r="6" fill="#0f172a" />
          <polygon points="62,70 68,70 70,84 60,84" fill="#0f172a" />
        </g>
      ) : (
        <text x="65" y="70" textAnchor="middle" fontSize="42">
          {stage === 'QUIXORT' ? '⚙️' : '💀'}
        </text>
      )}
    </svg>
  );
};

/**
 * Full-screen Snow & Pine Forest Background Scene matching Reference Images 1 & 2
 */
export const SnowPineForestFrame: React.FC<{
  variant: 'LOBBY' | 'WORLD_MAP';
  children: React.ReactNode;
}> = ({ variant, children }) => {
  const isLobby = variant === 'LOBBY';
  return (
    <div
      className={`min-h-screen w-full relative overflow-hidden flex flex-col justify-between select-none ${
        isLobby ? 'bg-[#1b365d]' : 'bg-[#0f5a47]'
      }`}
    >
      {/* Background Snow Dots */}
      <div
        className="pointer-events-none fixed inset-0 opacity-65"
        style={{
          backgroundImage:
            'radial-gradient(#ffffff 2px, transparent 2px), radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
          backgroundSize: '90px 90px, 55px 55px',
          backgroundPosition: '0 0, 25px 35px',
        }}
      />

      {/* Left Snow Pine Trees Silhouette */}
      <svg
        viewBox="0 0 260 500"
        preserveAspectRatio="none"
        className="pointer-events-none fixed left-0 bottom-0 h-[82vh] w-[18vw] min-w-[140px] z-0 opacity-95"
      >
        <polygon points="90,20 10,160 170,160" fill="#14532d" stroke="#000" strokeWidth="4" />
        <polygon points="90,20 50,90 130,90" fill="#ffffff" stroke="#000" strokeWidth="3" />
        <polygon points="90,110 0,270 185,270" fill="#166534" stroke="#000" strokeWidth="4" />
        <polygon points="90,110 42,190 138,190" fill="#ffffff" stroke="#000" strokeWidth="3" />
        <polygon points="100,200 -10,410 215,410" fill="#14532d" stroke="#000" strokeWidth="4" />
        <polygon points="100,200 45,305 155,305" fill="#ffffff" stroke="#000" strokeWidth="3" />
      </svg>

      {/* Right Snow Pine Trees Silhouette */}
      <svg
        viewBox="0 0 260 500"
        preserveAspectRatio="none"
        className="pointer-events-none fixed right-0 bottom-0 h-[82vh] w-[18vw] min-w-[140px] z-0 opacity-95"
      >
        <polygon points="170,25 85,165 255,165" fill="#14532d" stroke="#000" strokeWidth="4" />
        <polygon points="170,25 130,95 210,95" fill="#ffffff" stroke="#000" strokeWidth="3" />
        <polygon points="170,115 70,280 260,280" fill="#166534" stroke="#000" strokeWidth="4" />
        <polygon points="170,115 120,195 220,195" fill="#ffffff" stroke="#000" strokeWidth="3" />
        <polygon points="160,210 45,420 270,420" fill="#14532d" stroke="#000" strokeWidth="4" />
        <polygon points="160,210 105,310 215,310" fill="#ffffff" stroke="#000" strokeWidth="3" />
      </svg>

      {/* Top Fairy Lights String (Lobby & World Map) */}
      <svg
        viewBox="0 0 1200 70"
        preserveAspectRatio="none"
        className="pointer-events-none fixed top-0 inset-x-0 w-full h-16 z-10"
      >
        <path
          d="M0,10 Q200,55 400,15 Q600,55 800,15 Q1000,55 1200,10"
          fill="none"
          stroke="#111827"
          strokeWidth="3.5"
        />
        {[90, 190, 300, 420, 540, 660, 780, 900, 1020, 1120].map((cx, idx) => (
          <circle
            key={cx}
            cx={cx}
            cy={idx % 2 === 0 ? 34 : 26}
            r="6"
            fill={idx % 3 === 0 ? '#fde047' : idx % 3 === 1 ? '#ef4444' : '#22c55e'}
            stroke="#000"
            strokeWidth="2"
          />
        ))}
      </svg>

      {/* Bottom White Snowbank Floor */}
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 bg-[#f8fafc] border-t-4 border-black z-0 ${
          isLobby ? 'h-[19vh]' : 'h-[23vh]'
        }`}
        style={{
          borderTopLeftRadius: '45% 24px',
          borderTopRightRadius: '45% 24px',
        }}
      />

      {/* World Map Left & Right Krampus Cutouts */}
      {!isLobby && (
        <>
          <KrampusSantaCoatCharacter className="pointer-events-none fixed left-2 top-8 w-36 md:w-44 z-10 drop-shadow-[4px_4px_0px_#000]" />
          <KrampusSantaCoatCharacter
            flipped
            className="pointer-events-none fixed right-3 bottom-[8vh] w-36 md:w-44 z-20 drop-shadow-[4px_4px_0px_#000]"
          />
        </>
      )}

      {/* Lobby Bottom-Right Krampus Sign Cutout */}
      {isLobby && (
        <KrampusSignCharacter className="pointer-events-none fixed right-4 bottom-2 w-60 md:w-72 z-20 drop-shadow-[4px_4px_0px_#000]" />
      )}

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-between px-6 md:px-12 py-6 max-w-[1500px] w-full mx-auto">
        {children}
      </div>
    </div>
  );
};
