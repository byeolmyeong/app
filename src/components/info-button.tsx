import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

export type InfoItem = { term: string; text: string };

export type InfoButtonProps = {
  /** 설명 시트의 제목 */
  title: string;
  /** 용어와 그 뜻. 위에서부터 차례로 보여 준다 */
  items: readonly InfoItem[];
  testID?: string;
};

/** 작은 물음표 버튼. 누르면 아래에서 설명 시트가 올라온다. */
export function InfoButton({ title, items, testID }: InfoButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${title} · ${strings.help.buttonLabel}`}
        hitSlop={Spacing.sm}
        onPress={() => setOpen(true)}
        style={styles.button}>
        <Txt variant="label" color="gray">
          {strings.help.mark}
        </Txt>
      </Pressable>
      {/* 낱말이 많으면 시트가 화면 위까지 늘고 그 안에서 굴린다. 닫기는 굴리는 칸 밖 맨 아래(결정 061 의 5) */}
      <Sheet visible={open} onClose={() => setOpen(false)} title={title} footer={<Button label={strings.help.close} onPress={() => setOpen(false)} />}>
        <View testID="info-items" style={styles.items}>
          {items.map((item) => (
            <View key={item.term} style={styles.item}>
              <Txt variant="table" style={styles.term}>
                {item.term}
              </Txt>
              <Txt variant="body" color="gray">
                {item.text}
              </Txt>
            </View>
          ))}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: Sizes.infoButton,
    height: Sizes.infoButton,
    borderRadius: Sizes.infoButton / 2,
    borderWidth: LineWidth,
    borderColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  items: { gap: Spacing.md },
  item: { gap: Spacing.xxs },
  term: { fontWeight: FontWeight.semibold },
});
