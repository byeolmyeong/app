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

/** 앱 안 주소만("/" 하나로 시작, 바깥 주소 · "//" 는 아님) — 광고 푸시가 앱 밖으로 보내지 않게 */
const isAppPath = (v: string) => v.startsWith('/') && !v.startsWith('//') && !v.includes('://');

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
 * 누르면 갈 곳(결정 066 의 4): 오늘의 하늘(11-4, 길 A 의 A④ 가 만든다) · 별명 공개(10) · 나 탭(12-8) · 시기 탭(14) ·
 * 그 문의의 답변 보기(16-8) · 광고는 어드민이 고른 앱 안 주소.
 */
export function pushTarget(data: PushData): Href {
  switch (data.type) {
    case 'TODAY_SKY':
      return '/today' as Href;
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
