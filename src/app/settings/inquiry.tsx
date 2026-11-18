import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Field, FieldInput } from '@/components/field';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { goBackOrHome } from '@/features/chart/chart-empty';
import { CategoryChips } from '@/features/support/category-chips';
import { checkInquiry, INQUIRY_BODY_MAX, inquiryLength, type InquiryProblems } from '@/features/support/inquiry';
import { useInquiry } from '@/features/support/use-inquiry';
import { useUpdateBusy } from '@/features/update/update-gate';
import type { InquiryCategory } from '@/lib/api';

const I = strings.inquiry;

const BODY_ERRORS = { TOO_SHORT: I.errors.bodyTooShort, TOO_LONG: I.errors.bodyTooLong };

/** 온 곳(마이 · 자주 묻는 질문)으로 돌아간다. 돌아갈 곳이 없으면(웹에서 주소로 바로 연 경우) 마이로 간다(결정 034) */
function backToMy() {
  if (router.canGoBack()) router.back();
  else router.replace('/my');
}

/**
 * 문의하기(결정 024). 종류 · 내용 · 답장 받을 이메일(비워도 된다)을 받아 서버에 보낸다.
 * 보내면 "문의를 보냈어요" 만 남고, 실패하면 안내와 함께 적은 것을 그대로 둔다.
 * 적은 내용과 이메일은 이 화면의 메모리에만 있다. 기기에 보관하지 않는다.
 */
export default function InquiryScreen() {
  // 세션을 시작해 둔다(주소로 바로 들어온 경우). 보내는 요청의 401 은 lib/api 가 세션을 한 번 다시 받아 처리한다.
  useSession();
  const [category, setCategory] = useState<InquiryCategory | null>(null);
  const [body, setBody] = useState('');
  const [email, setEmail] = useState('');
  const [problems, setProblems] = useState<InquiryProblems>({});
  const { state, send } = useInquiry();
  // 적어 둔 글이 있으면(아직 보내지 않았다) 강제 업데이트를 미룬다(결정 027).
  useUpdateBusy(state.status !== 'sent' && (body !== '' || email !== ''));
  const nav = <NavBar title={I.title} onBack={goBackOrHome} />;

  function onSubmit() {
    const checked = checkInquiry({ category, body, email });
    setProblems(checked.ok ? {} : checked.problems);
    if (checked.ok) void send(checked.input);
  }

  if (state.status === 'sent')
    return (
      <Screen nav={nav}>
        <View style={styles.done}>
          <Txt variant="heading">{I.done.title}</Txt>
          <Txt variant="table" color="gray">
            {I.done.body}
          </Txt>
          <Button label={I.done.back} onPress={backToMy} />
        </View>
      </Screen>
    );

  const sending = state.status === 'sending';
  const failure =
    state.status !== 'failed'
      ? null
      : state.error === 'NETWORK' || state.error === 'LIMIT'
        ? I.failed[state.error]
        : state.code === 'INVALID_BODY' || state.code === 'INVALID_EMAIL'
          ? I.failed[state.code]
          : I.failed.OTHER;

  return (
    <Screen nav={nav}>
      <View style={styles.form}>
        <Txt variant="table" color="gray">
          {I.intro}
        </Txt>
        <Field label={I.categoryLabel} error={problems.category && I.errors.categoryRequired}>
          <CategoryChips
            value={category}
            invalid={Boolean(problems.category)}
            onChange={(next) => {
              setCategory(next);
              setProblems((p) => ({ ...p, category: undefined }));
            }}
          />
        </Field>
        <View style={styles.body}>
          <Field label={I.bodyLabel} hint={I.bodyHint} error={problems.body && BODY_ERRORS[problems.body]}>
            <FieldInput
              multiline
              value={body}
              onChangeText={(text) => {
                setBody(text);
                setProblems((p) => ({ ...p, body: undefined }));
              }}
              placeholder={I.bodyPlaceholder}
              invalid={Boolean(problems.body)}
              accessibilityLabel={I.bodyLabel}
            />
          </Field>
          <Txt variant="mono" color="hint" style={styles.count}>
            {`${inquiryLength(body)}${I.countSeparator}${INQUIRY_BODY_MAX}${I.countUnit}`}
          </Txt>
        </View>
        <Field label={I.emailLabel} hint={I.emailHint} error={problems.email && I.errors.emailFormat}>
          <FieldInput
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setProblems((p) => ({ ...p, email: undefined }));
            }}
            placeholder={I.emailPlaceholder}
            invalid={Boolean(problems.email)}
            accessibilityLabel={I.emailLabel}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>
        <View style={styles.bottom}>
          {failure ? (
            <Txt variant="table" color="danger">
              {failure}
            </Txt>
          ) : null}
          <Button label={sending ? I.sending : I.submit} disabled={sending} onPress={onSubmit} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { flexGrow: 1, gap: Spacing.lg, paddingTop: Spacing.xs },
  body: { gap: Spacing.xxs },
  count: { alignSelf: 'flex-end' },
  bottom: { marginTop: 'auto', gap: Spacing.sm },
  done: { gap: Spacing.md, paddingTop: Spacing.lg },
});
