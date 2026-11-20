import { strings } from '@/content/strings';

/** 문구 트리의 끝(글자)을 모두 모은다 */
function leaves(node: unknown, path: string[] = []): { path: string; value: unknown }[] {
  if (typeof node === 'object' && node !== null)
    return Object.entries(node).flatMap(([key, child]) => leaves(child, [...path, key]));
  return [{ path: path.join('.'), value: node }];
}

// 시기 탭 v2(결정 049 · 061 · 065, 캔버스 14 · 14-1 ~ 14-4 · 14-7 · 14-8 · 11-1 · 11-2)
describe('시기 탭 문구(strings.timing)', () => {
  const T = strings.timing;

  it('빈 값이 없다', () => {
    const all = leaves(T);
    expect(all.length).toBeGreaterThan(50);
    for (const { path, value } of all) expect([path, typeof value === 'string' && value.trim().length > 0]).toEqual([path, true]);
  });

  it('"변곡점" 이라 부르지 않고 "큰 변화" 라 부른다(결정 049)', () => {
    for (const { value } of leaves(T)) expect(String(value)).not.toMatch(/변곡점/);
    expect(T.life.title).toBe('인생의 큰 변화');
    expect(T.life.next).toBe('다음 큰 변화');
  });

  it('칩 셋 · 자세한 풀이 카드 · 잠금 · 쓰는 중 · 못 썼을 때는 시안의 글 그대로', () => {
    expect(Object.values(T.chips)).toEqual(['이번 달', '올해', '인생']);
    expect(T.detail.title).toBe('지금 나의 시기도 알아볼까요');
    expect(T.detail.body).toBe('받으면 지금 나의 시기, 올해의 흐름, 인생의 큰 변화가 채워져요.');
    expect(T.locked.year.title).toBe('올해의 흐름은 시기 풀이를 받으면 열려요');
    expect(T.making.title).toBe('시기 풀이를 쓰고 있어요');
    expect(T.making.lines).toHaveLength(3);
    expect(T.writeFail).toBe('시기 풀이를 끝까지 쓰지 못했어요');
    expect(T.day.making.title).toBe('그날의 하늘을 읽고 있어요');
    expect(T.day.fail).toBe('그날의 하늘을 읽지 못했어요');
    expect(T.month.quiet.title).toBe('이번 달은 큰 움직임 없이 흘러가요');
  });

  it('카테고리는 사람 · 일 · 마음, 영역은 넷, 요일은 일요일부터 일곱', () => {
    expect(T.categories).toEqual({ PEOPLE: '사람', WORK: '일', MIND: '마음' });
    expect(Object.keys(T.areas)).toEqual(['WORK', 'PEOPLE', 'SELF', 'MONEY']);
    expect(T.weekdays).toEqual(['일', '월', '화', '수', '목', '금', '토']);
  });

  it('미래 사건을 단정하지 않는다(반드시 · 틀림없이 · 운명 · ~게 됩니다)', () => {
    for (const { value } of leaves(T)) expect(String(value)).not.toMatch(/반드시|틀림없이|운명|게 됩니다|게 돼요/);
  });
});
