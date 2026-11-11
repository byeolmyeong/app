/**
 * 출생 정보 입력의 검사와 표시. 달력상 맞는 날짜인지와 받는 범위(1900-01-01 ~ 오늘)만 본다.
 * 시각의 표준시 변환과 차트 계산은 서버가 한다.
 */
import { strings } from '@/content/strings';
import type { BirthInput } from '@/lib/api';

/** 기기에 보관하는 출생 정보. date 는 YYYY-MM-DD, time 은 HH:mm 또는 null("모름") */
export type BirthProfile = { date: string; time: string | null; place: { id: number; name: string } };

type Parsed = { ok: true; value: string } | { ok: false; error: string };

const E = strings.home.errors;
const pad = (n: number) => String(n).padStart(2, '0');

/** today 는 기기의 오늘 날짜. 오늘 이후와 1900-01-01 이전은 받지 않는다. */
export function parseBirthDate(text: string, today: Date): Parsed {
  const t = text.trim();
  const m = /^(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D*$/.exec(t) ?? /^(\d{4})(\d{2})(\d{2})$/.exec(t);
  if (!m) return { ok: false, error: E.dateFormat };
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d)
    return { ok: false, error: E.dateFormat };
  if (y < 1900) return { ok: false, error: E.dateTooEarly };
  const value = `${y}-${pad(mo)}-${pad(d)}`;
  const todayValue = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  if (value > todayValue) return { ok: false, error: E.dateFuture };
  return { ok: true, value };
}

/** 24시간 HH:mm, 분 단위 */
export function parseBirthTime(text: string): Parsed {
  const t = text.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t) ?? /^(\d{2})(\d{2})$/.exec(t);
  if (!m) return { ok: false, error: E.timeFormat };
  const [h, mi] = [Number(m[1]), Number(m[2])];
  if (h > 23 || mi > 59) return { ok: false, error: E.timeFormat };
  return { ok: true, value: `${pad(h)}:${pad(mi)}` };
}

export type BirthForm = {
  dateText: string;
  timeText: string;
  timeUnknown: boolean;
  place: { id: number; name: string } | null;
};

export type BirthFormErrors = { date?: string; time?: string; place?: string };

export function validateBirthInput(
  form: BirthForm,
  today: Date,
): { ok: true; input: BirthInput; profile: BirthProfile } | { ok: false; errors: BirthFormErrors } {
  const date = parseBirthDate(form.dateText, today);
  const time = form.timeUnknown ? null : parseBirthTime(form.timeText);
  const errors: BirthFormErrors = {};
  if (!date.ok) errors.date = date.error;
  if (time && !time.ok) errors.time = time.error;
  if (!form.place) errors.place = E.placeRequired;
  if (!date.ok || (time && !time.ok) || !form.place) return { ok: false, errors };
  const timeValue = time ? time.value : null;
  return {
    ok: true,
    input: { date: date.value, time: timeValue, placeId: form.place.id },
    profile: { date: date.value, time: timeValue, place: { id: form.place.id, name: form.place.name } },
  };
}

/** 예: "2000. 6. 15. 오후 9:00 · 서울 마포구". 시각 "모름" 이면 시각을 적지 않는다. */
export function formatBirthSummary(profile: BirthProfile): string {
  const [y, mo, d] = profile.date.split('-').map(Number);
  let when = `${y}. ${mo}. ${d}.`;
  if (profile.time) {
    const [h, mi] = profile.time.split(':').map(Number);
    when += ` ${h < 12 ? strings.detail.am : strings.detail.pm} ${h % 12 === 0 ? 12 : h % 12}:${pad(mi)}`;
  }
  return `${when} · ${profile.place.name}`;
}
