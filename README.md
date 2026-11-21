# EMS Atlas · Energy Data Studio

EMS Atlas는 제조 공장의 에너지 담당자와 데이터 엔지니어가 **보고된 사용량이 어떻게 계산됐고, 이상 구간을 누가 확인해야 하는지** 함께 살펴보는 웹앱입니다. 월간 보고를 작성하는 사람은 MWh에서 시작해 개별 계량기와 시간대를 선택할 수 있고, 현장 담당자는 같은 측정값을 보면서 검토 결과를 남길 수 있습니다.

이 저장소는 **가상 데이터로 실행되는 프로토타입**입니다. 기본 화면은 가상 plant `0188`의 2026년 10월 1일부터 14일까지를 UTC로 보여줍니다. 별도의 네트워크 데모에서는 20개 공장의 일일 배치 상태를 탐색합니다. 두 시나리오의 기간과 측정값은 각각 독립적입니다.

## 3분 둘러보기

1. **Reporting → Reported energy**에서 `Demand`, `Chilled storage`, 10월 1일의 10시를 선택합니다.
2. **10:15**를 열면 누적 reading의 일시적 급증으로 Gold delta가 제외된 사례를 볼 수 있습니다. **10:30**에는 마지막으로 채택한 10:00 reading을 기준으로 증가량을 계산합니다. 뒤의 값에 두 구간의 증가량이 함께 반영되므로 15분별 사용량 배분에는 불확실성이 남습니다.
3. **18:00**에는 새 기준점이 된 reset anchor가, **22:30**에는 대응하는 Silver 행이 없는 승인 override가 있습니다. 계산 근거에서 이전 기준값, 원본값, 최종 delta, 환산 계수를 확인합니다.
4. **Reporting alerts**에서 10월 2일 냉동 설비의 휴지 시간 사용을 선택합니다. 연속된 8개 구간이 한 건으로 묶이고, 해당 소비량은 보고 합계에 포함됩니다. 담당자에게는 예정된 세척이나 재가동이 있었는지 질문할 수 있습니다.

## 사용자별 주요 화면

| 화면 | 답할 수 있는 질문 | 기능 |
|---|---|---|
| Reported energy | 선택 범위에서 얼마를 사용했고 어떤 미터가 변화에 기여했나? | Supply/Demand 범위 선택, Gold MWh, 비교 가능한 전주 동일 요일, 미터별 변화 기여, 시간별 막대, event 상세, CSV 다운로드 |
| Monthly overview | 어느 공장과 어느 달을 확인해야 하나? | 일일 배치의 평가 완료·대기·지연, 공장×월 매트릭스, 월별 일자 상태, 공장 지도와 최신 평가일 재생 |
| Weekly comparison | 어떤 설비 또는 태그가 두 주의 차이를 설명하나? | 동일 요일 비교, 수집률, 주간 그래프, 변화 분해, 태그별 Treemap·Sankey. Sankey는 태그 사이의 사용량 배분을 표현합니다. |
| Investigation | 어느 시점에 어떤 룰이 위반됐나? | 15분 프로파일, 기준선, 시점 선택, 서브미터별 룰 근거, 적용·통과·위반·미적용 구분, 품질 히트맵과 분석 차트 |
| Silver → Gold | 파이프라인이 어떤 값을 채택했으며 채택 이후에도 이상이 있나? | 단일 서브미터의 누적 reading과 delta를 별도 축에 표시하고 같은 시간 위치에서 확인. 데모 룰로 reset, 제외, 중복 출력, 휴지 시간 사용, 상하위 합계 차이를 조사 |
| Operations | 누가 무엇을 확인 중이고, 보고는 진행할 수 있나? | 알림 목록, 현장 확인 요청, 담당자, 질문·응답 이력, Teams 초안, 요청 처리 상태와 보고 결정 |

## 수치 해석

- **Silver raw_value**는 누적형 계량기의 원본 reading입니다. **Gold prev_value**는 비교에 사용한 직전 채택 기준값이고 **Gold delta**는 보고용 증가량입니다. 제외된 delta의 NULL과 실측 0을 구별합니다.
- **보고 MWh**는 running-total 태그의 채택된 delta에 해당 태그의 FactorToMJ를 곱해 합산한 뒤 3,600으로 나눕니다. 순간 전력(kW)과 환산 계수가 없는 값은 에너지 합계에서 제외합니다.
- **Supply**는 유입 계측, **Demand**는 사용처 계측입니다. 상위와 하위 계량기가 같은 에너지를 측정할 수 있어 두 범위를 분리합니다.
- 관측 행 수는 수집 현황을 알려줍니다. 공식 completeness에는 승인된 대상 태그, cadence, 운영 달력과 제외 기간이 필요합니다. 가상 파일럿에는 기대 수신 주기 미승인 상태를 표시합니다.
- Gold 채택 여부와 운영 이상 여부는 독립적으로 읽습니다. 허용 범위 안의 delta도 비가동 시간에 반복되면 현장 확인 대상이 됩니다. 룰과 임계값은 설명용 데모 정책입니다.

