import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { strings } from '@/content/strings';
import { SHARE_IMAGE, ShareCardView } from '@/features/share/share-card';
import type { ShareCard } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

const S = strings.share;
const C = fixtures.shareCards;
/** 카드에 그려진 글자 전부(그린 순서) */
const texts = () => screen.getAllByText(/[\s\S]+/).map((node) => [node.props.children].flat().join(''));
/** 어느 카드에나 있는 글: 카드의 값 다음에 한 줄 소개(앱 이름은 로고 그림이다, 결정 036) */
const frame = (inner: string[]) => [...inner, S.tagline];

describe('공유 카드', () => {
  it('요약 해석 카드는 한 줄 총평과 키워드 셋만 그린다', async () => {
    await render(<ShareCardView card={C.reading} />);
    expect(texts()).toEqual(frame([S.card.readingLabel, C.reading.headline, ...C.reading.keywords]));
  });

  it('궁합 점수 카드는 두 이름 · 점수 · 한 줄만 그리고, 점수 옆의 말은 서버가 준 카드에만 붙인다', async () => {
    const first = await render(<ShareCardView card={C.score} />);
    expect(texts()).toEqual(frame([S.card.scoreLabel, '나 × 지우', '82점', C.score.headline]));
    await first.unmount();
    await render(<ShareCardView card={{ ...C.score, score: 55, scoreLabel: '다른 결의 사이' }} />);
    expect(texts()).toEqual(frame([S.card.scoreLabel, '나 × 지우', '55점', '다른 결의 사이', C.score.headline]));
  });

  it('랭킹 카드는 관계 이름과 받은 순서의 이름 · 점수만 그린다(앱이 이름을 줄이거나 다시 줄 세우지 않는다)', async () => {
    const card: ShareCard = {
      kind: 'RANKING',
      relation: 'FRIEND',
      entries: [
        { name: 'ㅅㅇ', score: 77 },
        { name: 'ㅁㅅ', score: 91 },
        { name: '○', score: 60 },
      ],
    };
    await render(<ShareCardView card={card} />);
    expect(texts()).toEqual(frame(['내 친구 궁합 TOP 3', '1', 'ㅅㅇ', '77점', '2', 'ㅁㅅ', '91점', '3', '○', '60점']));
  });

  it('다음 변곡점 카드는 해와 계절 · 주제 한 줄만 그린다', async () => {
    const first = await render(<ShareCardView card={C.nextTurn} />);
    expect(texts()).toEqual(frame([S.card.nextTurnLead, '2029년 여름', C.nextTurn.theme]));
    await first.unmount();
    await render(<ShareCardView card={{ kind: 'NEXT_TURN', year: 2027, season: 'SPRING', theme: '주제' }} />);
    expect(texts()).toEqual(frame([S.card.nextTurnLead, '2027년 봄', '주제']));
  });

  it('계약에 없는 값이 섞여 와도 그리지 않는다(출생 정보 · 근거 · 본문)', async () => {
    const extra = { ...C.reading, basis: ['태양', '쌍둥이'], birth: '2000-06-15', body: '본문' } as ShareCard;
    await render(<ShareCardView card={extra} />);
    expect(texts()).toEqual(frame([S.card.readingLabel, C.reading.headline, ...C.reading.keywords]));
  });

  it('인스타 스토리 비율(9:16)이다', async () => {
    expect(SHARE_IMAGE).toEqual({ width: 1080, height: 1920 });
    await render(<ShareCardView card={C.reading} width={180} />);
    const { width, height } = StyleSheet.flatten(screen.getByTestId('share-card-frame').props.style);
    expect([width, height]).toEqual([180, 320]);
  });

  it('위에 별이, 아래에 로고(앱 이름으로 읽힌다)가 있고, 별이의 표정은 카드 종류로만 정한다(결정 036)', async () => {
    const face = (id: string) => screen.queryByTestId(id, { includeHiddenElements: true });
    const cases: [ShareCard, string][] = [
      [C.reading, 'share-byeoli-default'],
      [C.score, 'share-byeoli-happy'],
      [{ ...C.score, score: 12, scoreLabel: '다른 결의 사이' }, 'share-byeoli-happy'],
      [{ kind: 'RANKING', relation: 'LOVE', entries: [{ name: '지우', score: 80 }] }, 'share-byeoli-default'],
      [C.nextTurn, 'share-byeoli-think'],
    ];
    for (const [card, expected] of cases) {
      const view = await render(<ShareCardView card={card} />);
      expect(face(expected)).toBeTruthy();
      for (const other of ['share-byeoli-default', 'share-byeoli-happy', 'share-byeoli-think'].filter((id) => id !== expected))
        expect(face(other)).toBeNull();
      expect(screen.getByLabelText(strings.appName)).toBeTruthy();
      await view.unmount();
    }
  });
});
