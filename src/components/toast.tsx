import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { Colors, ToastLayout as L } from '@/constants/theme';

export type ToastKind = 'success' | 'error';
export type ToastMessage = { kind: ToastKind; text: string };
/** 알림이 뜨는 자리: 아래 탭 위(화면 좌우 20) · 아래 주 버튼 위(버튼 폭 그대로) */
export type ToastAnchor = 'tabs' | 'button';

/** 저절로 사라지기까지(ADR 065 예정): 성공 2초 · 실패 4초 */
const TOAST_MS: Record<ToastKind, number> = { success: 2000, error: 4000 };

/** 두 아이콘이 함께 쓰는 선 모양(보드 23 · 23-1) */
const ICON = {
  width: L.icon,
  height: L.icon,
  viewBox: '0 0 24 24',
  fill: 'none',
  strokeWidth: L.iconStroke,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/**
 * 짧은 알림의 상태. show 로 띄우면 성공 2초 · 실패 4초 뒤 저절로 사라진다. 한 번에 하나 — 새 것이 오면 바꾸고 시간도 새로 센다.
 * 화면은 돌려받은 toast · hide 를 `<Toast>` 에 넘긴다. 알림은 화면의 입력을 건드리지 않는다(실패해도 적은 글은 그대로).
 */
export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS[toast.kind]);
    return () => clearTimeout(timer);
  }, [toast]);
  const show = useCallback((kind: ToastKind, text: string) => setToast({ kind, text }), []);
  const hide = useCallback(() => setToast(null), []);
  return { toast, show, hide };
}

export type ToastProps = {
  toast: ToastMessage | null;
  /** 누르면 닫는다 */
  onClose: () => void;
  above: ToastAnchor;
};

/**
 * 짧은 알림(보드 23 · 23-1): 아이콘(성공 체크 · 실패 동그라미 느낌표)과 한 줄 글. 화면이 아래 탭이나 아래 주 버튼과 **같은 View 안에** 두면
 * 그 바로 위 12 에 뜬다(감싼 View 를 기준으로 떠 있다). 누르면 닫힌다. 화면 읽기에 알린다(성공 polite · 실패 assertive, iOS 는 읽어 준다).
 */
export function Toast({ toast, onClose, above }: ToastProps) {
  useEffect(() => {
    if (toast && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(toast.text);
  }, [toast]);
  if (!toast) return null;
  const error = toast.kind === 'error';
  return (
    <Pressable
      testID="toast"
      role={error ? 'alert' : 'status'}
      aria-live={error ? 'assertive' : 'polite'}
      accessibilityLabel={toast.text}
      onPress={onClose}
      style={[styles.toast, above === 'tabs' ? styles.overTabs : styles.overButton]}>
      {error ? (
        <Svg testID="toast-icon-error" {...ICON} stroke={Colors.dangerSoft}>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M12 7.5v5.5M12 16.5v.01" />
        </Svg>
      ) : (
        <Svg testID="toast-icon-success" {...ICON} stroke={Colors.success}>
          <Path d="M5 12.5l4.5 4.5L19 7.5" />
        </Svg>
      )}
      <Txt variant="kicker" keepAll style={styles.text}>
        {toast.text}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: L.above,
    flexDirection: 'row',
    alignItems: 'center',
    gap: L.gap,
    paddingVertical: L.paddingV,
    paddingHorizontal: L.paddingH,
    borderRadius: L.radius,
    backgroundColor: Colors.hair,
    boxShadow: L.shadow,
  },
  overTabs: { left: L.inset, right: L.inset },
  overButton: { left: 0, right: 0 },
  text: { flex: 1 },
});