## 알림·검토·Teams

보고 화면에서는 같은 미터에서 같은 룰이 연속된 구간을 하나의 finding으로 묶습니다. 선택한 기간의 구간 수, 영향 설명, 연결된 요청을 확인할 수 있습니다. 요청에는 공장, 미터, 시점, 측정 근거와 질문이 저장됩니다.

- **업무 상태**는 Open, In review, Resolved입니다. **보고 결정**은 Undecided, Ready to report, Hold for correction입니다. 현장 답변이 끝나도 재처리가 필요하면 보고를 보류할 수 있습니다.
- **수동 연락**은 저장된 요청에서 Teams 채팅 초안을 열고 사용자가 Send를 누르는 방식입니다. 답변과 판정은 웹앱에 기록합니다.
- **파이프라인 릴레이**는 선택 기능입니다. Python의 teams_relay.py가 서버 환경의 TEAMS_WORKFLOW_URL을 읽어 이벤트를 보내고 로컬 SQLite에 전송 시도를 기록합니다. 인증이 필요한 환경에서는 TEAMS_ACCESS_TOKEN을 사용할 수 있습니다. 명령 옵션은 python teams_relay.py --help 로 확인할 수 있습니다.
- **전달 증거**는 Teams monitoring에서 가져온 로그와 이벤트 ID를 대조합니다. Workflow의 HTTP 수락과 채널 게시, 담당자 확인은 서로 다른 상태입니다. 현재 운영 Teams 피드와 Databricks 조회는 연결되어 있지 않습니다.

## 데이터와 소스 구조

Reported energy의 가상 event에서 다섯 CSV를 생성합니다. 태그 ID는 긴 정수를 보존하는 문자열이고 plant ID는 앞자리 0을 유지합니다.

| 다운로드 | 범위 |
|---|---|
| meter_catalog.csv | 태그 메타데이터, 계측 역할, 단위 |
| contributions_weekly.csv | 태그·주별 Gold 에너지와 환산 상태 |
| silver_coverage_weekly.csv | 태그·주별 Silver 관측 수와 원본 범위 |
| selected_tag_hourly.csv | 선택 태그의 시간별 Gold 기여 |
| selected_tag_observations_one_day.csv | 선택 태그·날짜의 event별 Silver와 Gold 근거 |

프론트엔드는 빌드 없이 실행되는 HTML, CSS, JavaScript와 SVG 차트로 구성됩니다. reported-energy.js가 파일럿 event와 집계를, report-desk.js가 변화 기여와 보고 알림을, rules.js와 gold.js가 룰과 처리 근거를 담당합니다. reviews.js는 요청 화면, worker.js는 정적 자산과 /api/reviews API, 0000_review_requests.sql은 요청 테이블 정의입니다.

## 실행

저장소 루트에서 정적 미리보기를 시작합니다.

```sh
python3 -m http.server 8000
```

브라우저에서 http://localhost:8000 을 엽니다. 보고 수치, 차트, 가상 CSV는 브라우저에서 동작합니다. 이 모드에서 요청 조회·저장은 서버 연결 필요 상태로 표시됩니다.

요청 저장까지 실행하려면 Node.js로 Worker 번들을 생성합니다.

```sh
node build.mjs
```

생성된 dist/server/index.js는 표준 fetch 엔트리포인트를 가진 Worker ES 모듈입니다. Worker 런타임에서 D1 데이터베이스를 DB 이름으로 바인딩하고 0000_review_requests.sql을 먼저 적용합니다. API는 GET으로 요청 목록을 읽고 POST로 생성하며 PATCH로 판정 이력을 갱신합니다. 수정 시 version으로 동시 변경 충돌을 감지합니다. 호스팅 환경에서 사용자 인증과 접근 범위를 설정해야 합니다. 실제 공장 데이터, Teams 웹훅 URL, 토큰, 담당자 이메일은 공개 소스에 넣지 마세요.
