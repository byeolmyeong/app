import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Field, FieldInput, FieldSelect } from '@/components/field';
import { ScrollPicker } from '@/components/scroll-picker';
import { Sheet } from '@/components/sheet';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { getSession } from '@/features/auth/use-session';
import {
  formatDateTyping,
  formatTimeDisplay,
  fromTimePick,
  parseBirthDate,
  toTimePick,
  validateBirthInput,
  type BirthFormErrors,
  type BirthProfile,
  type TimePick,
} from '@/features/chart/birth-input';
import { PlacePicker } from '@/features/chart/place-picker';
import type { StoredBirth } from '@/features/chart/use-birth-profile';
import { api, type Place } from '@/lib/api';

const S = strings.home;
/** 다 친 날짜(YYYY-MM-DD)의 글자 수. 다 쳤을 때 바로 검사한다 */
const DATE_LENGTH = 10;
/** 시각을 처음 고를 때 가운데에 놓이는 값 */
const DEFAULT_TIME: TimePick = { period: 'PM', hour: 12, minute: 0 };

const PERIODS = [
  { value: 'AM' as const, label: strings.detail.am },
  { value: 'PM' as const, label: strings.detail.pm },
];
const HOURS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
const MINUTES = Array.from({ length: 60 }, (_, i) => ({ value: i, label: String(i).padStart(2, '0') }));

const sameInput = (a: BirthProfile, b: BirthProfile) =>
  a.date === b.date && a.time === b.time && a.place.id === b.place.id;

export type BirthFormProps = {
  /** 기기에 보관된 값. 있으면 입력 칸을 이 값으로 채운다 */
  stored: StoredBirth | null;
  save: (value: StoredBirth) => Promise<void>;
};

/**
 * 출생 정보 입력. 한 화면에 생년월일 · 태어난 시각("모름") · 태어난 곳이 모두 보인다.
 * 생년월일은 숫자를 치고, 시각은 칸을 누르면 아래에서 올라오는 드럼롤 시트에서,
 * 곳은 화면을 가득 채우는 고르기 화면(`PlacePicker`)에서 고른다.
 * 맨 아래 버튼을 누르면 차트를 받아 보관하고 풀이 글(/reading)로 간다. 차트는 풀이 글 화면에서 연다.
 */
