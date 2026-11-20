/**
 * 알림함의 줄(결정 052 · 058, 보드 11-3): 어느 줄을 보이고, 어디로 가고, 어느 묶음(오늘 · 최근 7일 · 최근 30일)에 넣고, 때를 어떻게 적는지.
 * 날짜는 서버가 준 시각(UTC)을 한국 시간대로 읽어 견주기만 한다 — 점성 계산은 없다(계획 "전역 제약").
 */
import type { Href } from 'expo-router';

import { strings } from '@/content/strings';
import { pushTarget, type PushData } from '@/features/push/push-data';
import type { NotificationItem, NotificationList } from '@/lib/api';

const N = strings.notifications;

/** 한국 시각(UTC+9) */
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const JUST_NOW_MS = 60 * 1000;
/** "최근 7일" 묶음: 오늘 뒤로 이만큼의 날(오늘 포함 7일) */
const WEEK_DAYS = 7;
const NOON = 12;

const koreanDay = (ms: number) => Math.floor((ms + KOREA_OFFSET_MS) / DAY_MS);

/** 알림함의 줄을 휴대폰 푸시의 data 모양으로 — 같은 갈 곳(pushTarget)을 쓰려고. 1.0.0 에 없는 궁합 리포트 · 모르는 종류 · 문의 식별자 없는 문의 답변은 null */
function pushDataOf(item: NotificationItem): PushData | null {
  switch (item.kind) {
    case 'READING_DONE':
      return { type: 'READING_DONE' };
    case 'ME_REPORT_DONE':
      return { type: 'ME_REPORT_DONE' };
    case 'TIMING_REPORT_DONE':
      return { type: 'TIMING_REPORT_DONE' };
    case 'INQUIRY_ANSWERED':
      return item.inquiryId ? { type: 'INQUIRY_ANSWERED', inquiryId: item.inquiryId } : null;
    default:
      return null;
  }
}

/** 누르면 갈 곳 — 휴대폰 푸시와 같은 표(`features/push/push-data.ts` 의 pushTarget, 결정 066 의 4). 갈 곳이 없으면 null — 그 줄을 숨긴다 */
export function notificationTarget(item: NotificationItem): Href | null {
  const data = pushDataOf(item);
  return data ? pushTarget(data) : null;
}

/** 보이는 줄만(갈 곳이 있는 것) — 받은 순서(새것부터) 그대로 */
export const visibleNotifications = (items: NotificationItem[]) => items.filter((item) => notificationTarget(item) !== null);

/**
 * 홈 종의 점: 보이는 줄 가운데 안 읽은 것이 있는가. 서버의 unread 는 숨기는 줄(궁합 리포트)도 세어, 그것만 남으면 누를 수 없는 점이 남는다.
 */
export const hasUnread = (list: NotificationList) => visibleNotifications(list.items).some((item) => !item.read);

export type NotificationGroup = keyof typeof N.groups;

/** 받은 날(한국 날짜)이 오늘이면 today, 오늘 포함 7일 안이면 week, 그 전이면 month. 기기 시계가 받은 때보다 앞이면 오늘로 본다 */
export function groupOf(createdAt: string, now: number): NotificationGroup {
  const at = Date.parse(createdAt);
  const days = Number.isNaN(at) ? Infinity : koreanDay(now) - koreanDay(at);
  if (days <= 0) return 'today';
  return days < WEEK_DAYS ? 'week' : 'month';
}

/** 묶음 순서대로, 빈 묶음은 빼고 */
export function groupNotifications(items: NotificationItem[], now: number): { group: NotificationGroup; items: NotificationItem[] }[] {
  const groups = Object.keys(N.groups) as NotificationGroup[];
  return groups
    .map((group) => ({ group, items: items.filter((item) => groupOf(item.createdAt, now) === group) }))
    .filter((g) => g.items.length > 0);
}

/** 때: 1분 안이면 "방금", 오늘이면 "오후 2:10", 그 전이면 "11월 7일"(한국 시각). 읽을 수 없는 시각이면 빈 글자 */
export function timeLabel(createdAt: string, now: number): string {
  const at = Date.parse(createdAt);
  if (Number.isNaN(at)) return '';
  if (now - at < JUST_NOW_MS) return N.justNow;
  const korea = new Date(at + KOREA_OFFSET_MS);
  if (groupOf(createdAt, now) !== 'today') return `${korea.getUTCMonth() + 1}${N.date.month}${korea.getUTCDate()}${N.date.day}`;
  const hours = korea.getUTCHours();
  const hour12 = hours % NOON === 0 ? NOON : hours % NOON;
  const minutes = String(korea.getUTCMinutes()).padStart(2, '0');
  return `${hours < NOON ? N.time.am : N.time.pm}${hour12}${N.time.colon}${minutes}`;
}

/** 줄의 제목 · 본문. 별명 지음은 닉네임이 있으면 "새벽별 님의 별명과 풀이를…" */
export function notificationText(item: NotificationItem, nickname: string | null): { title: string; body: string } | null {
  const kind = Object.prototype.hasOwnProperty.call(N.kinds, item.kind) ? N.kinds[item.kind as keyof typeof N.kinds] : null;
  if (!kind) return null;
  const body = item.kind === 'READING_DONE' && nickname ? `${nickname}${N.namedPrefix}${kind.body}` : kind.body;
  return { title: kind.title, body };
}
