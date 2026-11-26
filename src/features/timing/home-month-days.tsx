import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, LineWidth, ScreenPaddingX, TimingLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';
import { formatDayOnly, weekdayOf } from '@/features/timing/dates';
import { categoryLabel } from '@/features/timing/timing-parts';
import type { MonthSky } from '@/lib/api';

const S = strings.home.monthDays;
const Y = L.home.days;

/**
 * 홈의 이번 달 눈여겨볼 날(결정 092): 이번 달(`GET /timing/month` 의 days — 시기 풀이 전에도 열린다)을 칸 폭이 정해진 가로 슬라이드로 둔다
 * (소유자 "많으면 슬라이드"). 오늘 · 다가오는 날이 앞, 지난 날은 맨 뒤(결정 096). 칸: "21일 · 오늘"(오늘은 주색 글자 · 주색 테두리) / "25일 · 수" · 그날의 한 줄(두 줄까지). 누르면 그날(onDay).
 * 받기 전 · 못 받음 · 날이 없으면 칸을 두지 않는다(홈은 이 칸을 기다리지 않는다). 첫 칸은 홈 여백에 맞추고, 밀면 왼쪽은 홈 여백에서 잘리고
 * 오른쪽만 화면 끝까지 간다(소유자 빌드 15 "왼쪽에 넘치지 않게").
 */
export function HomeMonthDays({ sky, today, onDay }: { sky: MonthSky | null; today: string; onDay: (date: string) => void }) {
  if (!sky) return null;
  // 이번 달 달력과 같은 날만 — 모르는 종류는 뺀다. 오늘 · 다가오는 날을 날짜 순서로 앞에, 지난 날은 맨 뒤에(결정 096)
  const known = sky.days.filter((d) => categoryLabel(d.category) !== null).sort((a, b) => a.date.localeCompare(b.date));
  const days = [...known.filter((d) => d.date >= today), ...known.filter((d) => d.date < today)];
  if (days.length === 0) return null;
  return (
    <View testID="home-month-days">
      <Txt variant="kicker" color="accentText" style={styles.title}>
        {S.title}
      </Txt>
      <ScrollView
        testID="home-month-days-scroll"
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.row}>
        {days.map((d) => {
          const isToday = d.date === today;
          const when = `${formatDayOnly(d.date)}${S.separator}${isToday ? S.today : strings.timing.weekdays[weekdayOf(d.date)]}`;
          return (
            <Pressable
              key={d.date}
              testID="home-month-day"
              accessibilityRole="button"
              onPress={() => onDay(d.date)}
              style={[styles.day, isToday && styles.today]}>
              <Txt variant="label" color={isToday ? 'accentText' : 'hint'}>
                {when}
              </Txt>
              <Txt variant="caption" color="body" numberOfLines={2} keepAll style={styles.text}>
                {d.text}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: Y.titleBottom },
  /** 왼쪽은 홈 여백에서 자르고, 오른쪽만 홈 여백을 넘어 화면 끝까지 — 다음 칸이 걸쳐 보여 밀 수 있다는 걸 알린다 */
  scroll: { marginRight: -ScreenPaddingX },
  row: { gap: Y.gap, paddingRight: ScreenPaddingX },
  day: {
    width: Y.width,
    padding: Y.pad,
    borderRadius: Y.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  today: { borderColor: Colors.primary },
  text: { marginTop: Y.textTop },
});
