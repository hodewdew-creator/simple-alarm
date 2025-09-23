import React, { useState, useRef, useCallback } from "react";
import { Plus, X, RefreshCw, Timer, Trash2 } from "lucide-react";

/** ========= 타입 및 시드 ========= */
interface AlarmItem {
  id: string;
  title: string;
  time: string; // "HH:MM" 24h
  repeat: string; // "매일", "평일", "월·수·금" 등 (사람이 읽을 문자열)
  actions: Array<"simple" | "pattern" | "autoOff">;
  selectedAction: "simple" | "pattern" | "autoOff";
  enabled: boolean;
  color: string;
  avatarType: "emoji" | "image";
  avatarValue: string;

  // 추가: 간단 설정값
  pattern?: string; // 패턴 문자열(예: 1-3-7)
  autoOffAmount?: number; // 숫자
  autoOffUnit?: "sec" | "min"; // 단위
  sound?: boolean; // 소리 on/off
  vibrate?: boolean; // 진동 on/off
}

const pastel = {
  mint: "from-teal-300 to-emerald-300",
  peach: "from-rose-300 to-amber-200",
  sky: "from-sky-300 to-indigo-300",
  lilac: "from-violet-300 to-fuchsia-300",
  lemon: "from-yellow-300 to-lime-300",
} as const;

const seed: AlarmItem[] = [
  { id: "a1", title: "기상", time: "06:30", repeat: "평일", actions: ["simple","pattern","autoOff"], selectedAction: "simple", enabled: true,  color: pastel.mint,  avatarType: "emoji", avatarValue: "⏰", sound: true, vibrate: true },
  { id: "a2", title: "출근 준비", time: "07:10", repeat: "매일", actions: ["simple","pattern","autoOff"], selectedAction: "simple", enabled: false, color: pastel.sky,    avatarType: "emoji", avatarValue: "🧼", sound: true, vibrate: true },
  { id: "a3", title: "점심 알림", time: "12:10", repeat: "매일", actions: ["simple","pattern","autoOff"], selectedAction: "simple", enabled: true,  color: pastel.lemon,  avatarType: "emoji", avatarValue: "🍱", sound: true, vibrate: true },
  { id: "a4", title: "약 먹기", time: "21:00", repeat: "매일", actions: ["simple","pattern","autoOff"], selectedAction: "simple", enabled: true,  color: pastel.lilac,  avatarType: "emoji", avatarValue: "💊", sound: false, vibrate: true },
];

/** ========= 유틸 훅 ========= */
// 더블탭(모바일)
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

// 길게탭/길게클릭
function useLongPress(onLong: () => void, ms = 450) {
  const timer = useRef<number | null>(null);
  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      onLong();
      timer.current = null;
    }, ms);
  }, [onLong, ms]);
  const clear = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchCancel: clear,
  };
}

