// jest 전용: react-native Animated 의 움직임을 기다리지 않고 바로 끝낸다.
// 시트가 닫히는 220ms 같은 움직임을 실제 시간으로 기다리면 부하가 걸렸을 때 시험이 5초 제한에 걸린다(타임아웃을 늘리지 않는다 — 골든 룰).
// 움직임의 결과(마지막 값 · 끝났다는 알림)는 그대로 준다. 끝없이 도는 움직임(Animated.loop — 별이 · 별명 짓는 중)은 시작만 하고 돌리지 않는다.
const { Animated } = require('react-native');

const done = (callback) => callback?.({ finished: true });

Animated.timing = (value, config) => ({
  start: (callback) => {
    value.setValue(config.toValue);
    done(callback);
  },
  stop: () => {},
  reset: () => {},
});
Animated.spring = Animated.timing;
Animated.loop = () => ({ start: () => {}, stop: () => {}, reset: () => {} });

// 연결 상태(@react-native-community/netinfo)는 네이티브 모듈이라 라이브러리가 준 가짜를 쓴다(결정 061 의 4 — 연결 끊김).
// 끊김 · 되살아남을 보는 시험은 그 파일에서 addEventListener 를 바꿔 끼운다.
jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));

// 기기 저장소(AsyncStorage)도 네이티브 모듈이라 없으면 읽어 들이는 순간 던진다. 루트의 문(UpdateGate)이 업데이트를 권한 버전을 적어 두므로
// (결정 059) 라이브러리가 준 가짜(메모리)를 모든 시험에 깐다. 파일마다 jest.mock 으로 같은 가짜를 다시 깔아도 된다.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// 소리(expo-audio)도 네이티브 모듈이라 jest 에서는 읽어 들이는 순간 던진다. 쓰는 중 화면이 기다릴 때 음악을 청하므로(결정 062)
// 소리를 내지 않는 가짜를 모든 시험에 깐다. 음악 줄 자체의 시험(features/audio)은 그 파일에서 다시 깔아 틀고 멈춤을 본다.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ volume: 1, loop: false, play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(async () => {}), remove: jest.fn() })),
  setAudioModeAsync: jest.fn(async () => {}),
}));
