# Prism - 포춘쿠키 메시지 서비스

## 이 서비스는 뭔가요?

**Prism**은 프리즘지점에서 운영하는 인터랙티브 웹 서비스입니다.
방문자가 간단한 질문 3개에 답하면, 그 답변을 바탕으로 **나만의 포춘쿠키 메시지**를 만들어줍니다.

페스티벌이나 오프라인 행사에서 QR코드를 통해 접속하도록 설계되었으며,
짧은 시간 안에 많은 사람이 동시에 참여해도 문제없이 동작합니다.

## 사용자 경험 (방문자가 보는 화면)

```
인트로 → 질문1 → 질문2 → 질문3 → 정보 입력 → 로딩 → 결과
```

1. **인트로** — "Bake your future" 화면에서 시작 버튼을 누릅니다.
2. **질문 1** — "지금 내 삶에서 가장 불안한 것은?" (건강, 관계, 수입, 노후, 사고 중 택1)
3. **질문 2** — "지금 내가 가장 지키고 싶은 대상은?" (나 자신, 파트너, 가족, 반려동물 등)
4. **질문 3** — "지금 내 삶에 가장 필요한 건?" (정보, 안전망, 응원, 계획, 연결)
5. **정보 입력** — 이름(닉네임), 연락처, 관심 항목 선택, 개인정보 동의
6. **로딩** — "당신의 미래를 굽는 중이에요..." 애니메이션
7. **결과** — 3줄의 맞춤 포춘쿠키 메시지 + 빵 유형 결과 카드

## 빵 유형 시스템

질문 3의 답변에 따라 5가지 빵 유형 중 하나가 배정됩니다:

| 답변 | 빵 유형 | 성격 |
|------|---------|------|
| 정보 | 🥐 지혜로운 크루아상 | 정보탐험형 — 정확한 정보로 선택하는 타입 |
| 안전망 | 🍞 든든한 통밀식빵 | 안정설계형 — 현실적인 기반을 먼저 다지는 타입 |
| 응원 | 🥞 포근한 팬케이크 | 온기충전형 — 마음의 온기를 중요하게 여기는 타입 |
| 계획 | 🥨 치밀한 프레첼 | 플래너형 — 실행 가능한 계획을 세우는 타입 |
| 연결 | 🥖 다정한 브리오슈 | 브릿지형 — 관계의 힘을 믿는 타입 |

## 제출 후 일어나는 일

사용자가 제출 버튼을 누르면 뒷단에서 자동으로 처리됩니다:

1. **포춘쿠키 메시지 생성** — 3개 질문 답변을 조합해 3줄 메시지를 만듭니다.
2. **문자 발송** — 입력한 연락처로 포춘쿠키 메시지를 문자(SOLAPI)로 보냅니다.
3. **공유 이미지 생성** — 결과를 예쁜 카드 이미지로 만들어 SNS 공유에 사용할 수 있게 합니다.
4. **OG 이미지 생성** — 링크 공유 시 미리보기에 표시될 이미지를 만듭니다.

## 주요 페이지

| 주소 | 설명 |
|------|------|
| `/` | 메인 페이지 (질문 → 결과) |
| `/r/[id]` | 개별 결과 공유 페이지 (링크로 공유 가능) |
| `/ops?key=...` | 운영 대시보드 (제출 건수, 상태 모니터링) |
| `/admin` | 관리자 페이지 (제출 데이터 관리) |

---

## 개발자를 위한 정보

아래부터는 이 서비스를 직접 운영하거나 개발하는 분을 위한 내용입니다.

### 기술 스택

- **프론트엔드**: Next.js 15 + React 19
- **백엔드/DB**: Supabase (PostgreSQL)
- **배포**: Vercel
- **문자 발송**: SOLAPI
- **이미지 생성**: sharp + Next.js OG Image

### 설치 및 실행

```bash
cp .env.example .env.local   # 환경변수 파일 복사
# .env.local에 Supabase, SOLAPI 등 시크릿 값 입력
npm install                   # 패키지 설치
npm run dev                   # 로컬 개발 서버 시작
```

DB 마이그레이션: `supabase/migrations/0001_init.sql` 실행

### 아키텍처 (대량 트래픽 대응)

페스티벌 등 버스트 트래픽에 대비한 설계입니다:

- **제출 경로** (`POST /api/submit`): 빠르게 데이터 저장 + 이벤트 큐에 등록 후 즉시 응답
- **비동기 처리**: 문자 발송, 이미지 생성 등 무거운 작업은 백그라운드 워커가 처리
- **동시성 제어**: PostgreSQL `FOR UPDATE SKIP LOCKED`로 워커 간 충돌 방지
- **자동 재시도**: 실패 시 지수 백오프로 재시도, 최대 횟수 초과 시 `FAILED` 처리
- **디스패치 누지**: `SUBMIT_DISPATCH_NUDGE_MODULO` 설정으로 실시간성과 부하 사이 균형 조절

### Worker 인증

내부 작업 경로는 다음 중 하나로 인증합니다:
- `x-worker-key: <WORKER_API_KEY>`
- `Authorization: Bearer <CRON_SECRET>` (Vercel Cron용)

### API 경로

| 경로 | 메서드 | 설명 |
|------|--------|------|
| `/api/submit` | POST | 사용자 제출 |
| `/api/jobs/process-submissions` | POST | 제출 이벤트 처리 |
| `/api/jobs/send-message` | POST | 문자 발송 |
| `/api/jobs/generate-image` | POST | 공유 이미지 생성 |
| `/api/cron/dispatch` | GET/POST | 워커 디스패치 |
| `/api/ops/summary` | GET | 운영 요약 JSON |
| `/api/og/[submissionId]` | GET | OG 이미지 생성 |

### 부하 테스트

```bash
# 대량 제출 테스트
LOADTEST_BASE_URL="https://YOUR_URL" LOADTEST_TOTAL=5000 LOADTEST_CONCURRENCY=80 npm run loadtest:submit

# 워커 드레인 테스트
LOADTEST_BASE_URL="https://YOUR_URL" WORKER_API_KEY="$WORKER_API_KEY" LOADTEST_DRAIN_CYCLES=30 npm run loadtest:drain
```

### 디스패치 튜닝

- **`SUBMIT_DISPATCH_NUDGE_MODULO`**: 제출 N건당 1건이 디스패치를 트리거 (기본값 8)
  - 값이 작을수록 → 실시간에 가깝지만 서버 부하 증가
  - 값이 클수록 → 부하 감소, 크론에 더 의존
- **`/api/cron/dispatch` 파라미터**: `submissionBatch`, `jobBatch`, `maxCycles`, `budgetMs`, `leaseTtlSeconds`
