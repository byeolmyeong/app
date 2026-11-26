import { Pressable, StyleSheet } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth } from '@/constants/theme';

export type TextLinkProps = { label: string; onPress: () => void };

/** 밑줄 그은 글자 링크. */
export function TextLink({ label, onPress }: TextLinkProps) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={styles.link}>
      <Txt variant="table" style={styles.text}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start', borderBottomWidth: LineWidth, borderBottomColor: Colors.ink },
  text: { fontWeight: FontWeight.semibold },
});
