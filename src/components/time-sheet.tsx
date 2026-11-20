import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { clockToWheel, TimeWheel, wheelToClock, type WheelTime } from '@/components/time-wheel';
import { Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

/** 값이 "HH:mm" 꼴이 아닐 때 가운데에 놓는 시각(받는 시간의 기본, 결정 057 의 4) */
const FALLBACK: WheelTime = { period: 'AM', hour: 8, minute: 0 };

/**
 * 받는 시간 고르기 시트(시안 8-1 모양 — 제목 없음 · 드럼 세 열 · 맨 아래 "확인"). 마이 › 알림(16-2)과 홈의 알림 받기 권유(11-10)가 쓴다.
 * 열 때마다 `value`("HH:mm") 에서 시작하고, "확인" 을 눌러야 `onConfirm` 으로 "HH:mm" 을 준다. 닫으면 고르던 것은 버린다.
 */
export function TimeSheet({
  visible,
  value,
  minuteStep = 1,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  value: string;
  minuteStep?: number;
  onConfirm: (clock: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<WheelTime>(() => clockToWheel(value) ?? FALLBACK);
  // 닫혀 있다가 열릴 때 지금 값에서 다시 시작한다
  const [wasVisible, setWasVisible] = useState(visible);
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (visible) setDraft(clockToWheel(value) ?? FALLBACK);
  }
  const confirm = () => {
    const minute = draft.minute - (draft.minute % minuteStep);
    onConfirm(wheelToClock({ ...draft, minute }));
  };
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View testID="time-body" style={styles.body}>
        <TimeWheel value={draft} onChange={setDraft} minuteStep={minuteStep} />
        <Button label={strings.home.timeConfirm} onPress={confirm} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  /** 제목 없는 시트(결정 056 의 9 · 061 의 6): 시트 위 여백(32)에 더해, 시트 위 끝에서 드럼까지 시안 8-1 의 58 */
  body: { gap: Spacing.md + Spacing.xxs, marginTop: Sizes.pickerSheetTop - Spacing.xl },
});
