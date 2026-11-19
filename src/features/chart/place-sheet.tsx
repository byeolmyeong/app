/**
 * 태어난 곳 고르기 시트(결정 042, 시안 보드 8-2 · 8-2-1 · 8-2-2). 맨 위 "동네 이름으로 찾기" 검색, 아래 시 · 도 칩 17개(3열) →
 * 누르면 그 시 · 군 · 구 목록(뒤로 가기, 고른 곳에 체크). 검색은 서버가 준 목록을 앱이 거르고, 같은 이름이 여럿이라
 * 시 · 도를 앞에 붙여 보여 준다. 결과 개수 줄은 두지 않는다. 지역 목록을 앱에 새로 넣지 않는다(서버 목록이 원본, 결정 006 정신).
 */
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions, type TextStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Sheet } from '@/components/sheet';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, Radius, Sizes, Spacing, StepLayout, Typography } from '@/constants/theme';
import { strings } from '@/content/strings';
import type { Place } from '@/lib/api';

const B = strings.birthSheet;
const H = strings.home;

/** 목록의 이름은 "시·도 시·군·구" 꼴이다. 앞 낱말이 시·도다(세종은 한 낱말뿐이다) */
const regionOf = (name: string) => name.split(' ')[0];
const districtOf = (name: string) => name.split(' ').slice(1).join(' ');
const shortRegion = (region: string) => H.regionShort[region] ?? region;

/** 칸과 검색 결과에 적는 이름: 짧은 시 · 도 + 시 · 군 · 구(예: "서울 강남구", "세종") */
export function placeLabel(name: string): string {
  return [shortRegion(regionOf(name)), districtOf(name)].filter(Boolean).join(' ');
}

/** 시 · 도 칩은 3열, 틈 8 */
const CHIP_COLUMNS = 3;
const CHIP_GAP = Spacing.xs;

/** 시 · 군 · 구 목록은 가나다순(완성형 한글은 글자 번호 순서가 곧 가나다순이라 기기 언어 설정과 상관없다) */
const byName = (a: Place, b: Place) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

export type PlaceSheetProps = {
  visible: boolean;
  /** 서버가 준 전체 목록. null 은 아직 받지 못함 */
  places: Place[] | null;
  /** 목록을 받지 못했다. 안내와 다시 불러오기를 보여 준다 */
  failed: boolean;
  onRetry: () => void;
  /** 지금 골라져 있는 곳 */
  selectedId?: number;
  onPick: (place: Place) => void;
  onClose: () => void;
};

