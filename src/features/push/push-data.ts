import type { Href } from 'expo-router';

/**
 * 푸시의 data(서버 S10-2 의 `data.type`, 문구는 결정 066 의 4 표). 오늘의 하늘은 그날(YYYY-MM-DD), 문의 답변은 문의 식별자,
 * 광고(어드민 이벤트)는 누르면 갈 앱 안 주소를 함께 준다. 앱 안 알림함도 같은 모양 · 같은 갈 곳을 쓴다.
 */
export type PushData =
  | { type: 'TODAY_SKY'; date: string }
  | { type: 'READING_DONE' }
  | { type: 'ME_REPORT_DONE' }
  | { type: 'TIMING_REPORT_DONE' }
  | { type: 'INQUIRY_ANSWERED'; inquiryId: string }
  | { type: 'EVENT'; target: string };

/**
 * 광고(어드민 이벤트) 푸시가 보낼 수 있는 앱 안 주소의 첫 조각 — 홈 · 나 · 시기 · 내 별명 · 하늘 지도 · 마이 · 설정. 없는 주소로 보내
 * 길 잃은 화면이 뜨지 않게, 앱 밖으로 보내지 않게 이 목록으로 거른다(#64 리뷰). 오늘의 하늘 `/today` 는 A④ 가 더했다.
 */
const APP_ROUTES = new Set(['', 'me', 'timing', 'today', 'reading', 'chart', 'my', 'settings']);
const isAppPath = (v: string) => v.startsWith('/') && !v.startsWith('//') && !v.includes('://') && APP_ROUTES.has(v.slice(1).split(/[/?#]/)[0]);

/** 받은 data 를 읽는다. 모르는 종류이거나 함께 와야 할 값이 없으면 null(버린다) */
export function parsePushData(raw: unknown): PushData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const v = raw as Record<string, unknown>;
  switch (v.type) {
    case 'TODAY_SKY':
      return typeof v.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.date) ? { type: 'TODAY_SKY', date: v.date } : null;
    case 'READING_DONE':
    case 'ME_REPORT_DONE':
    case 'TIMING_REPORT_DONE':
      return { type: v.type };
    case 'INQUIRY_ANSWERED': {
      const id = typeof v.inquiryId === 'number' ? String(v.inquiryId) : v.inquiryId;
      return typeof id === 'string' && id !== '' ? { type: 'INQUIRY_ANSWERED', inquiryId: id } : null;
    }
    case 'EVENT':
      return typeof v.target === 'string' && isAppPath(v.target) ? { type: 'EVENT', target: v.target } : null;
    default:
      return null;
  }
}

/**
 * 누르면 갈 곳(결정 066 의 4): 오늘의 하늘 · 별명 공개(10) · 나 탭(12-8) · 시기 탭(14) · 그 문의의 답변 보기(16-8) · 광고는 어드민이 고른
 * 앱 안 주소. 오늘의 하늘은 11-4 화면 `/today`(A④). 알림함(`features/notifications`)도 이 표를 쓴다.
 */
export function pushTarget(data: PushData): Href {
  switch (data.type) {
    case 'TODAY_SKY':
      // 그날을 함께 넘긴다 — 서버가 아침에 미리 만든 날이라 오늘의 하늘이 만드는 중을 비추지 않게(리뷰 #87 의 4)
      return { pathname: '/today', params: { date: data.date } };
    case 'READING_DONE':
      return '/reading';
    case 'ME_REPORT_DONE':
      return '/me';
    case 'TIMING_REPORT_DONE':
      return '/timing';
    case 'INQUIRY_ANSWERED':
      return { pathname: '/my/inquiries/[id]', params: { id: data.inquiryId } };
    case 'EVENT':
      return data.target as Href;
  }
}

/**
 * 지금 보고 있는 화면(경로)이 그 알림이 가리키는 화면인가 — 그렇다면 앱을 쓰는 중에 온 그 알림은 배너로 띄우지 않는다(결정 076).
 * 오늘의 하늘은 홈(그 카드가 있다) · 오늘의 하늘 화면, 별명 지음은 내 별명 · 나 탭, 나 탭 풀이는 나 탭, 시기 풀이는 시기 탭, 문의 답변은 그 문의의 답변 보기,
 * 광고는 그 주소.
 */
export function isViewingTarget(data: PushData, pathname: string): boolean {
  switch (data.type) {
    case 'TODAY_SKY':
      return pathname === '/' || pathname === '/today';
    case 'READING_DONE':
      return pathname === '/reading' || pathname === '/me';
    case 'ME_REPORT_DONE':
      return pathname === '/me';
    case 'TIMING_REPORT_DONE':
      return pathname === '/timing';
    case 'INQUIRY_ANSWERED':
      return pathname === `/my/inquiries/${data.inquiryId}`;
    case 'EVENT':
      return pathname === (data.target.split(/[?#]/)[0].replace(/(.)\/+$/, '$1'));
  }
}

