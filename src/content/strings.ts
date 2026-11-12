/**
 * 화면 문구의 단일 출처. 화면과 부품에 문구를 직접 적지 않는다.
 * 1.1.0 에서 영어를 붙일 때 이 파일과 같은 모양의 번역만 추가한다.
 * 천체·별자리·각도의 키는 서버가 주는 식별자다(서버 저장소 "API 계약").
 */
export const strings = {
  appName: '별명',
  common: {
    back: '←',
    backLabel: '뒤로',
    arrow: '→',
    timeColon: ':',
    none: '—',
  },
  /** 홈(카테고리 화면). 구성은 docs/decisions/019-home-categories.md */
  /** 아래 탭(결정 019) */
  tabs: { home: '홈', my: '마이' },
  my: {
    title: '마이',
    birthLabel: '출생 정보',
    editBirth: '바꾸기',
    settings: '설정',
  },
  /** 설정(F9). 로그아웃 · 알림은 소셜 로그인 · 푸시가 생길 때 더한다 */
  settings: {
    title: '설정',
    privacy: '개인정보 처리방침',
    terms: '이용약관',
    contact: '문의',
    /** 문의 메일 주소. 소유자가 정한 임시 주소다. 바꿀 때는 여기 한 곳만 바꾼다(다른 곳에 적지 않는다) */
    contactEmail: 'kimdonghwan913@gmail.com',
    version: '앱 버전',
    deleteAccount: '계정 삭제',
    deleteSheet: {
      title: '계정을 삭제할까요?',
      body: '계정과 출생 정보, 받은 풀이와 리포트가 서버와 이 기기에서 모두 지워져요. 되돌릴 수 없어요.',
      confirm: '삭제',
      deleting: '삭제하는 중',
      cancel: '취소',
      failed: {
        NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
        OTHER: '계정을 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      },
    },
  },
  /**
   * 처리방침 · 약관의 글. [확인 필요] 본문은 자리표시다. 실제 문안은 소유자가 정해 이 자리의 paragraphs 를 바꾸고,
   * 그때 placeholderNotice 를 지운다(화면에서 그 줄을 빼는 곳: src/app/settings/privacy.tsx · terms.tsx).
   */
  legal: {
    placeholderNotice: '[확인 필요] 아직 확정되지 않은 임시 글입니다. 출시 전에 실제 문안으로 바뀝니다.',
    privacy: {
      title: '개인정보 처리방침',
      paragraphs: [
        '[자리표시] 수집하는 개인정보의 항목과 수집 방법이 이 자리에 들어갑니다.',
        '[자리표시] 개인정보의 이용 목적, 보관 기간, 파기 절차가 이 자리에 들어갑니다.',
        '[자리표시] 이용자의 권리와 행사 방법, 문의처가 이 자리에 들어갑니다.',
      ],
    },
    terms: {
      title: '이용약관',
      paragraphs: [
        '[자리표시] 서비스의 내용과 이용 조건이 이 자리에 들어갑니다.',
        '[자리표시] 이용자와 운영자의 권리 · 의무가 이 자리에 들어갑니다.',
        '[자리표시] 책임의 한계와 약관의 변경 절차가 이 자리에 들어갑니다.',
      ],
    },
  },
  main: {
    soon: '준비 중',
    readingLabel: '나의 별명',
    readingMore: '풀이 읽기',
    readingEmpty: '아직 별명을 짓지 않았어요.',
    readingCta: '내 별명 읽기',
    categories: [
      {
        key: 'me',
        title: '나',
        items: [
          { label: '요약 풀이', path: '/reading' },
          { label: '내 차트', path: '/chart' },
          { label: '심층 리포트', path: '/report' },
        ],
      },
      {
        key: 'relation',
        title: '관계',
        items: [
          { label: '사람을 대하는 성향', path: '/report?area=RELATIONSHIP' },
          { label: '연애에서 해 볼 만한 것', path: '/direction' },
        ],
      },
      {
        key: 'synastry',
        title: '궁합',
        items: [
          { label: '상대와 궁합 보기', path: '/synastry' },
          { label: '궁합 랭킹', path: '/synastry/ranking' },
        ],
      },
      {
        key: 'timing',
        title: '시기',
        items: [
          { label: '지금 나의 구간', path: '/report?area=TIMING' },
          { label: '다가오는 변곡점', path: '/report?area=TIMING' },
        ],
      },
    ],
  },
  birth: {
    title: '출생 정보',
  },
  home: {
    title: '별이 붙여 준\n나의 별명',
    subtitle: '태어난 순간의 하늘을 계산해\n나를 설명하는 글로 풀어 드립니다.',
    dateLabel: '생년월일',
    datePlaceholder: '2000-06-15',
    timeLabel: '태어난 시각',
    timePlaceholder: '시각 선택',
    timeUnknownValue: '모름',
    timeUnknown: '태어난 시각을 몰라요',
    timeSheetTitle: '태어난 시각',
    timeConfirm: '확인',
    placeLabel: '태어난 곳',
    placePlaceholder: '시·도, 시·군·구 선택',
    placeSheetTitle: '태어난 곳',
    /** 시·도 칩에 적는 짧은 이름. 없는 이름은 그대로 적는다 */
    regionShort: {
      서울특별시: '서울',
      부산광역시: '부산',
      대구광역시: '대구',
      인천광역시: '인천',
      광주광역시: '광주',
      대전광역시: '대전',
      울산광역시: '울산',
      세종특별자치시: '세종',
      경기도: '경기',
      강원특별자치도: '강원',
      충청북도: '충북',
      충청남도: '충남',
      전북특별자치도: '전북',
      전라남도: '전남',
      경상북도: '경북',
      경상남도: '경남',
      제주특별자치도: '제주',
    } as Record<string, string>,
    submit: '내 별명 읽기',
    submitting: '하늘을 계산하는 중',
    placeLoadFailed: '출생지 목록을 불러오지 못했어요.',
    placeRetry: '다시 불러오기',
    errors: {
      dateFormat: '예: 2000-06-15',
      dateTooEarly: '1900년부터 받아요',
      dateFuture: '오늘까지만 받아요',
      timeFormat: '예: 21:00',
      timeRequired: '태어난 시각을 골라 주세요',
      placeRequired: '태어난 곳을 골라 주세요',
    },
    requestErrors: {
      NETWORK: '인터넷 연결을 확인하고 다시 눌러 주세요.',
      LIMIT: '요청이 많아요. 잠시 뒤 다시 눌러 주세요.',
      OTHER: '하늘을 계산하지 못했어요. 잠시 뒤 다시 눌러 주세요.',
    },
  },
  chart: {
    title: '내 하늘',
    wheelLabel: '출생 차트 휠',
    wheelHeading: '태어난 순간의 하늘',
    wheelCaption: '내가 태어난 순간, 해와 달과 행성이 하늘 어디에 있었는지 그린 그림이에요. 검은 점 하나가 천체 하나입니다.',
    keyThreeHeading: '나를 이루는 세 가지',
    keyThreeCaption: '그중에서 나를 읽을 때 가장 먼저 보는 세 자리예요.',
    keySunCaption: '힘을 내는 방식',
    keyMoonCaption: '편안함을 느끼는 방식',
    keyAscCaption: '처음 보이는 모습',
    /** 별자리 이름 뒤에 붙이는 말: 전갈 → 전갈자리 */
    signSuffix: '자리',
    keySun: '나의 중심',
    keyMoon: '나의 마음',
    keyAsc: '나의 첫인상',
    seeAll: '천체별로 자세히 보기',
    readReading: '내 별명 읽기',
    seeSynastry: '궁합 보기',
    empty: '출생 정보를 먼저 넣어 주세요.',
    goHome: '출생 정보 넣기',
    timeUnknownNote: '태어난 시각을 몰라 하우스와 상승점은 보여 드리지 않아요.',
  },
  reading: {
    title: '내 별명',
    generating: '별명을 짓는 중이에요',
    generatingNote: '태어난 순간의 하늘을 글로 옮기고 있어요. 길면 1분쯤 걸려요.',
    /** 문단 머리의 근거 줄: "근거 · 태양 · 쌍둥이 · 6하우스". 뒤의 낱말들은 서버가 준다 */
    basisLabel: '근거',
    basisSeparator: ' · ',
    strengths: '강점',
    cautions: '보완점',
    bullet: '·',
    /** 방향성 "이성" 화면(`/direction`)으로 들어가는 줄(결정 023) */
    seeDirection: '연애에서 해 볼 만한 것 보기',
    seeChart: '내 차트 보기',
    /** 앞날·건강·투자를 단정하지 않는다(golden-rules "프로젝트 규칙") */
    disclaimer: '오락과 자기 성찰을 위한 내용이에요. 앞날을 알려 주거나 전문가의 조언을 대신하지 않습니다.',
    failed: {
      NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
      LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
      OTHER: '글을 받아 오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
    },
    retry: '다시 시도',
  },
  /** 방향성 제시(F10)의 이성 주제. 조언형으로만 쓴다. 앞일을 단정하지 않는다(결정 023) */
  direction: {
    title: '연애에서 해 볼 만한 것',
    generating: '해 볼 만한 것을 고르는 중이에요',
    generatingNote: '내 하늘에서 연애와 닿는 자리를 글로 옮기고 있어요. 20초쯤 걸려요.',
    failed: {
      NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
      LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
      OTHER: '글을 받아 오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
    },
    retry: '다시 시도',
    /** 미래 주제: 심층 리포트 시기 탭의 끝(결정 026). 언제인지는 위의 "지금 나의 구간" 이 보여 준다 */
    future: {
      heading: '이 시기에 해 볼 만한 것',
      generating: '해 볼 만한 것을 고르는 중이에요',
      generatingNote: '지금 지나는 시기를 글로 옮기고 있어요. 처음에는 20초쯤 걸려요.',
      failed: {
        NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
        LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
        OTHER: '글을 받아 오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      },
      retry: '다시 시도',
    },
    /** 궁합 주제: 궁합 결과에서 들어가는 화면(결정 026). 상대의 출생 정보는 글을 처음 만들 때만 다시 받는다 */
    synastry: {
      title: '이 사이에서 해 볼 만한 것',
      generating: '해 볼 만한 것을 고르는 중이에요',
      generatingNote: '두 사람의 하늘이 닿는 자리를 글로 옮기고 있어요. 처음에는 20초쯤 걸려요.',
      reenter: '상대의 출생 정보는 저장하지 않아요. 글을 쓰려면 궁합을 볼 때 넣은 상대의 출생 정보를 다시 넣어 주세요.',
      submit: '해 볼 만한 것 보기',
      mismatch: '이 궁합을 볼 때 넣은 출생 정보와 달라요. 그때와 같은 생년월일 · 시각 · 곳을 넣어 주세요.',
      invalidBirth: '넣은 출생 정보를 다시 확인해 주세요.',
      profileChanged: '이 궁합을 본 뒤에 내 출생 정보가 바뀌었어요. 궁합을 새로 본 다음 다시 열어 주세요.',
      recalculate: '궁합 새로 보기',
      failed: {
        NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
        LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
        OTHER: '글을 받아 오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      },
      retry: '다시 시도',
    },
  },
  report: {
    title: '심층 리포트',
    checking: '리포트를 확인하고 있어요',
    intro: '성격 · 관계 · 일 · 감정 · 시기, 다섯 가지로 나를 길게 풀어 드려요.',
    request: '리포트 받기',
    writing: '리포트를 쓰는 중이에요',
    writingNote: '1~2분쯤 걸려요. 화면을 나갔다가 다시 들어와도 돼요.',
    /** 영역 탭. 키는 서버가 주는 식별자다 */
    areas: { PERSONALITY: '성격', RELATIONSHIP: '관계', WORK: '일', EMOTION: '감정', TIMING: '시기' },
    /**
     * 시기 탭(결정 021). 행성 · 각도 이름을 쓰지 않고, 무슨 일이 일어난다고 단정하지 않는다("~하기 쉬운 시기").
     * 종류 · 영역 · 크기 · 변곡점의 키는 서버가 주는 식별자다.
     */
    timing: {
      nowHeading: '지금 나의 구간',
      nowNone: '지금은 걸쳐 있는 구간이 없어요.',
      milestoneNow: '지금 지나는 변곡점',
      nextIntervalLabel: '다음 구간',
      nextMilestoneLabel: '다음 변곡점',
      milestonesDone: '네 번의 변곡점을 모두 지나왔어요.',
      /** 날짜 뒤에 붙인다: "2027년 2월까지" · "2027년 3월부터" */
      untilSuffix: '까지',
      fromSuffix: '부터',
      /** F4 가 정한 고지 문구 */
      notice: '시기는 행성의 주기를 계산한 것이고, 무슨 일이 일어날지를 말하지 않습니다.',
      timeUnknownNotice: '태어난 시각을 몰라서 첫인상(상승점)에 닿는 구간과 운명처럼 느껴지는 만남 구간은 뺐어요.',
      milestonesHeading: '변곡점',
      milestonesIntro: '누구나 비슷한 나이에 지나는 네 번의 마디예요. 해와 나이는 내 차트로 계산한 값이에요.',
      milestoneKinds: {
        SATURN_SQUARE: '첫 번째 변곡점',
        SATURN_RETURN: '두 번째 변곡점',
        URANUS_OPPOSITION: '세 번째 변곡점',
        SECOND_SATURN_RETURN: '네 번째 변곡점',
      },
      nearest: '지금과 가장 가까워요',
      timelineHeading: '나에게 오는 구간',
      timelineIntro: '큰 변화를 먼저 보여 드려요. 지금을 기준으로 앞뒤 10년이고, 줄을 누르면 설명이 펼쳐져요.',
      /** 접어 둔 나머지 구간(작은 변화 · 기회 · 만남)을 펴는 버튼. 뒤에 "(12개)" 가 붙는다 */
      showAll: '작은 변화와 기회도 보기',
      showBig: '큰 변화만 보기',
      kinds: { CHANGE: '변화', OPPORTUNITY: '기회', FATED: '운명처럼 느껴지는 만남' },
      /** 종류가 무엇인지 타임라인 위에 한 줄씩 적는다 */
      kindNotes: {
        CHANGE: '익숙한 방식이 달라지기 쉬운 시기',
        OPPORTUNITY: '도움이 되는 사람을 만나거나 인연이 열리기 쉬운 시기',
        FATED: '운명처럼 느껴지는 만남이 생기기 쉬운 시기',
      },
      areas: { PEOPLE: '사람·인연', WORK: '일', MONEY: '돈', SELF: '나 자신' },
      sizes: { BIG: '큰 변화', SMALL: '작은 변화' },
      now: '지금',
      /** 뒤에 남은 개수를 붙인다: "이전 구간 더 보기 (5개)" */
      earlier: '이전 구간 더 보기',
      later: '이후 구간 더 보기',
      countSuffix: '개',
      /** 날짜와 나이의 낱말: "2026년 3월 ~ 2027년 1월", "2029년 · 만 29세" */
      yearSuffix: '년',
      monthSuffix: '월',
      periodSeparator: ' ~ ',
      agePrefix: '만 ',
      ageSuffix: '세',
      separator: ' · ',
    },
    failed: {
      NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
      LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
      OTHER: '리포트를 쓰지 못했어요. 잠시 뒤 다시 시도해 주세요.',
    },
    retry: '다시 시도',
  },
  /** 궁합(직접 입력). 점수와 그 옆의 말은 서버가 준 것을 그대로 보여 준다(결정 010, 서버 결정 008) */
  synastry: {
    title: '궁합',
    /** 관계 유형. 키는 서버가 주는 식별자다(결정 020) */
    relations: { LOVE: '연애', FRIEND: '친구', WORK: '일', FAMILY: '가족' },
    entry: {
      intro: '두 사람의 하늘을 겹쳐, 나에게 이 사람이 어떤 사이인지 봐요. 상대의 출생 정보는 저장하지 않아요.',
      relationLabel: '어떤 사이인가요',
      nameLabel: '상대를 부를 이름',
      namePlaceholder: '예: 지우',
      submit: '궁합 보기',
      calculating: '궁합을 보는 중이에요',
      calculatingNote: '두 사람의 하늘을 겹쳐 글로 옮기고 있어요. 길면 1분쯤 걸려요.',
      errors: {
        relationRequired: '어떤 사이인지 골라 주세요',
        nameRequired: '부를 이름을 적어 주세요',
      },
      failed: {
        NETWORK: '인터넷 연결을 확인하고 다시 눌러 주세요.',
        LIMIT: '요청이 많아요. 잠시 뒤 다시 눌러 주세요.',
        OTHER: '궁합을 보지 못했어요. 잠시 뒤 다시 눌러 주세요.',
      },
    },
    result: {
      nameSeparator: ' · ',
      scoreCaption: '나 기준 점수',
      scoreUnit: '점',
      wheelHeading: '두 사람의 하늘',
      wheelCaption: '고리 안쪽의 검은 점은 나, 바깥의 빈 점은 상대예요. 가운데 선은 두 사람의 천체가 서로 이루는 각도입니다.',
      noWheel: '겹친 그림은 궁합을 본 직후에만 볼 수 있어요. 상대의 출생 정보를 저장하지 않기 때문이에요.',
      getReport: '궁합 리포트 받기',
      seeReport: '궁합 리포트 보기',
      loading: '궁합을 불러오고 있어요',
      notFound: '이 궁합을 찾을 수 없어요.',
      goEntry: '궁합 보러 가기',
      failed: {
        NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
        LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
        OTHER: '궁합을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      },
      retry: '다시 시도',
    },
    report: {
      title: '궁합 리포트',
      checking: '리포트를 확인하고 있어요',
      intro: '끌림 · 대화 · 갈등 · 오래가기, 네 가지로 두 사람 사이를 길게 풀어 드려요.',
      reenter: '상대의 출생 정보는 저장하지 않아요. 리포트를 쓰려면 궁합을 볼 때 넣은 상대의 출생 정보를 다시 넣어 주세요.',
      request: '리포트 받기',
      writing: '리포트를 쓰는 중이에요',
      writingNote: '1~2분쯤 걸려요. 화면을 나갔다가 다시 들어와도 돼요.',
      /** 영역 탭. 키는 서버가 주는 식별자다 */
      areas: { ATTRACTION: '끌림', TALK: '대화', CONFLICT: '갈등', LASTING: '오래가기' },
      failed: {
        NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
        LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
        OTHER: '리포트를 쓰지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      },
      mismatch: '이 궁합을 볼 때 넣은 출생 정보와 달라요. 그때와 같은 생년월일 · 시각 · 곳을 넣어 주세요.',
      profileChanged: '이 궁합을 본 뒤에 내 출생 정보가 바뀌었어요. 궁합을 새로 본 다음 리포트를 받아 주세요.',
      recalculate: '궁합 새로 보기',
      retry: '다시 시도',
    },
    ranking: {
      title: '궁합 랭킹',
      keywordSeparator: ' · ',
      loading: '랭킹을 불러오고 있어요',
      empty: '아직 이 사이로 본 궁합이 없어요.',
      failed: {
        NETWORK: '인터넷 연결을 확인하고 다시 시도해 주세요.',
        LIMIT: '요청이 많아요. 잠시 뒤 다시 시도해 주세요.',
        OTHER: '랭킹을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
      },
    },
    /** 지금까지 본 궁합의 목록(궁합 시작 화면 아래) */
    past: {
      heading: '지난 궁합',
      seeRanking: '궁합 랭킹 보기',
    },
    /** 겹친 휠: 내 점과 상대 점을 한 고리에 그린 그림 */
    overlay: {
      wheelLabel: '두 사람의 하늘을 겹친 그림',
      mine: '나',
    },
  },
  detail: {
    title: '차트 자세히',
    helpLabel: '이 표 읽는 법',
    /** 탭마다 표 위에 적는 한 줄 */
    intro: {
      planets: '천체마다 맡은 주제가 있어요. 그 천체가 어느 별자리에 있었는지로 그 주제가 드러나는 방식을 읽습니다.',
      houses: '하우스는 삶의 열두 영역이에요. 각 영역이 어느 별자리에서 시작하는지를 보여 줍니다.',
      aspects: '두 천체가 특별한 각도를 이루면 두 주제를 함께 읽어요. 어떤 사이인지가 각도의 종류입니다.',
    },
    tabs: { planets: '행성', houses: '하우스', aspects: '각도' },
    columns: {
      body: '천체',
      sign: '별자리',
      degree: '도수',
      house: '하우스',
      pair: '두 천체',
      aspect: '각도',
      orb: '오차',
      motion: '방향',
    },
    retrograde: '역행',
    applying: '다가가는 중',
    separating: '멀어지는 중',
    am: '오전',
    pm: '오후',
  },
  /**
   * 물음표 버튼을 누르면 나오는 설명. 점성술에서 무엇을 뜻하는지만 적는다.
   * 사람의 앞날이나 성격을 단정하지 않는다(golden-rules "프로젝트 규칙").
   */
  help: {
    buttonLabel: '설명 보기',
    mark: '?',
    close: '확인',
    wheel: {
      title: '이 그림 읽는 법',
      items: [
        { term: '바깥 고리', text: '하늘을 열두 칸으로 나눈 별자리예요. 양자리부터 물고기자리까지 한 바퀴를 돕니다.' },
        { term: '검은 점', text: '태어난 순간 해·달·행성이 있던 자리예요. 점 옆 글자는 이름의 줄임말입니다(해, 달, 수, 금, 화, 목, 토, 천, 해왕, 명).' },
        { term: '안쪽 숫자 1~12', text: '하우스예요. 하늘의 자리를 삶의 열두 영역(나, 돈, 배움, 집, 사랑, 일…)에 나눠 놓은 칸입니다. 태어난 시각을 알아야 그릴 수 있어요.' },
        { term: '가운데 선', text: '두 천체가 서로 특별한 각도를 이룰 때 잇는 선이에요. 이어진 둘은 함께 읽습니다. 실선은 잘 어울리는 각도, 점선은 서로 당기는 각도예요.' },
        { term: '왼쪽 끝', text: '태어난 순간 동쪽 지평선에 떠오르던 별자리(상승점)를 왼쪽에 둡니다. 시각을 모르면 양자리가 왼쪽에 와요.' },
      ],
    },
    overlay: {
      title: '겹친 그림 읽는 법',
      items: [
        { term: '가운데 고리', text: '하늘을 열두 칸으로 나눈 별자리예요. 두 사람의 점을 같은 고리에 함께 놓았습니다.' },
        { term: '안쪽의 검은 점', text: '내가 태어난 순간 해·달·행성이 있던 자리예요. 점 옆 글자는 이름의 줄임말입니다(해, 달, 수, 금, 화, 목, 토, 천, 해왕, 명).' },
        { term: '바깥의 빈 점', text: '상대가 태어난 순간 해·달·행성이 있던 자리예요.' },
        { term: '가운데 선', text: '상대의 천체가 내 해·달·수성·금성·화성과 특별한 각도를 이룰 때 잇는 선이에요. 실선은 잘 어울리는 각도, 점선은 서로 당기는 각도입니다. 같은 자리에 겹친 둘은 선 없이 함께 읽어요.' },
        { term: '왼쪽 끝의 선', text: '내가 태어난 순간 동쪽 지평선에 떠오르던 자리(상승점)예요. 내 태어난 시각을 알 때만 그립니다.' },
      ],
    },
    keyThree: {
      title: '세 가지가 뜻하는 것',
      items: [
        { term: '나의 중심 · 태양', text: '태양이 있던 별자리예요. 흔히 말하는 "내 별자리"가 이것이고, 점성술에서는 그 사람이 힘을 내는 방식으로 봅니다.' },
        { term: '나의 마음 · 달', text: '달이 있던 별자리예요. 점성술에서는 편안함을 느끼는 방식, 감정이 움직이는 결로 봅니다.' },
      ],
      asc: { term: '나의 첫인상 · 상승점', text: '태어난 순간 동쪽 지평선에 떠오르던 별자리예요. 점성술에서는 처음 만난 사람에게 보이는 모습으로 봅니다. 4분만 달라도 바뀔 수 있어 태어난 시각이 필요해요.' },
    },
    planets: {
      title: '행성 표 읽는 법',
      items: [
        { term: '천체', text: '해·달·행성마다 맡은 주제가 있어요. 태양 중심, 달 마음, 수성 생각과 말, 금성 애정과 취향, 화성 행동, 목성 넓히는 힘, 토성 책임과 끈기, 천왕성 변화, 해왕성 상상, 명왕성 깊은 변화.' },
        { term: '별자리', text: '그 천체의 주제가 어떤 식으로 드러나는지를 말해요. 같은 금성이어도 별자리에 따라 표현이 달라진다고 봅니다.' },
        { term: '도수', text: '별자리 한 칸(30도) 안에서의 정확한 자리예요. 24°40′ 은 24도 40분이라는 뜻입니다. 해석에는 크게 쓰이지 않아요.' },
        { term: '하우스', text: '그 주제가 삶의 어느 영역에서 드러나는지를 말해요. 1은 나, 7은 가까운 관계, 10은 일과 사회입니다.' },
        { term: '역행', text: '지구에서 볼 때 그 행성이 뒤로 가는 것처럼 보이던 때예요. 점성술에서는 그 주제를 안으로 되짚는 것으로 봅니다.' },
        { term: '그 밖의 지점', text: '북쪽 교점(나아가는 방향), 릴리스(감춰 둔 마음), 행운점(편안한 자리), 버텍스(뜻밖의 만남), 상승점(첫인상), 중천(사회에서의 모습)은 행성이 아니라 계산으로 구한 자리예요.' },
      ],
    },
    houses: {
      title: '하우스 표 읽는 법',
      items: [
        { term: '하우스', text: '삶의 열두 영역이에요. 1 나, 2 돈과 가진 것, 3 배움과 말, 4 집과 뿌리, 5 사랑과 놀이, 6 일상과 건강 습관, 7 가까운 관계, 8 깊은 나눔, 9 넓은 세계, 10 일과 사회, 11 친구와 모임, 12 혼자만의 시간.' },
        { term: '별자리 · 도수', text: '그 영역이 시작되는 자리예요. 그 영역을 어떤 태도로 대하는지를 별자리로 읽습니다.' },
      ],
    },
    aspects: {
      title: '각도 표 읽는 법',
      items: [
        { term: '두 천체', text: '서로 특별한 각도를 이루는 둘이에요. 점성술에서는 두 주제가 함께 움직이는 것으로 봅니다.' },
        { term: '각도', text: '합(0도)은 하나로 섞임, 육분(60도)과 삼분(120도)은 자연스럽게 어울림, 사분(90도)과 충(180도)은 서로 당겨서 조율이 필요한 사이로 봅니다.' },
        { term: '오차', text: '정확한 각도에서 얼마나 벗어났는지예요. 작을수록 그 사이가 또렷하다고 봅니다.' },
        { term: '방향', text: '"다가가는 중"은 정확한 각도로 가까워지던 때, "멀어지는 중"은 지나온 때예요.' },
      ],
    },
  },
  /** 천체가 맡은 주제(점성술에서 그렇게 본다는 뜻). 표에서 이름 아래에 작게 적는다 */
  bodyMeanings: {
    SUN: '나의 중심',
    MOON: '마음',
    MERCURY: '생각과 말',
    VENUS: '애정과 취향',
    MARS: '행동',
    JUPITER: '넓히는 힘',
    SATURN: '책임과 끈기',
    URANUS: '변화',
    NEPTUNE: '상상',
    PLUTO: '깊은 변화',
    NORTH_NODE: '나아가는 방향',
    LILITH: '감춰 둔 마음',
    FORTUNE: '편안한 자리',
    VERTEX: '뜻밖의 만남',
    ASC: '첫인상',
    MC: '사회에서의 모습',
  } as Record<string, string>,
  /** 하우스 번호가 가리키는 삶의 영역 */
  houseMeanings: {
    1: '나',
    2: '돈과 가진 것',
    3: '배움과 말',
    4: '집과 뿌리',
    5: '사랑과 놀이',
    6: '일상',
    7: '가까운 관계',
    8: '깊은 나눔',
    9: '넓은 세계',
    10: '일과 사회',
    11: '친구와 모임',
    12: '혼자만의 시간',
  } as Record<string, string>,
  /** 각도의 종류가 뜻하는 사이 */
  aspectMeanings: {
    CONJUNCTION: '하나로 섞임',
    SEXTILE: '어울림',
    SQUARE: '조율이 필요',
    TRINE: '잘 어울림',
    OPPOSITION: '서로 당김',
  } as Record<string, string>,
  bodies: {
    SUN: '태양',
    MOON: '달',
    MERCURY: '수성',
    VENUS: '금성',
    MARS: '화성',
    JUPITER: '목성',
    SATURN: '토성',
    URANUS: '천왕성',
    NEPTUNE: '해왕성',
    PLUTO: '명왕성',
    NORTH_NODE: '북쪽 교점',
    LILITH: '릴리스',
    FORTUNE: '행운점',
    VERTEX: '버텍스',
    ASC: '상승점',
    MC: '중천',
  },
  /** 휠 안에 쓰는 짧은 이름 */
  bodiesShort: {
    SUN: '해',
    MOON: '달',
    MERCURY: '수',
    VENUS: '금',
    MARS: '화',
    JUPITER: '목',
    SATURN: '토',
    URANUS: '천',
    NEPTUNE: '해왕',
    PLUTO: '명',
  },
  signs: {
    ARIES: '양',
    TAURUS: '황소',
    GEMINI: '쌍둥이',
    CANCER: '게',
    LEO: '사자',
    VIRGO: '처녀',
    LIBRA: '천칭',
    SCORPIO: '전갈',
    SAGITTARIUS: '사수',
    CAPRICORN: '염소',
    AQUARIUS: '물병',
    PISCES: '물고기',
  },
  aspects: {
    CONJUNCTION: '합',
    SEXTILE: '육분',
    SQUARE: '사분',
    TRINE: '삼분',
    OPPOSITION: '충',
  },
} as const;
