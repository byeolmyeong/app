import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Avatar, isAvatarId } from '@/components/avatar';
import { Button } from '@/components/button';
import { GlowBackdrop } from '@/components/glow';
import { Skeleton, SkeletonText } from '@/components/skeleton';
import { Txt } from '@/components/txt';
import { BrandColors, Colors, FontWeight, LineWidth, MeLayout as L, Sizes } from '@/constants/theme';
import { strings } from '@/content/strings';
import { AreaArt } from '@/features/me/area-art';
import { ME_AREAS, type MeArea } from '@/lib/api';

const S = strings.me;
const C = L.card;
const D = L.detail;
const K = L.skeleton;

/**
 * 받은 뒤 맨 위 카드(보드 12-8): 프로필 그림 · "○○ 님의 별명" · 한 줄 별명(한 줄로 자름) · 꺾쇠 › → 내 별명.
 * 오른쪽의 "풀이 읽기" 글자는 빼고 꺾쇠만 카드 오른쪽 세로 가운데에 둔다 — 화면 읽기 이름에는 남긴다(소유자, 빌드 11 · 결정 078 정정 — 홈 카드는 그대로).
 */
export function MeNicknameCard({
  nickname,
  avatar,
  headline,
  onOpen,
}: {
  nickname: string | null;
  avatar: number | null;
  headline: string | null;
  onOpen: () => void;
}) {
  return (
    <Pressable
      testID="me-nickname-card"
      accessibilityRole="button"
      accessibilityLabel={[nickname ? `${nickname}${S.card.suffix}` : S.card.fallback, headline, S.card.read].filter(Boolean).join(S.card.labelSeparator)}
      onPress={onOpen}
      style={styles.card}>
      {isAvatarId(avatar) ? <Avatar id={avatar} size={C.avatar} /> : null}
      <View style={styles.cardText}>
        <Txt variant="label" color="accentText">
          {nickname ? `${nickname}${S.card.suffix}` : S.card.fallback}
        </Txt>
        {headline ? (
          <Txt variant="clause" numberOfLines={1}>
            {headline}
          </Txt>
        ) : null}
      </View>
      <Svg testID="me-nickname-card-chevron" width={C.chevron} height={C.chevron} viewBox="0 0 24 24" fill="none">
        <Path d="M9 6l6 6-6 6" stroke={Colors.hint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

/** 칩 다섯(보드 12-8): 고른 칩은 밝은 바탕에 어두운 글씨, 나머지는 떠 있는 면 · 옅은 테두리 */
export function AreaChips({ value, onChange }: { value: MeArea; onChange: (area: MeArea) => void }) {
  return (
    <View testID="me-chips" accessibilityRole="tablist" accessibilityLabel={S.chipsLabel} style={styles.chips}>
      {ME_AREAS.map((area) => {
        const on = area === value;
        return (
          <Pressable
            key={area}
            testID={`me-chip-${area}`}
            accessibilityRole="tab"
            accessibilityLabel={S.areas[area]}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(area)}
            style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
            <Txt variant="desc" color={on ? 'paper' : 'gray'} style={on ? styles.semibold : styles.medium}>
              {S.areas[area]}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * 받기 전 맨 아래 "자세한 풀이" 카드(보드 12 받기 전): 이름표 · 제목 · 설명 · 칩 다섯 그림 · "자세한 풀이 받기".
 * 서버가 지금은 받을 수 없다고 하면(402, 1.1.0 예약) 버튼 위에 한 줄(결정 050 의 4). 버튼 아래에는 아무것도 두지 않는다(결정 061 의 5).
 */
export function DetailCard({ blocked, onRequest }: { blocked: boolean; onRequest: () => void }) {
  return (
    <View testID="me-detail-card" style={styles.detail}>
      <GlowBackdrop color={BrandColors.cardGlow} extent={D.glow.extent} centerX={D.glow.x} centerY={D.glow.y} />
      <Txt variant="captionStrong" color="accentText">
        {S.detail.kicker}
      </Txt>
      <Txt variant="cardTitle" keepAll style={styles.detailTitle}>
        {S.detail.title}
      </Txt>
      <Txt variant="desc" color="gray" keepAll style={styles.detailBody}>
        {S.detail.body}
      </Txt>
      <View style={styles.icons}>
        {ME_AREAS.map((area) => (
          <View key={area} style={styles.icon}>
            <AreaArt area={area} size={D.icon} variant="icon" />
            <Txt variant="statLabel" color="gray">
              {S.areas[area]}
            </Txt>
          </View>
        ))}
      </View>
      {blocked ? (
        <Txt variant="caption" color="gray" style={styles.blocked}>
          {S.detail.blocked}
        </Txt>
      ) : null}
      <View style={styles.request}>
        <Button label={S.detail.request} onPress={onRequest} />
      </View>
    </View>
  );
}

/** 받은 뒤 맨 위 별명 카드의 뼈대(결정 071, 보드 12-8): 같은 카드에 프로필 동그라미 · 이름 · 한 줄 별명(꺾쇠 자리는 비운다) */
export function MeNicknameCardSkeleton() {
  return (
    <View testID="me-nickname-card-skeleton" style={styles.card}>
      <Skeleton width={C.avatar} height={C.avatar} pill />
      <View style={styles.cardText}>
        <SkeletonText variant="label" widths={[K.card.label]} />
        <SkeletonText variant="clause" widths={[K.card.headline]} />
      </View>
      <View style={styles.chevronSpace} />
    </View>
  );
}

/** 칩 다섯의 뼈대(결정 071, 보드 24-1 의 알약 · 12-8 의 자리) */
export function AreaChipsSkeleton() {
  return (
    <View testID="me-chips-skeleton" style={styles.chips}>
      {ME_AREAS.map((area) => (
        <View key={area} testID="me-chip-skeleton" style={styles.chip}>
          <Skeleton width="100%" height={L.chips.height} pill />
        </View>
      ))}
    </View>
  );
}

/** 받기 전 "자세한 풀이" 카드의 뼈대(결정 071, 보드 12 받기 전): 같은 카드에 이름표 · 제목 · 설명 · 영역 다섯(그림 · 이름) · 버튼 */
export function DetailCardSkeleton() {
  return (
    <View testID="me-detail-card-skeleton" style={styles.detail}>
      <SkeletonText variant="captionStrong" widths={[K.detail.kicker]} />
      <SkeletonText variant="cardTitle" widths={K.detail.title} style={styles.detailTitle} />
      <SkeletonText variant="desc" widths={K.detail.body} style={styles.detailBody} />
      <View style={styles.icons}>
        {ME_AREAS.map((area) => (
          <View key={area} style={styles.icon}>
            <Skeleton width={D.icon} height={D.icon} pill />
            <SkeletonText variant="statLabel" widths={[K.detail.icon]} center />
          </View>
        ))}
      </View>
      <View style={styles.request}>
        <Skeleton width="100%" height={Sizes.buttonHeight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: C.gap,
    marginTop: L.cardTop,
    marginBottom: L.cardBottom,
    paddingVertical: C.padV,
    paddingHorizontal: C.padH,
    borderRadius: C.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  cardText: { flex: 1, minWidth: 0, gap: C.textGap },
  chevronSpace: { width: C.chevron },
  chips: { flexDirection: 'row', gap: L.chips.gap, paddingTop: L.chips.top, paddingBottom: L.chips.bottom },
  chip: { flex: 1, height: L.chips.height, borderRadius: L.chips.height / 2, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: Colors.ink },
  chipOff: { backgroundColor: Colors.raised, borderWidth: LineWidth, borderColor: Colors.hair },
  semibold: { fontWeight: FontWeight.semibold },
  medium: { fontWeight: FontWeight.medium },
  detail: {
    overflow: 'hidden',
    marginTop: D.top,
    paddingTop: D.padTop,
    paddingHorizontal: D.padX,
    paddingBottom: D.padBottom,
    borderRadius: D.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  detailTitle: { marginTop: D.titleTop },
  detailBody: { marginTop: D.bodyTop },
  icons: { flexDirection: 'row', marginTop: D.iconsTop },
  icon: { flex: 1, alignItems: 'center', gap: D.iconGap },
  blocked: { marginTop: D.buttonTop, textAlign: 'center' },
  request: { marginTop: D.buttonTop },
});
