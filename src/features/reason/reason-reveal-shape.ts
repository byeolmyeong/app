/**
 * 이유 상자 펼침의 모양 — 진행 값 하나(접힘 0 → 펼침 1)가 꺾쇠 회전 · 칸 높이 · 내용 보임을 함께 그린다.
 * 앱(reason-reveal.tsx, Reanimated)과 웹(reason-reveal.web.tsx, RN Animated)이 같은 값을 써서 같은 모양으로 움직인다.
 */
export const RevealShape = {
  /** 진행 1 에서 꺾쇠가 도는 각도(반 바퀴 — 닫힘 ⌃ → 펼침 ⌄, 결정 061 의 7) */
  turnDeg: 180,
  /** 내용은 진행 0 → 이 값 사이에서 나타나고, 접을 때는 이 값 아래에서 흐려진다(앞 1/3) */
  fadeUntil: 1 / 3,
  /**
   * 처음부터 펼친 상자(내용이 흐름 안, 결정 083 · 088)를 묶지 않을 때의 높이 상한 — 내용보다 늘 커서 내용이 제 높이를 낸다.
   * 높이 키를 넣었다 뺐다 하지 않고 이 상한(maxHeight)만 바꾼다(Reanimated 는 스타일에서 빠진 키를 되돌리지 않는다)
   */
  freeMaxHeight: 100_000,
} as const;
