import React, { useState, useRef } from "react";
import { Plus, X, RefreshCw, Timer, Trash2 } from "lucide-react";

interface AlarmItem {
  id: string;
  title: string;
  time: string;
  repeat: string;
  actions: Array<"simple" | "pattern" | "autoOff">;
  selectedAction: "simple" | "pattern" | "autoOff";
  enabled: boolean;
  color: string;
  avatarType: "emoji" | "image";
  avatarValue: string;
}

const pastel = {
  mint: "from-teal-300 to-emerald-300",
  peach: "from-rose-300 to-amber-200",
  sky: "from-sky-300 to-indigo-300",
  lilac: "from-violet-300 to-fuchsia-300",
  lemon: "from-yellow-300 to-lime-300",
};

const seed: AlarmItem[] = [
  { id: "a1", title: "기상", time: "06:30", repeat: "평일", actions: ["simple","pattern","autoOff"], selectedAction: "simple", enabled: true,  color: pastel.mint,  avatarType: "emoji", avatarValue: "⏰" },
  { id: "a2", title: "출근 준비", time: "07:10", repeat: "매일", actions: ["simple","pattern","autoOff"], selectedAction: "simple", enabled: false, color: pastel.sky,    avatarType: "emoji", avatarValue: "🧼" },
  { id: "a3", title: "점심 알림", time: "12:10", repeat: "매일", actions: ["simple","pattern","autoOff"], selectedAction: "simple", enabled: true,  color: pastel.lemon,  avatarType: "emoji", avatarValue: "🍱" },
  { id: "a4", title: "약 먹기", time: "21:00", repeat: "매일", actions: ["simple","pattern","autoOff"], selectedAction: "simple", enabled: true,  color: pastel.lilac,  avatarType: "emoji", avatarValue: "💊" },
  { id: "a5", title: "운동", time: "20:30", repeat: "월·수·금", actions: ["simple","pattern","autoOff"], selectedAction: "simple", enabled: true,  color: pastel.peach,  avatarType: "emoji", avatarValue: "🏃" },
  { id: "a6", title: "스트레칭", time: "22:10", repeat: "매일", actions: ["simple","pattern","autoOff"], selectedAction: "simple", enabled: false, color: pastel.sky,    avatarType: "emoji", avatarValue: "🧘" },
  { id: "a7", title: "물 마시기", time: "15:00", repeat: "매일", actions: ["simple","pattern","autoOff"], selectedAction: "simple", enabled: true,  color: pastel.mint,  avatarType: "emoji", avatarValue: "💧" },
  { id: "a8", title: "독서", time: "23:10", repeat: "주말", actions: ["simple","pattern","autoOff"], selectedAction: "simple", enabled: true,  color: pastel.lilac,  avatarType: "emoji", avatarValue: "📚" },
];

function useDoubleTap(cb: () => void, delay = 300) {
  const lastRef = useRef(0);
  return (e: any) => {
    const now = Date.now();
    if (now - lastRef.current < delay) {
      e.stopPropagation?.();
      e.preventDefault?.();
      lastRef.current = 0;
      cb();
      return;
    }
    lastRef.current = now;
  };
}

