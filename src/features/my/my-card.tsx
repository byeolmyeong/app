import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, isAvatarId } from '@/components/avatar';
import { CardConstellation } from '@/components/card-constellation';
import { GlowBackdrop } from '@/components/glow';
import { Txt } from '@/components/txt';
import { BrandColors, Colors, FontWeight, LineWidth, MyLayout } from '@/constants/theme';
import { strings } from '@/content/strings';

const L = MyLayout.card;
const C = strings.my.card;

export type MyCardProps = {
  /** `GET /account` 의 닉네임 · 프로필 그림. 받지 못했거나 옛 계정이면 null — 그 칸을 빼고 그린다 */
  nickname: string | null;
  avatar: number | null;
  /** 해 별자리 이름("물병자리" — 서버 차트의 SUN). 없으면 null */
  sunSign: string | null;
  /** 별명을 받은 지 며칠(받은 날 1일). 요약 해석에 만든 때가 없으면 null */
  days: number | null;
  /** 받아 둔 요약 해석의 한 줄 별명. 없으면 null */
  headline: string | null;
  /** 출생 정보 한 줄. 기기에 출생 정보가 없으면 null */
  birthLine: string | null;
  onAccount: () => void;
  onBirth: () => void;
};

function CardButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Txt variant="table" style={styles.buttonText}>
        {label}
      </Txt>
    </Pressable>
  );
}

/**
 * 마이 위의 별명 카드(결정 056 의 1, 보드 16): 프로필 그림 · 닉네임 · "해 별자리 · 별명을 받은 지 N일" · 한 줄 별명 · 출생 정보 한 줄,
 * 아래 버튼 둘(계정 · 프로필 / 출생 정보 바꾸기). 홈 카드와 같은 빛과 별자리 장식을 오른쪽 위에 둔다. 카드 자체는 누르지 않는다.
 */
export function MyCard({ nickname, avatar, sunSign, days, headline, birthLine, onAccount, onBirth }: MyCardProps) {
  const meta = [sunSign, days !== null ? `${C.daysPrefix}${days}${C.daysSuffix}` : null].filter(Boolean).join(C.separator);
  return (
    <View testID="my-card" style={styles.card}>
      <GlowBackdrop color={BrandColors.cardGlow} extent={L.glow.extent} centerX={L.glow.x} centerY={L.glow.y} />
      <CardConstellation />
      <View style={styles.row}>
        {isAvatarId(avatar) ? <Avatar id={avatar} size={L.avatar} /> : null}
        <View style={styles.names}>
          {nickname ? <Txt variant="sheetTitle">{nickname}</Txt> : null}
          {meta ? (
            <Txt variant="caption" color="gray">
              {meta}
            </Txt>
          ) : null}
        </View>
      </View>
      {headline ? (
        <Txt variant="input" color="inkSoft" keepAll style={styles.headline}>
          {headline}
        </Txt>
      ) : null}
      {birthLine ? (
        <Txt variant="caption" color="accentText" style={styles.birth}>
          {birthLine}
        </Txt>
      ) : null}
      <View style={styles.buttons}>
        <CardButton label={C.account} onPress={onAccount} />
        <CardButton label={C.birth} onPress={onBirth} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: L.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
    paddingTop: L.paddingTop,
    paddingHorizontal: L.padding,
    paddingBottom: L.padding,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: L.rowGap },
  names: { flexShrink: 1, gap: L.namesGap },
  headline: { marginTop: L.headlineTop, lineHeight: L.headlineLine, fontWeight: FontWeight.medium },
  birth: { marginTop: L.birthTop },
  buttons: { flexDirection: 'row', gap: L.buttonGap, marginTop: L.buttonsTop },
  button: {
    flex: 1,
    height: L.button,
    borderRadius: L.buttonRadius,
    backgroundColor: L.buttonFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontWeight: FontWeight.semibold },
});
