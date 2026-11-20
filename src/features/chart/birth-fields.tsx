import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { CheckBox } from '@/components/checkbox';
import { Field, FieldInput, FieldSelect } from '@/components/field';
import { Sheet } from '@/components/sheet';
import { TimeWheel } from '@/components/time-wheel';
import { Txt } from '@/components/txt';
import { Sizes, Spacing } from '@/constants/theme';
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
import { PlaceSheet, placeLabel } from '@/features/chart/place-sheet';
import { api, type Place } from '@/lib/api';

const S = strings.home;
/** 다 친 날짜(YYYY-MM-DD)의 글자 수. 다 쳤을 때 바로 검사한다 */
const DATE_LENGTH = 10;
/** 시각을 처음 고를 때 가운데에 놓이는 값 */
const DEFAULT_TIME: TimePick = { period: 'PM', hour: 12, minute: 0 };


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
  /** 서버가 거절한 이유(가입의 만 14세 미만). 날짜를 고치면 지워지고, 다 채웠는지에는 넣지 않는다(버튼은 켜진 채, 보드 8-4) */
  const [serverDateError, setServerDateError] = useState<string | null>(null);

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
    setServerDateError(null);
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

  /** 서버가 거절한 이유를 생년월일 칸 아래에 띄운다(가입의 만 14세 미만, 보드 8-4). 날짜를 고치면 지워진다 */
  function setDateError(message: string) {
    setServerDateError(message);
  }

  /** 다 채웠는가(가입 단계의 버튼을 켤 때): 날짜를 다 쳤고 틀리지 않았으며, 시각을 골랐거나 "모름", 시각이 있으면 곳도 */
  const complete =
    dateText.length === DATE_LENGTH && !errors.date && (timeUnknown || timeText !== '') && (timeUnknown || place !== null);

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
    serverDateError,
    setSheet,
    setTimeDraft,
    loadPlaces,
    onDateText,
    onOpenTime,
    onConfirmTime,
    onTimeUnknown,
    onPickPlace,
    validate,
    setDateError,
    complete,
  };
}

export type BirthFieldsControl = ReturnType<typeof useBirthFields>;

/**
 * 출생 정보 세 칸(결정 042 시안 보드 8). 한 화면에 생년월일 · 태어난 시각 · 태어난 곳이 모두 보인다.
 * 시각 "모름" 은 시각 칸 이름 줄 오른쪽의 작은 체크다. 켜면 시각 칸이 흐려지고 안내가 붙는다. 태어난 곳 칸은 그대로 받는다.
 * 생년월일은 숫자를 치고, 시각은 칸을 누르면 아래에서 올라오는 드럼롤 시트에서(오전/오후 · 시 · 분, 같은 폭),
 * 곳은 아래에서 올라오는 시트(`PlaceSheet` — 검색 · 시 · 도 칩 → 시 · 군 · 구)에서 고른다.
 */
export function BirthFields({ control: c }: { control: BirthFieldsControl }) {
  const timeError = !c.timeUnknown && c.errors.time ? S.errors.timeRequired : undefined;
  return (
    <>
      <View style={styles.fields}>
        <Field label={S.dateLabel} error={c.errors.date ?? c.serverDateError ?? undefined}>
          <FieldInput
            value={c.dateText}
            onChangeText={c.onDateText}
            placeholder={S.datePlaceholder}
            keyboardType="number-pad"
            maxLength={DATE_LENGTH}
            invalid={Boolean(c.errors.date ?? c.serverDateError)}
            accessibilityLabel={S.dateLabel}
          />
        </Field>
        <Field
          label={S.timeLabel}
          labelRight={
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={S.timeUnknown}
              accessibilityState={{ checked: c.timeUnknown }}
              hitSlop={Spacing.xs}
              onPress={() => c.onTimeUnknown(!c.timeUnknown)}
              style={styles.unknown}>
              <CheckBox checked={c.timeUnknown} size={Sizes.checkSmall} />
              <Txt variant="captionStrong" color={c.timeUnknown ? 'ink' : 'gray'}>
                {S.timeUnknownValue}
              </Txt>
            </Pressable>
          }
          hint={c.timeUnknown ? S.timeUnknownNote : undefined}
          error={timeError}>
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
        <Field label={S.placeLabel} error={c.errors.place}>
          <FieldSelect
            testID="place-field"
            value={(c.place && placeLabel(c.place.name)) || undefined}
            placeholder={S.placePlaceholder}
            invalid={Boolean(c.errors.place)}
            open={c.sheet === 'place'}
            onPress={() => c.setSheet('place')}
          />
        </Field>
      </View>

      <Sheet visible={c.sheet === 'time'} onClose={() => c.setSheet(null)}>
        <View testID="time-body" style={styles.timeBody}>
          <TimeWheel value={c.timeDraft} onChange={c.setTimeDraft} />
          <Button label={S.timeConfirm} onPress={c.onConfirmTime} />
        </View>
      </Sheet>

      <PlaceSheet
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
  unknown: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs + Spacing.hairline },
  /** 제목 없는 시트(결정 056 의 9 · 061 의 6): 시트 위 여백(32)에 더해, 시트 위 끝에서 드럼까지 시안 8-1 의 58 */
  timeBody: { gap: Spacing.md + Spacing.xxs, marginTop: Sizes.pickerSheetTop - Spacing.xl },
});
