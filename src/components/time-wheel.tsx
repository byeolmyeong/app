import type { Dispatch, SetStateAction } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScrollPicker } from '@/components/scroll-picker';
import { Txt } from '@/components/txt';
import { Colors, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

/** 시각 고르기(오전/오후 · 시 · 분)의 값 */
export type WheelTime = { period: 'AM' | 'PM'; hour: number; minute: number };

const PERIODS = [
  { value: 'AM' as const, label: strings.detail.am },
  { value: 'PM' as const, label: strings.detail.pm },
];
const HOURS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
const minutesOf = (step: number) =>
  Array.from({ length: Math.ceil(60 / step) }, (_, i) => ({ value: i * step, label: String(i * step).padStart(2, '0') }));

const pad = (n: number) => String(n).padStart(2, '0');

/** "HH:mm"(24시간)을 고르기 값으로. 꼴이 틀리면 null */
export function clockToWheel(clock: string): WheelTime | null {
  const m = /^(\d{2}):(\d{2})$/.exec(clock);
  if (!m) return null;
  const [h, minute] = [Number(m[1]), Number(m[2])];
  if (h > 23 || minute > 59) return null;
  return { period: h < 12 ? 'AM' : 'PM', hour: h % 12 === 0 ? 12 : h % 12, minute };
}

/** 고르기 값을 "HH:mm" 으로. 오전 12시는 00, 오후 12시는 12 */
export function wheelToClock(t: WheelTime): string {
  return `${pad((t.hour % 12) + (t.period === 'PM' ? 12 : 0))}:${pad(t.minute)}`;
}

/** 예: "오후 9:00" */
export function formatWheelTime(t: WheelTime): string {
  return `${t.period === 'AM' ? strings.detail.am : strings.detail.pm} ${t.hour}:${pad(t.minute)}`;
}

/** "HH:mm" 을 "오전 8:00" 꼴로. 꼴이 틀리면 빈 글자 */
export function formatClock(clock: string): string {
  const t = clockToWheel(clock);
  return t ? formatWheelTime(t) : '';
}

/**
 * 시각 드럼 세 열(오전/오후 · 시 · 분, 시안 8-1): 세 열을 가로지르는 가운데 띠 하나. 시 · 분은 한 바퀴 돈다.
 * `minuteStep` 이 1 보다 크면 분을 그 간격으로만 보인다(받는 시간은 5분, 서버 결정 042) — 그 간격에 없는 값은 아래로 맞춰 가운데에 둔다.
 */
export function TimeWheel({
  value,
  onChange,
  minuteStep = 1,
}: {
  value: WheelTime;
  /** 이전 값에서 바꾼다(열 하나를 굴리다 멈추는 사이 다른 열을 눌러도 앞 열의 값을 덮지 않게) */
  onChange: Dispatch<SetStateAction<WheelTime>>;
  minuteStep?: number;
}) {
  const snap = (m: number) => m - (m % minuteStep);
  const minute = snap(value.minute);
  return (
    <View style={styles.pickers}>
      <View pointerEvents="none" style={styles.band} />
      <ScrollPicker
        testID="time-period"
        band={false}
        items={PERIODS}
        value={value.period}
        onChange={(period) => onChange((prev) => ({ ...prev, minute: snap(prev.minute), period }))}
      />
      <ScrollPicker
        testID="time-hour"
        band={false}
        loop
        items={HOURS}
        value={value.hour}
        onChange={(hour) => onChange((prev) => ({ ...prev, minute: snap(prev.minute), hour }))}
      />
      <Txt variant="pickerOn">{strings.common.timeColon}</Txt>
      <ScrollPicker
        testID="time-minute"
        band={false}
        loop
        items={minutesOf(minuteStep)}
        value={minute}
        onChange={(next) => onChange((prev) => ({ ...prev, minute: next }))}
      />
    </View>
  );
}

const PICKER_HEIGHT = Sizes.pickerRow * Sizes.pickerRows;

const styles = StyleSheet.create({
  pickers: {
    height: PICKER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
  },
  /** 세 열을 가로지르는 가운데 줄 뒤의 띠 */
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: Sizes.pickerRow * Math.floor(Sizes.pickerRows / 2),
    height: Sizes.pickerRow,
    borderRadius: Sizes.pickerBandRadius,
    backgroundColor: Colors.sheetFill,
  },
});
