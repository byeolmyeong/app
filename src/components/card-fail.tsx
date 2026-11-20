import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { CardFailLayout as L, Colors, LineWidth } from '@/constants/theme';

export type CardFailProps = {
  /** 그 카드의 이름표(카드가 있던 자리를 알려 준다) */
  kicker: string;
  title: string;
  body: string;
  retry: { label: string; onPress: () => void };
};

/**
 * 카드 하나만 못 불러왔을 때 그 카드 자리에 두는 작은 안내(보드 19-1, 결정 061 의 3): 이름표 · 제목 · 한 줄 설명 · "다시 보기".
 * 나머지 화면은 그대로 보인다. 화면 전체를 못 불러오면 StateScreen(보드 19)이다.
 */
export function CardFail({ kicker, title, body, retry }: CardFailProps) {
  return (
    <View testID="card-fail" style={styles.card}>
      <Txt variant="captionStrong" color="accentText">
        {kicker}
      </Txt>
      <Txt variant="stat" style={styles.title}>
        {title}
      </Txt>
      <Txt variant="desc" color="gray" keepAll style={styles.body}>
        {body}
      </Txt>
      <Pressable accessibilityRole="button" onPress={retry.onPress} style={styles.button}>
        <Txt variant="term">{retry.label}</Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: L.padding,
    borderRadius: L.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  title: { marginTop: L.titleTop },
  body: { marginTop: L.bodyTop },
  button: {
    marginTop: L.buttonTop,
    alignSelf: 'flex-start',
    height: L.button,
    paddingHorizontal: L.buttonPadX,
    borderRadius: L.buttonRadius,
    backgroundColor: Colors.hair,
    justifyContent: 'center',
  },
});
