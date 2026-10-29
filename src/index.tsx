import { Hono } from 'hono'
import { renderer } from './renderer'

const app = new Hono()

app.use(renderer)

const iconPaths: Record<string, string> = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  clipboard: 'M9 4h6l1 2h4v15H4V6h4l1-2zM9 11h6M9 15h6M9 18h4',
  alert: 'M12 3 2.8 20h18.4L12 3zM12 9v4M12 17h.01',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8',
  users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.6 2.77-.09-.03a1.7 1.7 0 0 0-1.8.25l-.07.06h-3.2l-.02-.1a1.7 1.7 0 0 0-1.3-1.25l-.1-.02-1.6-2.77.07-.07a1.7 1.7 0 0 0 .25-1.8l-.03-.09v-3.2l.1-.02a1.7 1.7 0 0 0 1.25-1.3l.02-.1 2.77-1.6.07.07a1.7 1.7 0 0 0 1.8.25l.09-.03 2.77 1.6-.03.09a1.7 1.7 0 0 0 .25 1.8l.06.07v3.2z',
  search: 'm20 20-4.3-4.3M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  plus: 'M12 5v14M5 12h14',
  up: 'M7 17 17 7M7 7h10v10',
  down: 'm7 10 5 5 5-5',
  clock: 'M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  check: 'm5 12 4 4L19 6',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  image: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM22 15l-5-5L5 20',
  spark: 'm12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3zM19 14l1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14z',
  x: 'M18 6 6 18M6 6l12 12',
  edit: 'm16 4 4 4M4 20l4.5-1 11-11a2.12 2.12 0 0 0-3-3l-11 11L4 20z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
}

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={iconPaths[name] || iconPaths.grid} />
    </svg>
  )
}

const departmentFolders = [
  { name: '제지생산1팀', processes: ['원질', '초지'] },
  { name: '제지생산2팀', processes: ['카타', '포장'] },
  { name: '화장지생산팀', processes: ['초지', '가공'] },
  { name: '패드생산팀', processes: [] },
  { name: 'PS품질보증팀', processes: [] },
  { name: 'HL품질보증팀', processes: [] },
  { name: '환경에너지팀', processes: ['에너지', '환경'] },
  { name: '공무팀', processes: [] },
  { name: '전기팀', processes: [] },
  { name: '구매1팀', processes: [] },
]

const assessmentFolders = [
  {
    id: 'regular',
    name: '정기 위험성평가',
    description: '위험요인 평가와 개선요청 관리',
    subfolders: [
      { id: 'hazards', name: '유해∙위험요인' },
      { id: 'improvements', name: '개선요청 건' },
    ],
  },
  {
    id: 'adhoc',
    name: '수시 위험성평가',
    description: '사유 발생 시 평가',
    subfolders: [
      { id: 'improvements', name: '개선요청 건' },
    ],
  },
]

const assessmentYears = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index)

