# EMS Atlas 독립 리뷰 요청

당신은 제조 EMS를 처음 인수하는 제품·데이터·소프트웨어 리뷰어입니다. 이 문서가 포함된 커밋을 체크아웃하고 SHA를 기록한 뒤, 비즈니스 사용자와 공장 담당자의 입장에서 앱을 실행하고 검토해 주세요. 산출물은 한국어 리뷰 보고서입니다. 코드 변경·배포·실제 담당자 연락은 별도 작업입니다.

- GitHub 저장소 https://github.com/doyeonkim2016/ems-atlas
- 배포 앱 https://ems-field-atlas.doyeon9502s2.chatgpt.site (소유자 접근 제한이 있을 수 있음)
- 대응하는 Sites 소스 커밋 8c3e678bbfa2912920b06b43499dbe10aa9ae5a2. GitHub는 정적 파일과 SQL을 루트에 둔 공개용 레이아웃입니다.

## 무엇을 해결하려는가

에너지 보고 담당자가 일일 배치 후 월별·주별 사용량을 살펴보고, 변화를 만든 공장·미터·시간을 찾아, 원본과 처리 근거를 확인한 뒤 현장에 질문하고 보고 가능 여부를 결정하는 제품입니다. 설계 규모는 세계 20개 공장에 **합계 약 1,000개 미터**입니다. 한 사람이 무엇을 먼저 조사하고 누구의 답을 기다리는지 알아볼 수 있어야 합니다.

Reporting → Investigation → Operations를 따라가세요. 연간 월별 개요, 공장 지도, 주간 비교, 태그 구성 Treemap/Sankey, 시간별 프로파일, Silver/Gold 근거, 룰북, 검토 요청과 Teams 모니터링이 있습니다. 월·일·15분의 의미와 데이터 최신 일자가 명확한지, 필터 변경 후에도 공장·미터·UTC 기간이 일치하는지 보세요. 지도는 공장 위치 정확성, Sankey는 계층별 기여와 물리 흐름의 구별을 평가하세요. 물리 흐름에는 승인된 topology와 submeter 매핑이 필요합니다.

## 데이터의 출처와 의미

1. 현재 공개 앱은 가상 데이터입니다. 0188의 10월 1일 이상 15일 미만 UTC, 5개 태그의 상세 데모와 20개 공장의 네트워크 데모는 독립된 시나리오입니다. 전체 보고 수치는 브라우저에서 생성·집계합니다. 선택한 미터·날짜의 DQ 슬롯과 alert, 검토 요청은 앱 DB에 저장됩니다. 브라우저는 같은 출처의 Worker를 통해 DB를 사용합니다.
2. 별도의 과거 CSV 파일럿에 대해 제품 담당자가 제공한 배경은 카탈로그 354태그, 관측 17태그, 환산 가능 전기 태그 11개, Silver 주별 행 합계 20,222건입니다. 개별 event 표본은 한 태그 하루 3,439건 모두 ok였습니다. 현재 시뮬레이션이나 전체 2주 검증 결과로 인용하지 마세요. CSV 종류는 meter_catalog, contributions_weekly, silver_coverage_weekly, selected_tag_hourly, selected_tag_observations_one_day입니다.
3. 실제 파이프라인의 Bronze는 IoT JSON·파일 경로·적재 시각, Silver는 파싱·필터·중복 제거 후의 meter reading입니다. 파싱 실패는 별도 quarantine입니다. Silver 누적 raw_value와 Gold가 보존한 raw_value, 직전 채택 기준 prev_value, 보고 delta인 value를 구분하세요. Gold-only override가 가능합니다. event_key로 연결하고 긴 tag_id 및 앞자리 0이 있는 plant_id는 문자열로 보존합니다. 2026-07-01 UTC 이전 legacy_direct_delta와 이후 vee_v1의 경계를 장기 비교에서 어떻게 보여줄지 평가하세요.
4. 에너지는 running-total 태그에서 채택한 delta × FactorToMJ의 합 / 3600 MWh입니다. NULL·0·누락 계수·순간 power의 표현을 검토하세요. Supply와 하위 Demand의 단순 합은 중복될 수 있습니다. 승인된 cadence, grace, 운영일·정비 제외가 없으면 공식 completeness는 미판정입니다. 전체 2주 export는 Silver/Gold full outer join과 manifest 행 수, 중복 event_key, 기간 검증이 필요한 별도 작업입니다.
5. 향후 app DB에 일일 배치로 데이터를 공급하는 방향을 기준으로 평가하세요. Databricks 실시간 조회를 필수 전제로 두지 마세요. 필요한 입력은 승인된 미터 역할·단위·cadence·시간대, 룰 버전·threshold, 배치 watermark, 원본 event와 VEE 평가·예외, 보고 상태, 검토 결정, incident 및 전송 시도입니다. Bronze/Silver에서 이미 제거된 행은 Gold만 보고 원인을 확정할 수 없습니다.

## 코드와 실행

README.md부터 읽으세요. index.html, app.js, brand.css는 탐색과 스타일, reported-energy.js와 report-desk.js는 가상 event와 보고 합계·비교·finding, rules.js와 gold.js는 조사 화면, dq-day.js는 DB 히트맵입니다. dq-store.js와 worker.js는 같은 출처의 서버 경계, 두 SQL 파일은 DB 구조와 트리거, reviews.js·teams.js·teams_relay.py는 현장 요청·전달 처리입니다. 화면의 설명과 실제 SQL 조건을 대조하세요.

