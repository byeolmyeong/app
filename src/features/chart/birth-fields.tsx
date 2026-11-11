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

/**
 * 출생 정보 세 칸(생년월일 · 태어난 시각 · 태어난 곳)의 값과 검사. 내 출생 정보 입력과 궁합의 상대 입력이 함께 쓴다.
 * 값은 이 훅을 부른 화면의 메모리에만 있다. 보내거나 보관하는 것은 부른 쪽이 정한다.
 */
export function useBirthFields(initial?: BirthProfile | null) {
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
    setErrors((e) => ({ ...e, time: undefined, place: undefined }));
  }

  function onPickPlace(p: Place) {
    setPlace({ id: p.id, name: p.name });
    setErrors((e) => ({ ...e, place: undefined }));
    setSheet(null);
  }

  /** 세 칸을 검사한다. 틀린 칸이 있으면 칸 아래에 오류를 띄우고 null 을 돌려준다 */
  function validate() {
    const v = validateBirthInput({ dateText, timeText, timeUnknown, place }, new Date());
    setErrors(v.ok ? {} : v.errors);
    return v.ok ? v : null;
  }

  return {
    dateText,
    timeText,
    timeUnknown,
    place,
    places,
    placesFailed,
    sheet,
    timeDraft,
    errors,
    setSheet,
    setTimeDraft,
    loadPlaces,
    onDateText,
    onOpenTime,
    onConfirmTime,
    onTimeUnknown,
    onPickPlace,
    validate,
  };
}

export type BirthFieldsControl = ReturnType<typeof useBirthFields>;

/**
 * 출생 정보 세 칸. 한 화면에 생년월일 · 태어난 시각("모름") · 태어난 곳이 모두 보인다.
 * 시각 "모름" 을 고르면 태어난 곳 칸은 사라지고 묻지 않는다(계산에 쓰이지 않는다. 결정 020).
 * 생년월일은 숫자를 치고, 시각은 칸을 누르면 아래에서 올라오는 드럼롤 시트에서,
 * 곳은 화면을 가득 채우는 고르기 화면(`PlacePicker`)에서 고른다.
 */
export function BirthFields({ control: c }: { control: BirthFieldsControl }) {
  const timeError = !c.timeUnknown && c.errors.time ? S.errors.timeRequired : undefined;
  return (
    <>
      <View style={styles.fields}>
        <Field label={S.dateLabel} error={c.errors.date}>
          <FieldInput
            value={c.dateText}
            onChangeText={c.onDateText}
            placeholder={S.datePlaceholder}
            keyboardType="number-pad"
            maxLength={DATE_LENGTH}
            invalid={Boolean(c.errors.date)}
            accessibilityLabel={S.dateLabel}
          />
        </Field>
        <View style={styles.timeGroup}>
          <Field label={S.timeLabel} error={timeError}>
            <FieldSelect
              testID="time-field"
              value={c.timeUnknown ? S.timeUnknownValue : formatTimeDisplay(c.timeText) || undefined}
              placeholder={S.timePlaceholder}
              disabled={c.timeUnknown}
              open={c.sheet === 'time'}
              invalid={Boolean(timeError)}
              onPress={c.onOpenTime}
            />
          </Field>
          <Checkbox label={S.timeUnknown} checked={c.timeUnknown} onChange={c.onTimeUnknown} />
        </View>
        {c.timeUnknown ? null : (
          <Field label={S.placeLabel} error={c.errors.place}>
            <FieldSelect
              testID="place-field"
              value={c.place?.name}
              placeholder={S.placePlaceholder}
              invalid={Boolean(c.errors.place)}
              open={c.sheet === 'place'}
              onPress={() => c.setSheet('place')}
            />
          </Field>
        )}
      </View>

      <Sheet visible={c.sheet === 'time'} onClose={() => c.setSheet(null)} title={S.timeSheetTitle}>
        <View style={styles.pickers}>
          <ScrollPicker
            testID="time-period"
            items={PERIODS}
            value={c.timeDraft.period}
            onChange={(period) => c.setTimeDraft((d) => ({ ...d, period }))}
          />
          <ScrollPicker
            testID="time-hour"
            loop
            items={HOURS}
            value={c.timeDraft.hour}
            onChange={(hour) => c.setTimeDraft((d) => ({ ...d, hour }))}
          />
          <Txt variant="picker">{strings.common.timeColon}</Txt>
          <ScrollPicker
            testID="time-minute"
            loop
            items={MINUTES}
            value={c.timeDraft.minute}
            onChange={(minute) => c.setTimeDraft((d) => ({ ...d, minute }))}
          />
        </View>
        <Button label={S.timeConfirm} onPress={c.onConfirmTime} />
      </Sheet>

      <PlacePicker
        visible={c.sheet === 'place'}
        places={c.places}
        failed={c.placesFailed}
        onRetry={c.loadPlaces}
        selectedId={c.place?.id}
        onPick={c.onPickPlace}
        onClose={() => c.setSheet(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fields: { gap: Spacing.lg },
  timeGroup: { gap: Spacing.xs },
  pickers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs },
});