/** ========= 작은 컴포넌트 ========= */
function ActionChip({
  kind, selected, onSelect, onLongPress, item
}: {
  kind: AlarmItem["actions"][number];
  selected: boolean;
  onSelect: () => void;
  onLongPress: () => void;
  item: AlarmItem; // 🔥 추가
}) {
  let label = "";
  if (kind === "simple") label = "한번만 알림";
  if (kind === "pattern") label = "패턴으로 3분간격 재알림해제";
  if (kind === "autoOff") {
    if (item.autoOffAmount && item.autoOffUnit) {
      const unitLabel = item.autoOffUnit === "sec" ? "초" : "분";
      label = `자동 종료 (${item.autoOffAmount}${unitLabel} 후 꺼짐)`;
    } else {
      label = "자동 종료 (N초/분 후 꺼짐)";
    }
  }

  const Icon = kind === "simple" ? X : kind === "pattern" ? RefreshCw : Timer;

  const onTouchEnd = useDoubleTap(onSelect);
  const longBind = useLongPress(onLongPress);

  return (
    <button
      onDoubleClick={(e) => { e.stopPropagation(); onSelect(); }}
      onTouchEnd={onTouchEnd}
      {...longBind}
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] shadow-sm transition
        ${selected ? "bg-slate-800 text-white font-bold ring-2 ring-slate-600" : "bg-white/70 text-slate-700"}`}
      title={`${label} (더블탭=선택 / 길게탭=설정)`}
    >
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}


function Avatar({
  item, onPick
}: {
  item: AlarmItem;
  onPick: () => void; // 더블탭/더블클릭 시 프리셋 팝업
}) {
  const onTouchEnd = useDoubleTap(onPick);
  return (
    <button
      aria-label="아이콘 변경"
      title="아이콘 변경 (더블탭)"
      onDoubleClick={(e) => { e.stopPropagation(); onPick(); }}
      onTouchEnd={onTouchEnd}
      className="grid place-items-center h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-white/70"
    >
      {item.avatarType === "image" && item.avatarValue ? (
        <img src={item.avatarValue} alt="알람 이미지" className="h-full w-full object-cover rounded-xl" />
      ) : (
        <span className="text-[14px] sm:text-[16px]" aria-hidden>{item.avatarValue || "⏰"}</span>
      )}
    </button>
  );
}

function ModalShell({
  open, onClose, title, children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={onClose}>
      <div className="w-[92%] max-w-sm rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-slate-500 text-sm hover:text-slate-700">닫기</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmojiPicker({ value, onPick }: { value?: string; onPick: (em: string) => void }) {
  const presets = ["⏰","😴","🧘","🏃","🍱","💊","💧","📚","🚿","🚌","🎮","🎵","🌞","🌙","⭐","📝"];
  return (
    <div className="grid grid-cols-8 gap-2">
      {presets.map((em) => (
        <button
          key={em}
          onClick={() => onPick(em)}
          className={`grid place-items-center h-10 rounded-xl border ${value===em ? "border-slate-900" : "border-slate-200"} hover:bg-slate-50`}
          title={em}
        >
          <span className="text-xl">{em}</span>
        </button>
      ))}
    </div>
  );
}

/** ========= 시간·반복 고급 폼 ========= */
type RepeatMode = "none" | "weekly" | "nweeks";
const weekdayLabels = ["일","월","화","수","목","금","토"];

function pad2(n: number) { return n < 10 ? `0${n}` : String(n); }
function parseTimeToTodayDate(timeHHMM: string): Date {
  const [h, m] = timeHHMM.split(":").map(Number);
  const d = new Date();
  d.setSeconds(0,0);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function nextOccurrencePreview(opts: {
  mode: RepeatMode;
  nWeeks: number;
  weekdays: boolean[];   // length 7, Sun..Sat
  monthlyDays: number[]; // 1..31
  time: string;          // "HH:MM"
}): string {
  const now = new Date();
  const targetTime = opts.time;
  const start = new Date(now.getTime());

  // 최대 365일 탐색(미리보기용)
  for (let i=0;i<365;i++){
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    // 월간 규칙 우선
    if (opts.monthlyDays.length > 0) {
      if (opts.monthlyDays.includes(d.getDate())) {
        const dt = new Date(d);
        const [h,m] = targetTime.split(":").map(Number);
        dt.setHours(h||0,m||0,0,0);
        if (dt.getTime() >= now.getTime()) {
          return `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())} ${pad2(h||0)}:${pad2(m||0)}`;
        }
      }
      continue;
    }

    // 주간 기반
    if (opts.mode === "none") {
      // 반복없음 → 오늘/내일만 체크
      const [h,m] = targetTime.split(":").map(Number);
      const dt = new Date(d);
      dt.setHours(h||0,m||0,0,0);
      if (dt.getTime() >= now.getTime()) {
        return `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())} ${pad2(h||0)}:${pad2(m||0)}`;
      }
      continue;
    }

    // weekly 또는 nweeks
    const dayIdx = d.getDay(); // 0..6
    if (!opts.weekdays.some(Boolean)) continue; // 요일 미선택 시 스킵
    if (!opts.weekdays[dayIdx]) continue;

    // N주 간격 체크
    if (opts.mode === "nweeks") {
      // 기준 주: 1970-01-04(일요일)로 가정
      const base = new Date(1970,0,4); // Sunday
      const weeksFromBase = Math.floor((d.getTime() - base.getTime()) / (7*24*3600*1000));
      if (weeksFromBase % opts.nWeeks !== 0) continue;
    }

    const [h,m] = targetTime.split(":").map(Number);
    const dt = new Date(d);
    dt.setHours(h||0,m||0,0,0);
    if (dt.getTime() >= now.getTime()) {
      return `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())} ${pad2(h||0)}:${pad2(m||0)}`;
    }
  }
  return "계산 불가";
}

function buildRepeatLabel(
  mode: RepeatMode,
  nWeeks: number,
  weekdays: boolean[],
  monthlyDays: number[]
): string {
  // 2) 매달 x일 포맷 우선
  if (monthlyDays.length > 0) {
    const days = [...monthlyDays].sort((a,b)=>a-b).join(", ");
    return `매달 ${days}일`;
  }

  // 1) 주 단위 포맷 (요일 / 매주 / x주간격)
  const pickedDays = weekdayLabels
    .filter((_, i) => weekdays[i])
    .join("·"); // 예: "월·수·금"

  if (mode === "none") {
    // 반복 없음은 그대로 표기 (원하면 공백/생략도 가능)
    return "반복없음";
  }

  if (mode === "weekly") {
    // 요일 선택이 있으면 "월·수·금/매주", 없으면 "매주"
    return pickedDays ? `${pickedDays}/매주` : "매주";
  }

  // mode === "nweeks"
  // 요일 선택이 있으면 "월·수·금/3주간격", 없으면 "3주간격"
  return pickedDays ? `${pickedDays}/${nWeeks}주간격` : `${nWeeks}주간격`;
}

function WeekdayToggle({
  value, onChange
}: { value: boolean[]; onChange: (v: boolean[]) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {weekdayLabels.map((label, idx) => {
        const active = value[idx];
        return (
          <button
            key={label}
            onClick={() => {
              const next = [...value];
              next[idx] = !next[idx];
              onChange(next);
            }}
            className={`px-2 py-1 rounded-lg border text-sm ${active ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300"}`}
            title={label}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Chips({
  values, onAdd, onRemove, max=31
}: { values: number[]; onAdd: (n:number)=>void; onRemove:(n:number)=>void; max?:number }) {
  const [val, setVal] = useState<string>("");
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          max={max}
          value={val}
          onChange={(e)=>setVal(e.target.value)}
          placeholder="숫자"
          className="w-24 rounded-lg border px-3 py-2"
        />
        <button
          onClick={()=>{
            const n = parseInt(val,10);
            if (!Number.isFinite(n) || n<1 || n>max) return;
            if (!values.includes(n)) onAdd(n);
            setVal("");
          }}
          className="px-3 py-2 rounded-lg bg-slate-900 text-white"
        >
          추가
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.sort((a,b)=>a-b).map(n=>(
          <span key={n} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 border">
            {n}일
            <button onClick={()=>onRemove(n)} className="text-slate-500 hover:text-slate-700">×</button>
          </span>
        ))}
        {values.length===0 && <span className="text-xs text-slate-400">선택된 날짜 없음</span>}
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-16 shrink-0 text-sm text-slate-600">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}
function TextInput({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; }) {
  return (
    <input
      value={value}
      onChange={(e)=>onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full rounded-lg border px-3 py-2"
    />
  );
}
function NumberInput({ value, onChange, min=1 }: { value: number; onChange: (v: number) => void; min?: number; }) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e)=>onChange(Math.max(min, parseInt(e.target.value || String(min),10)))}
      className="w-24 rounded-lg border px-3 py-2 text-center"
    />
  );
}

