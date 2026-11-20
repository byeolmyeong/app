import { Redirect } from 'expo-router';

/** 옛 문의하기 주소(결정 024). 문의는 이제 마이 › 문의하기에서 주고받는다 — 새 문의 화면으로 보낸다(결정 058) */
export default function OldInquiryScreen() {
  return <Redirect href="/my/inquiries/new" />;
}
