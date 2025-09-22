import React, { useMemo, useState } from "react";
import { Plus, Settings, AlarmClock, Camera, BellOff, X, RefreshCw, Power, Bell, Vibrate } from "lucide-react";

/**
 * 간단한알람 – 홈 화면 (리액트 목업)
 * 반영 사항:
 * 1) 알람 시각 글씨 키우기 (time만 크게)
 * 2) 시각/반복 클릭 시 설정 팝업(모달) – AM/PM/시각/요일/몇주마다/소리/진동
 * 3) 제목 옆에 소리/진동 상태 아이콘 표기
 */

type ActionKind = "x" | "stop" | "pattern" | "selfie";

interface AlarmItem {
  id: string;
  title: string;
  time: string;               // "HH:MM" 24h 저장 (AM/PM 변환은 모달에서)
  repeat: string;             // 간단 표기 ("평일", "매일" 등) — 모달 저장 시 갱신
  actions: ActionKind[];
  enabled: boolean;
  color: string;
  // 추가: 소리/진동 상태
  sound: boolean;
  vibrate: boolean;
}

const pastel = {
  mint: "from-teal-300 to-emerald-300",
  peach: "from-rose-300 to-amber-200",
  sky: "from-sky-300 to-indigo-300",
  lilac: "from-violet-300 to-fuchsia-300",
  lemon: "from-yellow-300 to-lime-300",
};

const initialAlarms: AlarmItem[] = [
  { id: "a1", title: "기상 알람", time: "06:40", repeat: "평일", actions: ["x", "stop", "pattern"], enabled: true,  color: pastel.mint,  sound: true,  vibrate: true  },
  { id: "a2", title: "출근 준비", time: "07:10", repeat: "매일", actions: ["stop", "selfie"],        enabled: false, color: pastel.sky,   sound: true,  vibrate: true  },
  { id: "a3", title: "운동 가기", time: "20:30", repeat: "월·수·금", actions: ["pattern", "x"],      enabled: true,  color: pastel.peach, sound: false, vibrate: true  },
];

// 요일 헬퍼
const WEEKDAYS_KR = ["일", "월", "화", "수", "목", "금", "토"];

function ActionChip({ kind }: { kind: ActionKind }) {
  const map = {
    x:       { label: "X누르면 꺼지기",   icon: X },
    stop:    { label: "알람종료 누르기",   icon: BellOff },
    pattern: { label: "패턴 누르기",      icon: RefreshCw },
    selfie:  { label: "셀카 찍기",        icon: Camera },
  } as const;
  const Icon = map[kind].icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] bg-white/70 text-slate-700 shadow-sm">
      <Icon className="h-3.5 w-3.5" /> {map[kind].label}
    </span>
  );
}

// ====== 설정 모달 ======
type EditTab = "time" | "repeat";
interface EditTarget { id: string; tab: EditTab }