/** 고급 TimeRepeatForm: 시간/요일/반복모드/N주 옵션/매달 n일 + 다음 울릴 날짜 미리보기 */
/** 고급 TimeRepeatForm: 시간/요일/반복모드/N주 옵션/매달 n일 + 다음 울릴 날짜 미리보기 */
function TimeRepeatForm({
  timeInit, repeatInit, onCancel, onSave
}: {
  timeInit: string; repeatInit: string;
  onCancel: () => void;
  onSave: (v: { time: string; repeat: string }) => void;
}) {
  // ── 1) HH:MM(24h) 파싱/포맷 헬퍼 (AM/PM 제거)
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const parse24 = (s: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s || "");
    const H = m ? clamp(parseInt(m[1], 10), 0, 23) : 7;
    const M = m ? clamp(parseInt(m[2], 10), 0, 59) : 0;
    return { hour24: H, minute: M };
  };
  const toString24 = (h: number, m: number) =>
    `${String(clamp(h,0,23)).padStart(2,"0")}:${String(clamp(m,0,59)).padStart(2,"0")}`;

  // ── 2) 시간 상태: 24h 시/분 직접 관리
  const init = parse24(timeInit || "07:00");
  const [hour24, setHour24] = useState<number>(init.hour24);  // 0~23
  const [minute, setMinute] = useState<number>(init.minute);  // 0~59
  const [time, setTime] = useState<string>(toString24(init.hour24, init.minute));

  // 시/분 변경 시 문자열 동기화
  React.useEffect(() => {
    setTime(toString24(hour24, minute));
  }, [hour24, minute]);

  // ── 3) 반복 모드/요일/매달 옵션 (기존 유지)
  const [mode, setMode] = useState<RepeatMode>(
    /주에 한 번/.test(repeatInit) ? "nweeks" :
    repeatInit === "반복없음" ? "none" : "weekly"
  );
  const [nWeeks, setNWeeks] = useState<number>(2);

  const initWeekdays = (): boolean[] => {
    const picked = new Array(7).fill(false) as boolean[];
    if (repeatInit === "매일") return picked.map(()=>true);
    if (repeatInit === "평일") { picked[1]=picked[2]=picked[3]=picked[4]=picked[5]=true; return picked; }
    if (repeatInit === "주말") { picked[0]=picked[6]=true; return picked; }
    // "월·수·금" 등
    weekdayLabels.forEach((l, idx)=>{
      if (repeatInit.includes(l)) picked[idx] = true;
    });
    return picked;
  };
  const [weekdays, setWeekdays] = useState<boolean[]>(initWeekdays());

  const [monthlyDays, setMonthlyDays] = useState<number[]>(
    /매달\s+[\d,\s]+일/.test(repeatInit)
      ? (repeatInit.match(/매달\s+(.+)일/)?.[1] || "")
          .split(",").map(s=>parseInt(s.trim(),10)).filter(n=>Number.isFinite(n))
      : []
  );

  const repeatLabel = buildRepeatLabel(mode, nWeeks, weekdays, monthlyDays);
  const preview = nextOccurrencePreview({ mode, nWeeks, weekdays, monthlyDays, time });

  return (
    <div className="space-y-4">
      {/* 시간: 24시간제 (0~23시 / 0~59분) */}
      <FieldRow label="시간">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={23}
            value={hour24}
            onChange={(e) => setHour24(clamp(parseInt(e.target.value || "0",10), 0, 23))}
            className="w-20 rounded-lg border px-3 py-2 text-center"
            aria-label="시(0~23)"
          />
          <span className="text-sm">시</span>
          <input
            type="number"
            min={0}
            max={59}
            value={minute}
            onChange={(e) => setMinute(clamp(parseInt(e.target.value || "0",10), 0, 59))}
            className="w-20 rounded-lg border px-3 py-2 text-center"
            aria-label="분(0~59)"
          />
          <span className="text-sm">분</span>
        </div>
      </FieldRow>

      {/* 요일 */}
      <FieldRow label="요일">
        <WeekdayToggle value={weekdays} onChange={setWeekdays} />
      </FieldRow>

      {/* 반복 모드 */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {(["none","weekly","nweeks"] as RepeatMode[]).map(m => (
            <button
              key={m}
              onClick={()=>setMode(m)}
              className={`px-3 py-1 rounded-lg border text-sm ${mode===m ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-300"}`}
            >
              {m==="none"?"반복없음":m==="weekly"?"매주":"N주에 한 번"}
            </button>
          ))}
        </div>
        {mode==="nweeks" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">간격</span>
            <NumberInput value={nWeeks} onChange={setNWeeks} min={1} />
            <span className="text-sm text-slate-600">주</span>
          </div>
        )}
      </div>

      {/* 추가 옵션: 매달 n일 */}
      <div className="space-y-2">
        <div className="text-sm font-semibold"> 매월 특정일 알람</div>
        <FieldRow label="매달">
          <Chips
            values={monthlyDays}
            onAdd={(n)=>setMonthlyDays(prev => prev.includes(n) ? prev : [...prev, n])}
            onRemove={(n)=>setMonthlyDays(prev => prev.filter(x=>x!==n))}
          />
        </FieldRow>
        <p className="text-[11px] text-slate-500">
          ※ 월간 규칙이 주간 규칙보다 우선 적용됩니다.
          <br/> (매주 월/수, 매월 15일 알람 동시 설정 → 매월 15일에만 알람)
        </p>
      </div>

      {/* 미리보기 */}
      <div className="rounded-lg bg-slate-50 border px-3 py-2 text-sm text-slate-700">
        <div>반복 요약: <b>{repeatLabel}</b></div>
        <div className="mt-1 text-slate-500 text-[12px]">다음 울림: {preview}</div>
      </div>

      {/* 액션 */}
      <div className="flex justify-end gap-2 pt-1">
        <button className="px-3 py-1 rounded-lg border" onClick={onCancel}>취소</button>
        <button
          className="px-3 py-1 rounded-lg bg-blue-600 text-white"
          onClick={()=>{
            if (!/^\d{2}:\d{2}$/.test(time)) { alert("시간 형식을 확인해주세요."); return; }
            onSave({ time, repeat: repeatLabel });
          }}
        >
          저장
        </button>
      </div>
    </div>
  );
}


