import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ListCard, ListCardRow } from '@/components/list-card';

describe('목록 카드 줄의 값(소유자 2026-11-21)', () => {
  const long = 'averyveryverylongemailaddress@example-domain.co.kr';

  it('오른쪽에 값이 있으면 이름은 한 줄 · 줄지 않고, 값은 한 줄에 가운데 말줄임 — 화면 읽기는 전체', async () => {
    await render(
      <ListCard>
        <ListCardRow label="연결된 계정" value={long} />
      </ListCard>,
    );
    expect(screen.getByText('연결된 계정').props.numberOfLines).toBe(1);
    const value = screen.getByText(long);
    expect(value.props.numberOfLines).toBe(1);
    expect(value.props.ellipsizeMode).toBe('middle');
    expect(value.props.accessibilityLabel).toBe(long);
  });

  it('값이 없으면 이름은 남은 폭을 다 쓰고 줄을 막지 않는다', async () => {
    await render(
      <ListCard>
        <ListCardRow label="자주 묻는 질문" onPress={() => {}} />
      </ListCard>,
    );
    expect(screen.getByText('자주 묻는 질문').props.numberOfLines).toBeUndefined();
  });

  it('설명이 있는 줄의 오른쪽 값은 제 폭만 — 이름 · 설명 칸이 남은 폭을 쓴다(내 정보의 출생 정보 "수정 ›", 결정 084)', async () => {
    const line = '1999년 3월 8일 · 오후 2:10 · 서울 강남구';
    await render(
      <ListCard>
        <ListCardRow label="출생 정보" description={line} value="수정" onPress={() => {}} />
      </ListCard>,
    );
    expect(screen.getByText(line)).toBeTruthy();
    // 값을 감싼 칸이 늘어나지 않고(flex 없음) 줄지도 않는다
    const box = screen.getByText('수정').parent;
    expect(box?.type).toBe('View');
    expect(StyleSheet.flatten(box?.props.style)).toMatchObject({ flexShrink: 0 });
    expect(StyleSheet.flatten(box?.props.style).flex).toBeUndefined();
  });
});
