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
    form.className = 'assessment-wizard'
    const wizardState = { step: 0, beforeScore: '', afterScore: '', photoUrls: [] }
    const stepLabels = ['기본정보', '위험요인·대책', '위험도 평가', '최종 확인']
    const stepper = document.createElement('div')
    stepper.className = 'wizard-stepper'
    stepper.setAttribute('aria-label', '평가 작성 단계')
    const stepButtons = stepLabels.map((label, index) => {
      const item = document.createElement('div')
      item.className = 'wizard-step'
      item.innerHTML = `<span class="wizard-step-number">${index + 1}</span><span class="wizard-step-label"></span>`
      item.querySelector('.wizard-step-label').textContent = label
      stepper.append(item)
      return item
    })
    form.append(stepper)

    const pages = stepLabels.map((label, index) => {
      const page = document.createElement('section')
      page.className = 'wizard-page'
      page.setAttribute('aria-label', `${index + 1}단계 ${label}`)
      page.hidden = index !== 0
      form.append(page)
      return page
    })

    const assessmentType = document.createElement('select')
    assessmentType.innerHTML = '<option value="정기">정기 평가 · 연 1회</option><option value="수시">수시 평가 · 사유 발생</option>'
    const team = document.createElement('input')
    team.placeholder = '예: 공무팀 보전파트'
    const process = document.createElement('input')
    process.placeholder = '예: 화장지 4호기'
    const reason = document.createElement('select')
    reason.innerHTML = '<option value="">사유 선택</option><option>사고 발생</option><option>공정 변경</option><option>신규 공정·설비 추가</option><option>정비·보수</option><option>작업방법 변경</option><option>기타</option>'
    const assessmentDate = document.createElement('input')
    assessmentDate.type = 'date'
    assessmentDate.value = new Date().toISOString().slice(0, 10)
    const participants = document.createElement('textarea')
    participants.placeholder = '참여자 이름을 직접 입력해 주세요. 여러 명은 쉼표 또는 줄바꿈으로 구분할 수 있습니다.'
    participants.rows = 2
    const reasonField = field('수시 평가 사유', reason)
    const reasonHelp = document.createElement('small')
    reasonHelp.className = 'form-help'
    reasonHelp.textContent = '정기 평가를 선택하면 사유 입력은 생략할 수 있습니다.'
    reasonField.append(reasonHelp)
    reasonField.hidden = true
    assessmentType.addEventListener('change', () => {
      reasonField.hidden = assessmentType.value !== '수시'
    })
    pages[0].append(
      field('평가 유형', assessmentType),
      field('부서 / 팀', team),
      field('공정명', process),
      reasonField,
      field('평가 기준일', assessmentDate),
      field('위험성평가 참여자', participants, '이름을 직접 입력해 주세요.'),
    )

    const hazard = document.createElement('textarea')
    hazard.placeholder = '예: 회전 중인 롤러에 장갑이나 작업복이 말려 들어갈 위험'
    hazard.rows = 3
    const accidentType = document.createElement('textarea')
    accidentType.placeholder = '예: 끼임, 협착, 찰과상'
    accidentType.rows = 2
    const improvement = document.createElement('textarea')
    improvement.placeholder = '위험을 줄이기 위해 어떤 조치를 할지 구체적으로 입력해 주세요.'
    improvement.rows = 4
    const improvementDate = document.createElement('input')
    improvementDate.type = 'date'
    const photoInput = document.createElement('input')
    photoInput.type = 'file'
    photoInput.accept = 'image/*'
    photoInput.multiple = true
    photoInput.setAttribute('aria-label', '개선 전 사진 선택')
    const photoLabel = document.createElement('div')
    photoLabel.className = 'photo-picker'
    photoLabel.tabIndex = 0
    photoLabel.setAttribute('role', 'button')
    photoLabel.setAttribute('aria-label', '개선 전 사진 추가')
    photoLabel.innerHTML = '<span class="photo-picker-icon">＋</span><span><strong>개선 전 사진 추가</strong><small>사진 파일을 선택하면 미리보기가 표시됩니다.</small></span>'
    photoLabel.append(photoInput)
    photoLabel.addEventListener('click', (event) => {
      if (event.target !== photoInput) photoInput.click()
    })
    photoLabel.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        photoInput.click()
      }
    })
    const photoPreview = document.createElement('div')
    photoPreview.className = 'photo-preview-grid'
    photoInput.addEventListener('change', () => {
      wizardState.photoUrls.forEach(url => URL.revokeObjectURL(url))
      wizardState.photoUrls = Array.from(photoInput.files || []).map(file => URL.createObjectURL(file))
      photoPreview.replaceChildren()
      Array.from(photoInput.files || []).forEach((file, index) => {
        const preview = document.createElement('figure')
        preview.className = 'photo-preview'
        const image = document.createElement('img')
        image.src = wizardState.photoUrls[index]
        image.alt = `개선 전 사진 ${index + 1}: ${file.name}`
        const caption = document.createElement('figcaption')
        caption.textContent = file.name
        preview.append(image, caption)
        photoPreview.append(preview)
      })
    })
    pages[1].append(
      field('위험요인', hazard, '작업 중 어떤 위험이 발생할 수 있는지 작성합니다.'),
      field('예상되는 재해형태', accidentType, '예: 끼임, 넘어짐, 추락, 화상 등'),
      field('개선(예방)대책', improvement, '위험요인을 줄이거나 제거하기 위한 조치를 작성합니다.'),
      field('개선 예정일', improvementDate, '날짜를 클릭하면 달력에서 선택할 수 있습니다.'),
      field('개선 전 사진', photoLabel, '여러 장을 선택할 수 있습니다.'),
      photoPreview,
    )

    const scoreSelection = (label, color, stateKey, disabled = false) => {
      const group = document.createElement('div')
      group.className = `score-group score-group-${color}`
      const title = document.createElement('div')
      title.className = 'score-group-title'
      title.textContent = label
      const choices = document.createElement('div')
      choices.className = 'score-choices'
      const display = document.createElement('div')
      display.className = `risk-score-circle ${color}-circle`
      display.hidden = true
      display.setAttribute('aria-live', 'polite')
      const buttons = []
      ;['1', '2', '3'].forEach(value => {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'score-choice'
        button.textContent = value
        button.setAttribute('aria-label', `${label} ${value} 선택`)
        button.disabled = disabled
        button.addEventListener('click', () => {
          if (stateKey === 'afterScore' && !wizardState.beforeScore) {
            toast('개선 전 위험등급을 먼저 선택해 주세요.')
            return
          }
          wizardState[stateKey] = value
          display.textContent = value
          display.hidden = false
          buttons.forEach(option => option.classList.toggle('selected', option === button))
          if (stateKey === 'beforeScore') {
            afterScoreGroup.querySelectorAll('.score-choice').forEach(option => { option.disabled = false })
          }
          updateRiskGrades()
        })
        buttons.push(button)
        choices.append(button)
      })
      group.append(title, choices, display)
      return group
    }
    const scoreIntro = document.createElement('p')
    scoreIntro.className = 'wizard-instruction'
    scoreIntro.textContent = '먼저 개선 전(빨간색)을 선택한 뒤 개선 후(초록색)를 선택하세요. 3번 버튼은 두 동그라미를 모두 지웁니다.'
    const scoreCards = document.createElement('div')
    scoreCards.className = 'score-cards'
    const beforeScoreGroup = scoreSelection('개선 전 위험성', 'red', 'beforeScore')
    const afterScoreGroup = scoreSelection('개선 후 위험성', 'green', 'afterScore', true)
    const resetScores = document.createElement('button')
    resetScores.type = 'button'
    resetScores.className = 'score-reset-button'
    resetScores.textContent = '3번 · 동그라미 모두 지우기'
    const beforeGrade = document.createElement('input')
    beforeGrade.readOnly = true
    beforeGrade.placeholder = '빨간색 숫자 자동 입력'
    const afterGrade = document.createElement('input')
    afterGrade.readOnly = true
    afterGrade.placeholder = '초록색 숫자 자동 입력'
    const updateRiskGrades = () => {
      beforeGrade.value = wizardState.beforeScore
      afterGrade.value = wizardState.afterScore
    }
    const clearScoreGroup = (group, color) => {
      group.querySelector('.risk-score-circle').hidden = true
      group.querySelector('.risk-score-circle').textContent = ''
      group.querySelectorAll('.score-choice').forEach(button => button.classList.remove('selected'))
    }
    resetScores.addEventListener('click', () => {
      wizardState.beforeScore = ''
      wizardState.afterScore = ''
      clearScoreGroup(beforeScoreGroup, 'red')
      clearScoreGroup(afterScoreGroup, 'green')
      afterScoreGroup.querySelectorAll('.score-choice').forEach(button => { button.disabled = true })
      updateRiskGrades()
      toast('개선 전·후 위험도 선택을 모두 지웠습니다.')
    })
    scoreCards.append(beforeScoreGroup, afterScoreGroup)
    pages[2].append(
      scoreIntro,
      scoreCards,
      resetScores,
      document.createElement('hr'),
      field('개선 전 위험등급', beforeGrade, '개선 전 빨간색 숫자를 선택하면 자동으로 입력됩니다.'),
      field('개선 후 위험등급', afterGrade, '개선 후 초록색 숫자를 선택하면 자동으로 입력됩니다.'),
    )

    const summary = document.createElement('dl')
    summary.className = 'assessment-summary'
    const summaryItems = []
    ;['평가 유형', '부서 / 팀', '공정명', '평가 기준일', '참여자', '위험요인', '재해형태', '개선(예방)대책', '개선 예정일', '개선 전 위험등급', '개선 후 위험등급', '개선 전 사진'].forEach(label => {
      const row = document.createElement('div')
      row.className = 'summary-item'
      const term = document.createElement('dt')
      term.textContent = label
      const detail = document.createElement('dd')
      detail.textContent = '—'
      row.append(term, detail)
      summary.append(row)
      summaryItems.push(detail)
    })
    pages[3].append(summary)
    const refreshSummary = () => {
      const values = [
        assessmentType.value,
        team.value.trim(),
        process.value.trim(),
        assessmentDate.value,
        participants.value.trim(),
        hazard.value.trim(),
        accidentType.value.trim(),
        improvement.value.trim(),
        improvementDate.value,
        wizardState.beforeScore,
        wizardState.afterScore,
        Array.from(photoInput.files || []).map(file => file.name).join(', '),
      ]
      summaryItems.forEach((item, index) => { item.textContent = values[index] || (index === 10 ? '등록된 사진 없음' : '—') })
    }

    const modalTitle = '새 위험성평가 만들기'
    showModal(modalTitle, '단계별로 입력하고, 마지막에 내용을 확인하세요.', form, '다음 단계', (backdrop) => {
      if (wizardState.step === 0) {
        if (!team.value.trim() || !process.value.trim()) {
          toast('부서와 공정명을 입력해 주세요.')
          return
        }
        if (assessmentType.value === '수시' && !reason.value) {
          toast('수시 평가 사유를 선택해 주세요.')
          return
        }
      }
      if (wizardState.step === 1 && (!hazard.value.trim() || !accidentType.value.trim() || !improvement.value.trim())) {
        toast('위험요인, 재해형태, 개선(예방)대책을 입력해 주세요.')
        return
      }
      if (wizardState.step === 2 && (!wizardState.beforeScore || !wizardState.afterScore)) {
        toast('개선 전 빨간색, 개선 후 초록색 위험도를 순서대로 선택해 주세요.')
        return
      }
      if (wizardState.step < 3) {
        wizardState.step += 1
        if (wizardState.step === 3) refreshSummary()
        pages.forEach((page, index) => { page.hidden = index !== wizardState.step })
        stepButtons.forEach((item, index) => {
          item.classList.toggle('active', index === wizardState.step)
          item.classList.toggle('complete', index < wizardState.step)
        })
        backdrop.querySelector('.modal-submit').textContent = wizardState.step === 3 ? '평가 저장' : '다음 단계'
        previousButton.hidden = wizardState.step === 0
        const labels = ['기본 정보와 참여자를 입력해 주세요.', '위험요인, 재해형태, 대책과 개선 전 사진을 입력해 주세요.', '개선 전 빨간색을 먼저 선택하고, 개선 후 초록색을 선택해 주세요.', '입력한 내용을 확인한 뒤 평가 초안을 저장합니다.']
        backdrop.querySelector('.modal-head p').textContent = labels[wizardState.step]
        backdrop.querySelector('.modal-body').scrollTop = 0
        return
      }

      const tbody = document.querySelector('#assessment-table-body')
      const row = document.createElement('tr')
      row.dataset.type = assessmentType.value === '정기' ? 'regular' : 'adhoc'
      row.dataset.search = `${team.value} ${process.value} ${assessmentType.value} ${hazard.value} ${accidentType.value} ${participants.value}`
      row.innerHTML = `
        <td><div class="assessment-name"><span class="assessment-symbol symbol-mint"></span><span><strong></strong><small></small></span></div></td>
        <td><span class="type-badge"></span></td><td><span class="author-cell"><i class="author-avatar avatar-teal">김</i> 김안전</span></td>
        <td><div class="progress-cell"><div class="table-progress"><span style="width:0%"></span></div><small>0%</small></div></td>
        <td><span class="risk-count risk-high"></span></td><td><span class="status-badge status-progress"><i></i> 작성 중</span></td><td><button class="row-menu" type="button" aria-label="평가 메뉴">···</button></td>`
      row.querySelector('.assessment-symbol').textContent = team.value.trim().slice(0, 1)
      row.querySelector('.assessment-name strong').textContent = process.value.trim() + ' 위험성평가'
      row.querySelector('.assessment-name small').textContent = `${team.value.trim()} · ${process.value.trim()} · 참여자 ${participants.value.trim() || '미입력'}`
      row.querySelector('.risk-count').textContent = `${wizardState.beforeScore} → ${wizardState.afterScore}`
      const badge = row.querySelector('.type-badge')
      badge.textContent = assessmentType.value
      badge.classList.add(assessmentType.value === '정기' ? 'type-regular' : 'type-adhoc')
      tbody.prepend(row)
      document.querySelector('#total-count').textContent = String(Number(document.querySelector('#total-count').textContent) + 1)
      wizardState.photoUrls.forEach(url => URL.revokeObjectURL(url))
      backdrop.remove()
      toast(`${process.value.trim()} 평가 초안을 저장했습니다. (현재 브라우저 미리보기)`)
    })
    document.querySelector('.modal-card')?.classList.add('assessment-modal-card')
    const previousButton = document.createElement('button')
    previousButton.type = 'button'
    previousButton.className = 'button button-secondary wizard-previous'
    previousButton.textContent = '이전 단계'
    previousButton.hidden = true
    previousButton.addEventListener('click', () => {
      if (wizardState.step === 0) return
      wizardState.step -= 1
      pages.forEach((page, index) => { page.hidden = index !== wizardState.step })
      stepButtons.forEach((item, index) => {
        item.classList.toggle('active', index === wizardState.step)
        item.classList.toggle('complete', index < wizardState.step)
      })
      const backdrop = document.querySelector('.modal-backdrop')
      if (backdrop) {
        backdrop.querySelector('.modal-submit').textContent = '다음 단계'
        backdrop.querySelector('.modal-head p').textContent = ['기본 정보와 참여자를 입력해 주세요.', '위험요인, 재해형태, 대책과 개선 전 사진을 입력해 주세요.', '개선 전 빨간색을 먼저 선택하고, 개선 후 초록색을 선택해 주세요.'][wizardState.step]
        backdrop.querySelector('.modal-body').scrollTop = 0
      }
      previousButton.hidden = wizardState.step === 0
    })
    document.querySelector('.modal-foot').prepend(previousButton)
    stepButtons[0].classList.add('active')
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
