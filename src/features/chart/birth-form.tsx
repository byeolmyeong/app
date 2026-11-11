import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Field, FieldInput } from '@/components/field';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { Colors, LineWidth, Sizes, Spacing } from '@/constants/theme';
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
const SEARCH_DELAY_MS = 300;
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
 * 출생 정보 입력. 한 화면에 하나씩 묻는다: 생년월일 → 태어난 시각("모름") → 태어난 곳 검색.
 * 마지막에 누르면 차트를 받아 보관하고 /chart 로 간다.
 */
export function BirthForm({ stored, save, intro }: BirthFormProps) {
  const initial = stored?.profile;
  const [step, setStep] = useState(0);
  const [dateText, setDateText] = useState(initial?.date ?? '');
  const [timeText, setTimeText] = useState(initial?.time ?? '');
  const [timeUnknown, setTimeUnknown] = useState(initial ? initial.time === null : false);
  const [place, setPlace] = useState<BirthProfile['place'] | null>(initial?.place ?? null);
  const [placeText, setPlaceText] = useState(initial?.place.name ?? '');
  const [results, setResults] = useState<Place[] | null>(null);
  const [searchFailed, setSearchFailed] = useState(false);
  const [errors, setErrors] = useState<BirthFormErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const searchSeq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function onPlaceText(text: string) {
    setPlaceText(text);
    setPlace(null);
    if (timer.current) clearTimeout(timer.current);
    const seq = ++searchSeq.current;
    const q = text.trim();
    if (!q) {
      setResults(null);
      setSearchFailed(false);
      return;
    }
    // 글자마다 부르지 않고, 늦게 온 앞선 검색의 답은 버린다.
    timer.current = setTimeout(async () => {
      const r = await api.searchPlaces(q);
      if (seq !== searchSeq.current) return;
      setResults(r.ok ? r.data : null);
      setSearchFailed(!r.ok);
    }, SEARCH_DELAY_MS);
  }

  function onPickPlace(p: Place) {
    searchSeq.current++;
    setPlace({ id: p.id, name: p.name });
    setPlaceText(p.name);
    setResults(null);
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
            <Field first label={S.placeLabel} hint={S.placeHint} error={errors.place}>
              <FieldInput
                key="place"
                autoFocus
                value={placeText}
                onChangeText={onPlaceText}
                placeholder={S.placePlaceholder}
                autoCorrect={false}
                accessibilityLabel={S.placeLabel}
              />
            </Field>
            {results?.map((p) => (
              <Pressable key={p.id} accessibilityRole="button" onPress={() => onPickPlace(p)} style={styles.result}>
                <Txt variant="table">{p.name}</Txt>
              </Pressable>
            ))}
            {results?.length === 0 || searchFailed ? (
              <Txt variant="table" color="gray" style={styles.note}>
                {searchFailed ? S.placeSearchFailed : S.placeEmpty}
              </Txt>
            ) : null}
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

const styles = StyleSheet.create({
  form: { flexGrow: 1, gap: Spacing.lg },
  question: { gap: Spacing.xs, paddingTop: Spacing.lg },
  result: {
    paddingVertical: Spacing.sm,
    paddingLeft: Sizes.fieldLabelWidth + Spacing.xs,
    borderBottomWidth: LineWidth,
    borderBottomColor: Colors.hair,
  },
  note: { paddingVertical: Spacing.sm },
  check: {
    paddingLeft: Sizes.fieldLabelWidth + Spacing.xs,
    paddingTop: Spacing.sm,
  },
  bottom: { marginTop: 'auto', gap: Spacing.sm },
});
