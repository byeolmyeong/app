import { strings } from '@/content/strings';

const G = strings.glossary;
/** 서버가 주는 식별자: 천체 10 · 별자리 12 · 각도 5 */
const BODY_KEYS = Object.keys(strings.bodiesShort);
const SIGN_KEYS = Object.keys(strings.signs);
const ASPECT_KEYS = Object.keys(strings.aspects);
const HOUSE_KEYS = Array.from({ length: 12 }, (_, i) => String(i + 1));

/** 항목의 모든 값이 비지 않은 글자인가 */
const filled = (entry: Record<string, unknown>) =>
  Object.values(entry).every((v) => typeof v === 'string' && v.trim().length > 0);

describe('용어 사전(내 하늘 지도 · 이렇게 풀이한 이유)', () => {
  it('천체 10 · 별자리 12 · 하우스 12 · 각도 5 가 모두 있고 그 밖의 것은 없다', () => {
    expect(BODY_KEYS).toHaveLength(10);
    expect(Object.keys(G.bodies).sort()).toEqual([...BODY_KEYS].sort());
    expect(SIGN_KEYS).toHaveLength(12);
    expect(Object.keys(G.signs).sort()).toEqual([...SIGN_KEYS].sort());
    expect(Object.keys(G.houses).sort()).toEqual([...HOUSE_KEYS].sort());
    expect(ASPECT_KEYS).toHaveLength(5);
    expect(Object.keys(G.aspects).sort()).toEqual([...ASPECT_KEYS].sort());
    expect(Object.keys(G.angles).sort()).toEqual(['ASC', 'MC']);
  });

  it('천체는 이름 · 별명 · 짧은 주제 · 한 줄 뜻이 모두 차 있다', () => {
    for (const key of BODY_KEYS) {
      const entry = G.bodies[key as keyof typeof G.bodies];
      expect(Object.keys(entry).sort()).toEqual(['meaning', 'name', 'nickname', 'topic']);
      expect(filled(entry)).toBe(true);
    }
  });

  it('별자리는 별명 · 한 줄 뜻, 하우스는 별명 · 짧은 주제 · 한 줄 뜻, 각도는 각도의 말 · 한 줄 뜻이 모두 차 있다', () => {
    for (const key of SIGN_KEYS) {
      const entry = G.signs[key as keyof typeof G.signs];
      expect(Object.keys(entry).sort()).toEqual(['meaning', 'nickname']);
      expect(filled(entry)).toBe(true);
    }
    for (let n = 1; n <= 12; n++) {
      const entry = G.houses[n as keyof typeof G.houses];
      expect(Object.keys(entry).sort()).toEqual(['meaning', 'nickname', 'topic']);
      expect(filled(entry)).toBe(true);
    }
    for (const key of ASPECT_KEYS) {
      const entry = G.aspects[key as keyof typeof G.aspects];
      expect(Object.keys(entry).sort()).toEqual(['meaning', 'phrase']);
      expect(filled(entry)).toBe(true);
    }
  });

  it('상승점 · 중천은 이름 · 별명 · 휠에 적는 짧은 이름 · 한 줄 뜻이 차 있다', () => {
    for (const entry of [G.angles.ASC, G.angles.MC]) {
      expect(Object.keys(entry).sort()).toEqual(['meaning', 'name', 'nickname', 'short']);
      expect(filled(entry)).toBe(true);
    }
  });

  it('별명은 시안의 말을 따른다', () => {
    expect(G.bodies.SUN).toMatchObject({ name: '해', nickname: '나의 중심', topic: '나의 중심', meaning: '내가 힘을 내는 방식' });
    expect(G.bodies.MOON).toMatchObject({ name: '달', nickname: '나의 마음', topic: '마음' });
    expect(G.bodies.MERCURY).toMatchObject({ nickname: '말을 맡은 별', topic: '말과 생각' });
    expect(G.bodies.VENUS).toMatchObject({ nickname: '좋아하는 것', topic: '좋아하는 것' });
    expect(G.bodies.SATURN).toMatchObject({ nickname: '책임을 맡은 별', topic: '책임' });
    expect(G.bodies.NEPTUNE.topic).toBe('꿈과 상상');
    expect(G.signs.AQUARIUS).toEqual({ nickname: '자유로움', meaning: '자유롭고 독창적인 성향' });
    expect(G.houses[5]).toEqual({ nickname: '즐거움의 자리', topic: '즐거움', meaning: '노는 것 · 만드는 것 · 연애' });
    expect(G.houses[4].topic).toBe('집과 가족');
    expect(G.angles.ASC).toMatchObject({ name: '상승점', nickname: '첫인상의 자리', short: '첫인상' });
    expect(G.angles.MC).toMatchObject({ name: '중천', nickname: '꿈의 자리', short: '꿈' });
  });

  it('각도의 말: 합 "겹쳐요" · 사분 "부딪혀요" · 육분 "잘 어울려요"(시안), 삼분 · 충은 같은 말투의 기본값', () => {
    expect(G.aspects.CONJUNCTION.phrase).toBe('겹쳐요');
    expect(G.aspects.SQUARE.phrase).toBe('부딪혀요');
    expect(G.aspects.SEXTILE.phrase).toBe('잘 어울려요');
    expect(G.aspects.TRINE.phrase).toBe('자연스럽게 통해요');
    expect(G.aspects.OPPOSITION.phrase).toBe('마주 봐요');
    expect(G.aspects.CONJUNCTION.meaning).toBe('두 별이 같은 자리에서 만나요');
  });

  it('별명은 서로 겹치지 않는다(천체끼리 · 별자리끼리 · 하우스끼리)', () => {
    const unique = (list: string[]) => new Set(list).size === list.length;
    expect(unique(Object.values(G.bodies).map((b) => b.nickname))).toBe(true);
    expect(unique(Object.values(G.signs).map((s) => s.nickname))).toBe(true);
    expect(unique(Object.values(G.houses).map((h) => h.nickname))).toBe(true);
    expect(unique(Object.values(G.aspects).map((a) => a.phrase))).toBe(true);
  });

  it('내 하늘 지도 화면 문구: 열두 차례의 말이 있고 비지 않았다', () => {
    expect(strings.skyMap.ordinals).toHaveLength(12);
    expect(strings.skyMap.ordinals[4]).toBe('다섯째');
    const { ordinals, ...rest } = strings.skyMap;
    expect(ordinals.every((o) => o.length > 0)).toBe(true);
    expect(filled(rest)).toBe(true);
  });
});
