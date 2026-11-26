import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, DialogLayout, DimColor, Radius, Sizes } from '@/constants/theme';

type Action = { label: string; onPress: () => void };

export type DialogProps = {
  title: string;
  /** 설명 — 줄은 `\n` 으로 나눠 쓴다 */
  body: string;
  /** 왼쪽 보조 버튼(나중에 · 취소). 뒤로 가기(안드로이드)도 이것과 같다 */
  cancel: Action;
  /** 오른쪽 주 버튼 */
  confirm: Action;
};

/**
 * 가운데 창(결정 061 의 6, 보드 17): 뒤를 어둡게 가리고 가운데에 제목 · 설명 · 버튼 둘(보조 왼쪽 · 주 오른쪽).
 * 둘 중 하나를 고르게 한다 — 바깥을 눌러도 닫히지 않는다. 넓은 웹 화면에서도 앱 화면 폭 안에서만 가린다.
 * 띄울 때 그리고(부모가 정한다) 닫을 때 치운다.
 */
export function Dialog({ title, body, cancel, confirm }: DialogProps) {
  return (
    <Modal testID="dialog" visible transparent animationType="fade" onRequestClose={cancel.onPress}>
      <View style={styles.root}>
        <View style={styles.column}>
          <View accessibilityViewIsModal style={styles.card}>
            <Txt variant="subhead" accessibilityRole="header" keepAll style={styles.center}>
              {title}
            </Txt>
            <Txt variant="small" color="gray" keepAll style={[styles.center, styles.body]}>
              {body}
            </Txt>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={cancel.onPress} style={[styles.button, styles.cancel]}>
                <Txt variant="button">{cancel.label}</Txt>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={confirm.onPress} style={[styles.button, styles.confirm]}>
                <Txt variant="button">{confirm.label}</Txt>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: Sizes.maxContentWidth,
    justifyContent: 'center',
    paddingHorizontal: DialogLayout.inset,
    backgroundColor: DimColor,
  },
  card: {
    paddingTop: DialogLayout.paddingTop,
    paddingHorizontal: DialogLayout.padding,
    paddingBottom: DialogLayout.padding,
    borderRadius: DialogLayout.radius,
    backgroundColor: Colors.fill,
  },
  center: { textAlign: 'center' },
  body: { marginTop: DialogLayout.bodyTop },
  actions: { flexDirection: 'row', marginTop: DialogLayout.actionsTop, gap: DialogLayout.actionGap },
  button: { flex: 1, height: DialogLayout.button, alignItems: 'center', justifyContent: 'center', borderRadius: Radius },
  cancel: { backgroundColor: Colors.hair },
  confirm: { backgroundColor: Colors.primary },
});