로컬 정적 화면은 저장소 루트에서 python3 -m http.server 8000으로 열 수 있습니다. node build.mjs로 dist/server/index.js를 생성합니다. DB 기능은 D1 호환 Worker에서 DB 바인딩과 0000_review_requests.sql → 0001_meter_dq.sql 적용이 필요합니다. 임시 SQLite에서도 두 SQL을 적용하고 독립적으로 INSERT/SELECT하여 룰을 검증할 수 있습니다. 정적 서버에서 실패한 DB 요청, 로컬 통합 테스트, 배포 브라우저에서 확인한 결과를 각각 기록하세요.

## 반드시 재현할 업무 시나리오

| 검토 항목 | 절차와 기대 결과 |
|---|---|
| Spike와 기준값 | Reported energy → Demand → Chilled storage → 10월 1일 → Daily rule checks → Load sample day. 96개 슬롯에서 10:15 SPIKE, 15:15 LOW, 21:15 GOLD_MISSING을 찾습니다. 10:15 원본은 보존되고 delta는 NULL입니다. 10:30이 10:00 기준을 사용하는지와 해당 30분의 세부 사용 배분이 불확실함을 확인하세요. |
| Reset·override | 18:00 reset_anchor의 NULL과 새 기준, 22:30 승인 override의 Gold 행과 대응 Silver 부재를 확인하세요. 그 상태 자체로 경보가 생성되는지 검사하세요. |
| 정상 계산된 이상 사용 | 같은 미터 10월 2일. 예정 휴지 시간에 delta > 2 kWh인 8개 슬롯이 REST를 발생시키고 사용량은 보고 합계에 포함됩니다. 8개 구간 alert와 연속된 한 finding, 현장 요청이 각각 어떻게 보이는지 설명하세요. |
| 8가지 demo_v1 조건 | SPIKE·LOW는 upstream Gold status, GOLD_MISSING은 Silver만 존재, FACTOR는 누적형·delta 존재·계수 누락, REST는 휴지 중 2 kWh 초과, UNIT은 Silver 단위 공백, VALUE는 Silver raw NULL, NO_READING은 overdue이고 Silver 없음·승인 override 제외입니다. 룰별 정상·위반·경계값과 한 슬롯의 복수 위반을 임시 DB에서 검사하세요. reset, 멈춘 미터(flatline), 비가동 시간 사용의 의미를 구분하세요. |
| 빈 날과 재실행 | 적재 전 빈 결과, 정상 슬롯, pending, 명시적 overdue를 구분하세요. DB INSERT 트리거와 유일 키가 재적재 중복을 방지하는지 확인하세요. 행이 전혀 없는 날을 찾는 스케줄러, 늦은 도착·정정 재평가, 룰 재버전 적용은 별도 평가 항목입니다. |
| 조사와 조치 | 히트맵의 ! → 룰·버전·시각·reading·delta → Inspect event and request review를 따라가세요. DB 증거와 브라우저 생성 event가 항상 같은지, 요청에 원래 룰·finding ID가 구조적으로 보존되는지 확인하세요. 테스트용 DB에서 Open → In review → Resolved, 보고 판단 Undecided / Ready to report / Hold for correction 및 동시 수정 충돌을 확인하세요. |
| Teams | 초안 열기, 사용자의 수동 전송, 선택형 Python relay, Workflow HTTP 수락, 실제 게시·담당자 확인을 각각 구분하세요. 실제 메시지를 보내지 않고 예시 payload·로컬 로그로 재시도와 연결 ID를 확인하세요. 영구 incident·전송 로그와 callback이 필요한 지점을 명시하세요. |
| 디자인과 비교 | 월 → 공장 → 미터 → 이상 시각을 처음 쓰는 사용자가 찾는지 살펴보세요. 두 점 차트의 동일 요일·매칭 슬롯, 기준 주 부재, 96칸 히트맵의 색상·!·시간축·키보드·터치, hover 값, 모바일과 reduced motion을 확인하세요. 코카콜라풍 색상, 글꼴과 대비, 섹션 밀도를 실제 화면에서 평가하세요. |

## 결과 형식

첫 문단에 “데모 시연 가능 여부 / 운영 투입 가능 여부 / 가장 큰 근거”를 쓰세요. 이어서 ① 실행 환경·검토 SHA·검증 범위 ② 사용자 여정별 통과·실패·미검증 ③ 심각도순 이슈 표 ④ 개선 우선순위를 제시하세요. 이슈마다 파일·줄, 입력과 재현 절차, 기대값·실제값, 잘못될 업무 판단, 최소 수정과 회귀 검사를 적으세요. 제품 설명만으로 결함을 단정하지 말고 구현·실행 증거와 가정을 분리하세요. 수정 제안은 한 공장 실사용을 위한 필수 사항과 20개 공장 확장 시 필요한 사항으로 나누세요. 우선순위에는 KPI 정합성, 공장별 접근 제어, 일일 배치 부분 실패·재처리, 조회 범위·페이지 처리, 배치 최신성, Teams 상태 추적을 포함하세요.
