import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { StateScreen } from '@/components/state-screen';
import { Txt } from '@/components/txt';
import { useLoadingPhase } from '@/components/use-loading-phase';
import { useOnReconnect, useOnline } from '@/components/use-online';
import { Colors, FontWeight, InquiryLayout as L, LineWidth, MyLayout, ScreenPaddingX, StateLayout, Typography } from '@/constants/theme';
import { strings } from '@/content/strings';
import { formatInquiryDate } from '@/features/support/inquiry';
import { useInquiries } from '@/features/support/use-inquiries';
import type { InquiryItem } from '@/lib/api';

const I = strings.inquiry;

const back = () => (router.canGoBack() ? router.back() : router.replace('/my'));
const open = (id: string) => router.push({ pathname: '/my/inquiries/[id]', params: { id } });

/** 상태 칩: 확인 중(채운 면 · 회색) / 답변 왔어요(옅은 보라). 옛 이메일 문의는 "이메일로 보냈어요"(결정 058 의 결과) */
function StatusChip({ item }: { item: InquiryItem }) {
  const answered = item.answer !== null;
  return (
    <View style={[styles.chip, answered ? styles.chipAnswered : styles.chipOpen]}>
      <Txt variant="label" color="gray" style={answered ? styles.chipAnsweredText : null}>
        {answered ? I.status.answered : item.emailed ? I.status.emailed : I.status.open}
      </Txt>
    </View>
  );
}

/**
 * 처음 불러올 때 0.3초가 넘으면 보이는 뼈대 — 다 그려진 목록과 같은 카드 · 같은 줄(첫 줄 / 상태 칩 · 날짜 / 오른쪽 화살표, 결정 065).
 * 막대는 글자 줄 높이 칸 가운데에 둬 줄 높이가 실제와 같다.
 */
function ListSkeleton() {
  return (
    <View accessible accessibilityLabel={strings.states.loading} style={styles.card}>
      {Array.from({ length: L.skeleton.rows }, (_, i) => (
        <View key={i} testID="skeleton-row" style={[styles.row, i > 0 && styles.divided]}>
          <View style={styles.rowText}>
            <View style={styles.lineBox}>
              <Skeleton width="70%" height={L.skeleton.line} />
            </View>
            <View style={styles.meta}>
              <View testID="skeleton-chip">
                <Skeleton width={L.skeleton.chip} height={L.status.height} pill />
              </View>
              <View style={styles.metaBox}>
                <Skeleton width={L.skeleton.date} height={L.skeleton.meta} />
              </View>
            </View>
          </View>
          <Skeleton width={MyLayout.list.chevron} height={MyLayout.list.chevron} />
        </View>
      ))}
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
          <StatusChip item={item} />
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
 * 처음 불러올 때 0.3초가 넘으면 뼈대, 10초가 넘거나 못 받으면 실패 화면(보드 19, "다시 보기"), 끊겨서 못 받았으면 20-1 — 연결이 돌아오면
 * 다시 부른다(결정 061 · 065 의 2).
 */
export default function InquiriesScreen() {
  const { state, retry } = useInquiries();
  // 날짜의 "올해" — 화면이 뜬 때로 한 번 정한다
  const [now] = useState(Date.now);
  const online = useOnline();
  useOnReconnect(online, () => {
    if (state.status === 'failed' && state.error === 'NETWORK') retry();
  });
  const phase = useLoadingPhase(state.status === 'loading');
  const nav = <NavBar chevron title={I.title} onBack={back} />;

  if (state.status === 'failed' && state.error === 'NETWORK' && !online)
    return (
      <StateScreen
        nav={nav}
        title={strings.states.offlineEmpty.title}
        body={strings.states.offlineEmpty.body}
        primary={{ label: strings.states.offlineEmpty.retry, onPress: retry }}
      />
    );
  if (state.status === 'failed' || state.status === 'notFound' || phase === 'timeout')
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
        {state.status === 'loading' && phase === 'skeleton' ? <ListSkeleton /> : null}
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
  /** 비었을 때: 둥근 그림 칸 · 제목 · 설명 두 줄을 머리 아래 560 칸의 가운데에(보드 16-8 비었을 때) */
  empty: { height: L.empty.height, alignItems: 'center', justifyContent: 'center' },
  lineBox: { height: Typography.item.lineHeight, justifyContent: 'center' },
  metaBox: { height: Typography.statLabel.lineHeight, justifyContent: 'center' },
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
