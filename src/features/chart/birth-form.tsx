import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Field, FieldInput } from "@/components/field";
import { Txt } from "@/components/txt";
import { Colors, LineWidth, Sizes, Spacing } from "@/constants/theme";
import { strings } from "@/content/strings";
import {
  validateBirthInput,
  type BirthFormErrors,
  type BirthProfile,
} from "@/features/chart/birth-input";
import type { StoredBirth } from "@/features/chart/use-birth-profile";
import { api, type Place } from "@/lib/api";

const S = strings.home;
const SEARCH_DELAY_MS = 300;

const sameInput = (a: BirthProfile, b: BirthProfile) =>
  a.date === b.date && a.time === b.time && a.place.id === b.place.id;

export type BirthFormProps = {
  /** 기기에 보관된 값. 있으면 입력 칸을 이 값으로 채운다 */
  stored: StoredBirth | null;
  save: (value: StoredBirth) => Promise<void>;
};

/** 출생 정보 입력: 날짜 · 시각("모름") · 출생지 검색. 누르면 차트를 받아 보관하고 /chart 로 간다. */
export function BirthForm({ stored, save }: BirthFormProps) {
  const initial = stored?.profile;
  const [dateText, setDateText] = useState(initial?.date ?? "");
  const [timeText, setTimeText] = useState(initial?.time ?? "");
  const [timeUnknown, setTimeUnknown] = useState(
    initial ? initial.time === null : false,
  );
  const [place, setPlace] = useState<BirthProfile["place"] | null>(
    initial?.place ?? null,
  );
  const [placeText, setPlaceText] = useState(initial?.place.name ?? "");
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

  async function onSubmit() {
    if (submitting) return;
    const v = validateBirthInput(
      { dateText, timeText, timeUnknown, place },
      new Date(),
    );
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    setRequestError(null);
    // 같은 입력의 차트를 이미 갖고 있으면 다시 요청하지 않는다.
    if (stored && sameInput(stored.profile, v.profile)) {
      router.push("/chart");
      return;
    }
    setSubmitting(true);
    const r = await api.createChart(v.input);
    setSubmitting(false);
    if (!r.ok) {
      setRequestError(
        r.error === "NETWORK" || r.error === "LIMIT"
          ? S.requestErrors[r.error]
          : S.requestErrors.OTHER,
      );
      return;
    }
    await save({ profile: v.profile, chart: r.data });
    router.push("/chart");
  }

  return (
    <View style={styles.form}>
      <View>
        <Field first label={S.dateLabel} error={errors.date}>
          <FieldInput
            value={dateText}
            onChangeText={(text) => {
              setDateText(text);
              setErrors((e) => ({ ...e, date: undefined }));
            }}
            placeholder={S.datePlaceholder}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel={S.dateLabel}
          />
        </Field>
        <Field
          label={S.timeLabel}
          hint={timeUnknown ? undefined : S.timeHint}
          error={timeUnknown ? undefined : errors.time}
        >
          {timeUnknown ? (
            <Txt variant="body" color="gray">
              {S.timeUnknownValue}
            </Txt>
          ) : (
            <FieldInput
              value={timeText}
              onChangeText={(text) => {
                setTimeText(text);
                setErrors((e) => ({ ...e, time: undefined }));
              }}
              placeholder={S.timePlaceholder}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel={S.timeLabel}
            />
          )}
        </Field>
        <Field label={S.placeLabel} hint={S.placeHint} error={errors.place}>
          <FieldInput
            value={placeText}
            onChangeText={onPlaceText}
            placeholder={S.placePlaceholder}
            autoCorrect={false}
            accessibilityLabel={S.placeLabel}
          />
        </Field>
        {results?.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            onPress={() => onPickPlace(p)}
            style={styles.result}
          >
            <Txt variant="table">{p.name}</Txt>
          </Pressable>
        ))}
        {results?.length === 0 || searchFailed ? (
          <Txt variant="table" color="gray" style={styles.note}>
            {searchFailed ? S.placeSearchFailed : S.placeEmpty}
          </Txt>
        ) : null}
        <View style={styles.check}>
          <Checkbox
            label={S.timeUnknown}
            checked={timeUnknown}
            onChange={setTimeUnknown}
          />
        </View>
      </View>
      <View style={styles.bottom}>
        {requestError ? (
          <Txt variant="table" color="danger">
            {requestError}
          </Txt>
        ) : null}
        <Button
          label={submitting ? S.submitting : S.submit}
          disabled={submitting}
          onPress={onSubmit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { flexGrow: 1, gap: Spacing.lg },
  result: {
    paddingVertical: Spacing.sm,
    paddingLeft: Sizes.fieldLabelWidth + Spacing.xs,
    borderBottomWidth: LineWidth,
    borderBottomColor: Colors.hair,
  },
  note: { paddingVertical: Spacing.sm },
  check: {
    paddingLeft: Sizes.fieldLabelWidth + Spacing.xs,
    paddingTop: Spacing.xxs,
  },
  bottom: { marginTop: "auto", gap: Spacing.sm },
});