function SettingsModal({
  open, onClose,
  alarm,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  alarm: AlarmItem | null;
  onSave: (next: Partial<AlarmItem>) => void;
}) {
  const [tab, setTab] = useState<EditTab>(alarm ? "time" : "time");

  // 내부 편집 상태
  const [hour12, setHour12] = useState(true);
  const [ampm, setAmPm] = useState<"AM" | "PM">("AM");
  const [hh, setHh] = useState("07");
  const [mm, setMm] = useState("00");

  // 반복
  const [repeatEveryWeeks, setRepeatEveryWeeks] = useState(1);
  const [weekdayFlags, setWeekdayFlags] = useState<boolean[]>([false, true, true, true, true, true, false]); // 기본: 평일
  const [sound, setSound] = useState(true);
  const [vibrate, setVibrate] = useState(true);

  // 모달 열릴 때 초기화
  React.useEffect(() => {
    if (!open || !alarm) return;

    setTab("time");
    // time 파싱
    const [H, M] = alarm.time.split(":").map(Number);
    if (H >= 12) {
      setAmPm("PM");
      setHh(String(((H - 12) || 12)).padStart(2, "0"));
    } else {
      setAmPm("AM");
      setHh(String((H === 0 ? 12 : H)).padStart(2, "0"));
    }
    setMm(String(M).padStart(2, "0"));
    setHour12(true);

    // repeat 파싱 (간단 규칙)
    const defaultFlags = [false, false, false, false, false, false, false];
    if (alarm.repeat.includes("매일")) {
      for (let i = 0; i < 7; i++) defaultFlags[i] = true;
    } else if (alarm.repeat.includes("평일")) {
      for (let i = 1; i <= 5; i++) defaultFlags[i] = true;
    } else {
      // "월·수·금" 등
      const parts = alarm.repeat.split("·");
      parts.forEach((p) => {
        const idx = WEEKDAYS_KR.indexOf(p as any);
        if (idx >= 0) defaultFlags[idx] = true;
      });
    }
    setWeekdayFlags(defaultFlags);
    setRepeatEveryWeeks(1);

    setSound(alarm.sound);
    setVibrate(alarm.vibrate);
  }, [open, alarm]);

  if (!open || !alarm) return null;

  // helpers
  const to24h = (ampm: "AM" | "PM", h12: number) => {
    if (ampm === "AM") return h12 % 12;      // 12 AM -> 0
    return (h12 % 12) + 12;                  // 12 PM -> 12
  };

  const repeatText = useMemo(() => {
    const days = weekdayFlags
      .map((v, i) => (v ? WEEKDAYS_KR[i] : null))
      .filter(Boolean) as string[];
    if (days.length === 7) return "매일";
    if (days.length === 5 && !weekdayFlags[0] && !weekdayFlags[6]) return "평일";
    if (days.length === 0) return "반복 없음";
    return days.join("·") + (repeatEveryWeeks > 1 ? ` (매 ${repeatEveryWeeks}주)` : "");
  }, [weekdayFlags, repeatEveryWeeks]);

  const save = () => {
    // time
    let nextTime = alarm.time;
    if (hour12) {
      const h12 = Math.max(1, Math.min(12, parseInt(hh || "12", 10)));
      const m = Math.max(0, Math.min(59, parseInt(mm || "0", 10)));
      const H24 = to24h(ampm, h12);
      nextTime = `${String(H24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    onSave({
      time: nextTime,
      repeat: repeatText,
      sound,
      vibrate,
    });
    onClose();
  };

  const toggleWeekday = (idx: number) => {
    setWeekdayFlags((prev) => {
      const arr = [...prev];
      arr[idx] = !arr[idx];
      return arr;
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={onClose}>
      <div className="w-[92%] max-w-sm rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">알람 설정</h3>
          <button onClick={onClose} className="text-sm text-slate-600">닫기</button>
        </div>

        {/* 탭 */}
        <div className="mb-3 flex rounded-xl bg-slate-100 p-1 text-sm">
          <button
            onClick={() => setTab("time")}
            className={`flex-1 rounded-lg py-1 ${tab === "time" ? "bg-white shadow" : "opacity-70"}`}
          >시간</button>
          <button
            onClick={() => setTab("repeat")}
            className={`flex-1 rounded-lg py-1 ${tab === "repeat" ? "bg-white shadow" : "opacity-70"}`}
          >반복/옵션</button>
        </div>

        {tab === "time" && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1">
                <input type="checkbox" checked={hour12} onChange={(e) => setHour12(e.target.checked)} />
                12시간제 (AM/PM)
              </label>
            </div>

            {hour12 && (
              <div className="flex items-center gap-2">
                <select value={ampm} onChange={(e) => setAmPm(e.target.value as "AM" | "PM")} className="rounded border px-2 py-1">
                  <option>AM</option>
                  <option>PM</option>
                </select>
                <input
                  value={hh}
                  onChange={(e) => setHh(e.target.value)}
                  className="w-14 rounded border px-2 py-1 text-center"
                  placeholder="시(1-12)"
                />
                :
                <input
                  value={mm}
                  onChange={(e) => setMm(e.target.value)}
                  className="w-14 rounded border px-2 py-1 text-center"
                  placeholder="분(00-59)"
                />
              </div>
            )}

            {!hour12 && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={`${alarm.time}`}
                  onChange={(e) => {
                    const v = e.target.value; // "HH:MM"
                    const [H, M] = v.split(":");
                    setAmPm(parseInt(H,10) >= 12 ? "PM" : "AM");
                    let h12 = parseInt(H,10) % 12;
                    if (h12 === 0) h12 = 12;
                    setHh(String(h12).padStart(2,"0"));
                    setMm(String(parseInt(M,10)).padStart(2,"0"));
                  }}
                  className="rounded border px-2 py-1"
                />
              </div>
            )}
          </div>
        )}

        {tab === "repeat" && (
          <div className="space-y-3 text-sm">
            <div>
              <div className="mb-1 font-medium">요일</div>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS_KR.map((d, i) => (
                  <button
                    key={d}
                    onClick={() => toggleWeekday(i)}
                    className={`rounded-full px-2 py-1 text-xs border ${weekdayFlags[i] ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-300"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span>매</span>
              <input
                type="number"
                min={1}
                value={repeatEveryWeeks}
                onChange={(e) => setRepeatEveryWeeks(Math.max(1, parseInt(e.target.value || "1", 10)))}
                className="w-16 rounded border px-2 py-1 text-center"
              />
              <span>주 반복</span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="inline-flex items-center gap-2 rounded-lg border px-2 py-2">
                <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
                <span className="inline-flex items-center gap-1"><Bell className="h-4 w-4" /> 소리</span>
              </label>
              <label className="inline-flex items-center gap-2 rounded-lg border px-2 py-2">
                <input type="checkbox" checked={vibrate} onChange={(e) => setVibrate(e.target.checked)} />
                <span className="inline-flex items-center gap-1"><Vibrate className="h-4 w-4" /> 진동</span>
              </label>
            </div>

            <div className="text-xs text-slate-500">
              * 끄기 옵션(단순/패턴/자동종료)은 카드 하단 칩으로 선택 유지
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-1 rounded-lg border" onClick={onClose}>취소</button>
          <button className="px-3 py-1 rounded-lg bg-blue-600 text-white" onClick={save}>저장</button>
        </div>
      </div>
    </div>
  );
}

// ====== 알람 카드 ======
function AlarmCard({
  item,
  onToggle,
  onOpenModal,
}: {
  item: AlarmItem;
  onToggle: (id: string) => void;
  onOpenModal: (id: string, tab: EditTab) => void;
}) {
  return (
    <button
      onClick={() => onToggle(item.id)}
      className={`group relative overflow-hidden rounded-2xl p-3 sm:p-4 text-left shadow-md transition focus:outline-none min-h-[110px]
      ${item.enabled ? "opacity-100" : "opacity-70"}`}
      aria-pressed={item.enabled}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${item.color} blur-[1px]`} />
      <div className="relative z-10 flex h-full flex-col gap-1.5">
        {/* 헤더: 제목 + 소리/진동 아이콘 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid place-items-center rounded-xl p-2 bg-white/70">
              <AlarmClock className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1">
              <h3 className="font-semibold text-sm sm:text-base md:text-lg">{item.title}</h3>
              <div className="ml-1 flex items-center gap-1 text-[11px] opacity-90">
                <span title={item.sound ? "소리 켜짐" : "소리 꺼짐"}>
                  {item.sound ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                </span>
                <span title={item.vibrate ? "진동 켜짐" : "진동 꺼짐"}>
                  <Vibrate className={`h-3.5 w-3.5 ${item.vibrate ? "" : "opacity-40"}`} />
                </span>
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] bg-white/80 text-slate-700">
            <Power className={`h-3.5 w-3.5 ${item.enabled ? "" : "opacity-50"}`} />
            {item.enabled ? "ON" : "OFF"}
          </div>
        </div>

        {/* 시간/반복 – 시간은 크게, 반복은 칩. 둘 다 클릭 시 모달 */}
        <div className="flex items-baseline gap-2">
          <span
            onClick={(e) => { e.stopPropagation(); onOpenModal(item.id, "time"); }}
            className="font-bold leading-none tracking-tight text-base sm:text-xl cursor-pointer"
            title="시간 설정"
          >
            {item.time}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenModal(item.id, "repeat"); }}
            className="text-[11px] sm:text-xs text-slate-800/90 bg-white/70 rounded-full px-1.5 py-0.5"
            title="반복/옵션 설정"
          >
            {item.repeat}
          </button>
        </div>

        {/* 끄기 옵션 칩들 (동작은 기존과 동일, UI만 유지) */}
        <div className="mt-1 flex flex-wrap gap-1">
          {item.actions.map((a) => (
            <ActionChip key={a} kind={a} />
          ))}
        </div>
      </div>
      <div className={`pointer-events-none absolute inset-0 rounded-2xl ring-1 ${item.enabled ? "ring-white/70" : "ring-white/30"}`} />
    </button>
  );
}

// ====== App ======
export default function App() {
  const [alarms, setAlarms] = useState<AlarmItem[]>(initialAlarms);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const toggleAlarm = (id: string) =>
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));

  const addAlarm = () => {
    const next: AlarmItem = {
      id: String(Date.now()),
      title: "새 알람",
      time: "07:00",
      repeat: "매일",
      actions: ["x", "stop"],
      enabled: true,
      color: [pastel.mint, pastel.sky, pastel.peach, pastel.lilac, pastel.lemon][Math.floor(Math.random() * 5)],
      sound: true,
      vibrate: true,
    };
    setAlarms((p) => [next, ...p].slice(0, 8));
  };

  const openSettings = () => alert("설정은 곧 추가 예정! (앱 전역 설정)");

  const currentAlarm = useMemo(
    () => (editTarget ? alarms.find((a) => a.id === editTarget.id) ?? null : null),
    [editTarget, alarms]
  );

  const applyModalSave = (next: Partial<AlarmItem>) => {
    if (!editTarget) return;
    setAlarms((prev) =>
      prev.map((a) => (a.id === editTarget.id ? { ...a, ...next } : a))
    );
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white to-slate-100">
      <header className="sticky top-0 z-20 backdrop-blur bg-white/70 border-b border-slate-200/60">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">
            간단한알람 <span className="text-slate-400 text-xs">(싱글탭:ON/OFF, 더블탭:설정)</span>
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={addAlarm} className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-white/80 px-2.5 py-1 text-xs shadow-sm">
              <Plus className="h-4 w-4" /> 추가
            </button>
            <button onClick={openSettings} className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-white/80 px-2.5 py-1 text-xs shadow-sm">
              <Settings className="h-4 w-4" /> 설정
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md p-3 grid grid-cols-2 gap-3">
        {alarms.slice(0, 8).map((alarm) => (
          <AlarmCard
            key={alarm.id}
            item={alarm}
            onToggle={toggleAlarm}
            onOpenModal={(id, tab) => setEditTarget({ id, tab })}
          />
        ))}
        {Array.from({ length: Math.max(0, 8 - alarms.length) }).map((_, i) => (
          <button key={`ghost-${i}`} onClick={addAlarm} className="rounded-2xl border-2 border-dashed border-slate-300/70 p-6 text-slate-400 bg-white/50">
            빈 칸 – 알람 추가
          </button>
        ))}
      </main>

      <footer className="mx-auto max-w-md px-4 pb-6 pt-2 text-center text-[10px] text-slate-500">
        카드를 눌러 ON/OFF · 시각/반복 누르면 설정 팝업
      </footer>

      {/* 설정 모달 */}
      <SettingsModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        alarm={currentAlarm}
        onSave={applyModalSave}
      />
    </div>
  );
}
