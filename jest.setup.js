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
