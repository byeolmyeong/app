import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { StateScreen } from '@/components/state-screen';
import { Txt } from '@/components/txt';
import { Colors, FontWeight, InquiryLayout as L, LineWidth, MyLayout, ScreenPaddingX, StateLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { formatInquiryDate } from '@/features/support/inquiry';
import { useInquiries } from '@/features/support/use-inquiries';
import type { InquiryItem } from '@/lib/api';

const I = strings.inquiry;

const back = () => (router.canGoBack() ? router.back() : router.replace('/my'));
const open = (id: string) => router.push({ pathname: '/my/inquiries/[id]', params: { id } });

/** 상태 칩: 확인 중(채운 면 · 회색) / 답변 왔어요(옅은 보라) */
function StatusChip({ answered }: { answered: boolean }) {
  return (
    <View style={[styles.chip, answered ? styles.chipAnswered : styles.chipOpen]}>
      <Txt variant="label" color="gray" style={answered ? styles.chipAnsweredText : null}>
        {answered ? I.status.answered : I.status.open}
      </Txt>
    </View>
  );
}

function Row({ item, now, first }: { item: InquiryItem; now: number; first: boolean }) {
  // 첫 줄만 보인다(줄바꿈 앞까지)
  const firstLine = item.body.split('\n')[0];
  return (
    <Pressable accessibilityRole="button" onPress={() => open(item.id)} style={[styles.row, !first && styles.divided]}>
      <View style={styles.rowText}>
        <Txt variant="item" numberOfLines={1} style={styles.firstLine}>
          {firstLine}
        </Txt>
        <View style={styles.meta}>
          <StatusChip answered={item.answer !== null} />
          <Txt variant="statLabel" color="hint">
            {formatInquiryDate(item.createdAt, now)}
          </Txt>
        </View>
      </View>
      <Svg width={MyLayout.list.chevron} height={MyLayout.list.chevron} viewBox="0 0 24 24" fill="none">
        <Path d="M9 6l6 6-6 6" stroke={Colors.hint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

/**
 * 문의 내역(결정 058 의 1, 보드 16-8): 내 문의 목록(첫 줄 · "확인 중" / "답변 왔어요" · 날짜) + 맨 아래 주 버튼 "새 문의하기".
 * 비어 있으면 "아직 문의가 없어요"(결정 065 의 3). 화면이 보일 때마다 다시 받는다(보내고 돌아오면 새 문의가 맨 위에).
 * 처음에 못 불러오면 실패 화면(보드 19 틀, "다시 보기").
 */
export default function InquiriesScreen() {
  const { state, retry } = useInquiries();
  // 날짜의 "올해" — 화면이 뜬 때로 한 번 정한다
  const [now] = useState(Date.now);
  const nav = <NavBar chevron title={I.title} onBack={back} />;

  if (state.status === 'failed' || state.status === 'notFound')
    return (
      <StateScreen
        nav={nav}
        title={I.loadFail.title}
        body={strings.states.loadFail.body}
        primary={{ label: strings.states.loadFail.retry, onPress: retry }}
      />
    );

  const items = state.status === 'ready' ? state.data : null;
  return (
    <Screen scroll={false} nav={nav}>
      <ScrollView style={styles.fill} contentContainerStyle={styles.content}>
        {items && items.length > 0 ? (
          <View style={styles.card}>
            {items.map((item, i) => (
              <Row key={item.id} item={item} now={now} first={i === 0} />
            ))}
          </View>
        ) : null}
        {items && items.length === 0 ? (
          <View style={styles.empty}>
            <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.emptyIcon}>
              <Svg width={L.empty.glyph} height={L.empty.glyph} viewBox="0 0 24 24" fill="none" stroke={Colors.accentText} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M4 5h16v11H9l-5 4z" />
                <Path d="M8 9h8M8 12h5" />
              </Svg>
            </View>
            <Txt variant="heading" accessibilityRole="header" style={styles.emptyTitle}>
              {I.empty.title}
            </Txt>
            <Txt color="gray" keepAll style={styles.emptyBody}>
              {I.empty.body}
            </Txt>
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button label={I.newInquiry} onPress={() => router.push('/my/inquiries/new')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  /** 머리 아래 12(보드 16-8) */
  content: { flexGrow: 1, paddingTop: MyLayout.gap, paddingHorizontal: ScreenPaddingX, paddingBottom: MyLayout.gap },
  card: {
    overflow: 'hidden',
    borderRadius: MyLayout.list.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: MyLayout.list.gap, paddingVertical: L.row.paddingV, paddingHorizontal: L.row.paddingH },
  divided: { borderTopWidth: LineWidth, borderTopColor: Colors.hair },
  rowText: { flex: 1, minWidth: 0, gap: L.row.gap },
  firstLine: { fontWeight: FontWeight.medium },
  meta: { flexDirection: 'row', alignItems: 'center', gap: L.row.metaGap },
  chip: { height: L.status.height, paddingHorizontal: L.status.paddingH, borderRadius: L.status.radius, justifyContent: 'center' },
  chipOpen: { backgroundColor: Colors.fill },
  chipAnswered: { backgroundColor: L.status.answeredFill },
  chipAnsweredText: { color: L.status.answeredText },
  /** 비었을 때: 둥근 그림 칸 · 제목 · 설명 두 줄을 남은 칸 가운데에(보드 16-8 비었을 때) */
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: {
    width: L.empty.icon,
    height: L.empty.icon,
    borderRadius: L.empty.icon / 2,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: L.empty.titleTop, textAlign: 'center' },
  emptyBody: { marginTop: L.empty.bodyTop, textAlign: 'center' },
  footer: { paddingHorizontal: ScreenPaddingX, paddingBottom: StateLayout.bottom },
});
