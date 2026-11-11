import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Field, FieldInput } from '@/components/field';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { Colors, LineWidth, Radius, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import {
  formatDateTyping,
  formatTimeTyping,
  parseBirthDate,
  parseBirthTime,
  validateBirthInput,
  type BirthFormErrors,
  type BirthProfile,
} from '@/features/chart/birth-input';
import type { StoredBirth } from '@/features/chart/use-birth-profile';
import { api, type Place } from '@/lib/api';

const S = strings.home;
/** 다 친 날짜(YYYY-MM-DD)와 시각(HH:mm)의 글자 수. 다 쳤을 때 바로 검사한다 */
const DATE_LENGTH = 10;
const TIME_LENGTH = 5;

/** 목록의 이름은 "시·도 시·군·구" 꼴이다. 앞 낱말이 시·도다(세종은 한 낱말뿐이다). */
const regionOf = (name: string) => name.split(' ')[0];
const districtOf = (name: string) => name.split(' ').slice(1).join(' ');

const sameInput = (a: BirthProfile, b: BirthProfile) =>
  a.date === b.date && a.time === b.time && a.place.id === b.place.id;

export type BirthFormProps = {
  /** 기기에 보관된 값. 있으면 입력 칸을 이 값으로 채운다 */
  stored: StoredBirth | null;
  save: (value: StoredBirth) => Promise<void>;
};

/**
 * 출생 정보 입력. 한 화면에서 차례로 펼친다: 생년월일 → 태어난 시각("모름") → 시·도 → 시·군·구.
 * 앞 칸을 맞게 채우면 다음 칸이 아래에 나타나고, 한 번 나타난 칸은 앞 칸을 고쳐도 사라지지 않는다.
 * 태어난 곳은 치지 않고 고른다. 누르면 차트를 받아 보관하고 /chart 로 간다.
 */
export function BirthForm({ stored, save }: BirthFormProps) {
  const initial = stored?.profile;
  const [dateText, setDateText] = useState(initial?.date ?? '');
  const [timeText, setTimeText] = useState(initial?.time ?? '');
  const [timeUnknown, setTimeUnknown] = useState(initial ? initial.time === null : false);
  const [place, setPlace] = useState<BirthProfile['place'] | null>(initial?.place ?? null);
  const [region, setRegion] = useState<string | null>(initial ? regionOf(initial.place.name) : null);
  /** 어디까지 펼쳤는가 */
  const [showTime, setShowTime] = useState(Boolean(initial));
  const [showPlace, setShowPlace] = useState(Boolean(initial));
  /** 서버가 준 전체 목록. null 은 아직 받지 못함 */
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [placesFailed, setPlacesFailed] = useState(false);
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
    if (date?.ok) setShowTime(true);
  }

  function onTimeText(text: string) {
    const value = formatTimeTyping(text);
    setTimeText(value);
    const time = value.length === TIME_LENGTH ? parseBirthTime(value) : null;
    setErrors((e) => ({ ...e, time: time && !time.ok ? time.error : undefined }));
    if (time?.ok) setShowPlace(true);
  }

  function onTimeUnknown(checked: boolean) {
    setTimeUnknown(checked);
    if (checked) setShowPlace(true);
  }

  function onPickRegion(name: string) {
    setRegion(name);
    const inRegion = (places ?? []).filter((p) => regionOf(p.name) === name);
    // 하위 시·군·구가 없는 곳(세종)은 바로 정해진다
    if (inRegion.length === 1 && inRegion[0].name === name) return onPickPlace(inRegion[0]);
    setPlace(null);
  }

  function onPickPlace(p: Place) {
    setPlace({ id: p.id, name: p.name });
    setErrors((e) => ({ ...e, place: undefined }));
  }

  async function onSubmit() {
    if (submitting) return;
    const v = validateBirthInput({ dateText, timeText, timeUnknown, place }, new Date());
    if (!v.ok) {
      // 아직 펼치지 않은 칸의 오류는 보여 주지 않는다
      setErrors({
        date: v.errors.date,
        time: showTime ? v.errors.time : undefined,
        place: showPlace ? v.errors.place : undefined,
      });
      return;
    }
    setErrors({});
    setRequestError(null);
    // 같은 입력의 차트를 이미 갖고 있으면 다시 요청하지 않는다.
    if (stored && sameInput(stored.profile, v.profile)) {
      router.push('/chart');
      return;
    }
    setSubmitting(true);
    const r = await api.createChart(v.input);
    setSubmitting(false);
    if (!r.ok) {
      setRequestError(
        r.error === 'NETWORK' || r.error === 'LIMIT' ? S.requestErrors[r.error] : S.requestErrors.OTHER,
      );
      return;
    }
    await save({ profile: v.profile, chart: r.data });
    router.push('/chart');
  }

  const districts = places && region ? places.filter((p) => regionOf(p.name) === region && districtOf(p.name)) : [];

  return (
    <View style={styles.form}>
      <View>
        <Field first label={S.dateLabel} hint={S.dateHint} error={errors.date}>
          <FieldInput
            value={dateText}
            onChangeText={onDateText}
            placeholder={S.datePlaceholder}
            keyboardType="number-pad"
            maxLength={DATE_LENGTH}
            accessibilityLabel={S.dateLabel}
          />
        </Field>
        {showTime ? (
          <>
            <Field
              label={S.timeLabel}
              hint={timeUnknown ? undefined : S.timeHint}
              error={timeUnknown ? undefined : errors.time}>
              {timeUnknown ? (
                <Txt variant="body" color="gray">
                  {S.timeUnknownValue}
                </Txt>
              ) : (
                <FieldInput
                  autoFocus={!initial}
                  value={timeText}
                  onChangeText={onTimeText}
                  placeholder={S.timePlaceholder}
                  keyboardType="number-pad"
                  maxLength={TIME_LENGTH}
                  accessibilityLabel={S.timeLabel}
                />
              )}
            </Field>
            <View style={styles.check}>
              <Checkbox label={S.timeUnknown} checked={timeUnknown} onChange={onTimeUnknown} />
            </View>
          </>
        ) : null}
        {showPlace ? (
          <>
            <Field label={S.placeLabel} error={errors.place}>
              <Txt variant="body" color={place ? 'ink' : 'gray'}>
                {place ? place.name : S.placePlaceholder}
              </Txt>
            </Field>
            {placesFailed ? (
              <View style={styles.note}>
                <Txt variant="table" color="gray">
                  {S.placeLoadFailed}
                </Txt>
                <TextLink label={S.placeRetry} onPress={loadPlaces} />
              </View>
            ) : null}
            {places ? (
              <View style={styles.options}>
                {[...new Set(places.map((p) => regionOf(p.name)))].map((name) => (
                  <Option key={name} label={name} selected={region === name} onPress={() => onPickRegion(name)} />
                ))}
              </View>
            ) : null}
            {districts.length > 0 ? (
              <View style={[styles.options, styles.districts]}>
                {districts.map((p) => (
                  <Option
                    key={p.id}
                    label={districtOf(p.name)}
                    selected={place?.id === p.id}
                    onPress={() => onPickPlace(p)}
                  />
                ))}
              </View>
            ) : null}
            <Txt variant="label" color="gray" style={styles.note}>
              {S.placeNote}
            </Txt>
          </>
        ) : null}
      </View>
      <View style={styles.bottom}>
        {requestError ? (
          <Txt variant="table" color="danger">
            {requestError}
          </Txt>
        ) : null}
        <Button label={submitting ? S.submitting : S.submit} disabled={submitting} onPress={onSubmit} />
      </View>
    </View>
  );
}

/** 고르는 칸 하나. 고른 것은 먹색으로 채운다. */
function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      testID="place-option"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}>
      <Txt variant="table" color={selected ? 'paper' : 'ink'}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: { flexGrow: 1, gap: Spacing.lg },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, paddingTop: Spacing.sm },
  /** 시·도 아래에 펼쳐지는 시·군·구. 옅은 선으로 나눈다 */
  districts: {
    marginTop: Spacing.sm,
    borderTopWidth: LineWidth,
    borderTopColor: Colors.hair,
  },
  option: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    borderRadius: Radius,
  },
  optionSelected: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  note: { paddingTop: Spacing.sm, gap: Spacing.xs },
  check: {
    paddingLeft: Sizes.fieldLabelWidth + Spacing.xs,
    paddingVertical: Spacing.sm,
    borderBottomWidth: LineWidth,
    borderBottomColor: Colors.hair,
  },
  bottom: { marginTop: 'auto', gap: Spacing.sm },
});
