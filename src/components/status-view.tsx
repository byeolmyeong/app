import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Byeoli } from '@/components/byeoli';
import { Txt } from '@/components/txt';
import { Sizes, Spacing } from '@/constants/theme';

export type StatusViewProps = {
  /** 생각 중: 글을 짓는 동안 · 머쓱: 불러오지 못했을 때 · 쉬는 중: 아직 없을 때 */
  state: 'think' | 'error' | 'empty';
  title: string;
  note?: string;
  /** 아래에 놓는 버튼(다시 시도 · 넣으러 가기) */
  children?: ReactNode;
};

/**
 * 기다리는 화면 · 오류 화면 · 빈 화면(결정 035): 가운데에 별이, 그 아래 제목 · 설명 · 버튼.
 * 별이는 장식이고 상태는 제목 글이 말한다. 생각 중의 제목은 문단 제목, 나머지는 본문 단계다.
 */
export function StatusView({ state, title, note, children }: StatusViewProps) {
  return (
    <View style={styles.box}>
      <Byeoli state={state} size={Sizes.byeoli} />
      <View style={styles.text}>
        <Txt variant={state === 'think' ? 'heading' : 'body'} style={styles.center}>
          {title}
        </Txt>
        {note ? (
          <Txt variant="table" color="gray" style={styles.center}>
            {note}
          </Txt>
        ) : null}
      </View>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // 화면의 남는 높이를 채우고 그 가운데에 놓인다(위아래로 조금 비켜 머리와 붙지 않게)
  box: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  text: { alignItems: 'center', gap: Spacing.xs },
  center: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: Spacing.sm, marginTop: Spacing.xs },
});
