import * as amplitude from '@amplitude/analytics-react-native';

import { sanitize, type EventName, type EventProps } from './events';

export { EVENTS, type EventName, type EventProps } from './events';
export { ROUTE_PATTERNS, screenNameOf, type RoutePattern } from './screen';

/**
 * 제품 분석(결정 040). 화면 코드는 SDK 를 직접 부르지 않고 여기만 부른다.
 * 키(`EXPO_PUBLIC_AMPLITUDE_API_KEY`)가 없으면 아무것도 보내지 않고 개발 중 콘솔에만 찍는다.
 * SDK 의 오류는 앱으로 새지 않는다.
 */
let enabled = false;

/** 서버 `GET /auth/session` 의 분석용 id 모양(계정 id 의 SHA-256 앞 32자) */
const ANALYTICS_ID = /^[0-9a-f]{32}$/;

function devWarn(message: string) {
  if (__DEV__) console.warn(`[analytics] ${message}`);
}

function guard(work: () => void) {
  try {
    work();
  } catch {
    devWarn('SDK 오류를 삼켰다');
  }
}

/** 앱이 켜질 때 한 번. 두 번 불러도 한 번만 초기화한다 */
export function initAnalytics(): void {
  const apiKey = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY?.trim();
  if (enabled || !apiKey) return;
  guard(() => {
    amplitude.init(apiKey, undefined, {
      logLevel: amplitude.Types.LogLevel.Warn,
      // 광고 식별자·IP 를 저장하지 않는다(추적 허용 창을 띄우지 않는다)
      trackingOptions: { ipAddress: false, adid: false, appSetId: false, idfv: false, carrier: false },
      // 세션만 자동으로 센다. 화면은 경로 패턴으로 직접 보낸다(`screen_viewed`)
      autocapture: {
        sessions: true,
        appLifecycles: false,
        screenViews: false,
        elementInteractions: false,
        frustrationInteractions: false,
        networkTracking: false,
      },
      // 웹의 유입 정보(레퍼러·주소)는 보내지 않는다. 유입 경로는 GA4 가 본다
      attribution: { disabled: true },
    });
    enabled = true;
  });
}

export function track<E extends EventName>(event: E, props: EventProps<E>): void {
  const clean = sanitize(event, props as Record<string, unknown>);
  if (!clean) return devWarn(`표에 없는 이벤트라 보내지 않는다: ${event}`);
  if (clean.dropped.length > 0) devWarn(`${event}: 값 목록 밖이라 버린 속성 ${clean.dropped.join(', ')}`);
  if (!enabled) {
    if (__DEV__) console.log('[analytics]', clean.event, clean.props);
    return;
  }
  guard(() => {
    amplitude.track(clean.event, clean.props);
  });
}

/** 로그인 뒤 서버가 준 분석용 id 로 이어 붙인다. 모양이 다르면(이메일·계정 id 등) 보내지 않는다 */
export function identify(analyticsId: string): void {
  if (!ANALYTICS_ID.test(analyticsId)) return devWarn('분석용 id 모양이 아니라 보내지 않는다');
  if (!enabled) return;
  guard(() => amplitude.setUserId(analyticsId));
}

/** 로그아웃·계정 삭제 뒤. 사용자 id 를 지우고 기기 id 를 새로 만든다 */
export function resetAnalytics(): void {
  if (!enabled) return;
  guard(() => amplitude.reset());
}
