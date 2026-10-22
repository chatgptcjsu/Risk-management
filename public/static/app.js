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

  const closeModal = () => document.querySelector('.modal-backdrop')?.remove()

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

  const authState = { user: null, csrfToken: '' }
  const currentYear = new Date().getFullYear()
  const teamProcesses = {
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

  const isManager = () => ['MANAGER', 'ADMIN'].includes(authState.user?.role)
  const isAdmin = () => authState.user?.role === 'ADMIN'
  let activeFolderScope = null

  const updateAccessUi = () => {
    const loginButton = document.querySelector('#manager-auth-button')
    if (loginButton) loginButton.textContent = authState.user ? `${authState.user.displayName} · 로그아웃` : '로그인'
    const userAdminButton = document.querySelector('#user-admin-button')
    if (userAdminButton) userAdminButton.hidden = !isAdmin()
    const addImprovementButton = document.querySelector('#add-improvement-button')
    if (addImprovementButton) addImprovementButton.hidden = !isManager()
    const folderUploadButton = document.querySelector('#folder-upload-button')
    const categoryAllowsUpload = activeFolderScope && (
      activeFolderScope.category === 'IMPROVEMENT_REQUEST' ||
      (activeFolderScope.category === 'HAZARD_RISK' && activeFolderScope.assessmentType === 'REGULAR')
    )
    if (folderUploadButton) folderUploadButton.hidden = !isManager() || !categoryAllowsUpload
    document.querySelectorAll('.improvement-status-select').forEach((select) => {
      select.disabled = !isManager()
    })
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

  const showFolderView = async (scope) => {
    activeFolderScope = scope
    const title = scope.category === 'HAZARD_RISK' ? '유해위험요인' : '개선요청 건'
    const path = [scope.year + '년', scope.assessmentType === 'REGULAR' ? '정기 위험성평가' : '수시 위험성평가', title, scope.team, scope.process].filter(Boolean).join(' / ')
    document.querySelector('#dashboard-sections').hidden = true
    document.querySelector('#team-folder-view').hidden = false
    document.querySelector('#page-title').textContent = title
    document.querySelector('#page-subtitle').textContent = `${scope.team}${scope.process ? ` · ${scope.process}` : ''} 분류에 보관된 파일과 업로드 내역입니다.`
    document.querySelector('#folder-category-label').textContent = title
    document.querySelector('#folder-title').textContent = scope.process ? `${scope.team} · ${scope.process}` : scope.team
    document.querySelector('#folder-path').textContent = path
    const uploadButton = document.querySelector('#folder-upload-button')
    const uploadInput = document.querySelector('#team-folder-file-input')
    const allowedUpload = scope.category === 'HAZARD_RISK'
      ? scope.assessmentType === 'REGULAR'
      : scope.category === 'IMPROVEMENT_REQUEST'
    uploadButton.hidden = !isManager() || !allowedUpload
    uploadInput.accept = scope.category === 'HAZARD_RISK' ? '.xlsx,.xls' : '.pptx,.ppt'
    const instruction = document.querySelector('#folder-empty-instruction')
    instruction.textContent = scope.category === 'HAZARD_RISK'
      ? '정기 위험성평가의 유해위험요인 엑셀 파일을 업로드하세요.'
      : '개선 필요 건 PPT 파일을 업로드하세요.'
    await loadFolderFiles()
  }

  const loadFolderFiles = async () => {
    const tbody = document.querySelector('#folder-file-list')
    if (!tbody || !activeFolderScope) return
    if (!authState.user) {
      setEmptyRow(tbody, 6, '파일을 보려면 로그인해 주세요.')
      document.querySelector('#folder-empty-state').hidden = false
      document.querySelector('#folder-empty-title').textContent = '로그인이 필요합니다.'
      document.querySelector('#folder-empty-instruction').textContent = '로그인하면 이 팀·공정에 업로드된 파일을 확인할 수 있습니다.'
      document.querySelector('#folder-login-button').hidden = false
      document.querySelector('#folder-file-count').textContent = '로그인 필요'
      return
    }
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
      document.querySelector('#folder-login-button').hidden = true
      document.querySelector('#folder-empty-title').textContent = '아직 등록된 파일이 없습니다.'
      document.querySelector('#folder-empty-instruction').textContent = isManager()
        ? (activeFolderScope.category === 'HAZARD_RISK' ? '엑셀 파일을 업로드할 수 있습니다.' : '개선요청 PPT 파일을 업로드할 수 있습니다.')
        : '평가 담당자에게 해당 분류의 파일 업로드를 요청하세요.'
      if (!visibleFiles.length) {
        setEmptyRow(tbody, 6, '등록된 파일이 없습니다.')
        return
      }
      tbody.replaceChildren()
      visibleFiles.forEach((file) => {
        const row = document.createElement('tr')
        const nameCell = row.insertCell()
        const link = document.createElement('a')
        link.className = 'folder-download-link'
        link.href = `/api/files/${file.id}/download`
        link.textContent = file.originalName
        nameCell.append(link)
        row.insertCell().textContent = file.originalName.split('.').pop().toUpperCase()
        row.insertCell().textContent = `${Math.max(1, Math.ceil(file.fileSize / 1024))} KB`
        row.insertCell().textContent = file.uploadedBy
        row.insertCell().textContent = formatDateTime(file.uploadedAt)
        const actionCell = row.insertCell()
        if (isAdmin()) {
          const deleteButton = document.createElement('button')
          deleteButton.type = 'button'
          deleteButton.className = 'completed-details-button'
          deleteButton.textContent = '삭제'
          deleteButton.addEventListener('click', async () => {
            if (!window.confirm(`${file.originalName} 파일을 삭제할까요?`)) return
            try {
              await apiRequest(`/api/files/${file.id}`, { method: 'DELETE' })
              await loadFolderFiles()
              toast('파일을 삭제했습니다.')
            } catch (error) { showRequestError(error) }
          })
          actionCell.append(deleteButton)
        } else {
          actionCell.textContent = '—'
        }
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
      toast('로그인이 필요합니다. 상단의 로그인 버튼을 눌러 주세요.')
    } else if (error.status === 403) {
      toast('이 작업은 관리자 또는 평가 담당자 권한이 필요합니다.')
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
    select.disabled = !isManager()
    select.dataset.improvementId = item.id
    return select
  }

  const renderHighRiskItems = (items) => {
    const tbody = document.querySelector('#improvement-table-body')
    if (!tbody) return
    if (!items.length) {
      setEmptyRow(tbody, 6, authState.user ? '위험도 8 이상인 미완료 개선 건이 없습니다.' : '로그인 후 개선 필요 건을 확인할 수 있습니다.')
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
      const user = await apiRequest('/api/auth/me')
      if (!user) {
        authState.user = null
        updateAccessUi()
        setEmptyRow(document.querySelector('#improvement-table-body'), 6, '로그인 후 개선 필요 건을 확인할 수 있습니다.')
        const total = document.querySelector('#completed-total')
        if (total) total.textContent = '완료 내역은 로그인 후 확인할 수 있습니다.'
        return
      }
      authState.user = user
      updateAccessUi()
      await loadHighRiskItems()
      if (activeFolderScope) await loadFolderFiles()
      if (!document.querySelector('#completed-list-content')?.hidden) await loadCompletedItems()
    } catch (error) {
      authState.user = null
      updateAccessUi()
      setEmptyRow(document.querySelector('#improvement-table-body'), 6, '로그인 후 개선 필요 건을 확인할 수 있습니다.')
      const total = document.querySelector('#completed-total')
      if (total) total.textContent = '완료 내역은 로그인 후 확인할 수 있습니다.'
      if (error.status !== 401) showRequestError(error)
    }
  }

  const loginButton = document.querySelector('#manager-auth-button')
  loginButton?.addEventListener('click', () => {
    if (authState.user) {
      const content = document.createElement('div')
      content.textContent = `${authState.user.displayName} 계정에서 로그아웃할까요?`
      showModal('로그아웃', '로그아웃하면 다시 로그인해야 합니다.', content, '로그아웃', async () => {
        try {
          await apiRequest('/api/auth/logout', { method: 'POST' })
          authState.user = null
          authState.csrfToken = ''
          closeModal()
          updateAccessUi()
          setEmptyRow(document.querySelector('#improvement-table-body'), 6, '로그인 후 개선 필요 건을 확인할 수 있습니다.')
          if (activeFolderScope) await loadFolderFiles()
          toast('로그아웃했습니다.')
        } catch (error) { showRequestError(error) }
      })
      return
    }
    const content = document.createElement('div')
    const username = document.createElement('input')
    username.autocomplete = 'username'
    username.placeholder = '아이디'
    const password = document.createElement('input')
    password.type = 'password'
    password.autocomplete = 'current-password'
    password.placeholder = '비밀번호'
    content.append(field('아이디', username), field('비밀번호', password))
    showModal('사용자 로그인', '현장 조회 계정 또는 관리자 계정으로 로그인하세요.', content, '로그인', async (backdrop) => {
      try {
        const user = await apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: username.value.trim(), password: password.value }) })
        authState.user = user
        updateAccessUi()
        closeModal()
        await loadHighRiskItems()
        if (activeFolderScope) await loadFolderFiles()
        if (!document.querySelector('#completed-list-content')?.hidden) await loadCompletedItems()
        toast(`${user.displayName}님, 로그인했습니다.`)
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
    if (open && authState.user) {
      try { await loadCompletedItems() } catch (error) { showRequestError(error) }
    }
  })
  document.querySelector('#completed-sort')?.addEventListener('change', async () => {
    if (authState.user) {
      try { await loadCompletedItems() } catch (error) { showRequestError(error) }
    }
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

  document.querySelector('#folder-back-button')?.addEventListener('click', () => {
    document.querySelector('#team-folder-view').hidden = true
    document.querySelector('#dashboard-sections').hidden = false
    document.querySelector('#page-title').textContent = '유해위험요인'
    document.querySelector('#page-subtitle').textContent = '작업현장의 유해·위험요인과 개선 진행 상황을 확인하세요.'
    document.querySelector('#breadcrumb-selection').textContent = '유해위험요인'
    activeFolderScope = null
  })

  document.querySelector('#folder-login-button')?.addEventListener('click', () => document.querySelector('#manager-auth-button')?.click())
  document.querySelector('#folder-login-button')?.addEventListener('click', () => document.querySelector('#manager-auth-button')?.click())
  const folderUploadInput = document.querySelector('#team-folder-file-input')
  document.querySelector('#folder-upload-button')?.addEventListener('click', () => folderUploadInput?.click())
  folderUploadInput?.addEventListener('change', async () => {
    const selected = Array.from(folderUploadInput.files || [])
    if (!selected.length || !activeFolderScope) return
    if (!isManager()) { toast('파일 업로드는 평가 담당자 권한이 필요합니다.'); return }
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

  document.querySelector('#user-admin-button')?.addEventListener('click', async () => {
    if (!isAdmin()) return
    try {
      const users = await apiRequest('/api/admin/users')
      const content = document.createElement('div')
      const username = document.createElement('input'); username.autocomplete = 'off'; username.placeholder = '아이디'
      const displayName = document.createElement('input'); displayName.placeholder = '표시 이름'
      const password = document.createElement('input'); password.type = 'password'; password.autocomplete = 'new-password'; password.placeholder = '임시 비밀번호 (12자 이상)'
      const role = document.createElement('select')
      role.innerHTML = '<option value="FIELD">현장 조회</option><option value="MANAGER">평가 담당자</option><option value="ADMIN">관리자</option>'
      const userList = document.createElement('ul'); userList.className = 'admin-user-list'
      users.forEach(user => { const entry = document.createElement('li'); entry.textContent = `${user.displayName} (${user.username}) · ${user.role}`; userList.append(entry) })
      const fields = document.createElement('div'); fields.className = 'admin-user-form'
      fields.append(field('아이디', username), field('이름', displayName), field('임시 비밀번호', password), field('권한', role))
      const help = document.createElement('p'); help.className = 'admin-user-help'; help.textContent = '현장 조회자는 열람, 평가 담당자는 파일 등록·상태 변경, 관리자는 사용자 및 파일 관리를 할 수 있습니다.'
      content.append(help, fields, userList)
      showModal('사용자 관리', '관리자만 계정과 권한을 관리할 수 있습니다.', content, '계정 추가', async () => {
        try {
          await apiRequest('/api/admin/users', { method: 'POST', body: JSON.stringify({ username: username.value.trim(), displayName: displayName.value.trim(), password: password.value, role: role.value }) })
          closeModal(); toast('사용자를 추가했습니다.')
        } catch (error) { showRequestError(error) }
      })
    } catch (error) { showRequestError(error) }
  })

  document.querySelector('#export-button')?.addEventListener('click', () => toast('연도별 엑셀 내보내기는 데이터 기능 연동 후 제공됩니다.'))
  document.querySelector('#status-filter')?.addEventListener('click', () => toast('상태별 필터는 다음 기능 구현 단계에서 연결됩니다.'))
  document.querySelector('#open-actions')?.addEventListener('click', () => toast('개선조치 관리 목록으로 이동합니다. (샘플 화면)'))
  document.querySelector('#review-all')?.addEventListener('click', () => toast('승인 대기함은 권한·워크플로 연동 후 사용할 수 있습니다.'))
  document.querySelectorAll('.row-menu, .risk-arrow, .small-more').forEach(button => {
    button.addEventListener('click', () => toast('상세 화면은 다음 단계에서 연결됩니다.'))
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
