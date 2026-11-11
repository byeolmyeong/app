import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { NavBar } from '@/components/nav-bar';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { Colors, LineWidth, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import type { Place } from '@/lib/api';

const S = strings.home;

/** 목록의 이름은 "시·도 시·군·구" 꼴이다. 앞 낱말이 시·도다(세종은 한 낱말뿐이다). */
const regionOf = (name: string) => name.split(' ')[0];
const districtOf = (name: string) => name.split(' ').slice(1).join(' ');

export type PlacePickerProps = {
  visible: boolean;
  /** 서버가 준 전체 목록. null 은 아직 받지 못함 */
  places: Place[] | null;
  /** 목록을 받지 못했다. 안내와 다시 불러오기를 보여 준다 */
  failed: boolean;
  onRetry: () => void;
  /** 지금 골라져 있는 곳 */
  selectedId?: number;
  onPick: (place: Place) => void;
  /** 고르지 않고 뒤로 간다 */
  onClose: () => void;
};

/**
 * 태어난 곳 고르기. 화면을 가득 채운다. 왼쪽에서 시·도를 누르면 오른쪽에 그 시·도의 시·군·구가 나오고,
 * 오른쪽 줄을 누르면 정해지고 닫힌다. 치는 칸은 없다.
 */
export function PlacePicker({ visible, places, failed, onRetry, selectedId, onPick, onClose }: PlacePickerProps) {
  const regions = places ? [...new Set(places.map((p) => regionOf(p.name)))] : [];
  const selected = places?.find((p) => p.id === selectedId);
  /** 왼쪽에서 누른 시·도. 누르기 전에는 고른 곳의 시·도, 그것도 없으면 첫 시·도 */
  const [pressed, setPressed] = useState<string | null>(null);
  const region = pressed ?? (selected ? regionOf(selected.name) : regions[0]);
  const districts = (places ?? []).filter((p) => regionOf(p.name) === region);
  const regionList = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const regionIndex = Math.max(0, regions.indexOf(region));

  // 열릴 때 고른 곳의 시·도가 왼쪽 목록에서 보이게 한다.
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(
      () => regionList.current?.scrollTo({ y: Math.max(0, regionIndex - 2) * Sizes.listRow, animated: false }),
      0,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 열릴 때 한 번만 맞춘다
  }, [visible]);

  function close() {
    setPressed(null);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={styles.root}>
        <SafeAreaView testID="place-picker" style={styles.column}>
          <NavBar title={S.placeSheetTitle} onBack={close} />
          {failed ? (
            <View style={styles.failed}>
              <Txt variant="table" color="gray">
                {S.placeLoadFailed}
              </Txt>
              <TextLink label={S.placeRetry} onPress={onRetry} />
            </View>
          ) : null}
          {places ? (
            <View style={styles.panes}>
              <ScrollView ref={regionList} style={styles.regionPane} showsVerticalScrollIndicator={false}>
                {regions.map((name) => {
                  const on = name === region;
                  return (
                    <Pressable
                      key={name}
                      testID="place-region"
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => setPressed(name)}
                      style={[styles.regionRow, on && styles.regionRowOn]}
                    >
                      <Txt variant="body" color={on ? 'ink' : 'gray'} style={on && styles.bold}>
                        {S.regionShort[name] ?? name}
                      </Txt>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <ScrollView style={styles.districtPane} showsVerticalScrollIndicator={false}>
                {districts.map((p) => {
                  const on = p.id === selectedId;
                  return (
                    <Pressable
                      key={p.id}
                      testID="place-option"
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => {
                        setPressed(null);
                        onPick(p);
                      }}
                      style={styles.districtRow}
                    >
                      <Txt variant="body" style={on && styles.bold}>
                        {districtOf(p.name) || p.name}
                      </Txt>
                      {on ? (
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
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', backgroundColor: Colors.canvas },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: Sizes.maxContentWidth,
    backgroundColor: Colors.paper,
    borderLeftWidth: LineWidth,
    borderRightWidth: LineWidth,
    borderColor: Colors.hair,
  },
  failed: { alignItems: 'center', gap: Spacing.xs, padding: Spacing.lg },
  // 화면 높이를 다 쓰는 두 칸. 왼쪽 시·도(회색 바탕), 오른쪽 시·군·구. 각자 굴린다.
  panes: { flex: 1, flexDirection: 'row', borderTopWidth: LineWidth, borderTopColor: Colors.hair },
  regionPane: { flexGrow: 0, width: Sizes.regionPaneWidth, backgroundColor: Colors.fill },
  regionRow: { height: Sizes.listRow, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  regionRowOn: { backgroundColor: Colors.paper },
  districtPane: { flex: 1 },
  districtRow: {
    height: Sizes.listRow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: LineWidth,
    borderBottomColor: Colors.fill,
  },
  bold: { fontWeight: '600' },
});
