/**
 * 프로필 고르기 시트(결정 042, 시안 보드 7-4). 제목 · 이름 없이 그림만 4열 2줄, 아래 확인. 고른 그림은 주색 고리와 체크 표시.
 * 확인을 눌러야 정해진다(바깥을 누르거나 끌어내리면 고르지 않고 닫힌다). 그림 이름은 화면 읽기에만 있다.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AVATAR_IDS, Avatar, type AvatarId } from '@/components/avatar';
import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Colors, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

const N = strings.nickname;

export type AvatarSheetProps = {
  visible: boolean;
  /** 지금 고른 그림. 시트를 열 때 이 그림이 골라져 있다 */
  value: AvatarId;
  onConfirm: (id: AvatarId) => void;
  onClose: () => void;
};

export function AvatarSheet({ visible, value, onConfirm, onClose }: AvatarSheetProps) {
  const [picked, setPicked] = useState<AvatarId>(value);
  // 다시 열 때는 지금 고른 그림에서 시작한다
  const [openedWith, setOpenedWith] = useState<AvatarId | null>(null);
  if (visible && openedWith !== value) {
    setOpenedWith(value);
    setPicked(value);
  }
  if (!visible && openedWith !== null) setOpenedWith(null);

  return (
    <Sheet visible={visible} onClose={onClose} gap={Spacing.xl}>
      <View accessibilityRole="radiogroup" accessibilityLabel={N.avatarSheet} style={styles.grid}>
        {AVATAR_IDS.map((id) => {
          const on = id === picked;
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityLabel={N.avatars[id - 1]}
              accessibilityState={{ selected: on, checked: on }}
              onPress={() => setPicked(id)}
              style={styles.cell}>
              <View style={[styles.pick, on && styles.pickOn]}>
                <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                  <Avatar id={id} size={Sizes.avatarPick} />
                </View>
                {on ? (
                  <View style={styles.check}>
                    <Svg width={Sizes.avatarCheckIcon} height={Sizes.avatarCheckIcon} viewBox="0 0 24 24" fill="none">
                      <Path d="M5 12.5L10 17L19 7.5" stroke={Colors.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Button label={N.confirm} onPress={() => onConfirm(picked)} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // 손잡이(위 10 + 4)에서 28 아래부터 그림이 시작한다(시트의 위 여백 32 에 10 을 더한다)
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.lg, marginTop: Spacing.xs + Spacing.hairline },
  cell: { width: '25%', alignItems: 'center' },
  pick: { width: Sizes.avatarPick, height: Sizes.avatarPick, borderRadius: Sizes.avatarPick / 2 },
  pickOn: { boxShadow: `0 0 0 ${Sizes.avatarRing}px ${Colors.primary}` },
  check: {
    position: 'absolute',
    right: -Spacing.xxs,
    bottom: -Spacing.xxs,
    width: Sizes.avatarCheck,
    height: Sizes.avatarCheck,
    borderRadius: Sizes.avatarCheck / 2,
    backgroundColor: Colors.primary,
    borderWidth: Spacing.hairline,
    borderColor: Colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
