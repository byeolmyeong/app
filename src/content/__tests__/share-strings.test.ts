import { strings } from '@/content/strings';

// 공유 v2(결정 053, 시안 12-4~12-7 · 12-13 · 12-14 · 11-6 · 11-7 · 14-5 · 14-6)의 문구
describe('공유 v2 문구', () => {
  const S = strings.share;
  const C = S.cards;

  it('시트의 버튼은 "이미지 저장" · "인스타그램 스토리 공유" 다(링크 버튼 없음)', () => {
    expect(S.actions.saveImage).toBe('이미지 저장');
    expect(S.actions.story).toBe('인스타그램 스토리 공유');
  });

  it('짧은 알림(결정 065 의 1): 저장했어요 · 저장하지 못했어요 · 사진 접근 · 스토리를 열지 못했어요', () => {
    expect(S.notices.saved).toBe('이미지를 저장했어요');
    expect(S.notices.saveFailed).toBe('이미지를 저장하지 못했어요');
    expect(S.notices.photosDenied).toBe('설정에서 사진 접근을 허용해 주세요');
    expect(S.notices.storyFailed.trim().length).toBeGreaterThan(0);
  });

  it('카드의 이름표는 "새벽별 님의 …", 닉네임이 없으면 "나의 …" 로 잇는다', () => {
    expect(`새벽별${C.of}${C.nickname}`).toBe('새벽별 님의 별명');
    expect(`새벽별${C.of}${strings.me.areas.LOVE}`).toBe('새벽별 님의 연애');
    expect(`새벽별${C.of}${C.today}`).toBe('새벽별 님의 오늘');
    expect(`새벽별${C.of}${C.nextBig}`).toBe('새벽별 님의 다음 큰 변화');
    expect(`${C.mine}${C.nickname}`).toBe('나의 별명');
  });

  it('칩: "11월 19일 · 오늘의 하늘" · "2028년 · 만 29세 무렵"', () => {
    const date = `11${C.date.month}19${C.date.day}`;
    expect(`${date}${C.separator}${C.daySky.today}`).toBe('11월 19일 · 오늘의 하늘');
    expect(`${date}${C.separator}${C.daySky.day}`).toBe('11월 19일 · 그날의 하늘');
    expect(`2028${C.when.year}${C.separator}${C.when.agePrefix}29${C.when.ageSuffix}`).toBe('2028년 · 만 29세 무렵');
  });

  it('한 줄 소개는 카드 종류마다 시안 그대로다', () => {
    expect(C.taglines.me).toBe('태어난 순간의 하늘로 읽는 나');
    expect(C.taglines.today).toBe('하늘의 움직임으로 읽는 오늘');
    expect(C.taglines.timing).toBe('하늘의 움직임으로 읽는 나의 시기');
    expect(C.taglines.day.trim().length).toBeGreaterThan(0);
  });

  it('공유할 것이 없을 때(404)의 안내가 새 종류 넷 모두에 있다', () => {
    for (const kind of ['NICKNAME', 'ME_AREA', 'DAY_SKY', 'NEXT_BIG'] as const) expect(S.nothing[kind].trim().length).toBeGreaterThan(0);
  });
});
