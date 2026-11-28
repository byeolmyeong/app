/**
 * 화면의 "오늘"(한국 날짜). 처음 그릴 때 한 번 읽고(그리는 동안 시계를 읽지 않는다), 앱으로 돌아올 때 다시 읽는다 —
 * 백그라운드에 둔 채 자정을 넘기면 어제를 "오늘" 로 표시하고 진짜 오늘을 그날의 하늘로 보내지 않게(오늘의 하늘 useTodaySky 와 같은 때).
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { koreaToday } from '@/features/timing/dates';

export function useKoreaToday(): string {
  const [today, setToday] = useState(koreaToday);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setToday(koreaToday());
    });
    return () => sub.remove();
  }, []);
  return today;
}
