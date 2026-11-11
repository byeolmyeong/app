import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Field, FieldInput, FieldSelect } from '@/components/field';
import { ScrollPicker } from '@/components/scroll-picker';
import { Sheet } from '@/components/sheet';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { Colors, Radius, Sizes, Spacing } from '@/constants/theme';
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
 * 출생 정보 입력. 한 화면에 생년월일 · 태어난 시각("모름") · 태어난 곳이 모두 보인다.
 * 생년월일은 숫자를 치고, 시각과 곳은 칸을 누르면 아래에서 올라오는 시트에서 고른다
 * (시각: 오전/오후 · 시 · 분 드럼롤, 곳: 왼쪽 시·도 · 오른쪽 그 시·도의 시·군·구).
 * "내 하늘 보기" 를 누르면 차트를 받아 보관하고 /chart 로 간다.
 */
export function BirthForm({ stored, save }: BirthFormProps) {
  const initial = stored?.profile;
  const [dateText, setDateText] = useState(initial?.date ?? '');
  /** HH:mm. 아직 고르지 않았으면 빈 글자 */
  const [timeText, setTimeText] = useState(initial?.time ?? '');
  const [timeUnknown, setTimeUnknown] = useState(initial ? initial.time === null : false);
  const [place, setPlace] = useState<BirthProfile['place'] | null>(initial?.place ?? null);
  /** 곳 시트의 왼쪽에서 누른 시·도. 시트를 열 때마다 비운다 */
  const [region, setRegion] = useState<string | null>(null);
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
      router.push('/chart');
      return;
    }
    setSubmitting(true);
    const r = await api.createChart(v.input);
    setSubmitting(false);
    if (!r.ok) {
      setRequestError(r.error === 'NETWORK' || r.error === 'LIMIT' ? S.requestErrors[r.error] : S.requestErrors.OTHER);
      return;
    }
    await save({ profile: v.profile, chart: r.data });
    router.push('/chart');
  }

  const regions = places ? [...new Set(places.map((p) => regionOf(p.name)))] : [];
  /** 곳 시트의 왼쪽에서 골라져 있는 시·도. 아직 누르지 않았으면 고른 곳의 시·도, 그것도 없으면 첫 시·도 */
  const shownRegion = region ?? (place ? regionOf(place.name) : regions[0]);
  const districts = (places ?? []).filter((p) => regionOf(p.name) === shownRegion);
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
            onPress={() => {
              setRegion(null);
              setSheet('place');
            }}
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
            items={HOURS}
            value={timeDraft.hour}
            onChange={(hour) => setTimeDraft((d) => ({ ...d, hour }))}
          />
          <Txt variant="picker">{strings.common.timeColon}</Txt>
          <ScrollPicker
            testID="time-minute"
            items={MINUTES}
            value={timeDraft.minute}
            onChange={(minute) => setTimeDraft((d) => ({ ...d, minute }))}
          />
        </View>
        <Button label={S.timeConfirm} onPress={onConfirmTime} />
      </Sheet>

      <Sheet visible={sheet === 'place'} onClose={() => setSheet(null)} title={S.placeSheetTitle}>
        {placesFailed ? (
          <View style={styles.failed}>
            <Txt variant="table" color="gray">
              {S.placeLoadFailed}
            </Txt>
            <TextLink label={S.placeRetry} onPress={loadPlaces} />
          </View>
        ) : null}
        {places ? (
          <View style={styles.placePanes}>
            <ScrollView style={styles.regionPane} showsVerticalScrollIndicator={false}>
              {regions.map((name) => (
                <Pressable
                  key={name}
                  testID="place-region"
                  accessibilityRole="button"
                  accessibilityState={{ selected: name === shownRegion }}
                  onPress={() => setRegion(name)}
                  style={[styles.regionRow, name === shownRegion && styles.regionRowOn]}
                >
                  <Txt
                    variant="table"
                    color={name === shownRegion ? 'ink' : 'gray'}
                    style={name === shownRegion && styles.bold}
                  >
                    {S.regionShort[name] ?? name}
                  </Txt>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView style={styles.districtPane} showsVerticalScrollIndicator={false}>
              {districts.map((p) => (
                <Pressable
                  key={p.id}
                  testID="place-option"
                  accessibilityRole="button"
                  accessibilityState={{ selected: place?.id === p.id }}
                  onPress={() => onPickPlace(p)}
                  style={styles.districtRow}
                >
                  <Txt variant="body" style={place?.id === p.id && styles.bold}>
                    {districtOf(p.name) || p.name}
                  </Txt>
                  {place?.id === p.id ? (
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M5 12.5L10 17L19 7.5"
                        stroke={Colors.primary}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { flexGrow: 1, gap: Spacing.lg },
  fields: { gap: Spacing.lg },
  timeGroup: { gap: Spacing.xs },
  pickers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs },
  // 곳 시트: 높이가 고정된 두 칸. 왼쪽 시·도(회색 바탕), 오른쪽 시·군·구. 각자 굴린다.
  placePanes: { flexDirection: 'row', height: Sizes.placeSheetHeight, borderRadius: Radius, overflow: 'hidden' },
  regionPane: { flexGrow: 0, width: Sizes.regionPaneWidth, backgroundColor: Colors.fill },
  regionRow: { height: Sizes.listRow, justifyContent: 'center', paddingHorizontal: Spacing.md },
  regionRowOn: { backgroundColor: Colors.paper },
  districtPane: { flex: 1 },
  districtRow: {
    height: Sizes.listRow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  bold: { fontWeight: '600' },
  failed: { alignItems: 'center', gap: Spacing.xs },
  bottom: { marginTop: 'auto', gap: Spacing.sm },
});
