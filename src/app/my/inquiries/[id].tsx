import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { StateScreen } from '@/components/state-screen';
import { Txt } from '@/components/txt';
import { useLoadingPhase } from '@/components/use-loading-phase';
import { useOnReconnect, useOnline } from '@/components/use-online';
import { Colors, InquiryLayout as L, LineWidth, MyLayout, ScreenPaddingX, Spacing, Typography } from '@/constants/theme';
import { strings } from '@/content/strings';
import { formatInquiryDate } from '@/features/support/inquiry';
import { useInquiryItem } from '@/features/support/use-inquiries';

const I = strings.inquiry;
const D = I.detail;

const back = () => (router.canGoBack() ? router.back() : router.replace('/my/inquiries'));

/** 카드 위 이름표 줄: 왼쪽 이름("내 문의 · 오류" · "별명 답변"), 오른쪽 날짜 */
function CardHead({ label, date, answer = false }: { label: string; date: string; answer?: boolean }) {
  return (
    <View style={styles.head}>
      <Txt variant="captionStrong" color="gray" style={answer ? styles.answerLabel : null}>
        {label}
      </Txt>
      <Txt variant="caption" color="hint">
        {date}
      </Txt>
    </View>
  );
}

/**
 * 답변 보기(결정 058 의 4, 보드 16-8): 내 문의 카드(종류 · 날짜 · 글) + 별명 답변 카드(날짜 · 글). 답이 아직 없으면 답변 카드 자리에 안내 한 줄,
 * 옛 앱이 이메일로 답을 받기로 한 문의면 "이메일로 보내 드려요". 알림함의 `INQUIRY_ANSWERED` 가 이 주소(`/my/inquiries/<id>`)로 연다.
 * 글은 사용자 · 관리자가 쓴 그대로의 글자로만 보인다. 남의 것 · 없는 것이면 "문의를 찾지 못했어요".
 * 불러오기는 내역과 같다: 0.3초가 넘으면 뼈대, 10초가 넘거나 못 받으면 19, 끊겨서 못 받았으면 20-1(연결이 돌아오면 다시).
 */
export default function InquiryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, retry } = useInquiryItem(typeof id === 'string' ? id : '');
  const [now] = useState(Date.now);
  const online = useOnline();
  useOnReconnect(online, () => {
    if (state.status === 'failed' && state.error === 'NETWORK') retry();
  });
  const phase = useLoadingPhase(state.status === 'loading');
  const nav = <NavBar chevron title={D.title} onBack={back} />;

  if (state.status === 'notFound')
    return <StateScreen nav={nav} title={D.notFound.title} body={D.notFound.body} primary={{ label: I.sent.toList, onPress: () => router.dismissTo('/my/inquiries') }} />;
  if (state.status === 'failed' && state.error === 'NETWORK' && !online)
    return (
      <StateScreen
        nav={nav}
        title={strings.states.offlineEmpty.title}
        body={strings.states.offlineEmpty.body}
        primary={{ label: strings.states.offlineEmpty.retry, onPress: retry }}
      />
    );
  if (state.status === 'failed' || phase === 'timeout')
    return (
      <StateScreen
        nav={nav}
        title={I.loadFail.title}
        body={strings.states.loadFail.body}
        primary={{ label: strings.states.loadFail.retry, onPress: retry }}
      />
    );
  if (state.status === 'loading')
    return (
      <Screen scroll={false} nav={nav}>
        {/* 다 그려진 화면과 같은 자리: 내 문의 카드(머리 — 종류 · 날짜 / 글 줄) + 아래 안내 한 줄(답이 왔는지는 모른다), 결정 065 */}
        {phase === 'skeleton' ? (
          <View accessible accessibilityLabel={strings.states.loading} style={styles.content}>
            <View testID="skeleton-card" style={styles.card}>
              <View style={styles.head}>
                <View style={styles.captionBox}>
                  <Skeleton width="40%" height={L.skeleton.meta} />
                </View>
                <View style={styles.dateBox}>
                  <Skeleton width={L.skeleton.date} height={L.skeleton.meta} />
                </View>
              </View>
              {/* 실제 글은 Txt 하나라 줄 사이는 줄 높이뿐이다 — 카드 간격이 끼지 않게 한 칸에 묶는다 */}
              <View testID="skeleton-body">
                {Array.from({ length: L.skeleton.bodyLines }, (_, i) => (
                  <View key={i} testID="skeleton-body-line" style={styles.bodyBox}>
                    <Skeleton width={i === L.skeleton.bodyLines - 1 ? '60%' : '100%'} height={L.skeleton.line} />
                  </View>
                ))}
              </View>
            </View>
            <View testID="skeleton-note" style={[styles.note, styles.noteBox]}>
              <Skeleton width="70%" height={L.skeleton.meta} />
            </View>
          </View>
        ) : null}
      </Screen>
    );

  const item = state.data;
  return (
    <Screen scroll={false} nav={nav}>
      <ScrollView style={styles.fill} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <CardHead label={`${D.mine}${D.separator}${I.categories[item.category]}`} date={formatInquiryDate(item.createdAt, now)} />
          <Txt keepAll>{item.body}</Txt>
        </View>
        {item.answer ? (
          <View testID="inquiry-answer" style={[styles.card, styles.answerCard]}>
            <CardHead label={D.answer} date={formatInquiryDate(item.answer.answeredAt, now)} answer />
            <Txt keepAll>{item.answer.body}</Txt>
          </View>
        ) : (
          <Txt variant="caption" color="hint" keepAll style={styles.note}>
            {item.emailed ? D.emailed : D.waiting}
          </Txt>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  /** 머리 아래 12, 카드끼리 12(보드 16-8 답변 보기) */
  content: { gap: MyLayout.gap, paddingTop: MyLayout.gap, paddingHorizontal: ScreenPaddingX, paddingBottom: Spacing.xl },
  card: {
    gap: L.card.gap,
    padding: L.card.padding,
    borderRadius: MyLayout.list.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  answerCard: { backgroundColor: L.answer.fill, borderColor: L.answer.border },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  answerLabel: { color: L.answer.label },
  note: { paddingHorizontal: Spacing.xxs },
  captionBox: { flex: 1, height: Typography.caption.lineHeight, justifyContent: 'center' },
  dateBox: { height: Typography.caption.lineHeight, justifyContent: 'center' },
  noteBox: { height: Typography.caption.lineHeight, justifyContent: 'center' },
  bodyBox: { height: Typography.body.lineHeight, justifyContent: 'center' },
});
