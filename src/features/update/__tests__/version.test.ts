import { isBelowVersion, shouldSuggestUpdate } from '@/features/update/version';

describe('버전 비교(결정 027)', () => {
  it.each([
    // [내 버전, 최소 버전, 낮은가]
    ['1.0.0', '1.0.1', true],
    ['1.0.0', '1.1.0', true],
    ['1.0.0', '2.0.0', true],
    ['1.9.9', '1.10.0', true],
    ['1.10.0', '1.9.9', false],
    ['1.2.0', '1.2.0', false],
    ['1.2.1', '1.2.0', false],
    ['2.0.0', '1.99.99', false],
    // 없는 마디는 0 이다
    ['1.2', '1.2.0', false],
    ['1.2.0', '1.2', false],
    ['1', '1.0.1', true],
    ['1.2', '1.2.1', true],
    ['2', '1.9', false],
    ['01.02.0', '1.2.0', false],
  ])('내 버전 %s, 최소 %s → 낮은가 %s', (mine, min, expected) => {
    expect(isBelowVersion(mine, min)).toBe(expected);
  });

  it.each([
    ['1.0.0', null],
    ['1.0.0', ''],
    ['1.0.0', 'latest'],
    ['1.0.0', '2.0.0-beta'],
    ['1.0.0', 'v2.0.0'],
    ['1.0.0', '2..0'],
    ['1.0.0', '2.0.0.1'],
    ['1.0.0', ' 2.0.0'],
    ['1.0.0', '-2.0'],
    ['1.0.0-rc1', '2.0.0'],
    ['', '2.0.0'],
    ['1.0.0.0', '2.0.0'],
    [undefined, '2.0.0'],
    [null, '2.0.0'],
    [100, '2.0.0'],
  ])('읽을 수 없는 값(내 버전 %p, 최소 %p)이면 낮다고 하지 않는다', (mine, min) => {
    expect(isBelowVersion(mine, min)).toBe(false);
  });
});

describe('업데이트 권유 판정(결정 059)', () => {
  it.each([
    // [내 버전, 최신, 최소, 이미 물은 최신, 권하는가]
    ['1.0.0', '1.1.0', null, null, true],
    ['1.0.0', '1.0.1', '1.0.0', null, true],
    ['1.9.9', '1.10.0', '1.0', null, true],
    // 최신과 같거나 높으면 권하지 않는다
    ['1.1.0', '1.1.0', null, null, false],
    ['1.1', '1.1.0', null, null, false],
    ['1.2.0', '1.1.0', null, null, false],
    // 최소보다 낮으면 권하지 않는다(막는 화면이 대신한다)
    ['1.0.0', '1.2.0', '1.1.0', null, false],
    // 같은 최신은 한 번만 묻는다. 더 새 최신이 나오면 다시 묻는다
    ['1.0.0', '1.1.0', null, '1.1.0', false],
    ['1.0.0', '1.2.0', null, '1.1.0', true],
    // 최소가 없거나 읽을 수 없으면 막지 않으니 권한다(결정 027)
    ['1.0.0', '1.1.0', 'latest', null, true],
  ])('내 %s · 최신 %p · 최소 %p · 물은 %p → %s', (current, latest, min, asked, expected) => {
    expect(shouldSuggestUpdate(current, latest, min, asked)).toBe(expected);
  });

  it.each([
    ['1.0.0', null],
    ['1.0.0', 'latest'],
    ['1.0.0', '2.0.0-beta'],
    [null, '1.1.0'],
    [undefined, '1.1.0'],
    ['1.0.0-rc1', '1.1.0'],
  ])('읽을 수 없는 버전(내 %p, 최신 %p)이면 권하지 않는다', (current, latest) => {
    expect(shouldSuggestUpdate(current, latest, null, null)).toBe(false);
  });
});
