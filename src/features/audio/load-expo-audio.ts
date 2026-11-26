/**
 * expo-audio 는 음악을 켤 때(soundtrack.start) 받는다(성능 계획 3) — 1.0.0 은 음악을 꺼 둬(결정 069) 웹 첫 번들에 싣지 않는다.
 * 시험(jest)은 import() 를 돌리지 않아 jest.setup.js 가 require 로 바꿔 끼운다.
 */
export const loadExpoAudio = () => import('expo-audio');