export function PlaceSheet({ visible, places, failed, onRetry, selectedId, onPick, onClose }: PlaceSheetProps) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  /** 칩 줄의 폭. 재고 나서 3열로 나눈다 */
  const [chipsWidth, setChipsWidth] = useState(0);
  const { height } = useWindowDimensions();
  const chipWidth = chipsWidth > 0 ? (chipsWidth - CHIP_GAP * (CHIP_COLUMNS - 1)) / CHIP_COLUMNS : undefined;
  const all = places ?? [];
  const regions = [...new Set(all.map((p) => regionOf(p.name)))];
  const q = query.trim();
  const searching = q.length > 0;
  /** 시 · 군 · 구 이름으로 찾는다(세종처럼 한 낱말이면 시 · 도 이름으로) */
  const results = searching
    ? all.filter((p) => (districtOf(p.name) || `${regionOf(p.name)} ${shortRegion(regionOf(p.name))}`).includes(q))
    : [];
  const districts = region ? all.filter((p) => regionOf(p.name) === region).sort(byName) : [];
  const listing = searching || region !== null;

  function reset() {
    setQuery('');
    setRegion(null);
  }

  function close() {
    reset();
    onClose();
  }

  function pick(place: Place) {
    reset();
    onPick(place);
  }

  function pressRegion(name: string) {
    const inside = all.filter((p) => regionOf(p.name) === name);
    // 세종처럼 시 · 군 · 구가 없으면 바로 고른다
    if (inside.length === 1 && !districtOf(inside[0].name)) return pick(inside[0]);
    setRegion(name);
  }

  // 시 · 도일 때 시트의 위는 222, 목록 · 검색일 때 64(보드 8-2 · 8-2-1 · 8-2-2). 아래 여백 없이 목록의 흐림이 바닥에 닿는다
  const sheetHeight = height - (listing ? Sizes.placeSheetTop : Sizes.placeSheetTopRegions);

  return (
    <Sheet visible={visible} onClose={close} gap={0} height={sheetHeight} flush>
      <View testID="place-picker" style={styles.head}>
        {region && !searching ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.common.backLabel}
            onPress={() => setRegion(null)}
            style={styles.back}>
            <Svg width={Sizes.sheetBackIcon} height={Sizes.sheetBackIcon} viewBox="0 0 24 24" fill="none">
              <Path d="M15 5l-7 7 7 7" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        ) : null}
        <Txt variant="sheetTitle" accessibilityRole="header" style={styles.title}>
          {region && !searching ? shortRegion(region) : H.placeSheetTitle}
        </Txt>
      </View>

      <View style={[styles.search, focused && styles.searchFocused]}>
        <Svg width={Sizes.icon} height={Sizes.icon} viewBox="0 0 24 24" fill="none">
          <Circle cx={11} cy={11} r={6.5} stroke={Colors.hint} strokeWidth={2} />
          <Path d="M16 16l4 4" stroke={Colors.hint} strokeWidth={2} strokeLinecap="round" />
        </Svg>
        <TextInput
          accessibilityLabel={B.searchPlaceholder}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={B.searchPlaceholder}
          placeholderTextColor={Colors.hint}
          selectionColor={Colors.primary}
          cursorColor={Colors.primary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={[styles.searchInput, searching && styles.searchValue]}
        />
        {searching ? (
          <Pressable accessibilityRole="button" accessibilityLabel={B.clearSearch} hitSlop={Spacing.xs} onPress={() => setQuery('')} style={styles.clear}>
            <Svg width={Sizes.clearIcon} height={Sizes.clearIcon} viewBox="0 0 10 10" fill="none">
              <Path d="M2 2l6 6M8 2l-6 6" stroke={Colors.gray} strokeWidth={1.6} strokeLinecap="round" />
            </Svg>
          </Pressable>
        ) : null}
      </View>

      {!places && !failed ? (
        <Txt variant="table" color="hint" style={[styles.empty, styles.below]}>
          {B.loading}
        </Txt>
      ) : null}

      {failed ? (
        <View style={[styles.failed, styles.below]}>
          <Txt variant="table" color="gray">
            {H.placeLoadFailed}
          </Txt>
          <TextLink label={H.placeRetry} onPress={onRetry} />
        </View>
      ) : null}

      {!listing && places ? (
        // 작은 화면에서 칩이 시트 아래로 넘치면 굴린다
        <ScrollView style={styles.fill} showsVerticalScrollIndicator={false}>
          <Txt variant="captionStrong" color="gray" style={styles.regionsLabel}>
            {B.regions}
          </Txt>
          <View style={styles.chips} onLayout={(e) => setChipsWidth(e.nativeEvent.layout.width)}>
            {regions.map((name) => (
              <Pressable
                key={name}
                testID="place-region"
                accessibilityRole="button"
                onPress={() => pressRegion(name)}
                style={[styles.chip, { width: chipWidth ?? '30%' }]}>
                <Txt variant="item" style={styles.chipText}>
                  {shortRegion(name)}
                </Txt>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {listing && places ? (
        <View testID="place-list" style={styles.list}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {searching && results.length === 0 ? (
              <Txt variant="table" color="hint" style={styles.empty}>
                {B.noResult}
              </Txt>
            ) : null}
            {(searching ? results : districts).map((p) => {
              const on = p.id === selectedId;
              const district = districtOf(p.name);
              const label = searching ? placeLabel(p.name) : district;
              return (
                <Pressable
                  key={p.id}
                  testID="place-option"
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: on }}
                  onPress={() => pick(p)}
                  style={styles.row}>
                  {searching ? <Match name={p.name} query={q} /> : <Txt variant="input" style={on && styles.rowOn}>{district}</Txt>}
                  {on ? (
                    <Svg width={Sizes.icon} height={Sizes.icon} viewBox="0 0 24 24" fill="none">
                      <Path d="M5 12.5L10 17L19 7.5" stroke={Colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <View pointerEvents="none" style={styles.fade}>
            <Svg width="100%" height={Sizes.placeFade}>
              <Defs>
                <LinearGradient id="placeFade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={Colors.raised} stopOpacity={0} />
                  <Stop offset="1" stopColor={Colors.raised} stopOpacity={1} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height={Sizes.placeFade} fill="url(#placeFade)" />
            </Svg>
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

/** 검색 결과 한 줄: 시 · 도는 회색, 시 · 군 · 구에서 찾은 글자는 주색 계열로 굵게 */
function Match({ name, query }: { name: string; query: string }) {
  const district = districtOf(name);
  const region = shortRegion(regionOf(name));
  if (!district) return <Txt variant="input">{region}</Txt>;
  const at = district.indexOf(query);
  const parts =
    at < 0 ? [{ text: district, hit: false }] : [
      { text: district.slice(0, at), hit: false },
      { text: district.slice(at, at + query.length), hit: true },
      { text: district.slice(at + query.length), hit: false },
    ];
  return (
    <Txt variant="input">
      <Txt variant="input" color="gray">
        {`${region} `}
      </Txt>
      {parts
        .filter((part) => part.text)
        .map((part, i) => (
          <Txt key={i} variant="input" color={part.hit ? 'accentText' : 'ink'} style={part.hit && styles.hit}>
            {part.text}
          </Txt>
        ))}
    </Txt>
  );
}

// 웹 브라우저가 그리는 파란 포커스 테두리는 끈다. 포커스는 칸의 주색 테두리로 보여 준다.
// 커서는 주색 — 시트 뿌리의 숨긴 커서(caretColor: transparent)를 물려받으면 웹에서 커서가 안 보인다.
const noOutline = (Platform.OS === 'web' ? { outlineStyle: 'none', caretColor: Colors.primary } : {}) as TextStyle;

const styles = StyleSheet.create({
  head: { minHeight: Typography.sheetTitle.lineHeight, justifyContent: 'center' },
  back: {
    position: 'absolute',
    left: StepLayout.backInset,
    top: (Typography.sheetTitle.lineHeight - StepLayout.back) / 2,
    width: StepLayout.back,
    height: StepLayout.back,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  title: { textAlign: 'center' },
  search: {
    marginTop: Spacing.md,
    height: Sizes.searchHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + Spacing.hairline,
    paddingHorizontal: Spacing.sm + Spacing.hairline,
    borderRadius: Radius,
    backgroundColor: Colors.sheetFill,
    borderWidth: LineWidth,
    borderColor: Colors.sheetFill,
  },
  searchFocused: { borderColor: Colors.primary },
  searchInput: { flex: 1, ...Typography.item, color: Colors.ink, padding: 0, minWidth: 0, ...noOutline },
  /** 검색 칸 아래 안내(받는 중 · 받지 못함) */
  below: { marginTop: Spacing.lg },
  /** 목록: 검색 칸에서 8 아래부터 시트 바닥까지 */
  list: { flex: 1, marginTop: Spacing.xs },
  fill: { flex: 1 },
  searchValue: { fontWeight: FontWeight.medium },
  clear: {
    width: Sizes.icon,
    height: Sizes.icon,
    borderRadius: Sizes.icon / 2,
    backgroundColor: Colors.handle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failed: { gap: Spacing.xs },
  regionsLabel: { marginTop: Spacing.lg, marginBottom: Spacing.xs + Spacing.hairline },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: CHIP_GAP },
  chip: {
    height: Sizes.searchHeight,
    borderRadius: Radius,
    backgroundColor: Colors.sheetFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontWeight: FontWeight.medium },
  row: {
    // 보드는 줄 56 에 아래 선 1 을 더한다(57)
    minHeight: Sizes.placeRow + LineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: LineWidth,
    borderBottomColor: Colors.sheetFill,
  },
  rowOn: { fontWeight: FontWeight.semibold },
  hit: { fontWeight: FontWeight.semibold },
  empty: { paddingVertical: Spacing.lg, textAlign: 'center' },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: Sizes.placeFade },
});
