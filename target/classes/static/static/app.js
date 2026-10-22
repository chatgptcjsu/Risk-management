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

  document.querySelectorAll('[data-regular-upload]').forEach((input) => {
    input.addEventListener('change', () => {
      const files = Array.from(input.files || [])
      if (!files.length) return
      const format = input.dataset.regularUpload === 'xlsx' ? '유해위험요인 엑셀' : '개선요청 PPT'
      toast(`${input.dataset.uploadPath} · ${format} 파일을 선택했습니다. 저장은 서버 연동 후 활성화됩니다.`)
    })
  })

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

  document.querySelectorAll('[data-workspace-selection]').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('[data-workspace-selection]').forEach((entry) => entry.classList.remove('selected'))
      item.classList.add('selected')
      const selection = item.dataset.workspaceSelection
      const breadcrumb = document.querySelector('#breadcrumb-selection')
      if (breadcrumb) breadcrumb.textContent = selection.split(' / ').slice(-2).join(' / ')
      toast(`${selection} 분류를 선택했습니다.`)
      if (window.innerWidth <= 660) document.querySelector('#sidebar')?.classList.remove('mobile-open')
    })
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
})()