/** ========= 메인 카드 ========= */
function AlarmCard({
  item,
  onToggle,
  onDelete,
  onPickEmoji,
  onRename,
  onEditTimeRepeat,
  onSelectAction,
  onConfigPattern,
  onConfigAutoOff,
  onToggleSound,
  onToggleVibrate,
}: {
  item: AlarmItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPickEmoji: (id: string) => void;
  onRename: (id: string) => void;
  onEditTimeRepeat: (id: string) => void;
  onSelectAction: (id: string, action: AlarmItem["actions"][number]) => void;
  onConfigPattern: (id: string) => void;
  onConfigAutoOff: (id: string) => void;
  onToggleSound: (id: string) => void;
  onToggleVibrate: (id: string) => void;
}) {
  // 싱글탭 vs 더블탭 지연-취소 핸들러
  const clickTimerRef = useRef<number | null>(null);
  const SINGLE_DELAY = 280;

  const handleCardTap = () => {
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      return; // 더블탭: 토글 취소
    }
    clickTimerRef.current = window.setTimeout(() => {
      onToggle(item.id); // 싱글탭일 때만
      clickTimerRef.current = null;
    }, SINGLE_DELAY) as unknown as number;
  };

  const dbl = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
  const dblTouch = (fn: () => void) => {
    const h = useDoubleTap(fn);
    return (e: React.TouchEvent) => h(e);
  };

  return (
    <div
      role="button"
      onClick={handleCardTap}
      onTouchEnd={handleCardTap}
      className={`group relative overflow-hidden rounded-2xl p-3 sm:p-4 text-left shadow-[0_4px_16px_rgba(0,0,0,0.10)] transition ring-0 focus:outline-none min-h-[110px]
      ${item.enabled ? "opacity-100" : "opacity-50 grayscale"}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${item.color} blur-[0.5px]`} />

      <div className="relative z-10 flex h-full flex-col gap-1.5">
        {/* 상단: 아바타 + 제목(더블탭=이름변경) + 삭제 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar item={item} onPick={() => onPickEmoji(item.id)} />
            <h3
              className="font-semibold text-sm sm:text-base tracking-tight cursor-pointer"
              onDoubleClick={dbl(() => onRename(item.id))}
              onTouchEnd={dblTouch(() => onRename(item.id))}
              title="더블탭으로 이름 변경"
            >
              {item.title}
            </h3>
          </div>
          <button
            type="button"
            title="알람 삭제"
            aria-label="알람 삭제"
            onClick={(e) => { e.stopPropagation(); if (window.confirm('이 알람을 삭제하시겠습니까?')) onDelete(item.id); }}
            className="cursor-pointer text-[14px] rounded-full border border-slate-400/70 px-2 py-0.5 bg-transparent text-slate-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 시간/반복 : 더블탭=시간·반복 팝업 */}
        <div className="flex items-baseline gap-2">
          <span
            className="font-bold leading-none tracking-tight text-base sm:text-xl cursor-pointer"
            onDoubleClick={dbl(() => onEditTimeRepeat(item.id))}
            onTouchEnd={dblTouch(() => onEditTimeRepeat(item.id))}
            title="더블탭: 시간/반복 변경"
          >
            {item.time}
          </span>
          <button
            onDoubleClick={dbl(() => onEditTimeRepeat(item.id))}
            onTouchEnd={dblTouch(() => onEditTimeRepeat(item.id))}
            className="text-[11px] sm:text-xs text-slate-800/90 bg-white/70 rounded-full px-1.5 py-0.5"
            title="더블탭: 시간/반복 변경"
          >
            {item.repeat}
          </button>
        </div>
      

        {/* 끄기 옵션 칩: 더블탭=선택 / 길게탭=설정 */}
        <div className="mt-0.5 flex flex-wrap gap-1 sm:gap-1.5">
          {item.actions.map((a) => (
<ActionChip
  key={a}
  kind={a}
  selected={item.selectedAction === a}
  onSelect={() => onSelectAction(item.id, a)}
  onLongPress={() => {
    if (a === "pattern") onConfigPattern(item.id);
    if (a === "autoOff") onConfigAutoOff(item.id);
  }}
  item={item} // 🔥 전달
/>

          ))}
        </div>

{/* 우하단: 소리/진동 토글 (더블탭) */}

<div className="mt-1 flex gap-1 justify-end">
  <button
    className={`rounded-full px-2 py-0.5 text-[14px] transition
      ${item.sound
        ? "border-2 border-black bg-white/70"
        : "bg-slate-400/30"
      }`}
    onDoubleClick={(e) => { e.stopPropagation(); onToggleSound(item.id); }}
    onTouchEnd={useDoubleTap(() => onToggleSound(item.id))}
    title="더블탭: 소리 켬/끔"
  >
    🔊
  </button>
  <button
    className={`rounded-full px-2 py-0.5 text-[14px] transition
      ${item.vibrate
        ? "border-2 border-black bg-white/70"
        : "bg-slate-400/30"
      }`}
    onDoubleClick={(e) => { e.stopPropagation(); onToggleVibrate(item.id); }}
    onTouchEnd={useDoubleTap(() => onToggleVibrate(item.id))}
    title="더블탭: 진동 켬/끔"
  >
    📳
  </button>
</div>


      </div>

      <div className={`pointer-events-none absolute inset-0 rounded-2xl ring-2 transition ${item.enabled ? "ring-white/70" : "ring-white/30"}`} />
    </div>
  );
}