export function BirthForm({ stored, save }: BirthFormProps) {
  const initial = stored?.profile;
  const [dateText, setDateText] = useState(initial?.date ?? '');
  /** HH:mm. 아직 고르지 않았으면 빈 글자 */
  const [timeText, setTimeText] = useState(initial?.time ?? '');
  const [timeUnknown, setTimeUnknown] = useState(initial ? initial.time === null : false);
  const [place, setPlace] = useState<BirthProfile['place'] | null>(initial?.place ?? null);
  /** 서버가 준 전체 목록. null 은 아직 받지 못함 */
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [placesFailed, setPlacesFailed] = useState(false);
  const [sheet, setSheet] = useState<'time' | 'place' | null>(null);
  /** 시각 시트에서 굴리는 중인 값. "확인" 을 눌러야 정해진다 */
  const [timeDraft, setTimeDraft] = useState<TimePick>(DEFAULT_TIME);
  const [errors, setErrors] = useState<BirthFormErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadPlaces = useCallback(async () => {
    setPlacesFailed(false);
    const r = await api.listPlaces();
    if (r.ok) setPlaces(r.data);
    else setPlacesFailed(true);
  }, []);

  useEffect(() => {
    let alive = true;
    api.listPlaces().then((r) => {
      if (!alive) return;
      if (r.ok) setPlaces(r.data);
      else setPlacesFailed(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  function onDateText(text: string) {
    const value = formatDateTyping(text);
    setDateText(value);
    const date = value.length === DATE_LENGTH ? parseBirthDate(value, new Date()) : null;
    setErrors((e) => ({ ...e, date: date && !date.ok ? date.error : undefined }));
  }

  function onOpenTime() {
    setTimeDraft(toTimePick(timeText) ?? DEFAULT_TIME);
    setSheet('time');
  }

  function onConfirmTime() {
    setTimeText(fromTimePick(timeDraft));
    setErrors((e) => ({ ...e, time: undefined }));
    setSheet(null);
  }

  function onTimeUnknown(checked: boolean) {
    setTimeUnknown(checked);
    setErrors((e) => ({ ...e, time: undefined }));
  }

  function onPickPlace(p: Place) {
    setPlace({ id: p.id, name: p.name });
    setErrors((e) => ({ ...e, place: undefined }));
    setSheet(null);
  }

  async function onSubmit() {
    if (submitting) return;
    const v = validateBirthInput({ dateText, timeText, timeUnknown, place }, new Date());
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    setRequestError(null);
    // 같은 입력의 차트를 이미 갖고 있으면 다시 요청하지 않는다.
    if (stored && sameInput(stored.profile, v.profile)) {
      router.push('/reading');
      return;
    }
    setSubmitting(true);
    const r = await api.createChart(v.input);
    // 세션이 있으면 서버에도 출생 정보를 저장한다. 요약 해석은 서버가 저장된 값으로 쓴다.
    // 저장하지 못하면 기기에도 두지 않는다(기기와 서버의 출생 정보가 달라지지 않게).
    const saved = r.ok && getSession().token ? await api.saveProfile(v.input) : null;
    setSubmitting(false);
    const failed = !r.ok ? r : saved && !saved.ok ? saved : null;
    if (!r.ok || failed) {
      const kind = failed?.error;
      setRequestError(kind === 'NETWORK' || kind === 'LIMIT' ? S.requestErrors[kind] : S.requestErrors.OTHER);
      return;
    }
    await save({ profile: v.profile, chart: r.data });
    router.push('/reading');
  }

  const timeError = !timeUnknown && errors.time ? S.errors.timeRequired : undefined;

  return (
    <View style={styles.form}>
      <View style={styles.fields}>
        <Field label={S.dateLabel} error={errors.date}>
          <FieldInput
            value={dateText}
            onChangeText={onDateText}
            placeholder={S.datePlaceholder}
            keyboardType="number-pad"
            maxLength={DATE_LENGTH}
            invalid={Boolean(errors.date)}
            accessibilityLabel={S.dateLabel}
          />
        </Field>
        <View style={styles.timeGroup}>
          <Field label={S.timeLabel} error={timeError}>
            <FieldSelect
              testID="time-field"
              value={timeUnknown ? S.timeUnknownValue : formatTimeDisplay(timeText) || undefined}
              placeholder={S.timePlaceholder}
              disabled={timeUnknown}
              open={sheet === 'time'}
              invalid={Boolean(timeError)}
              onPress={onOpenTime}
            />
          </Field>
          <Checkbox label={S.timeUnknown} checked={timeUnknown} onChange={onTimeUnknown} />
        </View>
        <Field label={S.placeLabel} error={errors.place}>
          <FieldSelect
            testID="place-field"
            value={place?.name}
            placeholder={S.placePlaceholder}
            invalid={Boolean(errors.place)}
            open={sheet === 'place'}
            onPress={() => setSheet('place')}
          />
        </Field>
      </View>
      <View style={styles.bottom}>
        {requestError ? (
          <Txt variant="table" color="danger">
            {requestError}
          </Txt>
        ) : null}
        <Button label={submitting ? S.submitting : S.submit} disabled={submitting} onPress={onSubmit} />
      </View>

      <Sheet visible={sheet === 'time'} onClose={() => setSheet(null)} title={S.timeSheetTitle}>
        <View style={styles.pickers}>
          <ScrollPicker
            testID="time-period"
            items={PERIODS}
            value={timeDraft.period}
            onChange={(period) => setTimeDraft((d) => ({ ...d, period }))}
          />
          <ScrollPicker
            testID="time-hour"
            loop
            items={HOURS}
            value={timeDraft.hour}
            onChange={(hour) => setTimeDraft((d) => ({ ...d, hour }))}
          />
          <Txt variant="picker">{strings.common.timeColon}</Txt>
          <ScrollPicker
            testID="time-minute"
            loop
            items={MINUTES}
            value={timeDraft.minute}
            onChange={(minute) => setTimeDraft((d) => ({ ...d, minute }))}
          />
        </View>
        <Button label={S.timeConfirm} onPress={onConfirmTime} />
      </Sheet>

      <PlacePicker
        visible={sheet === 'place'}
        places={places}
        failed={placesFailed}
        onRetry={loadPlaces}
        selectedId={place?.id}
        onPick={onPickPlace}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { flexGrow: 1, gap: Spacing.lg },
  fields: { gap: Spacing.lg },
  timeGroup: { gap: Spacing.xs },
  pickers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs },
  bottom: { marginTop: 'auto', gap: Spacing.sm },
});
