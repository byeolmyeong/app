import { router, useLocalSearchParams } from 'expo-router';
import type { Metadata } from 'expo-router/server';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { ShareCardView } from '@/features/share/share-card';
import { useSharedCard } from '@/features/share/use-shared-card';

const S = strings.share;
const P = S.page;

/** 링크를 붙였을 때 보이는 제목 · 설명. 카드의 내용이나 식별자는 넣지 않는다(고정 문구) */
export function generateMetadata(): Metadata {
  return {
    title: P.metaTitle,
    description: P.metaDescription,
    openGraph: { title: P.metaTitle, description: P.metaDescription },
  };
}

/**
 * 공유 페이지(F6, 결정 025): 로그인 없이 열린다. `GET /shared/{shareId}` 하나만 부르고 받은 카드와 "나도 보러 가기" 만 보여 준다.
 * 출생 정보 · 근거 · 본문은 없다(서버가 주지 않는다). 세션은 루트 레이아웃이 이 경로에서 시작하지 않는다.
 */
export default function SharedCardScreen() {
  const { shareId } = useLocalSearchParams<{ shareId?: string }>();
  const { state, retry } = useSharedCard(typeof shareId === 'string' ? shareId : null);

  return (
    <Screen>
      <View style={styles.root}>
        {state.status === 'loading' ? (
          <Txt variant="table" color="gray">
            {P.loading}
          </Txt>
        ) : state.status === 'done' ? (
          <ShareCardView card={state.card} width={Sizes.sharePageCardWidth} />
        ) : state.notFound ? (
          <Txt variant="body">{P.notFound}</Txt>
        ) : (
          <Txt variant="body">
            {state.error === 'NETWORK' || state.error === 'LIMIT' ? P.failed[state.error] : P.failed.OTHER}
          </Txt>
        )}
        <View style={styles.actions}>
          {state.status === 'failed' && !state.notFound ? (
            <Button variant="line" label={P.retry} onPress={retry} />
          ) : null}
          <Button label={P.cta} onPress={() => router.replace('/')} />
          <Txt variant="label" color="hint" style={styles.center}>
            {S.tagline}
          </Txt>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, paddingVertical: Spacing.xl },
  actions: { alignSelf: 'stretch', gap: Spacing.sm },
  center: { textAlign: 'center' },
});