/** ========= App ========= */
export default function App() {
  const [alarms, setAlarms] = useState<AlarmItem[]>(seed);

  // 공통 업데이트
  const update = (id: string, patch: Partial<AlarmItem>) =>
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  // 이모지 모달 상태
  const [emojiTargetId, setEmojiTargetId] = useState<string | null>(null);
  const closeEmoji = () => setEmojiTargetId(null);
  const byId = (id: string) => alarms.find(a => a.id === id);

  // 사용법 모달
  const [helpOpen, setHelpOpen] = useState(false);

  /** ===== 통일된 필드 모달 상태 ===== */
  type ModalKind =
    | { type: "name"; id: string }
    | { type: "timeRepeat"; id: string }
    | { type: "pattern"; id: string }
    | { type: "autoOff"; id: string }
    | null;

  const [modal, setModal] = useState<ModalKind>(null);
  const closeModal = () => setModal(null);
  const byIdSafe = (id: string | undefined) => (id ? alarms.find(a => a.id === id) : undefined);

  /** ===== 트리거들 ===== */
  const pickEmoji = (id: string) => setEmojiTargetId(id);
  const rename = (id: string) => setModal({ type: "name", id });
  const editTimeRepeat = (id: string) => setModal({ type: "timeRepeat", id });
  const configPattern = (id: string) => setModal({ type: "pattern", id });
  const configAutoOff = (id: string) => setModal({ type: "autoOff", id });

  /** ===== 토글들 ===== */
  const toggleSound   = (id: string) => update(id, { sound: !byId(id)?.sound });
  const toggleVibrate = (id: string) => update(id, { vibrate: !byId(id)?.vibrate });

  /** ===== 기본 로직 ===== */
  const toggleAlarm = (id: string) => update(id, { enabled: !byId(id)?.enabled });
  const deleteAlarm = (id: string) => setAlarms((prev) => prev.filter((a) => a.id !== id));
  const addAlarm = () => {
    const palette = [pastel.mint, pastel.sky, pastel.peach, pastel.lilac, pastel.lemon];
    const next: AlarmItem = {
      id: String(Date.now()),
      title: "새 알람",
      time: "07:00",
      repeat: "반복없음",
      actions: ["simple","pattern","autoOff"],
      selectedAction: "simple",
      enabled: true,
      color: palette[Math.floor(Math.random() * palette.length)],
      avatarType: "emoji",
      avatarValue: "⏰",
      sound: false,
      vibrate: true,
    };
    setAlarms((p) => [next, ...p]);
  };
  const selectAction = (id: string, action: AlarmItem["actions"][number]) => update(id, { selectedAction: action });

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white to-slate-100">
      <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/70 border-b border-slate-200/60">
        <div className="mx-auto max-w-5xl px-3 py-2 flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-bold tracking-tight flex items-baseline gap-1">
            Simple alarm <span className='text-slate-400 text-[11px]'>(ver.1.0)</span>
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHelpOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-white/80 px-2.5 py-1 text-xs shadow-sm hover:bg-white active:scale-[0.98]"
              aria-label="사용법"
              title="사용법"
            >
              상세 사용법
            </button>
            <button onClick={addAlarm} className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-white/80 px-2.5 py-1 text-xs shadow-sm hover:bg-white active:scale-[0.98]" aria-label="알람 추가">
              <Plus className="h-4 w-4" />새알람
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-3 grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-5">
        {alarms.map((alarm) => (
          <AlarmCard
            key={alarm.id}
            item={alarm}
            onToggle={toggleAlarm}
            onDelete={deleteAlarm}
            onPickEmoji={pickEmoji}
            onRename={rename}
            onEditTimeRepeat={editTimeRepeat}
            onSelectAction={selectAction}
            onConfigPattern={configPattern}
            onConfigAutoOff={configAutoOff}
            onToggleSound={toggleSound}
            onToggleVibrate={toggleVibrate}
          />
        ))}
      </main>

      {/* 사용법 모달 */}
<ModalShell open={helpOpen} onClose={() => setHelpOpen(false)} title="기본 사용법">
  <HelpContent onClose={() => setHelpOpen(false)} />
</ModalShell>


      {/* 이모지 선택 모달 */}
      <ModalShell open={!!emojiTargetId} onClose={closeEmoji} title="이모지 선택">
        {emojiTargetId && (
          <EmojiPicker
            value={byId(emojiTargetId)?.avatarValue}
            onPick={(em) => {
              setAlarms(p => p.map(a => a.id === emojiTargetId ? { ...a, avatarType: "emoji", avatarValue: em } : a));
              closeEmoji();
            }}
          />
        )}
      </ModalShell>

{/* 이름 변경 모달 */}
<ModalShell open={!!modal && modal.type==="name"} onClose={closeModal} title="이름 변경">
  {modal?.type==="name" && byIdSafe(modal.id) && (
    <NameForm
      initial={byIdSafe(modal.id)!.title}
      onCancel={closeModal}
      onSave={(name) => {
        setAlarms(p =>
          p.map(a => a.id === (modal as any).id ? { ...a, title: name.trim() } : a)
        );
        closeModal();
      }}
    />
  )}
</ModalShell>


      {/* 시간 · 반복 모달 */}
      <ModalShell open={!!modal && modal.type==="timeRepeat"} onClose={closeModal} title="시간 · 반복">
        {modal?.type==="timeRepeat" && byIdSafe(modal.id) && (
          <TimeRepeatForm
            timeInit={byIdSafe(modal.id)!.time}
            repeatInit={byIdSafe(modal.id)!.repeat}
            onCancel={closeModal}
            onSave={({ time, repeat }) => {
              setAlarms(p => p.map(a => a.id === (modal as any).id ? { ...a, time, repeat } : a));
              closeModal();
            }}
          />
        )}
      </ModalShell>

      {/* 패턴 설정 모달 */}
      <ModalShell open={!!modal && modal.type==="pattern"} onClose={closeModal} title="패턴 설정">
        {modal?.type==="pattern" && byIdSafe(modal.id) && (
          <PatternForm
            initial={byIdSafe(modal.id)!.pattern ?? ""}
            onCancel={closeModal}
            onSave={(patt) => {
              setAlarms(s => s.map(a => a.id === (modal as any).id ? { ...a, pattern: patt } : a));
              closeModal();
            }}
          />
        )}
      </ModalShell>

      {/* 자동 종료 모달 */}
      <ModalShell open={!!modal && modal.type==="autoOff"} onClose={closeModal} title="자동 종료">
        {modal?.type==="autoOff" && byIdSafe(modal.id) && (
          <AutoOffForm
            amountInit={byIdSafe(modal.id)!.autoOffAmount ?? 30}
            unitInit={byIdSafe(modal.id)!.autoOffUnit ?? "sec"}
            onCancel={closeModal}
            onSave={({ amount, unit }) => {
              setAlarms(s => s.map(a => a.id === (modal as any).id ? { ...a, autoOffAmount: amount, autoOffUnit: unit } : a));
              closeModal();
            }}
          />
        )}
      </ModalShell>

      <footer className="sm:block mx-auto max-w-5xl px-4 pb-8 pt-2 text-left text-xs text-slate-500">
        <ul className="list-none">
          <li>[간단 사용법]</li>
          <li>· 카드 싱글탭: ON/OFF</li>
          <li>· 버튼 더블탭: 이모지/이름/시간/반복/소리/진동 설정</li>
          <li>· 버튼 길게탭: 패턴/자동종료시간 설정</li>
        </ul>
      </footer>
    </div>
  );
}



