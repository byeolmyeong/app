import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useReduceMotion } from '@/components/byeoli';
import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, Motion, Sizes, Spacing } from '@/constants/theme';
import { measureReveal, RevealBody, RevealTurn, runReveal, useReveal } from '@/features/reason/reason-reveal';
import type { Faq } from '@/lib/api';

/**
 * 질문 한 줄. 누르면 그 아래에 답이 펼쳐지고 다시 누르면 접힌다. 화살표는 펼치면 위를 향한다.
 * 답은 관리자가 적은 그냥 글자다. 줄바꿈까지 그대로 한 덩어리의 글로 그리고 HTML · 마크다운으로 해석하지 않는다(결정 028).
 * 펼치고 접을 때 "이렇게 풀이한 이유" 상자와 같은 움직임이다(소유자 테스트앱 피드백): 높이가 늘고 줄며 답이 흐려졌다 나타나고
 * 꺾쇠가 반 바퀴 돈다 — 진행 값 하나(접힘 0 → 펼침 1)에 같은 Motion 값으로 묶는다. 앱은 Reanimated, 웹은 RN Animated
 * (reason-reveal.tsx · .web.tsx — 웹 번들에 Reanimated 를 싣지 않는다). 답은 처음부터 그려 두고(접힌 동안 높이 0 · 투명 ·
 * 누를 수 없음 · 화면 읽기에서 숨김) 절대 위치로 재 둔다 — 높이 0 칸 안에서도 제 높이를 잰다. 동작 줄이기면 바로 바뀐다.
 */
function FaqItem({ question, answer }: Pick<Faq, 'question' | 'answer'>) {
  const [open, setOpen] = useState(false);
  /** 꺾쇠 회전 · 높이 · 보임을 함께 움직이는 진행 값과 답의 실제 높이 */
  const reveal = useReveal();
  /** 다 펼쳐졌다 — 잘라내지 않는다(이유 상자와 같은 규칙 — 글꼴이 늦게 와 답의 높이를 다시 재는 사이에도 답 끝이 잘리지 않게) */
  const [settled, setSettled] = useState(false);
  /** 누를 때마다 올리는 번호 — 끝난 펼침의 알림이 그 뒤에 시작한 접기를 "다 펼침" 으로 덮지 않게(앱의 알림은 늦게 온다) */
  const turn = useRef(0);
  const reduce = useReduceMotion();
  const toggle = () => {
    const next = !open;
    setOpen(next);
    setSettled(false);
    const duration = reduce ? 0 : next ? Motion.openMs : Motion.closeMs;
    const mine = ++turn.current;
    runReveal(reveal, next ? 1 : 0, duration, next ? () => mine === turn.current && setSettled(true) : undefined);
  };
  return (
    <View style={styles.item}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={question}
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={styles.question}
      >
        <Txt variant="body" style={styles.questionText}>
          {question}
        </Txt>
        {/* 같은 꺾쇠(⌄)를 진행 값으로 반 바퀴 돌려 펼치면 ⌃ */}
        <RevealTurn reveal={reveal} testID="faq-chevron">
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M6 9l6 6 6-6"
              stroke={Colors.hint}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </RevealTurn>
      </Pressable>
      <RevealBody
        reveal={reveal}
        testID="faq-answer"
        pointerEvents={open ? 'auto' : 'none'}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
        // 웹(react-native-web)은 위 두 값을 읽지 않는다 — 접힌 답이 웹의 화면 읽기에 읽히지 않게 aria-hidden 도 준다
        aria-hidden={!open}
        style={settled ? styles.revealOpen : styles.reveal}
      >
        <View testID="faq-measure" style={styles.measure} onLayout={(e) => measureReveal(reveal, e.nativeEvent.layout.height)}>
          <Txt variant="body" color="gray" style={styles.answer}>
            {answer}
          </Txt>
        </View>
      </RevealBody>
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
  /** 답은 높이 0 에서 늘어나는 칸 안에 둔다(다 펼치면 잘라내지 않는다) */
  reveal: { overflow: 'hidden' },
  revealOpen: { overflow: 'visible' },
  /** 답은 칸의 높이와 상관없이 제 높이로 놓여 잰다 */
  measure: { position: 'absolute', top: 0, left: 0, right: 0 },
  answer: { paddingBottom: Spacing.md },
});
