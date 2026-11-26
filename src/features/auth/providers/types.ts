import type { ProviderCredential } from '@/lib/api';

/**
 * 공급자 로그인 버튼(결정 034). 플랫폼마다 파일이 다르고(`google.web.tsx` · `google.tsx` 등) 이름과 모양은 같다.
 * 그 플랫폼 · 설정에서 쓸 수 없으면 아무것도 그리지 않는다(null). 사용자가 닫은 것은 오류가 아니다.
 */
export type LoginButtonProps = {
  /** 공급자에서 자격 증명을 받았다. 서버 로그인은 부르는 쪽이 한다 */
  onCredential: (credential: ProviderCredential) => void;
  /** 공급자 쪽에서 실패했다(사용자가 닫은 것은 빼고) */
  onError: () => void;
  /** 누를 수 없다 — 흐리게(다른 버튼으로 로그인하고 서버를 기다리는 중) */
  disabled?: boolean;
  /** 이 버튼으로 받은 자격 증명으로 서버를 기다리는 중 — 버튼 안에 돌기(결정 067 의 2) */
  loading?: boolean;
  /** 이 기기에서 마지막에 쓴 공급자다 — 버튼에 "최근 로그인" 배지를 얹는다(결정 044). 버튼을 그리지 않으면 배지도 없다 */
  recent?: boolean;
};
