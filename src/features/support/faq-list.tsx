import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, Sizes, Spacing } from '@/constants/theme';
import type { Faq } from '@/lib/api';

/**
 * 질문 한 줄. 누르면 그 아래에 답이 펼쳐지고 다시 누르면 접힌다. 화살표는 펼치면 위를 향한다.
 * 답은 관리자가 적은 그냥 글자다. 줄바꿈까지 그대로 한 덩어리의 글로 그리고 HTML · 마크다운으로 해석하지 않는다(결정 028).
 */
function FaqItem({ question, answer }: Pick<Faq, 'question' | 'answer'>) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.item}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={question}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((on) => !on)}
        style={styles.question}
      >
        <Txt variant="body" style={styles.questionText}>
          {question}
        </Txt>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d={open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}
            stroke={Colors.hint}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      {open ? (
        <Txt variant="body" color="gray" style={styles.answer}>
          {answer}
        </Txt>
      ) : null}
    </View>
  );
}

/** 자주 묻는 질문 목록(결정 024). 서버가 준 순서대로 그리고, 질문마다 따로 펼치고 접는다(여러 개를 함께 펼 수 있다). */
export function FaqList({ items }: { items: readonly Faq[] }) {
  return (
    <View>
      {items.map((item) => (
        <FaqItem key={item.id} question={item.question} answer={item.answer} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { borderBottomWidth: LineWidth, borderBottomColor: Colors.hair },
  question: {
    minHeight: Sizes.listRow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  questionText: { flex: 1, fontWeight: FontWeight.medium },
  answer: { paddingBottom: Spacing.md },
});
