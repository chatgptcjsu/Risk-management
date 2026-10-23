(() => {
  const toast = (message) => {
    document.querySelector('.toast')?.remove()
    const notice = document.createElement('div')
    notice.className = 'toast'
    notice.setAttribute('role', 'status')
    notice.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg><span></span>'
    notice.querySelector('span').textContent = message
    document.body.appendChild(notice)
    window.setTimeout(() => notice.remove(), 3200)
  }

  const closeModal = () => {
    const backdrop = document.querySelector('.modal-backdrop')
    const preview = backdrop?.querySelector('.xlsx-preview-modal')
    if (preview?.dataset.unsaved === 'true' && !window.confirm('저장하지 않은 엑셀 수정 내용이 있습니다. 닫을까요?')) return
    backdrop?.remove()
  }

  const showModal = (title, subtitle, content, submitText, onSubmit) => {
    closeModal()
    const backdrop = document.createElement('div')
    backdrop.className = 'modal-backdrop'
    backdrop.innerHTML = `
      <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <header class="modal-head"><div><h2 id="dialog-title"></h2><p></p></div><button type="button" class="modal-close" aria-label="닫기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></header>
        <div class="modal-body"></div>
        <footer class="modal-foot"><button type="button" class="button button-secondary modal-cancel">취소</button><button type="button" class="button button-primary modal-submit"></button></footer>
      </section>`
    backdrop.querySelector('#dialog-title').textContent = title
    backdrop.querySelector('.modal-head p').textContent = subtitle
    backdrop.querySelector('.modal-body').append(content)
    backdrop.querySelector('.modal-submit').textContent = submitText
    backdrop.querySelector('.modal-close').addEventListener('click', closeModal)
    backdrop.querySelector('.modal-cancel').addEventListener('click', closeModal)
    backdrop.querySelector('.modal-submit').addEventListener('click', () => onSubmit(backdrop))
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) closeModal()
    })
    document.addEventListener('keydown', function onEscape(event) {
      if (event.key === 'Escape') {
        closeModal()
        document.removeEventListener('keydown', onEscape)
      }
    })
    document.body.appendChild(backdrop)
    backdrop.querySelector('input, select, button')?.focus()
  }

  const field = (labelText, control, helpText = '') => {
    const wrapper = document.createElement('label')
    wrapper.className = 'form-field'
    const label = document.createElement('span')
    label.textContent = labelText
    wrapper.append(label, control)
    if (helpText) {
      const help = document.createElement('small')
      help.className = 'form-help'
      help.textContent = helpText
      wrapper.append(help)
    }
    return wrapper
  }

  const authState = { csrfToken: '' }
  const currentYear = new Date().getFullYear()
  const defaultTeamProcesses = {
    '제지생산1팀': ['원질', '초지'],
    '제지생산2팀': ['카타', '포장'],
    '화장지생산팀': ['초지', '가공'],
    '패드생산팀': [],
    'PS품질보증팀': [],
    'HL품질보증팀': [],
    '환경에너지팀': ['에너지', '환경'],
    '공무팀': [],
    '전기팀': [],
    '구매1팀': [],
  }
  let teamProcesses = { ...defaultTeamProcesses }
  let currentTeam = ''

  const ensureCsrf = async () => {
    if (authState.csrfToken) return authState.csrfToken
    const response = await fetch('/api/auth/csrf', { credentials: 'same-origin' })
    if (!response.ok) throw new Error('보안 토큰을 가져오지 못했습니다.')
    const data = await response.json()
    authState.csrfToken = data.token
    return authState.csrfToken
  }

  const apiRequest = async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase()
    const headers = new Headers(options.headers || {})
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      headers.set('X-XSRF-TOKEN', await ensureCsrf())
    }
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    const response = await fetch(url, { ...options, method, headers, credentials: 'same-origin' })
    if (response.status === 204) return null
    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json') ? await response.json() : await response.text()
    if (!response.ok) {
      const error = new Error(payload?.message || payload?.error || '요청을 완료하지 못했습니다.')
      error.status = response.status
      throw error
    }
    return payload
  }

  const defaultDashboardTitle = '유해위험요인'
  const defaultHazardRiskLabel = '유해∙위험요인'
  let dashboardTitle = defaultDashboardTitle
  let hazardRiskLabel = defaultHazardRiskLabel
  let currentAssessmentYear = new Date().getFullYear()
  let currentAssessmentType = 'REGULAR'
  let currentSubcategory = 'HAZARD_RISK'
  let folderReturnMode = 'dashboard'
  let activeFolderScope = null

  const updateAccessUi = () => {
    const addImprovementButton = document.querySelector('#add-improvement-button')
    if (addImprovementButton) addImprovementButton.hidden = false
    const folderUploadButton = document.querySelector('#folder-upload-button')
    const categoryAllowsUpload = activeFolderScope && (
      activeFolderScope.category === 'IMPROVEMENT_REQUEST' ||
      (activeFolderScope.category === 'HAZARD_RISK' && activeFolderScope.assessmentType === 'REGULAR')
    )
    if (folderUploadButton) folderUploadButton.hidden = !categoryAllowsUpload
  }

  const applyHazardRiskLabel = () => {
    document.querySelectorAll('[data-hazard-label="true"]').forEach((label) => { label.textContent = hazardRiskLabel })
    document.querySelectorAll('[data-file-category="HAZARD_RISK"]').forEach((item) => {
      if (item.dataset.workspaceSelection) {
        item.dataset.workspaceSelection = item.dataset.workspaceSelection.replaceAll(defaultHazardRiskLabel, hazardRiskLabel)
      }
    })
    document.querySelector('#subcategory-label').textContent = hazardRiskLabel
  }

  const setEmptyRow = (tbody, columns, message) => {
    tbody.replaceChildren()
    const row = document.createElement('tr')
    const cell = document.createElement('td')
    cell.colSpan = columns
    cell.className = 'table-empty'
    cell.textContent = message
    row.append(cell)
    tbody.append(row)
  }

  const setPageView = (viewId) => {
    document.querySelector('.page-heading').hidden = viewId !== 'dashboard-sections'
    document.querySelector('#dashboard-sections').hidden = viewId !== 'dashboard-sections'
    document.querySelector('#assessment-hub-view').hidden = viewId !== 'assessment-hub-view'
    document.querySelector('#assessment-subcategory-view').hidden = viewId !== 'assessment-subcategory-view'
    document.querySelector('#team-process-view').hidden = viewId !== 'team-process-view'
    document.querySelector('#team-folder-view').hidden = viewId !== 'team-folder-view'
  }

  const showDashboardPage = () => {
    activeFolderScope = null
    folderReturnMode = 'dashboard'
    setPageView('dashboard-sections')
    document.querySelector('#page-title').textContent = dashboardTitle
    document.querySelector('#edit-dashboard-title-button').hidden = false
    document.querySelector('#page-subtitle').textContent = '작업현장의 유해·위험요인과 개선 진행 상황을 확인하세요.'
    document.querySelector('#breadcrumb-selection').textContent = '대시보드'
  }

  const showAssessmentHub = (year, assessmentType) => {
    currentAssessmentYear = Number(year)
    currentAssessmentType = assessmentType
    const typeLabel = assessmentType === 'REGULAR' ? '정기 위험성평가' : '수시 위험성평가'
    const yearLabel = `${year}년`
    setPageView('assessment-hub-view')
    document.querySelector('#page-title').textContent = typeLabel
    document.querySelector('#edit-dashboard-title-button').hidden = true
    document.querySelector('#page-subtitle').textContent = `${yearLabel} · ${typeLabel}의 세부 분류를 선택하세요.`
    document.querySelector('#assessment-hub-year').textContent = yearLabel
    document.querySelector('#assessment-hub-title').textContent = typeLabel
    document.querySelector('#assessment-hub-description').textContent = assessmentType === 'REGULAR'
      ? '정기 평가 자료와 개선요청 파일을 분류별로 확인하고 편집할 수 있습니다.'
      : '수시 평가의 개선요청 파일을 분류별로 확인하고 편집할 수 있습니다.'
    document.querySelector('#breadcrumb-selection').textContent = typeLabel
    const categories = document.querySelector('#assessment-hub-categories')
    categories.replaceChildren()
    const entries = assessmentType === 'REGULAR'
      ? [{ id: 'HAZARD_RISK', label: hazardRiskLabel, description: '유해·위험요인 엑셀 평가표', icon: 'XLSX' }, { id: 'IMPROVEMENT_REQUEST', label: '개선요청 건', description: '개선요청 파워포인트 파일', icon: 'PPT' }]
      : [{ id: 'IMPROVEMENT_REQUEST', label: '개선요청 건', description: '개선요청 파워포인트 파일', icon: 'PPT' }]
    entries.forEach((entry) => {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'assessment-category-card'
      const icon = document.createElement('span')
      icon.className = `assessment-category-icon ${entry.id === 'HAZARD_RISK' ? 'excel' : 'presentation'}`
      icon.textContent = entry.icon
      const copy = document.createElement('span')
      copy.className = 'assessment-category-copy'
      const name = document.createElement('strong')
      name.textContent = entry.label
      const description = document.createElement('small')
      description.textContent = entry.description
      copy.append(name, description)
      const arrow = document.createElement('span')
      arrow.className = 'assessment-category-arrow'
      arrow.textContent = '›'
      card.append(icon, copy, arrow)
      card.addEventListener('click', () => showAssessmentSubcategory(entry.id))
      categories.append(card)
    })
  }

  const showAssessmentSubcategory = (category) => {
    currentSubcategory = category
    const label = category === 'HAZARD_RISK' ? hazardRiskLabel : '개선요청 건'
    const typeLabel = currentAssessmentType === 'REGULAR' ? '정기 위험성평가' : '수시 위험성평가'
    setPageView('assessment-subcategory-view')
    document.querySelector('#page-title').textContent = label
    document.querySelector('#edit-dashboard-title-button').hidden = true
    document.querySelector('#subcategory-label').textContent = label
    document.querySelector('#edit-hazard-risk-label-button').hidden = category !== 'HAZARD_RISK'
    document.querySelector('#subcategory-title').textContent = `${currentAssessmentYear}년 · ${typeLabel}`
    document.querySelector('#subcategory-description').textContent = '팀 또는 공정을 선택해 파일을 확인하거나 업로드하세요.'
    document.querySelector('#page-subtitle').textContent = `${label} · 팀과 공정별 파일 보관함입니다.`
    document.querySelector('#breadcrumb-selection').textContent = label
    const grid = document.querySelector('#subcategory-team-grid')
    grid.replaceChildren()
    Object.entries(teamProcesses).forEach(([team, processes]) => {
      const article = document.createElement('article')
      article.className = 'subcategory-team-card'
      const teamButton = document.createElement('button')
      teamButton.type = 'button'
      teamButton.className = 'subcategory-team-open'
      teamButton.textContent = processes.length ? `${team} · ${processes.length}개 공정` : `${team} · 공정 추가`
      teamButton.addEventListener('click', () => showTeamProcessPage(team))
      article.append(teamButton)
      grid.append(article)
    })
  }

  const showTeamProcessPage = (team) => {
    currentTeam = team
    const processes = teamProcesses[team] || []
    const label = currentSubcategory === 'HAZARD_RISK' ? hazardRiskLabel : '개선요청 건'
    const typeLabel = currentAssessmentType === 'REGULAR' ? '정기 위험성평가' : '수시 위험성평가'
    setPageView('team-process-view')
    document.querySelector('#page-title').textContent = team
    document.querySelector('#edit-dashboard-title-button').hidden = true
    document.querySelector('#team-process-label').textContent = label
    document.querySelector('#team-process-title').textContent = `${team} · 공정 선택`
    document.querySelector('#team-process-description').textContent = `${currentAssessmentYear}년 · ${typeLabel} · 공정을 선택해 파일을 열람하거나 추가하세요.`
    document.querySelector('#breadcrumb-selection').textContent = `${team} · 공정`
    const list = document.querySelector('#team-process-list')
    list.replaceChildren()
    processes.forEach((process) => {
      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'team-process-item'
      item.textContent = process
      item.addEventListener('click', () => showFolderView({ year: currentAssessmentYear, assessmentType: currentAssessmentType, category: currentSubcategory, team, process }, 'team-process'))
      list.append(item)
    })
    document.querySelector('#team-process-empty').hidden = processes.length > 0
  }

  const addProcessToTeam = async () => {
    const input = document.createElement('input')
    input.type = 'text'
    input.maxLength = 80
    input.placeholder = '예: 원질, 초지'
    const content = document.createElement('div')
    content.append(field('새 공정 이름', input, `${currentTeam}에 추가할 공정 이름을 입력하세요.`))
    showModal('팀 공정 추가', `${currentTeam}에 공정을 추가합니다.`, content, '공정 추가', async () => {
      const process = input.value.trim()
      if (!process) { toast('공정 이름을 입력해 주세요.'); return }
      const existing = teamProcesses[currentTeam] || []
      if (existing.some(name => name.toLocaleLowerCase() === process.toLocaleLowerCase())) {
        toast('이미 등록된 공정입니다.')
        return
      }
      const updatedTeams = { ...teamProcesses, [currentTeam]: [...existing, process] }
      try {
        teamProcesses = await apiRequest('/api/settings/team-processes', { method: 'PUT', body: JSON.stringify({ teams: updatedTeams }) })
        closeModal()
        showTeamProcessPage(currentTeam)
        toast(`${process} 공정을 추가했습니다.`)
      } catch (error) { showRequestError(error) }
    })
  }

  const showFolderView = async (scope, returnMode = 'dashboard') => {
    activeFolderScope = scope
    folderReturnMode = returnMode
    const title = scope.category === 'HAZARD_RISK' ? hazardRiskLabel : '개선요청 건'
    const path = [scope.year + '년', scope.assessmentType === 'REGULAR' ? '정기 위험성평가' : '수시 위험성평가', title, scope.team, scope.process].filter(Boolean).join(' / ')
    setPageView('team-folder-view')
    document.querySelector('#page-title').textContent = title
    document.querySelector('#edit-dashboard-title-button').hidden = true
    document.querySelector('#page-subtitle').textContent = `${scope.team}${scope.process ? ` · ${scope.process}` : ''} 분류에 보관된 파일과 업로드 내역입니다.`
    document.querySelector('#folder-category-label').textContent = title
    document.querySelector('#folder-title').textContent = scope.process ? `${scope.team} · ${scope.process}` : scope.team
    document.querySelector('#folder-path').textContent = path
    const uploadButton = document.querySelector('#folder-upload-button')
    const uploadInput = document.querySelector('#team-folder-file-input')
    const allowedUpload = scope.category === 'HAZARD_RISK'
      ? scope.assessmentType === 'REGULAR'
      : scope.category === 'IMPROVEMENT_REQUEST'
    uploadButton.hidden = !allowedUpload
    uploadInput.accept = scope.category === 'HAZARD_RISK' ? '.xlsx,.xls' : '.pptx,.ppt'
    const instruction = document.querySelector('#folder-empty-instruction')
    instruction.textContent = scope.category === 'HAZARD_RISK'
      ? '정기 위험성평가의 유해위험요인 엑셀 파일을 업로드하세요.'
      : '개선 필요 건 PPT 파일을 업로드하세요.'
    await loadFolderFiles()
  }

  const renderSpreadsheetSheet = (sheet, sheetName, viewport, saveButton, drafts) => {
    const sourceRange = window.XLSX.utils.decode_range(sheet['!ref'] || 'A1')
    const rowCount = sourceRange.e.r - sourceRange.s.r + 1
    const totalColumns = sourceRange.e.c - sourceRange.s.c + 1
    const range = {
      s: sourceRange.s,
      e: {
        r: Math.min(sourceRange.e.r, sourceRange.s.r + 149),
        c: Math.min(sourceRange.e.c, sourceRange.s.c + 39),
      },
    }
    const visibleRows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: true, range })
    const shownColumns = Math.min(40, totalColumns)
    const table = document.createElement('table')
    table.className = 'xlsx-preview-table'
    table.setAttribute('aria-label', `${sheetName} 시트 미리보기`)
    const body = document.createElement('tbody')
    visibleRows.forEach((rowValues, rowIndex) => {
      const row = document.createElement('tr')
      if (rowIndex === 0) row.className = 'xlsx-preview-first-row'
      for (let columnIndex = 0; columnIndex < shownColumns; columnIndex += 1) {
        const cell = document.createElement('td')
        const excelRow = range.s.r + rowIndex
        const excelColumn = range.s.c + columnIndex
        const address = window.XLSX.utils.encode_cell({ r: excelRow, c: excelColumn })
        const sourceCell = sheet[address]
        const draftKey = `${sheetName}:${excelRow}:${excelColumn}`
        const sourceValue = sourceCell?.t === 'd' && sourceCell.v instanceof Date
          ? sourceCell.v.toISOString().slice(0, 10)
          : sourceCell?.t === 'n'
            ? String(sourceCell.v)
            : rowValues[columnIndex]
        const originalValue = sourceValue == null ? '' : String(sourceValue)
        const draft = drafts.get(draftKey)
        cell.textContent = draft ? draft.value : originalValue
        cell.contentEditable = 'true'
        cell.spellcheck = false
        cell.dataset.excelRow = String(excelRow)
        cell.dataset.excelColumn = String(excelColumn)
        cell.dataset.cellType = sourceCell?.t || 's'
        cell.dataset.originalValue = originalValue
        if (draft) cell.classList.add('is-edited')
        cell.addEventListener('input', () => {
          const changed = cell.textContent !== cell.dataset.originalValue
          cell.classList.toggle('is-edited', changed)
          if (changed) drafts.set(draftKey, { sheetName, row: excelRow, column: excelColumn, cellType: cell.dataset.cellType, value: cell.textContent || '' })
          else drafts.delete(draftKey)
          saveButton.disabled = drafts.size === 0
          const preview = document.querySelector('.xlsx-preview-modal')
          if (preview) preview.dataset.unsaved = String(drafts.size > 0)
        })
        row.append(cell)
      }
      body.append(row)
    })
    table.append(body)
    viewport.replaceChildren(table)
    return { rowCount, shownRows: visibleRows.length, shownColumns, totalColumns }
  }

  const openSpreadsheetPreview = async (file) => {
    const content = document.createElement('div')
    content.className = 'xlsx-preview-content'
    const toolbar = document.createElement('div')
    toolbar.className = 'xlsx-preview-actions'
    const saveButton = document.createElement('button')
    saveButton.type = 'button'
    saveButton.className = 'button button-primary'
    saveButton.textContent = '변경 내용 저장'
    saveButton.disabled = true
    const printButton = document.createElement('button')
    printButton.type = 'button'
    printButton.className = 'button button-secondary xlsx-print-button'
    printButton.textContent = '인쇄'
    printButton.addEventListener('click', () => window.print())
    toolbar.append(saveButton, printButton)
    const status = document.createElement('p')
    status.className = 'xlsx-preview-status'
    status.textContent = '엑셀 파일을 브라우저에서 여는 중입니다…'
    const tabs = document.createElement('div')
    tabs.className = 'xlsx-preview-tabs'
    tabs.setAttribute('role', 'tablist')
    const viewport = document.createElement('div')
    viewport.className = 'xlsx-preview-table-scroll'
    const fallback = document.createElement('a')
    const drafts = new Map()
    let workbook
    let activeSheetName = ''
    fallback.className = 'button button-secondary xlsx-preview-download'
    fallback.href = `/api/files/${file.id}/download`
    fallback.textContent = '원본 다운로드'
    fallback.hidden = true
    content.append(toolbar, status, tabs, viewport, fallback)
    showModal(file.originalName, '셀을 직접 편집한 뒤 저장하거나 인쇄할 수 있습니다.', content, '닫기', closeModal)
    document.querySelector('.modal-card')?.classList.add('xlsx-preview-modal')

    try {
      if (!window.XLSX) throw new Error('엑셀 미리보기 도구를 불러오지 못했습니다.')
      if (file.fileSize > 20 * 1024 * 1024) throw new Error('20MB를 초과하는 파일은 미리보기 대신 원본을 다운로드해 주세요.')
      const response = await fetch(`/api/files/${file.id}/download`, { credentials: 'same-origin' })
      if (!response.ok) throw new Error('파일을 불러오지 못했습니다.')
      workbook = window.XLSX.read(await response.arrayBuffer(), { type: 'array', cellDates: true })
      if (!workbook.SheetNames.length) throw new Error('파일에 표시할 시트가 없습니다.')
      const renderTab = (activeName) => {
        activeSheetName = activeName
        tabs.replaceChildren()
        workbook.SheetNames.forEach((sheetName) => {
          const tab = document.createElement('button')
          tab.type = 'button'
          tab.className = `xlsx-preview-tab${sheetName === activeName ? ' selected' : ''}`
          tab.setAttribute('role', 'tab')
          tab.setAttribute('aria-selected', String(sheetName === activeName))
          tab.textContent = sheetName
          tab.addEventListener('click', () => renderTab(sheetName))
          tabs.append(tab)
        })
        const result = renderSpreadsheetSheet(workbook.Sheets[activeName], activeName, viewport, saveButton, drafts)
        status.textContent = `${result.rowCount}행 · ${result.totalColumns}열 · 셀을 클릭해 편집하세요.${result.rowCount > result.shownRows ? ` 처음 ${result.shownRows}행 표시` : ''}${result.totalColumns > result.shownColumns ? ` · 처음 ${result.shownColumns}열 표시` : ''}`
      }
      renderTab(workbook.SheetNames[0])
      saveButton.addEventListener('click', async () => {
        const edits = Array.from(drafts.values())
        if (!edits.length) return
        saveButton.disabled = true
        saveButton.textContent = '저장 중…'
        try {
          await apiRequest(`/api/files/${file.id}/spreadsheet`, { method: 'PUT', body: JSON.stringify({ edits }) })
          drafts.clear()
          const refreshed = await fetch(`/api/files/${file.id}/download`, { credentials: 'same-origin' })
          if (!refreshed.ok) throw new Error('저장 후 엑셀 파일을 다시 불러오지 못했습니다.')
          workbook = window.XLSX.read(await refreshed.arrayBuffer(), { type: 'array', cellDates: true })
          const preview = document.querySelector('.xlsx-preview-modal')
          if (preview) preview.dataset.unsaved = 'false'
          renderTab(activeSheetName)
          status.textContent = `${edits.length}개 셀 변경 내용을 저장했습니다. ${status.textContent}`
          toast('엑셀 수정 내용을 저장했습니다.')
        } catch (error) {
          showRequestError(error)
          status.textContent = '저장하지 못했습니다. 내용을 확인하고 다시 시도해 주세요.'
        } finally {
          saveButton.textContent = '변경 내용 저장'
          saveButton.disabled = drafts.size === 0
        }
      })
    } catch (error) {
      status.textContent = `${error.message || '미리보기를 표시하지 못했습니다.'} 원본 파일은 아래에서 다운로드할 수 있습니다.`
      fallback.hidden = false
    }
  }

  const loadFolderFiles = async () => {
    const tbody = document.querySelector('#folder-file-list')
    if (!tbody || !activeFolderScope) return
    try {
      const query = new URLSearchParams({
        year: activeFolderScope.year,
        assessmentType: activeFolderScope.assessmentType,
        category: activeFolderScope.category,
        team: activeFolderScope.team,
        process: activeFolderScope.process || '',
      })
      const files = await apiRequest(`/api/files?${query.toString()}`)
      const selectedType = activeFolderScope.category === 'HAZARD_RISK' ? 'xlsx' : 'pptx'
      const visibleFiles = files.filter(file => {
        const ext = file.originalName.split('.').pop().toLowerCase()
        return selectedType === 'xlsx' ? ['xls', 'xlsx'].includes(ext) : ['ppt', 'pptx'].includes(ext)
      })
      document.querySelector('#folder-file-count').textContent = `${visibleFiles.length}개 파일`
      document.querySelector('#folder-empty-state').hidden = visibleFiles.length > 0
      document.querySelector('#folder-empty-title').textContent = '아직 등록된 파일이 없습니다.'
      document.querySelector('#folder-empty-instruction').textContent = activeFolderScope.category === 'HAZARD_RISK'
        ? '엑셀 파일을 업로드할 수 있습니다.'
        : '개선요청 PPT 파일을 업로드할 수 있습니다.'
      if (!visibleFiles.length) {
        setEmptyRow(tbody, 6, '등록된 파일이 없습니다.')
        return
      }
      tbody.replaceChildren()
      visibleFiles.forEach((file) => {
        const row = document.createElement('tr')
        const nameCell = row.insertCell()
        const link = document.createElement('a')
        const extension = file.originalName.split('.').pop().toLowerCase()
        const isSpreadsheet = activeFolderScope.category === 'HAZARD_RISK' && ['xls', 'xlsx'].includes(extension)
        link.className = isSpreadsheet ? 'folder-preview-link' : 'folder-download-link'
        link.href = isSpreadsheet ? '#' : `/api/files/${file.id}/download`
        link.textContent = file.originalName
        if (isSpreadsheet) link.addEventListener('click', (event) => { event.preventDefault(); openSpreadsheetPreview(file) })
        nameCell.append(link)
        row.insertCell().textContent = file.originalName.split('.').pop().toUpperCase()
        row.insertCell().textContent = `${Math.max(1, Math.ceil(file.fileSize / 1024))} KB`
        row.insertCell().textContent = file.uploadedBy
        row.insertCell().textContent = formatDateTime(file.uploadedAt)
        const actionCell = row.insertCell()
        const downloadLink = document.createElement('a')
        downloadLink.className = 'completed-details-button file-download-button'
        downloadLink.href = `/api/files/${file.id}/download`
        downloadLink.textContent = '다운로드'
        actionCell.append(downloadLink)
        tbody.append(row)
      })
    } catch (error) {
      showRequestError(error)
      setEmptyRow(tbody, 6, '파일 목록을 불러오지 못했습니다. 다시 시도해 주세요.')
    }
  }

  const formatDate = (value) => {
    if (!value) return '—'
    const date = new Date(`${value.slice(0, 10)}T00:00:00`)
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ko-KR').format(date)
  }

  const formatDateTime = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  }

  const showRequestError = (error) => {
    if (error.status === 401) {
      toast('이 작업은 인증이 필요합니다.')
    } else if (error.status === 403) {
      toast('이 기능을 사용할 권한이 없습니다.')
    } else {
      toast(error.message || '요청 처리 중 오류가 발생했습니다.')
    }
  }

  const createStatusSelect = (item) => {
    const select = document.createElement('select')
    select.className = `improvement-status-select ${item.status === 'COMPLETED' ? 'status-completed' : 'status-in-progress'}`
    select.setAttribute('aria-label', `${item.hazardEvent} 개선 상태`)
    select.innerHTML = '<option value="IN_PROGRESS">개선 진행 중</option><option value="COMPLETED">개선 완료</option>'
    select.value = item.status
    select.disabled = false
    select.dataset.improvementId = item.id
    return select
  }

  const renderHighRiskItems = (items) => {
    const tbody = document.querySelector('#improvement-table-body')
    if (!tbody) return
    if (!items.length) {
      setEmptyRow(tbody, 6, '위험도 8 이상인 미완료 개선 건이 없습니다.')
      return
    }
    tbody.replaceChildren()
    items.forEach((item) => {
      const row = document.createElement('tr')
      const scoreCell = row.insertCell()
      const score = document.createElement('span')
      score.className = `improvement-risk-score${item.riskScore >= 15 ? ' score-very-high' : ''}`
      score.textContent = String(item.riskScore)
      scoreCell.append(score)

      const hazardCell = row.insertCell()
      const hazardText = document.createElement('span')
      hazardText.className = 'improvement-hazard-cell'
      hazardText.textContent = item.hazardEvent
      hazardCell.append(hazardText)

      const targetCell = row.insertCell()
      targetCell.className = 'improvement-target-cell'
      const target = document.createElement('span')
      target.textContent = `${item.year}년 · ${item.assessmentType === 'REGULAR' ? '정기' : '수시'}`
      const team = document.createElement('small')
      team.textContent = item.process ? `${item.team} · ${item.process}` : item.team
      targetCell.append(target, team)

      const actionCell = row.insertCell()
      const actionText = document.createElement('span')
      actionText.className = 'improvement-action-cell'
      actionText.textContent = item.improvementAction
      actionCell.append(actionText)

      const dateCell = row.insertCell()
      dateCell.className = 'improvement-date-cell'
      dateCell.textContent = formatDate(item.plannedDate)

      const statusCell = row.insertCell()
      const status = createStatusSelect(item)
      status.addEventListener('change', () => changeImprovementStatus(item, status))
      statusCell.append(status)
      tbody.append(row)
    })
  }

  const openImprovementDetails = async (item) => {
    const content = document.createElement('div')
    content.className = 'improvement-details-modal'
    const rows = [
      ['개선 전 위험요인 / 재해형태', item.hazardEvent],
      ['개선(예방)대책', item.improvementAction],
      ['평가 및 담당', `${item.year}년 · ${item.assessmentType === 'REGULAR' ? '정기' : '수시'} · ${item.team}${item.process ? ` · ${item.process}` : ''} · 빈도 ${item.frequency} × 강도 ${item.severity} = ${item.riskScore}`],
      ['예정일 / 완료일', `${formatDate(item.plannedDate)} / ${formatDate(item.completedDate)}`],
    ]
    rows.forEach(([title, value]) => {
      const block = document.createElement('section')
      block.className = 'improvement-detail-block'
      const heading = document.createElement('strong')
      heading.textContent = title
      const text = document.createElement('p')
      text.textContent = value || '—'
      block.append(heading, text)
      content.append(block)
    })
    try {
      const history = await apiRequest(`/api/improvements/${item.id}/history`)
      const historyBlock = document.createElement('section')
      historyBlock.className = 'improvement-detail-block'
      const heading = document.createElement('strong')
      heading.textContent = '상태 변경 이력'
      const text = document.createElement('p')
      text.textContent = history.length
        ? history.map(entry => `${formatDate(entry.completedDate)} · ${entry.previousStatus || '신규'} → ${entry.newStatus} · ${entry.changedBy}`).join('\n')
        : '상태 변경 이력이 없습니다.'
      historyBlock.append(heading, text)
      content.append(historyBlock)
    } catch (error) {
      if (error.status === 401) { showRequestError(error); return }
    }
    showModal('개선 완료 상세', '완료 기록과 처리 이력을 확인합니다.', content, '닫기', closeModal)
  }

  const renderCompletedItems = (items) => {
    const tbody = document.querySelector('#completed-table-body')
    const count = document.querySelector('#completed-total')
    if (!tbody) return
    if (count) count.textContent = `완료 ${items.length}건`
    if (!items.length) {
      setEmptyRow(tbody, 6, '개선 완료 항목이 없습니다.')
      return
    }
    tbody.replaceChildren()
    items.forEach((item) => {
      const row = document.createElement('tr')
      row.insertCell().textContent = formatDate(item.completedDate)
      const score = row.insertCell()
      const scoreChip = document.createElement('span')
      scoreChip.className = 'improvement-risk-score'
      scoreChip.textContent = String(item.riskScore)
      score.append(scoreChip)
      row.insertCell().textContent = item.hazardEvent
      row.insertCell().textContent = item.process ? `${item.team} · ${item.process}` : item.team
      row.insertCell().textContent = item.improvementAction
      const detailCell = row.insertCell()
      const detailButton = document.createElement('button')
      detailButton.type = 'button'
      detailButton.className = 'completed-details-button'
      detailButton.textContent = '상세 보기'
      detailButton.addEventListener('click', () => openImprovementDetails(item))
      detailCell.append(detailButton)
      tbody.append(row)
    })
  }

  const loadHighRiskItems = async () => {
    const items = await apiRequest('/api/improvements/high-risk')
    renderHighRiskItems(items)
  }

  const loadCompletedItems = async () => {
    const sort = document.querySelector('#completed-sort')?.value || 'desc'
    const items = await apiRequest(`/api/improvements/completed?sort=${encodeURIComponent(sort)}`)
    renderCompletedItems(items)
  }

  const loadWorkspaceData = async () => {
    try {
      const [setting, hazardLabelSetting, processSettings] = await Promise.all([
        apiRequest('/api/settings/dashboard-title'),
        apiRequest('/api/settings/hazard-risk-label'),
        apiRequest('/api/settings/team-processes'),
      ])
      dashboardTitle = setting.title || defaultDashboardTitle
      hazardRiskLabel = hazardLabelSetting.label || defaultHazardRiskLabel
      teamProcesses = processSettings || { ...defaultTeamProcesses }
      document.querySelector('#page-title').textContent = dashboardTitle
      document.title = `안전온 | ${dashboardTitle}`
      applyHazardRiskLabel()
    } catch { /* Keep the default label if settings cannot be loaded. */ }
    updateAccessUi()
    try {
      await loadHighRiskItems()
      if (activeFolderScope) await loadFolderFiles()
      if (!document.querySelector('#completed-list-content')?.hidden) await loadCompletedItems()
    } catch (error) {
      showRequestError(error)
    }
  }

  document.querySelector('#edit-dashboard-title-button')?.addEventListener('click', () => {
    const input = document.createElement('input')
    input.type = 'text'
    input.maxLength = 120
    input.value = dashboardTitle
    input.autocomplete = 'off'
    const content = document.createElement('div')
    content.append(field('대시보드 제목', input, '변경 내용은 모든 사용자의 대시보드에 저장됩니다.'))
    showModal('대시보드 제목 편집', '메인 화면의 제목 레이블을 변경합니다.', content, '저장', async () => {
      const title = input.value.trim()
      if (!title) { toast('제목을 입력해 주세요.'); return }
      try {
        const updated = await apiRequest('/api/settings/dashboard-title', { method: 'PUT', body: JSON.stringify({ title }) })
        dashboardTitle = updated.title
        document.querySelector('#page-title').textContent = dashboardTitle
        document.title = `안전온 | ${dashboardTitle}`
        closeModal()
        toast('대시보드 제목을 저장했습니다.')
      } catch (error) { showRequestError(error) }
    })
  })

  const addImprovementButton = document.querySelector('#add-improvement-button')
  addImprovementButton?.addEventListener('click', () => {
    const content = document.createElement('div')
    const assessmentType = document.createElement('select')
    assessmentType.innerHTML = '<option value="REGULAR">정기 위험성평가</option><option value="AD_HOC">수시 위험성평가</option>'
    const team = document.createElement('select')
    team.innerHTML = '<option value="">팀 선택</option>' + Object.keys(teamProcesses).map(name => `<option value="${name}">${name}</option>`).join('')
    const process = document.createElement('select')
    const hazard = document.createElement('textarea')
    hazard.placeholder = '예: Trouble 조치 작업 중 센서 감지에 따른 설비 작동'
    const action = document.createElement('textarea')
    action.placeholder = '예: Interlock Type 변경을 통한 설비 안정성 개선'
    const frequency = document.createElement('select')
    frequency.innerHTML = '<option value="1">1 · 거의 없음</option><option value="2">2 · 낮음</option><option value="3">3 · 있음</option><option value="4">4 · 높음</option><option value="5">5 · 빈번함</option>'
    frequency.value = '2'
    const severity = document.createElement('select')
    severity.innerHTML = '<option value="1">1 · 영향 없음</option><option value="2">2 · 경미한 재해</option><option value="3">3 · 경중한 재해</option><option value="4">4 · 중대 재해</option>'
    severity.value = '4'
    const riskScore = document.createElement('strong')
    riskScore.className = 'risk-score-preview'
    const plannedDate = document.createElement('input')
    plannedDate.type = 'date'
    const assignee = document.createElement('input')
    assignee.placeholder = '담당자 이름'
    const refreshProcessOptions = () => {
      const options = teamProcesses[team.value] || []
      process.innerHTML = '<option value="">팀 전체</option>' + options.map(value => `<option value="${value}">${value}</option>`).join('')
    }
    const refreshRiskScore = () => {
      const score = Number(frequency.value) * Number(severity.value)
      riskScore.textContent = `위험도 ${score}`
      riskScore.classList.toggle('high', score >= 8)
    }
    team.addEventListener('change', refreshProcessOptions)
    frequency.addEventListener('change', refreshRiskScore)
    severity.addEventListener('change', refreshRiskScore)
    refreshProcessOptions()
    refreshRiskScore()
    const scoreRow = document.createElement('div')
    scoreRow.className = 'form-row'
    scoreRow.append(field('빈도', frequency), field('강도', severity))
    const scorePreview = document.createElement('div')
    scorePreview.className = 'risk-score-preview-row'
    scorePreview.append(riskScore)
    content.append(
      field('평가 유형', assessmentType),
      field('팀', team),
      field('공정', process),
      field('위험요인 및 재해형태', hazard),
      field('개선(예방)대책', action),
      scoreRow,
      scorePreview,
      field('개선 예정일', plannedDate),
      field('담당자', assignee),
    )
    showModal('개선 필요 건 등록', '위험도 8 이상인 항목만 상단 목록에 노출됩니다.', content, '등록', async () => {
      const score = Number(frequency.value) * Number(severity.value)
      if (!team.value || !hazard.value.trim() || !action.value.trim()) {
        toast('팀, 위험요인, 개선대책을 입력해 주세요.')
        return
      }
      if (score < 8) {
        toast('개선 필요 건은 위험도 8 이상만 등록할 수 있습니다.')
        return
      }
      try {
        await apiRequest('/api/improvements', {
          method: 'POST',
          body: JSON.stringify({
            year: currentYear,
            assessmentType: assessmentType.value,
            team: team.value,
            process: process.value,
            hazardEvent: hazard.value.trim(),
            improvementAction: action.value.trim(),
            frequency: Number(frequency.value),
            severity: Number(severity.value),
            plannedDate: plannedDate.value || null,
            assignee: assignee.value.trim(),
          }),
        })
        closeModal()
        await loadHighRiskItems()
        toast('개선 필요 건을 등록했습니다.')
      } catch (error) { showRequestError(error) }
    })
  })

  const changeImprovementStatus = async (item, select) => {
    const previousValue = item.status
    const nextValue = select.value
    if (nextValue === previousValue) return
    const saveStatus = async (completedDate) => {
      try {
        await apiRequest(`/api/improvements/${item.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: nextValue, completedDate: completedDate || null }),
        })
        closeModal()
        await loadHighRiskItems()
        if (!document.querySelector('#completed-list-content')?.hidden) await loadCompletedItems()
        toast(nextValue === 'COMPLETED' ? '개선 완료 처리했습니다.' : '개선 진행 중으로 변경했습니다.')
      } catch (error) {
        select.value = previousValue
        showRequestError(error)
      }
    }
    if (nextValue !== 'COMPLETED') {
      await saveStatus(null)
      return
    }
    const content = document.createElement('div')
    const date = document.createElement('input')
    date.type = 'date'
    date.value = new Date().toISOString().slice(0, 10)
    content.append(field('개선 완료일', date, '완료일을 입력하면 완료 목록이 해당 날짜 기준으로 정렬됩니다.'))
    showModal('개선 완료 처리', '완료일을 확인한 뒤 상태를 변경하세요.', content, '완료 처리', () => {
      if (!date.value) { toast('완료일을 입력해 주세요.'); return }
      saveStatus(date.value)
    })
    select.value = previousValue
  }

  document.querySelector('#completed-toggle')?.addEventListener('click', async (event) => {
    const button = event.currentTarget
    const panel = document.querySelector('#completed-list-content')
    const open = button.getAttribute('aria-expanded') !== 'true'
    button.setAttribute('aria-expanded', String(open))
    panel.hidden = !open
    if (open) {
      try { await loadCompletedItems() } catch (error) { showRequestError(error) }
    }
  })
  document.querySelector('#completed-sort')?.addEventListener('change', async () => {
    try { await loadCompletedItems() } catch (error) { showRequestError(error) }
  })

  document.querySelectorAll('[data-file-upload]').forEach((input) => {
    input.addEventListener('change', async () => {
      const selected = Array.from(input.files || [])
      if (!selected.length) return
      const form = new FormData()
      form.append('year', input.dataset.uploadYear)
      form.append('assessmentType', input.dataset.uploadType)
      form.append('category', input.dataset.uploadCategory)
      form.append('team', input.dataset.uploadTeam)
      form.append('process', input.dataset.uploadProcess || '')
      selected.forEach(file => form.append('files', file))
      try {
        const result = await apiRequest('/api/files', { method: 'POST', body: form })
        result.files.forEach(renderFileMetadata)
        input.value = ''
        toast(`${result.files.length}개 파일을 안전하게 저장했습니다.`)
      } catch (error) { showRequestError(error) }
    })
  })

  const newAssessmentButton = document.querySelector('#new-assessment-button')
  newAssessmentButton?.addEventListener('click', () => {
    const form = document.createElement('div')
    const assessmentType = document.createElement('select')
    assessmentType.innerHTML = '<option value="정기">정기 평가 · 연 1회</option><option value="수시">수시 평가 · 사유 발생</option>'
    const team = document.createElement('input')
    team.placeholder = '예: 공무팀 보전파트'
    const process = document.createElement('input')
    process.placeholder = '예: 화장지 4호기'
    const reason = document.createElement('select')
    reason.innerHTML = '<option value="">사유 선택</option><option>사고 발생</option><option>공정 변경</option><option>신규 공정·설비 추가</option><option>정비·보수</option><option>작업방법 변경</option><option>기타</option>'
    const date = document.createElement('input')
    date.type = 'date'
    date.value = new Date().toISOString().slice(0, 10)
    const typeField = field('평가 유형', assessmentType)
    const reasonField = field('수시 평가 사유', reason)
    const reasonHelp = document.createElement('small')
    reasonHelp.className = 'form-help'
    reasonHelp.textContent = '정기 평가를 선택하면 사유 입력은 생략할 수 있습니다.'
    reasonField.append(reasonHelp)
    assessmentType.addEventListener('change', () => {
      reasonField.hidden = assessmentType.value !== '수시'
    })
    reasonField.hidden = true
    form.append(
      typeField,
      field('부서 / 팀', team),
      field('공정명', process),
      reasonField,
      field('평가 기준일', date),
    )
    showModal('새 위험성평가 만들기', '평가 기본 정보를 입력해 주세요. 세부 위험요인은 다음 단계에서 작성합니다.', form, '평가 시작', (backdrop) => {
      if (!team.value.trim() || !process.value.trim()) {
        toast('부서와 공정명을 입력해 주세요.')
        return
      }
      if (assessmentType.value === '수시' && !reason.value) {
        toast('수시 평가 사유를 선택해 주세요.')
        return
      }
      const tbody = document.querySelector('#assessment-table-body')
      const row = document.createElement('tr')
      row.dataset.type = assessmentType.value === '정기' ? 'regular' : 'adhoc'
      row.dataset.search = `${team.value} ${process.value} ${assessmentType.value}`
      row.innerHTML = `
        <td><div class="assessment-name"><span class="assessment-symbol symbol-mint"></span><span><strong></strong><small></small></span></div></td>
        <td><span class="type-badge"></span></td><td><span class="author-cell"><i class="author-avatar avatar-teal">김</i> 김안전</span></td>
        <td><div class="progress-cell"><div class="table-progress"><span style="width:0%"></span></div><small>0%</small></div></td>
        <td><span class="risk-count">-</span></td><td><span class="status-badge status-progress"><i></i> 작성 중</span></td><td><button class="row-menu" type="button" aria-label="평가 메뉴">···</button></td>`
      row.querySelector('.assessment-symbol').textContent = team.value.trim().slice(0, 1)
      row.querySelector('.assessment-name strong').textContent = process.value.trim() + ' 위험성평가'
      row.querySelector('.assessment-name small').textContent = team.value.trim() + ' · ' + process.value.trim()
      const badge = row.querySelector('.type-badge')
      badge.textContent = assessmentType.value
      badge.classList.add(assessmentType.value === '정기' ? 'type-regular' : 'type-adhoc')
      tbody.prepend(row)
      document.querySelector('#total-count').textContent = String(Number(document.querySelector('#total-count').textContent) + 1)
      backdrop.remove()
      toast(`${process.value.trim()} 평가 초안을 만들었습니다. (샘플 화면)`)
    })
  })

  const uploadButton = document.querySelector('#open-photo-modal')
  uploadButton?.addEventListener('click', () => {
    const form = document.createElement('div')
    const drop = document.createElement('label')
    drop.className = 'upload-zone'
    drop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM22 15l-5-5L5 20"/></svg><strong>현장 사진을 선택하거나 끌어다 놓으세요</strong><small>JPG, PNG · 이미지가 선명하고 작업환경이 잘 보이도록 촬영해 주세요.</small>'
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/png,image/jpeg,image/webp'
    fileInput.multiple = true
    drop.append(fileInput)
    const filename = document.createElement('div')
    filename.className = 'upload-filename'
    const note = document.createElement('div')
    note.className = 'ai-note'
    note.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.8 20h18.4L12 3zM12 9v4M12 17h.01"/></svg><span>AI는 사진에서 확인할 수 있는 내용으로 초안을 제안합니다. 빈도·강도와 최종 위험도는 현장 담당자가 확인해야 합니다.</span>'
    fileInput.addEventListener('change', () => {
      filename.textContent = Array.from(fileInput.files || []).map(file => file.name).join(' · ')
    })
    drop.addEventListener('dragover', (event) => { event.preventDefault(); drop.classList.add('dragging') })
    drop.addEventListener('dragleave', () => drop.classList.remove('dragging'))
    drop.addEventListener('drop', (event) => {
      event.preventDefault()
      drop.classList.remove('dragging')
      const files = Array.from(event.dataTransfer?.files || [])
      filename.textContent = files.map(file => file.name).join(' · ')
    })
    form.append(drop, filename, note)
    showModal('사진으로 위험요인 초안 만들기', '작업환경을 보여주는 현장 사진을 등록해 주세요.', form, '위험요인 초안 요청', () => {
      const hasFiles = (fileInput.files?.length || 0) > 0 || filename.textContent.length > 0
      if (!hasFiles) {
        toast('먼저 분석할 현장 사진을 선택해 주세요.')
        return
      }
      closeModal()
      toast('사진 업로드와 AI 분석은 백엔드 연동 후 사용할 수 있습니다.')
    })
  })

  const dashboardScaleInput = document.querySelector('#dashboard-size-range')
  const dashboardScaleOutput = document.querySelector('#dashboard-size-value')
  const dashboardContent = document.querySelector('.page-content')
  const decreaseDashboardButton = document.querySelector('#dashboard-size-decrease')
  const increaseDashboardButton = document.querySelector('#dashboard-size-increase')

  const updateDashboardSize = (value, persist = true) => {
    const scale = Math.max(85, Math.min(115, Math.round(Number(value) / 5) * 5))
    if (!dashboardScaleInput || !dashboardContent) return
    const scaleFactor = scale / 100
    dashboardScaleInput.value = String(scale)
    dashboardContent.style.setProperty('--dashboard-scale', String(scaleFactor))
    if (dashboardScaleOutput) dashboardScaleOutput.textContent = `${scale}%`
    if (decreaseDashboardButton) decreaseDashboardButton.disabled = scale <= 85
    if (increaseDashboardButton) increaseDashboardButton.disabled = scale >= 115
    if (persist) {
      try { localStorage.setItem('safety-dashboard-scale', String(scale)) } catch (_) { /* storage may be blocked */ }
    }
  }

  if (dashboardScaleInput) {
    let savedScale = 100
    try { savedScale = Number(localStorage.getItem('safety-dashboard-scale')) || 100 } catch (_) { /* use default scale */ }
    updateDashboardSize(savedScale, false)
    dashboardScaleInput.addEventListener('input', () => updateDashboardSize(dashboardScaleInput.value))
  }
  decreaseDashboardButton?.addEventListener('click', () => updateDashboardSize(Number(dashboardScaleInput?.value || 100) - 5))
  increaseDashboardButton?.addEventListener('click', () => updateDashboardSize(Number(dashboardScaleInput?.value || 100) + 5))



  document.querySelectorAll('.filter-tab').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('selected'))
      button.classList.add('selected')
      const filter = button.dataset.filter
      document.querySelectorAll('#assessment-table-body tr').forEach(row => {
        row.hidden = filter !== 'all' && row.dataset.type !== filter
      })
    })
  })

  const searchInput = document.querySelector('.global-search input')
  searchInput?.addEventListener('input', () => {
    const query = searchInput.value.trim().toLocaleLowerCase()
    document.querySelectorAll('#assessment-table-body tr').forEach(row => {
      row.hidden = query.length > 0 && !row.dataset.search.toLocaleLowerCase().includes(query)
    })
    if (query) {
      document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('selected'))
      document.querySelector('.filter-tab[data-filter="all"]')?.classList.add('selected')
    }
  })

  document.querySelectorAll('[data-tree-toggle]').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      if (toggle.dataset.assessmentType) {
        showAssessmentHub(toggle.dataset.assessmentYear, toggle.dataset.assessmentType)
        if (window.innerWidth <= 660) document.querySelector('#sidebar')?.classList.remove('mobile-open')
        return
      }
      const expanded = toggle.getAttribute('aria-expanded') === 'true'
      const panel = document.getElementById(toggle.getAttribute('aria-controls'))
      toggle.setAttribute('aria-expanded', String(!expanded))
      toggle.classList.toggle('is-open', !expanded)
      if (panel) panel.hidden = expanded
    })
  })

  document.querySelectorAll('[data-file-year]').forEach((item) => {
    item.addEventListener('click', () => {
      const scope = {
        year: Number(item.dataset.fileYear),
        assessmentType: item.dataset.fileAssessmentType,
        category: item.dataset.fileCategory,
        team: item.dataset.fileTeam,
        process: item.dataset.fileProcess || '',
      }
      document.querySelectorAll('[data-workspace-selection]').forEach(entry => entry.classList.remove('selected'))
      item.classList.add('selected')
      const breadcrumb = document.querySelector('#breadcrumb-selection')
      if (breadcrumb) breadcrumb.textContent = item.dataset.workspaceSelection.split(' / ').slice(-2).join(' / ')
      showFolderView(scope).catch(showRequestError)
      if (window.innerWidth <= 660) document.querySelector('#sidebar')?.classList.remove('mobile-open')
    })
  })

  document.querySelector('#edit-hazard-risk-label-button')?.addEventListener('click', () => {
    const input = document.createElement('input')
    input.type = 'text'
    input.maxLength = 120
    input.value = hazardRiskLabel
    input.autocomplete = 'off'
    const content = document.createElement('div')
    content.append(field('분류 레이블', input, '사이드바와 정기 평가 분류 페이지에 함께 적용됩니다.'))
    showModal('유해·위험요인 레이블 편집', '분류 페이지 상단과 대시보드 분류 이름을 변경합니다.', content, '저장', async () => {
      const label = input.value.trim()
      if (!label) { toast('레이블 이름을 입력해 주세요.'); return }
      try {
        const updated = await apiRequest('/api/settings/hazard-risk-label', { method: 'PUT', body: JSON.stringify({ title: label }) })
        hazardRiskLabel = updated.label
        applyHazardRiskLabel()
        if (!document.querySelector('#assessment-hub-view').hidden) showAssessmentHub(currentAssessmentYear, currentAssessmentType)
        else if (!document.querySelector('#assessment-subcategory-view').hidden) showAssessmentSubcategory(currentSubcategory)
        else if (activeFolderScope?.category === 'HAZARD_RISK') {
          document.querySelector('#page-title').textContent = hazardRiskLabel
          document.querySelector('#folder-category-label').textContent = hazardRiskLabel
          document.querySelector('#folder-path').textContent = document.querySelector('#folder-path').textContent.replace(defaultHazardRiskLabel, hazardRiskLabel)
        }
        closeModal()
        toast('분류 레이블을 저장했습니다.')
      } catch (error) { showRequestError(error) }
    })
  })

  document.querySelector('#assessment-hub-back-button')?.addEventListener('click', showDashboardPage)
  document.querySelector('#subcategory-back-button')?.addEventListener('click', () => showAssessmentHub(currentAssessmentYear, currentAssessmentType))
  document.querySelector('#team-process-back-button')?.addEventListener('click', () => showAssessmentSubcategory(currentSubcategory))
  document.querySelector('#team-process-all-files-button')?.addEventListener('click', () => showFolderView({ year: currentAssessmentYear, assessmentType: currentAssessmentType, category: currentSubcategory, team: currentTeam, process: '' }, 'team-process'))
  document.querySelector('#add-team-process-button')?.addEventListener('click', addProcessToTeam)
  document.querySelector('#folder-back-button')?.addEventListener('click', () => {
    if (folderReturnMode === 'subcategory') showAssessmentSubcategory(currentSubcategory)
    else if (folderReturnMode === 'team-process') showTeamProcessPage(currentTeam)
    else showDashboardPage()
  })

  const folderUploadInput = document.querySelector('#team-folder-file-input')
  document.querySelector('#folder-upload-button')?.addEventListener('click', () => folderUploadInput?.click())
  folderUploadInput?.addEventListener('change', async () => {
    const selected = Array.from(folderUploadInput.files || [])
    if (!selected.length || !activeFolderScope) return
    const form = new FormData()
    form.append('year', String(activeFolderScope.year))
    form.append('assessmentType', activeFolderScope.assessmentType)
    form.append('category', activeFolderScope.category)
    form.append('team', activeFolderScope.team)
    form.append('process', activeFolderScope.process || '')
    selected.forEach(file => form.append('files', file))
    try {
      const result = await apiRequest('/api/files', { method: 'POST', body: form })
      folderUploadInput.value = ''
      await loadFolderFiles()
      toast(`${result.files.length}개 파일을 저장했습니다.`)
    } catch (error) { folderUploadInput.value = ''; showRequestError(error) }
  })

  document.querySelector('#export-button')?.addEventListener('click', () => toast('연도별 엑셀 내보내기는 데이터 기능 연동 후 제공됩니다.'))
  document.querySelector('#status-filter')?.addEventListener('click', () => toast('상태별 필터는 다음 기능 구현 단계에서 연결됩니다.'))
  document.querySelector('#open-actions')?.addEventListener('click', () => toast('개선조치 관리 목록으로 이동합니다. (샘플 화면)'))
  document.querySelector('#review-all')?.addEventListener('click', () => toast('승인 대기함은 권한·워크플로 연동 후 사용할 수 있습니다.'))
  document.querySelectorAll('.row-menu, .risk-arrow, .small-more').forEach(button => {
    button.addEventListener('click', () => toast('상세 화면은 다음 단계에서 연결됩니다.'))
  })

  document.querySelector('.brand')?.addEventListener('click', (event) => {
    event.preventDefault()
    showDashboardPage()
    if (window.innerWidth <= 660) document.querySelector('#sidebar')?.classList.remove('mobile-open')
  })
  document.querySelector('.dashboard-nav-item')?.addEventListener('click', (event) => {
    event.preventDefault()
    showDashboardPage()
  })
  document.querySelector('#mobile-menu-button')?.addEventListener('click', () => {
    document.querySelector('#sidebar')?.classList.toggle('mobile-open')
  })
  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 660) document.querySelector('#sidebar')?.classList.remove('mobile-open')
    })
  })

  updateAccessUi()
  loadWorkspaceData()
})()
