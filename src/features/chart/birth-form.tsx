import { router } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
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

/** 목록의 이름은 "시·도 시·군·구" 꼴이다. 앞 낱말이 시·도다(세종은 한 낱말뿐이다). */
const regionOf = (name: string) => name.split(' ')[0];
const districtOf = (name: string) => name.split(' ').slice(1).join(' ');
const LAST_STEP = S.steps.length - 1;

const sameInput = (a: BirthProfile, b: BirthProfile) =>
  a.date === b.date && a.time === b.time && a.place.id === b.place.id;

export type BirthFormProps = {
  /** 기기에 보관된 값. 있으면 입력 칸을 이 값으로 채운다 */
  stored: StoredBirth | null;
  save: (value: StoredBirth) => Promise<void>;
  /** 첫 질문 위에만 보여 주는 소개 */
  intro?: ReactNode;
};

/**
 * 출생 정보 입력. 한 화면에 하나씩 묻는다: 생년월일 → 태어난 시각("모름") → 태어난 곳.
 * 태어난 곳은 치지 않고 고른다: 시·도 → 그 안의 시·군·구.
 * 마지막에 누르면 차트를 받아 보관하고 /chart 로 간다.
 */
export function BirthForm({ stored, save, intro }: BirthFormProps) {
  const initial = stored?.profile;
  const [step, setStep] = useState(0);
  const [dateText, setDateText] = useState(initial?.date ?? '');
  const [timeText, setTimeText] = useState(initial?.time ?? '');
  const [timeUnknown, setTimeUnknown] = useState(initial ? initial.time === null : false);
  const [place, setPlace] = useState<BirthProfile['place'] | null>(initial?.place ?? null);
  const [region, setRegion] = useState<string | null>(initial ? regionOf(initial.place.name) : null);
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

  function onPickRegion(name: string) {
    const inRegion = (places ?? []).filter((p) => regionOf(p.name) === name);
    // 하위 시·군·구가 없는 곳(세종)은 바로 정해진다
    if (inRegion.length === 1 && inRegion[0].name === name) return onPickPlace(inRegion[0]);
    setRegion(name);
    setPlace(null);
  }

  function onPickPlace(p: Place) {
    setPlace({ id: p.id, name: p.name });
    setErrors((e) => ({ ...e, place: undefined }));
  }

  /** 지금 화면의 칸만 검사하고 다음 질문으로 간다 */
  function onNext() {
    if (step === 0) {
      const date = parseBirthDate(dateText, new Date());
      if (!date.ok) return setErrors({ date: date.error });
    } else if (!timeUnknown) {
      const time = parseBirthTime(timeText);
      if (!time.ok) return setErrors({ time: time.error });
    }
    setErrors({});
    setStep(step + 1);
  }

  async function onSubmit() {
    if (submitting) return;
    const v = validateBirthInput({ dateText, timeText, timeUnknown, place }, new Date());
    if (!v.ok) {
      setErrors(v.errors);
      // 앞 질문의 값이 틀렸으면 그 질문으로 돌아간다(오늘 날짜가 넘어간 경우 등)
      if (v.errors.date) setStep(0);
      else if (v.errors.time) setStep(1);
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

  const last = step === LAST_STEP;

  return (
    <View style={styles.form}>
      {step === 0 ? intro : null}
      <View style={styles.question}>
        <Txt variant="label" color="gray">
          {`${step + 1} / ${S.steps.length}`}
        </Txt>
        <Txt variant="title">{S.steps[step]}</Txt>
      </View>
      <View>
        {step === 0 ? (
          <Field first label={S.dateLabel} hint={S.dateHint} error={errors.date}>
            <FieldInput
              key="date"
              autoFocus
              value={dateText}
              onChangeText={(text) => {
                setDateText(formatDateTyping(text));
                setErrors((e) => ({ ...e, date: undefined }));
              }}
              onSubmitEditing={onNext}
              placeholder={S.datePlaceholder}
              keyboardType="number-pad"
              maxLength={10}
              accessibilityLabel={S.dateLabel}
            />
          </Field>
        ) : null}
        {step === 1 ? (
          <>
            <Field
              first
              label={S.timeLabel}
              hint={timeUnknown ? undefined : S.timeHint}
              error={timeUnknown ? undefined : errors.time}>
              {timeUnknown ? (
                <Txt variant="body" color="gray">
                  {S.timeUnknownValue}
                </Txt>
              ) : (
                <FieldInput
                  key="time"
                  autoFocus
                  value={timeText}
                  onChangeText={(text) => {
                    setTimeText(formatTimeTyping(text));
                    setErrors((e) => ({ ...e, time: undefined }));
                  }}
                  onSubmitEditing={onNext}
                  placeholder={S.timePlaceholder}
                  keyboardType="number-pad"
                  maxLength={5}
                  accessibilityLabel={S.timeLabel}
                />
              )}
            </Field>
            <View style={styles.check}>
              <Checkbox label={S.timeUnknown} checked={timeUnknown} onChange={setTimeUnknown} />
            </View>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Field first label={S.placeLabel} error={errors.place}>
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
            {places && region ? (
              <View style={styles.regionHead}>
                <Txt variant="label" color="gray">
                  {region}
                </Txt>
                <TextLink
                  label={S.regionBack}
                  onPress={() => {
                    setRegion(null);
                    setPlace(null);
                  }}
                />
              </View>
            ) : null}
            {places ? (
              <View style={styles.options}>
                {region
                  ? places
                      .filter((p) => regionOf(p.name) === region && districtOf(p.name))
                      .map((p) => (
                        <Option
                          key={p.id}
                          label={districtOf(p.name)}
                          selected={place?.id === p.id}
                          onPress={() => onPickPlace(p)}
                        />
                      ))
                  : [...new Set(places.map((p) => regionOf(p.name)))].map((name) => (
                      <Option
                        key={name}
                        label={name}
                        selected={place?.name === name}
                        onPress={() => onPickRegion(name)}
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
        {step > 0 ? <TextLink label={S.back} onPress={() => setStep(step - 1)} /> : null}
        {last ? (
          <Button label={submitting ? S.submitting : S.submit} disabled={submitting} onPress={onSubmit} />
        ) : (
          <Button label={S.next} onPress={onNext} />
        )}
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
  question: { gap: Spacing.xs, paddingTop: Spacing.lg },
  regionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, paddingTop: Spacing.sm },
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
    paddingTop: Spacing.sm,
  },
  bottom: { marginTop: 'auto', gap: Spacing.sm },
});
