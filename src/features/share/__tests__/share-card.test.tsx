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

describe('공유 카드 v2(결정 053 의 2 — 보드 12-7 · 12-14 · 11-7 · 14-6)', () => {
  const V = S.cards;
  const hidden = (id: string) => screen.queryByTestId(id, { includeHiddenElements: true });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('내 별명: 해 별자리 그림 · 별자리 이름 칩 · "새벽별 님의 별명" · 한 줄 별명 · "태어난 순간의 하늘로 읽는 나"', async () => {
    await render(<ShareCardView card={C.nickname} />);
    expect(texts()).toEqual(['물병자리', '새벽별 님의 별명', C.nickname.headline, V.taglines.me]);
    expect(hidden('share-art-sign-AQUARIUS')).toBeTruthy();
    expect(screen.getByLabelText(strings.appName)).toBeTruthy();
  });

  it('나 탭 영역: 영역 그림 · 영역 이름 칩 · "새벽별 님의 연애" · 서버가 준 제목', async () => {
    await render(<ShareCardView card={C.meArea} />);
    expect(texts()).toEqual(['연애', '새벽별 님의 연애', C.meArea.title, V.taglines.me]);
    expect(hidden('share-art-area-LOVE')).toBeTruthy();
  });

  it('오늘의 하늘: 달 그림 · "11월 19일 · 오늘의 하늘" · "새벽별 님의 오늘" · 제목 · "하늘의 움직임으로 읽는 오늘"', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-19T12:00:00+09:00') });
    await render(<ShareCardView card={C.daySky} />);
    expect(texts()).toEqual(['11월 19일 · 오늘의 하늘', '새벽별 님의 오늘', C.daySky.title, V.taglines.today]);
    expect(hidden('share-art-moon')).toBeTruthy();
  });

  it('그날의 하늘(오늘이 아닌 날, 한국 날짜로): "11월 21일 · 그날의 하늘" · "새벽별 님의 11월 21일"', async () => {
    // 한국은 이미 11월 20일 새벽이고 UTC 로는 아직 19일 — 오늘은 한국 날짜로 센다
    jest.useFakeTimers({ now: new Date('2026-11-20T01:00:00+09:00') });
    await render(<ShareCardView card={{ ...C.daySky, date: '2026-11-21' }} />);
    expect(texts()).toEqual(['11월 21일 · 그날의 하늘', '새벽별 님의 11월 21일', C.daySky.title, V.taglines.day]);
    await screen.unmount();
    await render(<ShareCardView card={{ ...C.daySky, date: '2026-11-20' }} />);
    expect(texts()[0]).toBe('11월 20일 · 오늘의 하늘');
  });

  it('다음 큰 변화: 계단 위 별 · "2028년 · 만 29세 무렵" · "새벽별 님의 다음 큰 변화" · 제목 · "하늘의 움직임으로 읽는 나의 시기"', async () => {
    await render(<ShareCardView card={C.nextBig} />);
    expect(texts()).toEqual(['2028년 · 만 29세 무렵', '새벽별 님의 다음 큰 변화', C.nextBig.title, V.taglines.timing]);
    expect(hidden('share-art-steps')).toBeTruthy();
  });

  it('닉네임이 없는 옛 계정이면 "나의 …" 로 적는다', async () => {
    const cases: [ShareCard, string][] = [
      [{ kind: 'NICKNAME', sunSign: 'GEMINI', headline: '한 줄' }, '나의 별명'],
      [{ kind: 'ME_AREA', area: 'WORK', title: '제목' }, '나의 일'],
      [{ kind: 'NEXT_BIG', year: 2030, age: 31, title: '제목' }, '나의 다음 큰 변화'],
    ];
    for (const [card, label] of cases) {
      const view = await render(<ShareCardView card={card} />);
      expect(texts()[1]).toBe(label);
      await view.unmount();
    }
  });

  it('영역 다섯 · 별자리 열둘 모두 그림이 있다(카드 값으로 그림을 고른다)', async () => {
    for (const area of ['PERSONALITY', 'LOVE', 'RELATIONSHIP', 'WORK', 'EMOTION'] as const) {
      const view = await render(<ShareCardView card={{ ...C.meArea, area }} />);
      expect(hidden(`share-art-area-${area}`)).toBeTruthy();
      expect(texts()[0]).toBe(strings.me.areas[area]);
      await view.unmount();
    }
    const signs = ['ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO', 'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES'] as const;
    for (const sunSign of signs) {
      const view = await render(<ShareCardView card={{ ...C.nickname, sunSign }} />);
      expect(hidden(`share-art-sign-${sunSign}`)).toBeTruthy();
      expect(texts()[0]).toBe(`${strings.signs[sunSign]}${strings.chart.signSuffix}`);
      await view.unmount();
    }
  });

  it('출생 정보 · 근거 · 본문 · 하우스가 섞여 와도 그리지 않는다(결정 053 의 4)', async () => {
    const extra = { ...C.nickname, birth: '1999-03-08', time: '14:10', place: '서울 강남구', house: 5, body: '본문', basis: ['해'] } as ShareCard;
    await render(<ShareCardView card={extra} />);
    expect(texts()).toEqual(['물병자리', '새벽별 님의 별명', C.nickname.headline, V.taglines.me]);
  });

  it('9:16 이고 별이는 없다(시안의 그림 · 로고 · 한 줄 소개)', async () => {
    await render(<ShareCardView card={C.nextBig} width={209} />);
    const { width, height } = StyleSheet.flatten(screen.getByTestId('share-card-frame').props.style);
    expect([width, height]).toEqual([209, 372]);
    for (const id of ['share-byeoli-default', 'share-byeoli-happy', 'share-byeoli-think']) expect(hidden(id)).toBeNull();
  });
});
