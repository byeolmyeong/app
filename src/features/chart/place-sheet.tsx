/**
 * 태어난 곳 고르기 시트(결정 041, 시안 보드 8-2 · 8-2-1 · 8-2-2). 맨 위 "동네 이름으로 찾기" 검색, 아래 시 · 도 칩 17개(3열) →
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

/** 시트의 위아래 여백 · 제목 줄 · 검색 칸을 뺀 목록의 높이(목록일 때 시트는 화면 위 64 까지 올라온다) */
const LIST_CHROME = Spacing.xl + Sizes.navHeight + Spacing.md + Sizes.searchHeight + Sizes.stepBottom + Spacing.xs;

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
  const districts = region ? all.filter((p) => regionOf(p.name) === region) : [];
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

  const listHeight = Math.max(Sizes.placeRow * 3, height - Sizes.placeSheetTop - LIST_CHROME);

  return (
    <Sheet visible={visible} onClose={close} gap={Spacing.md}>
      <View testID="place-picker" style={styles.head}>
        {region && !searching ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.common.backLabel}
            onPress={() => setRegion(null)}
            style={styles.back}>
            <Svg width={StepLayout.backIcon - 2} height={StepLayout.backIcon - 2} viewBox="0 0 24 24" fill="none">
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

      {failed ? (
        <View style={styles.failed}>
          <Txt variant="table" color="gray">
            {H.placeLoadFailed}
          </Txt>
          <TextLink label={H.placeRetry} onPress={onRetry} />
        </View>
      ) : null}

      {!listing && places ? (
        <View>
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
        </View>
      ) : null}

      {listing ? (
        <View style={{ height: listHeight }}>
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
const noOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

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
  regionsLabel: { marginTop: Spacing.xs, marginBottom: Spacing.xs + Spacing.hairline },
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
    minHeight: Sizes.placeRow,
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
