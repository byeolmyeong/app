import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ListCard, ListCardRow } from '@/components/list-card';
import { Colors, FontWeight, LineWidth, MyLayout } from '@/constants/theme';

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
});

describe('묶음 제목이 있는 목록 카드(결정 093)', () => {
  const flat = (el: { props: Record<string, unknown> }) => (StyleSheet.flatten(el.props.style as never) ?? {}) as Record<string, unknown>;

  it('제목은 카드 안 맨 위 — 본문 굵게 15/22 · 흰 글자, 화면 읽기에는 머리', async () => {
    await render(
      <ListCard title="고객 지원">
        <ListCardRow label="자주 묻는 질문" onPress={() => {}} />
        <ListCardRow label="문의하기" onPress={() => {}} />
      </ListCard>,
    );
    const title = screen.getByText('고객 지원');
    expect(flat(title)).toMatchObject({ fontSize: 15, lineHeight: 22, fontWeight: FontWeight.semibold, color: Colors.ink });
    expect(title.props.accessibilityRole).toBe('header');
    const shown = JSON.stringify(screen.toJSON());
    expect(shown.indexOf('"고객 지원"')).toBeLessThan(shown.indexOf('"자주 묻는 질문"'));
  });

  it('줄은 본문 보통(15/23) · 높이 48 · 줄 사이 선 없음, 꺾쇠는 그대로', async () => {
    await render(
      <ListCard title="고객 지원">
        <ListCardRow label="자주 묻는 질문" onPress={() => {}} />
        <ListCardRow label="문의하기" onPress={() => {}} />
      </ListCard>,
    );
    expect(flat(screen.getByText('문의하기'))).toMatchObject({ fontSize: 15, lineHeight: 23, fontWeight: FontWeight.regular });
    expect(flat(screen.getByRole('button', { name: '문의하기' }))).toMatchObject({ minHeight: MyLayout.list.titled.row });
    expect(MyLayout.list.titled.row).toBe(48);
    for (const item of screen.getAllByTestId('list-card-item')) expect(flat(item).borderTopWidth).toBeUndefined();
    expect(screen.getAllByTestId('list-card-chevron')).toHaveLength(2);
  });

  it('제목이 없으면 지금 모양 그대로 — 줄 사이 옅은 선 · 이름 중간 굵기 · 최소 높이 52(내 정보 · 알림 설정)', async () => {
    await render(
      <ListCard>
        <ListCardRow label="자주 묻는 질문" onPress={() => {}} />
        <ListCardRow label="문의하기" onPress={() => {}} />
      </ListCard>,
    );
    const items = screen.getAllByTestId('list-card-item');
    expect(flat(items[0]).borderTopWidth).toBeUndefined();
    expect(flat(items[1])).toMatchObject({ borderTopWidth: LineWidth, borderTopColor: Colors.hair });
    expect(flat(screen.getByText('문의하기')).fontWeight).toBe(FontWeight.medium);
    expect(flat(screen.getByRole('button', { name: '문의하기' }))).toMatchObject({ minHeight: MyLayout.list.row });
  });
});
