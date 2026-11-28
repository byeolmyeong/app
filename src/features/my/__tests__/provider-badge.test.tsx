import { render, screen } from '@testing-library/react-native';

import { strings } from '@/content/strings';
import { PROVIDER_MARKS, ProviderBadge, hasProviderMark } from '@/features/my/provider-badge';

const NAMES = strings.my.account.providers as Record<string, string>;

// 결정 103 의 1: 마크가 있는 공급자는 표 하나(PROVIDER_MARKS)에서 정한다 — "마크가 있다" 와 "마크를 그린다" 가 어긋나면 줄이 빈다(리뷰 #166)
describe('공급자 마크 표', () => {
  it('마크는 카카오 · Apple · Google 셋이고, 마크가 있다는 판정은 그 표에서 나온다', () => {
    expect(Object.keys(PROVIDER_MARKS).sort()).toEqual(['APPLE', 'GOOGLE', 'KAKAO']);
    for (const provider of [...Object.keys(NAMES), 'UNKNOWN']) expect(hasProviderMark(provider)).toBe(provider in PROVIDER_MARKS);
  });

  it.each(Object.keys(NAMES))('%s: 마크가 있다고 하면 그 마크를 그리고(화면 읽기는 공급자 이름), 없다고 하면 그리지 않는다', async (provider) => {
    await render(<ProviderBadge provider={provider} />);
    if (hasProviderMark(provider)) expect(screen.getByRole('image', { name: NAMES[provider] })).toBeTruthy();
    else expect(screen.queryByTestId(`provider-badge-${provider}`)).toBeNull();
  });
});