function ActionChip({ kind, selected, onSelect }: { kind: AlarmItem["actions"][number]; selected: boolean; onSelect: () => void }) {
  const map = {
    simple: { label: "단순 끄기", icon: X },
    pattern: { label: "패턴 입력", icon: RefreshCw },
    autoOff: { label: "자동 종료 (X초/분)", icon: Timer },
  } as const;
  const Icon = map[kind].icon;

  const onTouchEnd = useDoubleTap(onSelect);

  return (
    <button
      onClick={(e) => { /* let bubble to card for toggle */ }}
      onDoubleClick={(e) => { e.stopPropagation(); onSelect(); }}
      onTouchEnd={onTouchEnd}
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] shadow-sm transition ${selected ? "bg-slate-800 text-white font-bold ring-2 ring-slate-600" : "bg-white/70 text-slate-700"}`}
    >
      <Icon className="h-3 w-3" /> {map[kind].label}
    </button>
  );
}

function Avatar({ item, onEdit }: { item: AlarmItem; onEdit: () => void }) {
  const onTouchEnd = useDoubleTap(onEdit);
  if (item.avatarType === "image" && item.avatarValue) {
    return (
      <button
        aria-label="아이콘 변경"
        title="아이콘 변경"
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        onDoubleClick={(e) => { e.stopPropagation(); onEdit(); }}
        onTouchEnd={onTouchEnd}
        className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl overflow-hidden bg-white/70 ring-1 ring-white/70"
      >
        <img src={item.avatarValue} alt="알람 이미지" className="h-full w-full object-cover" />
      </button>
    );
  }
  return (
    <button
      aria-label="아이콘 변경"
      title="아이콘 변경"
      onClick={(e) => { e.stopPropagation(); onEdit(); }}
      onDoubleClick={(e) => { e.stopPropagation(); onEdit(); }}
      onTouchEnd={onTouchEnd}
      className="grid place-items-center h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-white/70"
    >
      <span className="text-[14px] sm:text-[16px]" aria-hidden>{item.avatarValue || "⏰"}</span>
    </button>
  );
}

function AlarmCard({ item, onToggle, onDelete, onEditAvatar, onSelectAction }: { item: AlarmItem; onToggle: (id: string) => void; onDelete: (id: string) => void; onEditAvatar: (id: string) => void; onSelectAction: (id: string, action: AlarmItem["actions"][number]) => void }) {
  const lastClickRef = useRef(0);
  const handleCardClick = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 300) {
      lastClickRef.current = 0;
      return;
    }
    lastClickRef.current = now;
    onToggle(item.id);
  };

  return (
    <div
      role="button"
      onClick={handleCardClick}
      className={`group relative overflow-hidden rounded-2xl p-3 sm:p-4 text-left shadow-[0_4px_16px_rgba(0,0,0,0.10)] transition ring-0 focus:outline-none min-h-[92px]
      ${item.enabled ? "opacity-100" : "opacity-50 grayscale"}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${item.color} blur-[0.5px]`} />
      <div className="relative z-10 flex h-full flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar item={item} onEdit={() => onEditAvatar(item.id)} />
            <h3 className="font-semibold text-sm sm:text-base tracking-tight">{item.title}</h3>
          </div>
          <button
            type="button"
            title="삭제"
            aria-label="알람 삭제"
            onClick={(e) => { e.stopPropagation(); if (window.confirm('이 알람을 삭제하시겠습니까?')) { onDelete(item.id); } }}
            className="cursor-pointer text-[14px] rounded-full border border-slate-400/70 px-2 py-0.5 bg-transparent text-slate-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

<div className="flex items-baseline gap-2">
  <span className="font-bold leading-none tracking-tight text-base sm:text-xl">
    {item.time}
  </span>
  <button
    onClick={(e) => { 
      e.stopPropagation(); 
      alert('여기서 설정 팝업(시/분, AM/PM, 반복주기 등)을 열 예정입니다.'); 
    }}
    className="text-[11px] sm:text-xs text-slate-800/90 bg-white/70 rounded-full px-1.5 py-0.5"
    title="반복 설정"
  >
    {item.repeat}
  </button>
</div>

        <div className="mt-0.5 flex flex-wrap gap-1 sm:gap-1.5">
          {item.actions.map((a) => (
            <button
              key={a}
              onDoubleClick={(e) => { e.stopPropagation(); onSelectAction(item.id, a); }}
              onTouchEnd={useDoubleTap(() => onSelectAction(item.id, a))}
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] shadow-sm transition ${
                item.selectedAction === a ? "bg-slate-800 text-white font-bold ring-2 ring-slate-600" : "bg-white/70 text-slate-700"
              }`}
            >
              {a === "simple" && <X className="h-3 w-3" />}
              {a === "pattern" && <RefreshCw className="h-3 w-3" />}
              {a === "autoOff" && <Timer className="h-3 w-3" />}
              {a === "simple" ? "단순 끄기" : a === "pattern" ? "패턴 입력" : "자동 종료 (X초/분)"}
            </button>
          ))}
        </div>

      </div>
      <div className={`pointer-events-none absolute inset-0 rounded-2xl ring-2 transition ${item.enabled ? "ring-white/70" : "ring-white/30"}`} />
    </div>
  );
}

export default function App() {
  const [alarms, setAlarms] = useState<AlarmItem[]>(seed);

  const toggleAlarm = (id: string) => {
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  };

  const editAvatar = (id: string) => {
    const kind = window.prompt("아이콘 타입을 선택하세요: emoji / image", "emoji");
    if (!kind) return;
    if (kind !== "emoji" && kind !== "image") {
      alert("emoji 또는 image 로 입력해주세요");
      return;
    }
    if (kind === "emoji") {
      const em = window.prompt("이모지를 입력하세요 (예: 😴 ⏰ 🧘)");
      if (!em) return;
      setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, avatarType: "emoji", avatarValue: em } : a)));
    } else {
      const url = window.prompt("이미지 URL을 입력하세요 (정사각형 권장)");
      if (!url) return;
      setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, avatarType: "image", avatarValue: url } : a)));
    }
  };

  const deleteAlarm = (id: string) => {
    if (window.confirm("이 알람을 삭제하시겠습니까?")) {
      setAlarms((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const addAlarm = () => {
    const palette = [pastel.mint, pastel.sky, pastel.peach, pastel.lilac, pastel.lemon];
    const next: AlarmItem = {
      id: String(Date.now()),
      title: "새 알람",
      time: "07:00",
      repeat: "매일",
      actions: ["simple","pattern","autoOff"],
      selectedAction: "simple",
      enabled: true,
      color: palette[Math.floor(Math.random() * palette.length)],
      avatarType: "emoji",
      avatarValue: "⏰",
    };
    setAlarms((p) => [next, ...p]);
  };

  const selectAction = (id: string, action: AlarmItem["actions"][number]) => {
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, selectedAction: action } : a)));
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white to-slate-100">
      <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/70 border-b border-slate-200/60">
        <div className="mx-auto max-w-5xl px-3 py-2 flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-bold tracking-tight flex items-baseline gap-1">Simple alarm <span className='text-slate-400 text-[11px]'>(싱글탭:ON/OFF, 더블탭:설정)</span></h1>
          <div className="flex items-center gap-2">
            <button onClick={addAlarm} className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-white/80 px-2.5 py-1 text-xs shadow-sm hover:bg-white active:scale-[0.98]" aria-label="알람 추가">
              <Plus className="h-4 w-4" /> 추가
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-3 grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-5">
        {alarms.map((alarm) => (
          <AlarmCard key={alarm.id} item={alarm} onToggle={toggleAlarm} onDelete={deleteAlarm} onEditAvatar={editAvatar} onSelectAction={selectAction} />
        ))}
      </main>

      <footer className="hidden sm:block mx-auto max-w-5xl px-4 pb-8 pt-2 text-center text-xs text-slate-500">
        싱글탭: ON/OFF · 더블탭: 기능 실행(아바타 변경/옵션 선택/삭제)
      </footer>
    </div>
  );
}
