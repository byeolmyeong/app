/**
 * 출생 정보 입력의 검사와 표시. 달력상 맞는 날짜인지와 받는 범위(1900-01-01 ~ 오늘)만 본다.
 * 시각의 표준시 변환과 차트 계산은 서버가 한다.
 */
import { strings } from '@/content/strings';
import type { BirthInput } from '@/lib/api';

/**
 * 기기에 보관하는 출생 정보. date 는 YYYY-MM-DD, time 은 HH:mm 또는 null("모름").
 * place 는 time 이 있으면 반드시 있고, time 이 null 이면 고른 경우에만 있다(결정 042 — 서버에는 보내지 않는다).
 */
export type BirthProfile = { date: string; time: string | null; place: { id: number; name: string } | null };

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

/**
 * 입력하는 동안 숫자만 남겨 YYYY-MM-DD 꼴로 맞춘다. 붙임표는 뒤에 숫자가 있을 때만 넣어 지울 때 막히지 않는다.
 * 한 자리로 끝날 수밖에 없는 월(2~9)·일(4~9)은 앞에 0 을 붙인다. 맞는 날짜인지는 [parseBirthDate] 가 본다.
 */
export function formatDateTyping(text: string): string {
  const digits = text.replace(/\D/g, '');
  const year = digits.slice(0, 4);
  let rest = digits.slice(4);
  if (rest && rest[0] > '1') rest = `0${rest}`;
  const month = rest.slice(0, 2);
  let day = rest.slice(2);
  if (day && day[0] > '3') day = `0${day}`;
  return [year, month, day.slice(0, 2)].filter(Boolean).join('-');
}

/** 시각 고르기(오전/오후 · 시 · 분)의 값 */
export type TimePick = { period: 'AM' | 'PM'; hour: number; minute: number };

/** HH:mm 을 고르기 값으로. 꼴이 틀리면 null */
export function toTimePick(time: string): TimePick | null {
  const parsed = parseBirthTime(time);
  if (!parsed.ok) return null;
  const [h, minute] = parsed.value.split(':').map(Number);
  return { period: h < 12 ? 'AM' : 'PM', hour: h % 12 === 0 ? 12 : h % 12, minute };
}

/** 고르기 값을 HH:mm 으로. 오전 12시는 00, 오후 12시는 12 */
export function fromTimePick(pick: TimePick): string {
  const h = (pick.hour % 12) + (pick.period === 'PM' ? 12 : 0);
  return `${pad(h)}:${pad(pick.minute)}`;
}

/** 예: "오후 9:00". 꼴이 틀리면 빈 글자 */
export function formatTimeDisplay(time: string): string {
  const pick = toTimePick(time);
  if (!pick) return '';
  return `${pick.period === 'AM' ? strings.detail.am : strings.detail.pm} ${pick.hour}:${pad(pick.minute)}`;
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
  // 시각을 몰라도 태어난 곳 칸은 받는다(결정 042). 그때는 없어도 되고, 골랐으면 기기에만 두고 서버에는 보내지 않는다
  // (시각이 없으면 서버가 곳을 읽지 않는다, 결정 020 의 서버 계약).
  const place = form.place;
  if (!form.timeUnknown && !place) errors.place = E.placeRequired;
  if (!date.ok || (time && !time.ok) || errors.place) return { ok: false, errors };
  const timeValue = time ? time.value : null;
  return {
    ok: true,
    input: { date: date.value, time: timeValue, placeId: place && timeValue !== null ? place.id : null },
    profile: { date: date.value, time: timeValue, place: place ? { id: place.id, name: place.name } : null },
  };
}

/** 보관된 출생 정보를 서버 요청 모양으로. 시각 "모름" 이면 placeId 를 보내지 않는다(null) */
export function birthInputOf(profile: BirthProfile): BirthInput {
  return {
    date: profile.date,
    time: profile.time,
    placeId: profile.time === null ? null : (profile.place?.id ?? null),
  };
}

/** 예: "2000. 6. 15. 오후 9:00 · 서울 마포구". 시각 "모름" 이면 곳 없이 "2000. 6. 15. · 태어난 시각 모름" */
export function formatBirthSummary(profile: BirthProfile): string {
  const [y, mo, d] = profile.date.split('-').map(Number);
  const day = `${y}. ${mo}. ${d}.`;
  if (profile.time === null) return `${day} · ${strings.home.timeLabel} ${strings.home.timeUnknownValue}`;
  return [`${day} ${formatTimeDisplay(profile.time)}`, profile.place?.name].filter(Boolean).join(' · ');
}
