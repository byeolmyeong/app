import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, Radius, Sizes } from '@/constants/theme';
import { strings } from '@/content/strings';

export type SealProps = {
  /** md 는 글 위의 도장, sm 은 화면 머리의 도장 */
  size?: 'md' | 'sm';
};

/** 인주 도장. 두 글자를 위아래로 쌓고 살짝 기울인다. */
export function Seal({ size = 'md' }: SealProps) {
  const side = size === 'md' ? Sizes.seal : Sizes.sealSmall;
  const fontSize = side * 0.37;
  return (
    <View testID="seal" accessibilityLabel={strings.appName} style={[styles.box, { width: side, height: side }]}>
      {strings.seal.map((ch) => (
        <Txt key={ch} variant="heading" color="paper" style={{ fontSize, lineHeight: fontSize * 1.02 }}>
          {ch}
        </Txt>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: Colors.seal,
    borderRadius: Radius,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
  },
});