function TeamTree({
  branchId,
  parentPath,
  year,
  assessmentType,
  category,
}: {
  branchId: string
  parentPath: string
  year: number
  assessmentType: 'REGULAR' | 'AD_HOC'
  category: 'HAZARD_RISK' | 'IMPROVEMENT_REQUEST'
}) {
  return (
    <>
      {departmentFolders.map((department, departmentIndex) => {
        const departmentId = `${branchId}-team-${departmentIndex}`
        const departmentPath = `${parentPath} / ${department.name}`
        return department.processes.length > 0 ? (
          <div class="tree-team-group" key={departmentId}>
            <button class="tree-toggle tree-team-toggle" type="button" data-tree-toggle={`department-${departmentId}`} aria-expanded="false" aria-controls={`department-content-${departmentId}`}>
              <span class="tree-team-marker"></span><span class="tree-team-name">{department.name}</span><Icon name="down" className="tree-chevron" />
            </button>
            <div class="tree-process-content" id={`department-content-${departmentId}`} hidden>
              {department.processes.map((process) => {
                const processPath = `${departmentPath} / ${process}`
                return (
                  <div class="tree-process-entry" key={`${departmentId}-${process}`}>
                    <button class="tree-selectable tree-process-leaf" type="button" data-workspace-selection={processPath} data-file-year={year} data-file-assessment-type={assessmentType} data-file-category={category} data-file-team={department.name} data-file-process={process}>
                      <span class="tree-process-marker"></span><span>{process}</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div class="tree-team-entry" key={departmentId}>
            <button class="tree-selectable tree-team-leaf" type="button" data-workspace-selection={departmentPath} data-file-year={year} data-file-assessment-type={assessmentType} data-file-category={category} data-file-team={department.name} data-file-process="">
              <span class="tree-team-marker"></span><span>{department.name}</span>
            </button>
          </div>
        )
      })}
    </>
  )
}

app.get('/', (c) => {
  return c.render(
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <a class="brand" href="#overview" aria-label="안전온 홈">
          <span class="brand-mark">
            <svg viewBox="0 0 36 40" fill="none" aria-hidden="true"><path d="M18 2 32 7v10c0 9.2-5.9 16.8-14 20C9.9 33.8 4 26.2 4 17V7l14-5Z" fill="currentColor"/><path d="m11 19 4.3 4.3L25.5 13" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <span class="brand-copy"><strong>안전온</strong><small>SAFETY MANAGEMENT</small></span>
        </a>

        <div class="workspace-switcher">
          <span class="workspace-avatar">청</span>
          <span class="workspace-copy"><strong>청주공장</strong><small>깨끗한나라 · 사업장</small></span>
          <Icon name="down" className="workspace-chevron" />
        </div>

        <div class="nav-section-label">WORKSPACE</div>
        <nav class="side-nav workspace-home-nav" aria-label="워크스페이스">
          <a class="nav-item active dashboard-nav-item" href="#overview"><Icon name="grid" /><span>대시보드</span></a>
        </nav>

        <section class="workspace-tree" aria-label="위험성평가 분류">
          <button class="workspace-assessment-toggle is-open" type="button" data-tree-toggle="workspace-assessments" aria-expanded="true" aria-controls="workspace-assessments-content">
            <span class="workspace-assessment-icon"><Icon name="clipboard" /></span>
            <span class="workspace-assessment-title">위험성평가</span>
            <span class="workspace-assessment-count">24</span>
            <Icon name="down" className="tree-chevron" />
          </button>
          <div class="workspace-tree-content" id="workspace-assessments-content">
          {assessmentYears.map((year) => (
            <div class="tree-year-group" key={year}>
              <button class={`tree-toggle tree-year-toggle${year === 2026 ? ' is-open' : ''}`} type="button" data-tree-toggle={`year-${year}`} aria-expanded={year === 2026 ? 'true' : 'false'} aria-controls={`year-content-${year}`}>
                <span class="tree-year-icon"><Icon name="calendar" /></span>
                <span class="tree-year-label">{year}년</span>
                {year === 2026 ? <span class="tree-current-badge">현재</span> : <span class="tree-archive-badge">보관</span>}
                <Icon name="down" className="tree-chevron" />
              </button>
              <div class="tree-year-content" id={`year-content-${year}`} hidden={year !== 2026}>
                {assessmentFolders.map((folder) => {
                  const categoryId = `${year}-${folder.id}`
                  return (
                    <div class="tree-category-group" key={categoryId}>
                      <button class="tree-toggle tree-category-toggle" type="button" data-tree-toggle={`category-${categoryId}`} data-assessment-type={folder.id === 'regular' ? 'REGULAR' : 'AD_HOC'} data-assessment-year={year} aria-expanded="false" aria-controls={`category-content-${categoryId}`}>
                        <span class={`tree-category-icon category-icon-${folder.id}`}><Icon name={folder.id === 'regular' ? 'clipboard' : 'alert'} /></span>
                        <span class="tree-category-copy"><strong>{folder.name}</strong><small>{folder.description}</small></span>
                        <Icon name="down" className="tree-chevron" />
                      </button>
                      <div class="tree-category-content" id={`category-content-${categoryId}`} hidden>
                        {folder.subfolders ? folder.subfolders.map((subfolder) => {
                          const subfolderId = `${categoryId}-${subfolder.id}`
                          const subfolderPath = `${year}년 / ${folder.name} / ${subfolder.name}`
                          return (
                            <div class="tree-subfolder-group" key={subfolderId}>
                              <button class="tree-toggle tree-subfolder-toggle" type="button" data-tree-toggle={`subfolder-${subfolderId}`} data-subcategory={subfolder.id === 'hazards' ? 'HAZARD_RISK' : 'IMPROVEMENT_REQUEST'} data-assessment-type={folder.id === 'regular' ? 'REGULAR' : 'AD_HOC'} data-assessment-year={year} aria-expanded="false" aria-controls={`subfolder-content-${subfolderId}`}>
                                <span class="tree-subfolder-marker"></span><span data-hazard-label={subfolder.id === 'hazards' ? 'true' : undefined}>{subfolder.name}</span><Icon name="down" className="tree-chevron" />
                              </button>
                              <div class="tree-subfolder-content" id={`subfolder-content-${subfolderId}`} hidden>
                                <TeamTree
                                  branchId={subfolderId}
                                  parentPath={subfolderPath}
                                  year={year}
                                  assessmentType={folder.id === 'regular' ? 'REGULAR' : 'AD_HOC'}
                                  category={subfolder.id === 'hazards' ? 'HAZARD_RISK' : 'IMPROVEMENT_REQUEST'}
                                />
                              </div>
                            </div>
                          )
                        }) : (
                          <TeamTree branchId={categoryId} parentPath={`${year}년 / ${folder.name}`} year={year} assessmentType={folder.id === 'regular' ? 'REGULAR' : 'AD_HOC'} category="IMPROVEMENT_REQUEST" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          </div>
        </section>

        <div class="nav-section-label nav-section-spaced">SAFETY OPERATIONS</div>
        <nav class="side-nav" aria-label="안전관리 메뉴">
          <a class="nav-item" href="#high-risks"><Icon name="alert" /><span>개선조치 관리</span><span class="nav-dot"></span></a>
          <a class="nav-item" href="#documents"><Icon name="file" /><span>문서 보관함</span></a>
        </nav>

        <div class="nav-section-label nav-section-spaced">MANAGEMENT</div>
        <nav class="side-nav" aria-label="관리 메뉴">
          <a class="nav-item" href="#team"><Icon name="users" /><span>조직 및 권한</span></a>
          <a class="nav-item" href="#settings"><Icon name="settings" /><span>설정</span></a>
        </nav>

        <div class="sidebar-spacer"></div>
        <div class="safety-tip">
          <span class="tip-icon"><Icon name="spark" /></span>
          <strong>안전은 함께 만드는 것</strong>
          <p>현장 구성원 모두가 위험요인을 발견하고 개선에 참여합니다.</p>
          <a href="#how-it-works">평가 절차 보기 <span>→</span></a>
        </div>
        <button class="profile-card" type="button" aria-label="프로필 메뉴">
          <span class="profile-avatar">김</span>
          <span class="profile-copy"><strong>현장 구성원</strong><small>청주공장 · 공용</small></span>
          <Icon name="more" className="profile-more" />
        </button>
      </aside>

      <main class="main-area" id="overview">
        <header class="topbar">
          <button class="mobile-menu-button" id="mobile-menu-button" type="button" aria-label="메뉴 열기"><Icon name="grid" /></button>
          <div class="breadcrumb"><span>청주공장</span><span class="crumb-separator">/</span><strong id="breadcrumb-selection">대시보드</strong></div>
          <div class="topbar-actions">
            <label class="global-search"><Icon name="search" /><input type="search" placeholder="평가, 공정, 위험요인 검색" aria-label="통합 검색" /></label>
            <button class="icon-button notification-button" type="button" aria-label="알림"><Icon name="bell" /><span class="notification-dot"></span></button>
            <div class="topbar-divider"></div>
            <span class="topbar-date"><Icon name="calendar" /> 2026년</span>
          </div>
        </header>

        <div class="page-content">
          <section class="page-heading">
            <div>
              <div class="eyebrow"><span class="eyebrow-line"></span> SAFETY OVERVIEW <span class="eyebrow-year">2026</span></div>
              <div class="page-title-row"><h1 id="page-title">유해위험요인</h1><button class="title-edit-button" id="edit-dashboard-title-button" type="button" aria-label="대시보드 제목 편집" title="대시보드 제목 편집"><Icon name="edit" /></button></div>
              <p id="page-subtitle">작업현장의 유해·위험요인과 개선 진행 상황을 확인하세요.</p>
            </div>
            <div class="heading-actions">
              <button class="button button-secondary" id="export-button" type="button"><Icon name="download" /> 내보내기</button>
              <button class="button button-primary" id="new-assessment-button" type="button"><Icon name="plus" /> 위험성평가 실시</button>
            </div>
          </section>

          <div id="dashboard-sections">
          <section class="welcome-banner" aria-label="평가 진행 요약">
            <div class="welcome-decoration decoration-one"></div><div class="welcome-decoration decoration-two"></div>
            <div class="welcome-content">
              <span class="welcome-label"><span class="welcome-pulse"></span> 2026 정기 위험성평가 진행 중</span>
              <h2>안전한 현장, <span>함께 만들어가요.</span></h2>
              <p>청주공장 전체 32개 공정 중 24개 공정의 평가가 등록되었습니다.</p>
              <div class="banner-progress-row"><div class="banner-progress"><span style="width:75%"></span></div><strong>75%</strong><span>24 / 32 공정</span></div>
            </div>
            <div class="welcome-illustration" aria-hidden="true">
              <div class="illustration-orbit orbit-a"></div><div class="illustration-orbit orbit-b"></div>
              <div class="illustration-shield"><svg viewBox="0 0 80 90" fill="none"><path d="M40 4 70 15v21c0 21-12.7 38.7-30 47C22.7 74.7 10 57 10 36V15L40 4Z" fill="url(#shieldGradient)"/><path d="m27 42 9 9 19-21" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="shieldGradient" x1="13" y1="9" x2="68" y2="82" gradientUnits="userSpaceOnUse"><stop stop-color="#76D7C4"/><stop offset="1" stop-color="#35B39E"/></linearGradient></defs></svg></div>
              <span class="float-check"><Icon name="check" /></span><span class="float-star">✦</span>
            </div>
          </section>

          <section class="metrics-grid" aria-label="평가 지표">
            <article class="metric-card">
              <div class="metric-top"><span class="metric-icon icon-blue"><Icon name="clipboard" /></span><span class="metric-period">올해 누적</span></div>
              <div class="metric-value-row"><strong class="metric-value" id="total-count">24</strong><span class="metric-unit">건</span><span class="metric-trend trend-neutral"><Icon name="up" /> 6건</span></div>
              <div class="metric-label">전체 평가</div><div class="metric-footnote">정기 18건 <span>·</span> 수시 6건</div>
            </article>
            <article class="metric-card">
              <div class="metric-top"><span class="metric-icon icon-amber"><Icon name="clock" /></span><span class="metric-period">확인 필요</span></div>
              <div class="metric-value-row"><strong class="metric-value">8</strong><span class="metric-unit">건</span><span class="metric-trend trend-amber">진행 중</span></div>
              <div class="metric-label">작성·검토 중</div><div class="mini-avatars"><span>박</span><span>이</span><span>정</span><small>외 5명 진행</small></div>
            </article>
            <article class="metric-card">
              <div class="metric-top"><span class="metric-icon icon-green"><Icon name="check" /></span><span class="metric-period">전체의 54%</span></div>
              <div class="metric-value-row"><strong class="metric-value">13</strong><span class="metric-unit">건</span><span class="metric-trend trend-green"><Icon name="up" /> 3건</span></div>
              <div class="metric-label">승인 완료</div><div class="metric-footnote">전년 동기 대비 <b>+18%</b></div>
            </article>
            <article class="metric-card metric-card-alert">
              <div class="metric-top"><span class="metric-icon icon-red"><Icon name="alert" /></span><span class="metric-period">빠른 조치 권장</span></div>
              <div class="metric-value-row"><strong class="metric-value">12</strong><span class="metric-unit">건</span><span class="metric-trend trend-red">위험도 8 이상</span></div>
              <div class="metric-label">개선조치 미완료</div><div class="metric-footnote">기한 초과 <b class="text-red">3건</b></div>
            </article>
          </section>

          <section class="panel improvements-panel" id="high-risks">
            <div class="panel-heading improvements-heading">
              <div>
                <div class="panel-title-row"><span class="risk-heading-icon"><Icon name="alert" /></span><h2>개선 필요 건</h2><span class="high-risk-pill">위험도 8 이상</span></div>
                <p>위험도가 8 이상인 항목을 확인하고 개선 상태를 기록하세요.</p>
              </div>
              <button class="button button-primary" id="add-improvement-button" type="button"><Icon name="plus" /> 개선 건 등록</button>
            </div>
            <div class="table-wrap improvement-table-wrap">
              <table class="improvement-table">
                <thead><tr><th>위험도</th><th>위험요인 및 재해형태</th><th>평가 대상</th><th>개선(예방)대책</th><th>예정일</th><th>진행 단계</th></tr></thead>
                <tbody id="improvement-table-body"><tr><td colspan="6" class="table-empty">개선 필요 건을 불러오는 중입니다.</td></tr></tbody>
              </table>
            </div>
          </section>

          <section class="panel completed-panel" id="completed-improvements">
            <div class="panel-heading completed-heading">
              <div><h2>개선 완료 항목</h2><p>완료일 기준으로 모아 보고, 항목을 선택해 상세 내용을 확인할 수 있습니다.</p></div>
              <button class="button button-secondary" id="completed-toggle" type="button" aria-expanded="false" aria-controls="completed-list-content">완료 내역 보기 <Icon name="down" /></button>
            </div>
            <div id="completed-list-content" class="completed-list-content" hidden>
              <div class="completed-toolbar"><span id="completed-total">완료 내역을 불러오는 중입니다.</span><label for="completed-sort">정렬</label><select id="completed-sort"><option value="desc">최신 완료일순</option><option value="asc">오래된 완료일순</option></select></div>
              <div class="table-wrap">
                <table class="completed-table">
                  <thead><tr><th>완료일</th><th>위험도</th><th>위험요인 및 재해형태</th><th>팀 / 공정</th><th>개선대책</th><th>상세</th></tr></thead>
                  <tbody id="completed-table-body"><tr><td colspan="6" class="table-empty">완료 항목이 없습니다.</td></tr></tbody>
                </table>
              </div>
            </div>
          </section>

          <section class="content-grid">
            <div class="primary-column">
              <section class="panel assessments-panel" id="assessments">
                <div class="panel-heading">
                  <div><div class="panel-title-row"><h2>최근 위험성평가</h2><span class="live-label"><span></span> LIVE</span></div><p>사업장 평가 진행 상황을 확인하세요.</p></div>
                  <a class="text-link" href="#all-assessments">전체 평가 보기 <span>→</span></a>
                </div>
                <div class="table-toolbar">
                  <div class="filter-tabs" role="tablist" aria-label="평가 유형 필터">
                    <button class="filter-tab selected" data-filter="all" type="button">전체 <span>24</span></button>
                    <button class="filter-tab" data-filter="regular" type="button">정기</button>
                    <button class="filter-tab" data-filter="adhoc" type="button">수시</button>
                  </div>
                  <button class="table-filter-button" type="button" id="status-filter"><span class="status-filter-dot"></span> 전체 상태 <Icon name="down" /></button>
                </div>
                <div class="table-wrap">
                  <table class="assessment-table">
                    <thead><tr><th>평가명 / 공정</th><th>유형</th><th>작성자</th><th>진행률</th><th>고위험</th><th>상태</th><th><span class="sr-only">상세</span></th></tr></thead>
                    <tbody id="assessment-table-body">
                      <tr data-type="regular" data-search="제지생산1팀 초지 공정 정기 위험성평가 김민수">
                        <td><div class="assessment-name"><span class="assessment-symbol symbol-mint">제</span><span><strong>초지 공정 위험성평가</strong><small>제지생산1팀 · 초지</small></span></div></td>
                        <td><span class="type-badge type-regular">정기</span></td><td><span class="author-cell"><i class="author-avatar avatar-teal">김</i> 김민수</span></td>
                        <td><div class="progress-cell"><div class="table-progress"><span style="width:100%"></span></div><small>100%</small></div></td><td><span class="risk-count risk-high">3건</span></td><td><span class="status-badge status-approved"><i></i> 승인 완료</span></td><td><button class="row-menu" type="button" aria-label="초지 공정 메뉴"><Icon name="more" /></button></td>
                      </tr>
                      <tr data-type="adhoc" data-search="공무팀 화장지 4호기 덤프 체스트 수시 정비 김현구">
                        <td><div class="assessment-name"><span class="assessment-symbol symbol-peach">공</span><span><strong>화장지 4호기 설비 정비</strong><small>공무팀</small></span></div></td>
                        <td><span class="type-badge type-adhoc">수시</span></td><td><span class="author-cell"><i class="author-avatar avatar-violet">김</i> 김현구</span></td>
                        <td><div class="progress-cell"><div class="table-progress"><span style="width:72%"></span></div><small>72%</small></div></td><td><span class="risk-count risk-high">2건</span></td><td><span class="status-badge status-review"><i></i> 검토 요청</span></td><td><button class="row-menu" type="button" aria-label="화장지 4호기 메뉴"><Icon name="more" /></button></td>
                      </tr>
                      <tr data-type="regular" data-search="환경에너지팀 에너지 설비 정기 위험성평가 이수진">
                        <td><div class="assessment-name"><span class="assessment-symbol symbol-blue">환</span><span><strong>보일러 설비 정기평가</strong><small>환경에너지팀 · 에너지</small></span></div></td>
                        <td><span class="type-badge type-regular">정기</span></td><td><span class="author-cell"><i class="author-avatar avatar-blue">이</i> 이수진</span></td>
                        <td><div class="progress-cell"><div class="table-progress"><span style="width:48%"></span></div><small>48%</small></div></td><td><span class="risk-count">1건</span></td><td><span class="status-badge status-progress"><i></i> 작성 중</span></td><td><button class="row-menu" type="button" aria-label="보일러 설비 메뉴"><Icon name="more" /></button></td>
                      </tr>
                      <tr data-type="adhoc" data-search="화장지생산팀 가공 신규 공정 수시 위험성평가 박서연">
                        <td><div class="assessment-name"><span class="assessment-symbol symbol-lilac">생</span><span><strong>화장지 가공 공정 평가</strong><small>화장지생산팀 · 가공</small></span></div></td>
                        <td><span class="type-badge type-adhoc">수시</span></td><td><span class="author-cell"><i class="author-avatar avatar-rose">박</i> 박서연</span></td>
                        <td><div class="progress-cell"><div class="table-progress"><span style="width:28%"></span></div><small>28%</small></div></td><td><span class="risk-count risk-high">4건</span></td><td><span class="status-badge status-progress"><i></i> 작성 중</span></td><td><button class="row-menu" type="button" aria-label="신규 포장라인 메뉴"><Icon name="more" /></button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="table-footer"><span>최근 업데이트 <b>오늘 10:42</b></span><button type="button" class="load-more">평가 목록 더 보기 <span>↓</span></button></div>
              </section>

            </div>

            <aside class="secondary-column">
              <section class="panel approval-panel">
                <div class="panel-heading compact-heading"><div><h2>내가 확인할 항목</h2><p>승인과 검토가 필요합니다.</p></div><button class="small-more" type="button" aria-label="더 보기"><Icon name="more" /></button></div>
                <div class="approval-total"><strong>5</strong><span>건의 확인 대기</span><span class="approval-total-icon"><Icon name="clipboard" /></span></div>
                <div class="approval-list">
                  <a class="approval-row" href="#review"><span class="approval-type approval-type-review">검토</span><span class="approval-info"><strong>화장지 4호기 설비 정비</strong><small>공무팀 · 김현구 · 2시간 전</small></span><Icon name="up" /></a>
                  <a class="approval-row" href="#review"><span class="approval-type approval-type-approve">승인</span><span class="approval-info"><strong>원료 투입 공정 정기평가</strong><small>제지생산2팀 · 박정우 · 어제</small></span><Icon name="up" /></a>
                  <a class="approval-row" href="#review"><span class="approval-type approval-type-review">검토</span><span class="approval-info"><strong>신규 포장라인 위험성평가</strong><small>화장지생산팀 · 박서연 · 어제</small></span><Icon name="up" /></a>
                </div>
                <button class="approval-all-button" type="button" id="review-all">대기 항목 모두 보기 <span>→</span></button>
              </section>

              <section class="panel activity-panel" id="documents">
                <div class="panel-heading compact-heading"><div><h2>최근 활동</h2><p>팀의 최신 업데이트입니다.</p></div><button class="small-more" type="button" aria-label="활동 더 보기"><Icon name="more" /></button></div>
                <div class="activity-timeline">
                  <div class="activity-entry"><span class="activity-avatar avatar-teal">김</span><div><p><b>김민수</b>님이 <b>초지 공정</b> 평가를 승인했습니다.</p><time>오늘 오전 10:42</time></div></div>
                  <div class="activity-entry"><span class="activity-avatar avatar-violet">김</span><div><p><b>김현구</b>님이 개선 전 사진을 추가했습니다.</p><time>오늘 오전 09:18</time></div></div>
                  <div class="activity-entry"><span class="activity-avatar avatar-rose">박</span><div><p><b>박서연</b>님이 신규 공정 평가를 시작했습니다.</p><time>어제 오후 16:05</time></div></div>
                </div>
                <a class="activity-link" href="#activity">활동 기록 전체 보기 <span>→</span></a>
              </section>

              <section class="ai-card">
                <div class="ai-card-orb"></div><div class="ai-card-head"><span class="ai-spark"><Icon name="spark" /></span><span class="ai-label">AI SAFETY ASSISTANT</span><span class="ai-beta">BETA</span></div>
                <h3>현장 사진에서<br />위험요인을 발견해요.</h3>
                <p>사진을 등록하면 위험요인과 개선대책 초안을 만들어 드립니다.</p>
                <button class="ai-upload-button" id="open-photo-modal" type="button"><Icon name="image" /> 사진으로 위험요인 초안 만들기 <span>→</span></button>
                <span class="ai-disclaimer">AI 제안은 현장 확인 후 승인해 주세요.</span>
              </section>
            </aside>
          </section>
          </div>

          <section class="panel assessment-hub-page" id="assessment-hub-view" hidden>
            <div class="assessment-hub-toolbar"><button class="button button-secondary" id="assessment-hub-back-button" type="button">대시보드로</button></div>
            <div class="assessment-hub-heading"><span class="folder-eyebrow" id="assessment-hub-year">2026년</span><h2 id="assessment-hub-title">정기 위험성평가</h2><p id="assessment-hub-description">하위 분류를 선택해 팀과 공정의 파일을 확인하세요.</p></div>
            <div class="assessment-hub-grid" id="assessment-hub-categories"></div>
          </section>
          <section class="panel assessment-subcategory-page" id="assessment-subcategory-view" hidden>
            <div class="assessment-hub-toolbar"><button class="button button-secondary" id="subcategory-back-button" type="button">분류 목록</button></div>
            <div class="assessment-hub-heading"><div class="subcategory-label-row"><span class="folder-eyebrow" id="subcategory-label">유해∙위험요인</span><button class="subcategory-label-edit" id="edit-hazard-risk-label-button" type="button" aria-label="분류 레이블 편집" title="분류 레이블 편집"><Icon name="edit" /></button></div><h2 id="subcategory-title">팀과 공정을 선택하세요</h2><p id="subcategory-description">목록에서 팀 또는 공정을 선택해 파일을 확인합니다.</p></div>
            <div class="subcategory-team-grid" id="subcategory-team-grid"></div>
          </section>
          <section class="panel assessment-workflow-page" id="assessment-workflow-view" hidden>
            <div class="assessment-hub-toolbar"><button class="button button-secondary" id="workflow-back-button" type="button">뒤로</button></div>
            <div class="assessment-hub-heading"><span class="folder-eyebrow" id="workflow-label">위험성평가 실시</span><h2 id="workflow-title">유해위험요인 작성</h2><p id="workflow-description">작업내용과 위험요인을 입력하고 빈도×강도로 위험도를 평가하세요.</p></div>
            <div class="workflow-content" id="workflow-content"></div>
            <div class="workflow-actions"><button class="button button-secondary" id="workflow-cancel-button" type="button">취소</button><button class="button button-primary" id="workflow-submit-button" type="button">위험도 계산 및 저장</button></div>
          </section>
          <section class="panel team-process-page" id="team-process-view" hidden>
            <div class="assessment-hub-toolbar"><button class="button button-secondary" id="team-process-back-button" type="button">팀 목록</button></div>
            <div class="assessment-hub-heading"><span class="folder-eyebrow" id="team-process-label">유해∙위험요인</span><h2 id="team-process-title">팀 공정</h2><p id="team-process-description">공정을 선택하세요.</p><div class="team-process-actions"><button class="button button-secondary" id="team-process-all-files-button" type="button">팀 전체 파일</button><button class="button button-primary" id="add-team-process-button" type="button">공정 추가</button></div></div>
            <div class="team-process-list" id="team-process-list"></div>
            <div class="team-process-empty" id="team-process-empty" hidden>아직 등록된 공정이 없습니다. 공정 추가를 눌러 첫 공정을 등록하세요.</div>
          </section>
          <section class="panel team-folder-page" id="team-folder-view" hidden>
            <div class="team-folder-toolbar">
              <button class="button button-secondary" id="folder-back-button" type="button"><Icon name="down" className="back-chevron" /> 뒤로</button>
              <button class="button button-primary" id="folder-upload-button" type="button" hidden><Icon name="plus" /> 파일 추가</button>
              <input id="team-folder-file-input" type="file" multiple hidden />
            </div>
            <div class="team-folder-heading">
              <div class="team-folder-icon"><Icon name="file" /></div>
              <div><span class="folder-eyebrow" id="folder-category-label">유해위험요인</span><h2 id="folder-title">팀 / 공정</h2><p id="folder-path">연도 · 평가유형 · 팀</p></div>
            </div>
            <div class="team-folder-summary"><span id="folder-file-count">파일 목록</span><span>구성원 공용 보관함</span></div>
            <div class="table-wrap">
              <table class="folder-files-table">
                <thead><tr><th>파일명</th><th>유형</th><th>파일 크기</th><th>올린 사람</th><th>업로드 일시</th><th>동작</th></tr></thead>
                <tbody id="folder-file-list"><tr><td colspan="6" class="table-empty">파일을 불러오는 중입니다.</td></tr></tbody>
              </table>
            </div>
            <div id="folder-empty-state" class="folder-empty-state" hidden>
              <span class="folder-empty-icon"><Icon name="file" /></span>
              <strong id="folder-empty-title">아직 등록된 파일이 없습니다.</strong>
              <p id="folder-empty-instruction">이 분류에 양식을 추가할 수 있습니다.</p>
            </div>
          </section>

          <footer class="page-footer"><span>© 2026 안전온 · 유해∙위험요인 관리</span><span><a href="#help">도움말</a><i></i><a href="#privacy">개인정보 처리방침</a><i></i><span>안전보건팀</span></span></footer>
        </div>
      </main>
    </div>,
  )
})

app.get('/health', (c) => c.json({ status: 'ok', app: 'safety-on-preview' }))

export default app
