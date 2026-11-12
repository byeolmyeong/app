import { StyleSheet, View } from 'react-native';

import { Paragraph } from '@/components/paragraph';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import type { Direction } from '@/lib/api';

/**
 * 방향성 제시의 글: 한 줄 제목 → 해 볼 만한 것 3개(근거 줄 · 제목 · 본문).
 * 서버가 준 글과 근거를 그대로 그린다. 앱은 글을 만들거나 고치지 않는다.
 */
export function DirectionView({ direction }: { direction: Direction }) {
  return (
    <View style={styles.root}>
      <Txt variant="display">{direction.title}</Txt>
      {direction.items.map((item, i) => (
        <Paragraph key={i} title={item.title} body={item.body} basis={item.basis} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.xl, paddingTop: Spacing.lg },
});