/** 나머지 폼들 (이름/패턴/자동종료) */
function PatternForm({
  initial, onCancel, onSave
}: {
  initial: string; onCancel: () => void; onSave: (p: string) => void;
}) {
  // 3x3 그리드의 9개 노드(0~8)
  const DOTS = Array.from({ length: 9 }, (_, i) => i);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [dragging, setDragging] = useState(false);
  const [current, setCurrent] = useState<number[]>([]);   // 현재 그리는 패턴
  const [phase, setPhase] = useState<"create"|"confirm">("create");
  const [firstPattern, setFirstPattern] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 👇 추가: 포인터(커서/손가락) 현재 위치 — 러버밴드 선을 위해 필요
  const [pointer, setPointer] = useState<{x:number; y:number} | null>(null);

  const resetDraw = () => {
    setCurrent([]);
    setPointer(null);
    setDragging(false);
    setError(null);
  };

  const encode = (arr: number[]) => arr.join("-");
  const decode = (s: string) =>
    s.split("-").map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n >= 0 && n <= 8);

  const hitTest = (x: number, y: number) => {
    // 포인터 위치로부터 어떤 점에 "근접"했는지 검사
    const threshold = 28; // px
    for (let i = 0; i < dotRefs.current.length; i++) {
      const el = dotRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = cx - x;
      const dy = cy - y;
      const dist = Math.hypot(dx, dy);
      if (dist <= threshold) return i;
    }
    return -1;
  };

  const addDot = (idx: number) => {
    if (idx < 0) return;
    setCurrent((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
  };

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setDragging(true);
    setPointer({ x: e.clientX, y: e.clientY }); // 👈 포인터 위치 기억
    const idx = hitTest(e.clientX, e.clientY);
    if (idx >= 0) addDot(idx);
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!dragging) return;
    setPointer({ x: e.clientX, y: e.clientY }); // 👈 이동 중에도 갱신
    const idx = hitTest(e.clientX, e.clientY);
    if (idx >= 0) addDot(idx);
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = () => {
    setDragging(false);
    setPointer(null); // 👈 드래그 종료 시 러버밴드 제거
    if (current.length < 2) {
      setError("점 두 개 이상을 이어주세요.");
      return;
    }
  };

  const handleSave = () => {
    if (current.length < 2) {
      setError("점 두 개 이상을 이어주세요.");
      return;
    }
    if (phase === "create") {
      setFirstPattern(current);
      setPhase("confirm");
      setCurrent([]);
      setError(null);
      return;
    }
    if (!firstPattern) {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
      return;
    }
    if (encode(firstPattern) !== encode(current)) {
      setError("패턴이 일치하지 않습니다. 다시 그려주세요.");
      return;
    }
    onSave(encode(current));
  };

  const handleUseExisting = () => {
    if (initial) onSave(initial);
  };

  // 선 렌더링: 선택한 점들 사이의 선 + (드래깅 중이면) 마지막 점 → 현재 포인터까지 러버밴드
  const Lines = () => {
    const centers: Array<{ x: number; y: number }> = DOTS.map((i) => {
      const el = dotRefs.current[i];
      if (!el) return { x: 0, y: 0 };
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });

    const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 1; i < current.length; i++) {
      const a = centers[current[i - 1]];
      const b = centers[current[i]];
      if (a && b) segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }

    // 👇 드래그 중이면 마지막 점 → 현재 포인터까지 임시 선 추가 (러버밴드)
    if (dragging && pointer && current.length >= 1) {
      const last = centers[current[current.length - 1]];
      if (last) {
        segs.push({ x1: last.x, y1: last.y, x2: pointer.x, y2: pointer.y });
      }
    }

    return (
      <svg className="pointer-events-none fixed inset-0 z-[60]">
        {segs.map((s, i) => (
          <line
            key={i}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke="rgb(30 41 59)" // slate-800
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.9"
          />
        ))}
      </svg>
    );
  };

  const headerHelp =
    phase === "create"
      ? "패턴을 그려주세요"
      : "한 번 더 똑같이 그려서 확인하세요";

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700">{headerHelp}</p>

      {/* 드로우 영역 */}
      <div
        ref={containerRef}
        className="relative mx-auto mt-1 grid w[260px] sm:w-[260px] w-[240px] grid-cols-3 gap-8"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { setDragging(false); setPointer(null); }}
      >
        {DOTS.map((i) => (
          <div
            key={i}
            ref={(el) => (dotRefs.current[i] = el)}
            className={`h-14 w-14 rounded-full grid place-items-center transition
              ${current.includes(i) ? "bg-slate-800 text-white" : "bg-white border border-slate-300"}
            `}
          >
            <div
              className={`h-3 w-3 rounded-full transition
                ${current.includes(i) ? "bg-white" : "bg-slate-400/60"}
              `}
            />
          </div>
        ))}
      </div>

      {/* 현재 선 그리기 */}
      {(current.length > 0 || (dragging && pointer)) && <Lines />}

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-2">
          {initial && phase === "create" && (
            <button
              className="px-3 py-1 rounded-lg border"
              onClick={handleUseExisting}
              title="기존 패턴 유지"
            >
              기존 유지
            </button>
          )}
          <button className="px-3 py-1 rounded-lg border" onClick={resetDraw}>
            지우기
          </button>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded-lg border" onClick={onCancel}>
            취소
          </button>
          <button
            className="px-3 py-1 rounded-lg bg-blue-600 text-white disabled:bg-slate-200 disabled:text-slate-400"
            disabled={current.length < 2}
            onClick={handleSave}
          >
            {phase === "create" ? "다음" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}


