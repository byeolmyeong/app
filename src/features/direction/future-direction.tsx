import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { SectionHead } from '@/components/section-head';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { DirectionView } from '@/features/direction/direction-view';
import { useFutureDirection } from '@/features/direction/use-future-direction';
import type { BirthInput } from '@/lib/api';

const S = strings.direction.future;

/**
 * 시기 탭 "지금" 바로 아래의 "이 시기에 해 볼 만한 것"(결정 026 · 031). 이 칸이 화면에 나타날 때 글을 요청한다.
 * 기다리는 중과 실패는 이 칸 안에서만 보여 준다(시기의 나머지는 그대로 보인다). 글은 이성 화면과 같은 부품으로 그린다.
 * input 은 내 출생 정보이고, 세션이 준비되기 전에는 null 이다.
 */
export function FutureDirection({
  input,
  onLoadingChange,
}: {
  input: BirthInput | null;
  /** 글을 기다리는 중인지가 바뀔 때 알린다(화면이 강제 업데이트를 미루는 데 쓴다 — 결정 027) */
  onLoadingChange?: (loading: boolean) => void;
}) {
  const { state, retry } = useFutureDirection(input);
  const loading = state.status === 'loading';
  useEffect(() => {
    onLoadingChange?.(loading);
    return () => onLoadingChange?.(false);
  }, [loading, onLoadingChange]);
  return (
    <View testID="future-direction" style={styles.root}>
      <SectionHead title={S.heading} />
      {state.status === 'loading' ? (
        <>
          <Txt variant="body">{S.generating}</Txt>
          <Txt variant="table" color="gray">
            {S.generatingNote}
          </Txt>
        </>
      ) : state.status === 'failed' ? (
        <>
          <Txt variant="body">
            {state.error === 'NETWORK' || state.error === 'LIMIT' ? S.failed[state.error] : S.failed.OTHER}
          </Txt>
          <Button variant="line" label={S.retry} onPress={retry} />
        </>
      ) : (
        <DirectionView direction={state.direction} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.sm, paddingTop: Spacing.xl },
});
