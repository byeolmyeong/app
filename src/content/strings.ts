/**
 * 화면 문구의 단일 출처. 화면과 부품에 문구를 직접 적지 않는다.
 * 1.1.0 에서 영어를 붙일 때 이 파일과 같은 모양의 번역만 추가한다.
 */
export const strings = {
  appName: '별명',
  /** 도장의 두 글자 */
  seal: ['별', '명'],
  common: {
    back: '←',
    arrow: '→',
    settings: '설정',
    none: '—',
  },
} as const;