function HelpContent({ onClose }: { onClose: () => void }) {
  const section = "space-y-1.5 text-sm text-slate-700";
  const bullet = "list-disc pl-5 space-y-1";
  const pill = "inline-block rounded-full px-1.5 py-0.5 bg-slate-800 text-white text-[11px] align-middle";

  return (
    <div className="space-y-4">
      {/* 기본 조작 */}
      <section className={section}>
        <h4 className="font-semibold">기본 조작</h4>
        <ul className={bullet}>
          <li><b>카드 한번클릭</b> → 알람 켜기/끄기</li>
          <li><b>카드내 버튼 더블클릭</b> → 설정 (이모지, 이름, 시간·반복, 🔊(소리), 📳(진동))</li>
          <li><b>카드내 버튼 길게누르기</b> → 알람종료옵션 (패턴입력/자동입력) 설정</li>
        </ul>
      </section>

      {/* 알람 꾸미기 */}
      <section className={section}>
        <h4 className="font-semibold">알람 꾸미기</h4>
        <ul className={bullet}>
          <li><b>이모티콘 더블클릭</b> → 선택</li>
          <li><b>알람제목 더블탭</b> → 변경</li>
        </ul>
      </section>

      {/* 시간 · 반복 */}
      <section className={section}>
        <h4 className="font-semibold">시간 · 반복</h4>
        <ul className={bullet}>
          <li><b>시간/반복 더블탭</b> → 설정</li>
          <li>시간: <b>24시간제</b>, ± 버튼으로 빠르게 조정</li>
          <li>요일: 일~토 선택 (복수선택 가능)</li>
          <li>반복: <b>반복 없음</b>, <b>매주</b>, <b>N주 간격</b> 설정가능</li>
          <li>추가: <b>매달 특정일</b> 선택 가능 (예: 매달 15일)</li>
        </ul>
      </section>

      {/* 종료 방식 */}
      <section className={section}>
        <h4 className="font-semibold">종료 방식</h4>
        <ul className={bullet}>
          <li><b>단순 끄기</b> : 한번끄면 재알람없음.</li>
          <li><b>패턴 입력</b> : 패턴을 입력해야 해제 <br/>(미입력 시 <b>3분 후</b> 무한재알람)</li>
          <li><b>자동 종료</b> : 설정한 시간(분/초)만큼 울린 뒤 꺼짐</li>
        </ul>
      </section>

      {/* 소리/진동 */}
      <section className={section}>
        <h4 className="font-semibold">소리 · 진동</h4>
        <ul className={bullet}>
          <li>우하단 <b>🔊 / 📳 더블탭</b> → 켬/끔</li>
          <li><span className={pill}>진한 테두리</span>가 보이면 켜진 상태</li>
        </ul>
      </section>

      <div className="flex justify-end pt-1">
        <button className="px-3 py-1 rounded-lg bg-slate-800 text-white" onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  );
}


function NameForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: string;
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  // 입력칸은 비어 있고, 기존 제목은 placeholder로만 보여줌
  const [name, setName] = useState("");

  return (
    <div className="space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={initial || "알람 이름"}
        autoFocus
        className="w-full rounded-lg border px-3 py-2"
      />
      <div className="flex justify-end gap-2">
        <button className="px-3 py-1 rounded-lg border" onClick={onCancel}>
          취소
        </button>
        <button
          className="px-3 py-1 rounded-lg bg-blue-600 text-white"
          onClick={() => onSave(name || initial)} // 비우면 기존 제목 유지
        >
          저장
        </button>
      </div>
    </div>
  );
}


function AutoOffForm({
  amountInit, unitInit, onCancel, onSave
}: {
  amountInit: number; unitInit: "sec"|"min";
  onCancel: () => void;
  onSave: (v: {amount:number; unit:"sec"|"min"}) => void;
}) {
  const [amount, setAmount] = useState(Math.max(1, amountInit || 30));
  const [unit, setUnit] = useState<"sec"|"min">(unitInit ?? "sec");

  const canSave = Number.isFinite(amount) && amount > 0;

  return (
    <div className="space-y-3">
      {/* 단위 선택 (초/분) */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">단위</span>
        <div className="inline-flex rounded-lg border overflow-hidden">
          <button
            type="button"
            className={`px-3 py-1 text-sm ${unit==="sec" ? "bg-slate-800 text-white" : "bg-white"}`}
            onClick={() => setUnit("sec")}
          >
            초
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-sm border-l ${unit==="min" ? "bg-slate-800 text-white" : "bg-white"}`}
            onClick={() => setUnit("min")}
          >
            분
          </button>
        </div>
      </div>

      {/* 시간(지속) 입력 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">지속 시간</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => {
              const v = parseInt(e.target.value || "1", 10);
              setAmount(Number.isFinite(v) ? Math.max(1, v) : 1);
            }}
            className="w-24 rounded-lg border px-3 py-2 text-center"
          />
          <span className="text-sm text-slate-600">{unit === "sec" ? "초" : "분"}</span>
        </div>
      </div>

      {/* 미리보기 안내 */}
      <p className="text-xs text-slate-500">
        알람이 시작되면 <b>{amount}</b>{unit === "sec" ? "초" : "분"} 뒤 자동으로 종료됩니다.
        <br/> 재알람은 울리지 않습니다.
      </p>

      <div className="flex justify-end gap-2 pt-1">
        <button className="px-3 py-1 rounded-lg border" onClick={onCancel}>취소</button>
        <button
          className={`px-3 py-1 rounded-lg ${canSave ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
          disabled={!canSave}
          onClick={() => onSave({ amount, unit })}
        >
          저장
        </button>
      </div>
    </div>
  );
}

