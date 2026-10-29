# 안전온 — 위험성평가 플랫폼 미리보기

## 프로젝트 개요
연도·정기/수시·세부 분류·팀·공정별로 유해위험요인 문서와 개선요청 PPT를 관리하는 플랫폼입니다.
현재 샌드박스는 Java 17 + Spring Boot + MariaDB API를 사용하며, 실제 파일은 서버 로컬 저장소에 저장됩니다.

## 현재 구현된 화면
- 유해위험요인 대시보드 (125% 고정)
- 평가 흐름: 연도 → 정기/수시 → 분류 → 세로형 팀 목록 → 팀별 공정 선택 → 파일
- 정기 위험성평가 분류 레이블 `유해∙위험요인` 편집 및 MariaDB 공유 저장
- 팀별 공정 목록을 MariaDB에 공유 저장하고 각 팀에서 공정을 추가
- 정기: 유해위험요인 XLS/XLSX 및 개선요청 PPT/PPTX 업로드
- 수시: 개선요청 PPT/PPTX 업로드만 허용
- 파일 메타데이터 MariaDB 저장, 바이너리 `data/uploads/` 저장, 목록·브라우저 미리보기·다운로드·관리자 삭제
- 위험성평가 실시 시작 단계에서 평가일시·평가자·위험성평가 참여자를 입력하고, 수시 선택 시 평가 사유를 추가 입력
- 입력한 평가 메타데이터를 정기 XLSX 및 수시/정기 개선요청 MariaDB 기록에 저장
- 위험성평가 실시: 팀·공정 선택 후 정기는 유해위험요인 작성, 수시는 위험요인 시트 없이 개선요청 작성
- 정기 평가는 빈도(1~5) × 강도(1~4)로 위험도를 계산하고 위험요인 행을 공정별 XLSX에 저장; 위험도 8 이상은 개선요청으로 이어짐
- 수시 위험성평가 개선요청은 부서·팀과 공정을 선택해 바로 등록
- 개선요청은 요청·진행·완료 상태를 표에서 선택하고 완료일을 기록
- 엑셀 파일은 브라우저에서 열람하고 기존 셀을 수정·저장·인쇄 가능
- PPTX 개선요청 파일도 브라우저에서 슬라이드/표 텍스트를 미리보고 수정·저장·인쇄 가능
- 대시보드 크기는 125%로 고정하고 크기 조절 UI 제거
- 대시보드 제목 레이블 편집 및 MariaDB 공유 저장
- 빈도×강도 위험도 계산, 위험도 8 이상 개선 건 테이블, 진행/완료 상태 및 완료일 정렬
- 일반 기능은 로그인 없이 조회·다운로드·업로드·엑셀 수정·개선 건 등록·상태 변경 가능
- 로그인 UI는 현재 숨김. `/api/admin/**` 및 파일 삭제는 ADMIN 세션 보호를 유지하며, 관리 UI는 로그인 재설계 후 연결
- 안전온 로고를 누르면 대시보드 처음 화면으로 이동
- `/health` 상태 확인 엔드포인트
- Spring Boot가 제공하는 정적 UI 리소스는 `src/main/resources/static/static/`에 배치하고 `public/static/`과 동기화해야 함

## 진입 경로
- `/` : 대시보드 화면
- `/health` : 서버 상태 확인 JSON
- `GET /api/settings/dashboard-title`, `PUT /api/settings/dashboard-title` : 대시보드 제목 조회·저장
- `GET /api/settings/hazard-risk-label`, `PUT /api/settings/hazard-risk-label` : 위험요인 레이블 조회·저장
- `GET /api/settings/team-processes`, `PUT /api/settings/team-processes` : 팀별 공정 분류 조회·저장
- `POST /api/files/hazard-assessments` : 정기 위험요인을 점수화하고 평가일시·평가자·참여자와 함께 해당 팀·공정 XLSX에 기록
- `POST /api/improvements` : 평가일시·평가자·참여자·수시 평가 사유를 포함한 개선요청 등록
- `PUT /api/files/{id}/spreadsheet` : XLS/XLSX 기존 셀 수정 저장 (요청 최대 500셀)
- `GET/PUT /api/files/{id}/presentation` : PPTX 슬라이드와 표 텍스트 미리보기·수정 저장
- `PATCH /api/improvements/{id}/status` : 개선요청 상태 요청·진행·완료 변경
- XLSX/PPTX 파일명을 누르면 브라우저에서 열고 편집·저장·인쇄 가능; 원본 다운로드도 제공

## 아직 연결되지 않은 기능
- 업로드된 엑셀/PPT 내용의 자동 분석 및 위험요인 레코드 자동 생성 (엑셀 열람·수정·저장·인쇄는 지원)
- 절차서·완료 예시와 동일한 개선요청 PPT 자동 생성
- 사진 기반 AI 위험요인 제안
- 실제 운영 배포용 지속성 있는 공유 파일 스토리지와 백업 정책
- 비밀번호 변경/초기화, 계정 잠금 등 운영 보안 보강

## 실행 방법
```bash
cd /home/user/webapp
pm2 start ecosystem.config.cjs
```
`.env`에는 데이터베이스와 초기 관리자 자격 증명이 저장됩니다. 업로드 디렉터리는 `data/uploads/`이며 Git에서 제외됩니다. 미리보기는 포트 3000에서 실행하고 `pm2 logs webapp --nostream`으로 로그를 확인합니다.

## 기술 및 배포 상태
- 런타임: Java 17, Spring Boot 3.5.16, MariaDB 11.8.6
- 접근 제어: 일반 API는 공개, `/api/admin/**` 및 파일 삭제는 ADMIN 세션 인증 유지
- CSRF: 공개 쓰기 요청도 쿠키 기반 CSRF 토큰 검증 유지
- 저장: MariaDB 메타데이터 + 샌드박스 로컬 파일 시스템
- 저장소: `https://github.com/chatgptcjsu/Risk-management` (`main` 브랜치)
- Spring Boot는 Cloudflare Pages에서 직접 실행되지 않으므로 실제 운영 배포에는 Java 지원 서버와 영속 파일 스토리지가 필요합니다.
