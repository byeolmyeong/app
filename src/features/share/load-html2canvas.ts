/**
 * 웹 "이미지 저장" 이 쓰는 html2canvas-pro(285KB)는 누를 때 받는다(성능 계획 3) — 웹 내보내기가 import() 를 따로 조각으로 낸다
 * (화면 조각 나누기는 #57 반짝임 때문에 끈 채). 시험(jest)은 import() 를 돌리지 않아 jest.setup.js 가 require 로 바꿔 끼운다.
 */
export const loadHtml2canvas = () => import('html2canvas-pro');
