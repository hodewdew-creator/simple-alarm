# Simple alarm

모바일 2열 카드형 알람 UI (React + Vite + Tailwind).  
싱글탭 = ON/OFF, 더블탭 = 설정(옵션 선택/아바타 변경/삭제) 플로우.

## 실행
```bash
pnpm i   # 또는 npm i / yarn
pnpm dev # 또는 npm run dev / yarn dev
```
빌드는 `pnpm build` (또는 npm/yarn 동일).

## 구조
- `src/App.tsx` 메인 화면
- `lucide-react` 아이콘 사용
- Tailwind 기본 설정 포함

## 현재 구현
- 2열 카드 그리드, 최대 8개 시드 알람
- 카드 싱글탭 → ON/OFF 토글
- 옵션 칩 더블탭 → 단순 끄기 / 패턴 입력 / 자동 종료 선택 (칩 강조)
- 아이콘 탭/더블탭 → 이모지/이미지 커스텀 (URL)
- 휴지통 클릭 → 확인 팝업 후 삭제
- 시간 폰트 **약간 키움** (`text-sm → text-sm/sm:text-lg`)

## 다음 구현 계획
1) **알람 시각 더 키우기(세밀 조정)**
   - 현재 `text-sm sm:text-lg`. 제품 감각에 맞춰 `text-base sm:text-xl` 정도까지 단계적 실험.

2) **시각/반복 클릭 시 팝업 설정창**
   - 모달 컴포넌트 추가:
     - 시간: 12/24h, AM/PM, 시/분
     - 반복: 요일, 매 n주 반복
     - 끄기 옵션: 단순/패턴/자동종료(X초/분)
     - 소리/진동 선택, 미리듣기
   - 모바일 제스처 충돌 방지: 카드 싱글탭 토글과 분리하기 위해 **버튼 요소**로 만들고 `e.stopPropagation()` 처리 (샘플로 repeat에 alert 바인딩해둠).

3) **제목 옆에 소리/진동 상태 표기**
   - `AlarmItem`에 `sound: boolean`, `vibrate: boolean` 필드 추가.
   - 카드 헤더 오른쪽에 작은 배지: `🔊`, `📳` 또는 `🔕`/`🚫` 조합.

4) **실제 알람 동작**
   - **웹(PWA) 경로**:
     - Notification API + Service Worker + Alarm 스케줄링(IndexedDB에 저장).
     - `showTrigger`(Chrome Alarm API 유사)는 실험적: 대체로 `setTimeout` + SW `sync`/`push` 또는 백엔드 필요.
     - iOS 사파리는 백그라운드 제한이 큼 → **PWA 설치 + Push(서버)** 권장.
   - **하이브리드(권장)**:
     - Capacitor 또는 React Native로 포팅.
     - **Android**: `AlarmManager` + `ForegroundService`로 백그라운드 알람/진동/사운드, Notification 채널 구성.
     - **iOS**: `UNUserNotificationCenter` 로컬 알림 스케줄, `UNNotificationAction`으로 패턴 입력/단순 종료 등 액션 버튼.
   - **종료 방식별 UX** (알림 팝업):
     - 단순 끄기: 닫으면 재알람 없음.
     - 패턴 입력: 알림 액션 눌러 앱 열기 → 패턴 모달 완료 시 재알람 해제. 미완료 시 **스누즈(재알림)** 반복.
     - 자동 종료: 알림에 `몇초/분 후 자동 종료됩니다` 안내, 타이머 끝나면 자동 해제.

### 기술 메모
- 시간/반복 모달은 **포커스 트랩 + ESC 닫기**로 접근성 고려.
- 알림 권한 흐름: 최초 실행 시 옵트인 모달 → 권한 요청 → 실패 시 가이드.
- 데이터 저장: `localStorage` → 향후 `IndexedDB` 마이그레이션.
- 국제화(i18n) 대비해 AM/PM/요일 로컬라이즈.

## 라이선스
MIT