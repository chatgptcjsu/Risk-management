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
    const intro = document.createElement('div')
    const assessmentType = document.createElement('select')
    assessmentType.innerHTML = '<option value="정기">정기 평가 · 연 1회</option><option value="수시">수시 평가 · 사유 발생</option>'
    const team = document.createElement('input')
    team.placeholder = '예: 공무팀 보전파트'
    const process = document.createElement('input')
    process.placeholder = '예: 화장지 4호기'
    const assessmentDate = document.createElement('input')
    assessmentDate.type = 'date'
    assessmentDate.value = new Date().toISOString().slice(0, 10)
    const reason = document.createElement('select')
    reason.innerHTML = '<option value="">사유 선택</option><option>사고 발생</option><option>공정 변경</option><option>신규 공정·설비 추가</option><option>정비·보수</option><option>작업방법 변경</option><option>기타</option>'
    const reasonField = field('수시 평가 사유', reason, '정기 평가는 입력하지 않아도 됩니다.')
    reasonField.hidden = true
    assessmentType.addEventListener('change', () => { reasonField.hidden = assessmentType.value !== '수시' })
    intro.className = 'ppt-assessment-start'
    intro.append(
      field('평가 유형', assessmentType),
      field('부서 / 팀', team),
      field('공정명', process),
      field('평가일', assessmentDate),
      reasonField,
    )

    let phase = 'start'
    let formSheet
    const photoObjectUrls = { before: [], after: [] }
    let selectedBeforeCell = null
    let selectedAfterCell = null
    let beforeRisk = ''
    let afterRisk = ''

    const createPhotoPicker = (kind, label, preview) => {
      const input = formSheet.querySelector(`[data-photo-input="${kind}"]`)
      const button = formSheet.querySelector(`[data-photo-button="${kind}"]`)
      const list = formSheet.querySelector(`[data-photo-preview="${kind}"]`)
      button.addEventListener('click', () => input.click())
      input.addEventListener('change', () => {
        photoObjectUrls[kind].forEach(url => URL.revokeObjectURL(url))
        photoObjectUrls[kind] = Array.from(input.files || []).map(file => URL.createObjectURL(file))
        list.replaceChildren()
        Array.from(input.files || []).forEach((file, index) => {
          const image = document.createElement('img')
          image.src = photoObjectUrls[kind][index]
          image.alt = `${label} 사진 ${index + 1}: ${file.name}`
          image.title = file.name
          list.append(image)
        })
        button.querySelector('small').textContent = input.files?.length ? `${input.files.length}장 선택 · 다시 눌러 변경` : preview
      })
    }

    const buildRiskMatrix = () => {
      const table = formSheet.querySelector('.risk-matrix')
      const headerRow = document.createElement('tr')
      const corner = document.createElement('th')
      corner.textContent = '빈도 / 강도'
      headerRow.append(corner)
      const severities = [
        ['영향 없음', 1],
        ['경미한 재해', 2],
        ['경증한 재해', 3],
        ['중대 재해', 4],
      ]
      severities.forEach(([label, value]) => {
        const th = document.createElement('th')
        th.innerHTML = `<span></span><small>${value}</small>`
        th.querySelector('span').textContent = label
        headerRow.append(th)
      })
      const thead = document.createElement('thead')
      thead.append(headerRow)
      const tbody = document.createElement('tbody')
      const frequencies = [
        ['거의 없음', 1],
        ['낮음', 2],
        ['있음', 3],
        ['높음', 4],
        ['빈번함', 5],
      ]
      frequencies.forEach(([label, frequency]) => {
        const row = document.createElement('tr')
        const labelCell = document.createElement('th')
        labelCell.innerHTML = '<span></span><small></small>'
        labelCell.querySelector('span').textContent = label
        labelCell.querySelector('small').textContent = String(frequency)
        row.append(labelCell)
        severities.forEach(([, severity]) => {
          const score = Number(frequency) * Number(severity)
          const cell = document.createElement('td')
          const button = document.createElement('button')
          button.type = 'button'
          button.className = `matrix-cell ${score >= 16 ? 'matrix-extreme' : score >= 8 ? 'matrix-high' : ''}`
          button.dataset.score = String(score)
          button.setAttribute('aria-label', `위험도 ${score} 선택`)
          const scoreText = document.createElement('span')
          scoreText.className = 'matrix-score'
          scoreText.textContent = String(score)
          const beforeMarker = document.createElement('i')
          beforeMarker.className = 'matrix-marker marker-before'
          beforeMarker.textContent = '○'
          beforeMarker.hidden = true
          const afterMarker = document.createElement('i')
          afterMarker.className = 'matrix-marker marker-after'
          afterMarker.textContent = '○'
          afterMarker.hidden = true
          button.append(scoreText, beforeMarker, afterMarker)
          button.addEventListener('click', () => {
            if (!selectedBeforeCell) {
              selectedBeforeCell = button
              beforeRisk = String(score)
              beforeMarker.hidden = false
              button.classList.add('selected-before')
              formSheet.querySelector('[data-before-grade]').value = beforeRisk
              formSheet.querySelector('[data-before-grade-label]').textContent = `위험도 ${score} · 등급 ${riskGrade(score)}`
              formSheet.querySelector('.matrix-selection-hint').textContent = '개선 전 선택 완료. 이제 개선 후 위험도를 초록색으로 선택하세요.'
              return
            }
            if (!selectedAfterCell) {
              selectedAfterCell = button
              afterRisk = String(score)
              afterMarker.hidden = false
              button.classList.add('selected-after')
              formSheet.querySelector('[data-after-grade]').value = afterRisk
              formSheet.querySelector('[data-after-grade-label]').textContent = `위험도 ${score} · 등급 ${riskGrade(score)}`
              formSheet.querySelector('.matrix-selection-hint').textContent = '개선 전·후 위험도가 선택되었습니다. 다시 선택하려면 ③ 초기화를 누르세요.'
              return
            }
            toast('선택을 바꾸려면 ③ 초기화 버튼을 먼저 눌러 주세요.')
          })
          cell.append(button)
          row.append(cell)
        })
        tbody.append(row)
      })
      table.append(thead, tbody)
    }

    const riskGrade = (score) => {
      const value = Number(score)
      if (value <= 3) return 1
      if (value <= 6) return 2
      if (value === 8) return 3
      if (value <= 12) return 4
      if (value === 15) return 5
      return 6
    }

    const buildFormSheet = () => {
      formSheet = document.createElement('div')
      formSheet.className = 'ppt-assessment-sheet'
      formSheet.innerHTML = `
        <header class="ppt-sheet-header">
          <h3 class="ppt-sheet-title"></h3>
          <div class="ppt-sheet-meta">
            <label>부서 / 팀<input type="text" data-sheet-team /></label>
            <label>공정명<input type="text" data-sheet-process /></label>
            <label>평가일<input type="date" data-sheet-date /></label>
          </div>
        </header>
        <div class="ppt-progress-ribbon" aria-label="평가 진행 단계">
          <span class="ribbon-active">기본정보</span><span>위험요인</span><span>대책수립</span><span>위험도</span><span>개선조치</span><span>확인</span><span>검토</span><span>완료</span>
        </div>
        <div class="ppt-assessment-grid">
          <section class="ppt-main-column">
            <div class="ppt-description-grid">
              <div class="ppt-section-title">위험요인 및 재해형태</div>
              <div class="ppt-section-title">개선(예방)대책</div>
              <div class="ppt-sheet-cell">
                <label class="ppt-text-label">위험요인<textarea data-hazard rows="3" placeholder="작업 중 어떤 위험이 있는지 작성"></textarea></label>
                <label class="ppt-text-label">재해형태<textarea data-accident rows="2" placeholder="예: 끼임, 넘어짐, 추락"></textarea></label>
              </div>
              <label class="ppt-sheet-cell ppt-text-label"><span class="sr-only">개선(예방)대책</span><textarea data-countermeasure rows="6" placeholder="위험요인을 줄이거나 제거할 수 있는 개선·예방대책을 작성"></textarea></label>
            </div>
            <div class="ppt-photo-section">
              <div class="ppt-section-title">개선 전</div><div class="ppt-section-title">개선 후</div>
              <div class="ppt-photo-cell">
                <button class="ppt-photo-button" data-photo-button="before" type="button"><span class="ppt-photo-empty">사진</span><strong>개선 전 사진 추가</strong><small>사진 파일 선택</small></button>
                <input data-photo-input="before" type="file" accept="image/*" multiple hidden />
                <div class="ppt-photo-preview" data-photo-preview="before"></div>
              </div>
              <div class="ppt-photo-cell">
                <button class="ppt-photo-button" data-photo-button="after" type="button"><span class="ppt-photo-empty">사진</span><strong>개선 후 사진 추가</strong><small>사진 파일 선택</small></button>
                <input data-photo-input="after" type="file" accept="image/*" multiple hidden />
                <div class="ppt-photo-preview" data-photo-preview="after"></div>
              </div>
            </div>
            <div class="ppt-detail-grid">
              <label class="ppt-detail-cell detail-before"><strong>개선전 위험등급</strong><input data-before-grade readonly placeholder="위험도 선택 시 자동 입력" /><small data-before-grade-label></small></label>
              <label class="ppt-detail-cell detail-after"><strong>개선후 위험등급</strong><input data-after-grade readonly placeholder="위험도 선택 시 자동 입력" /><small data-after-grade-label></small></label>
              <label class="ppt-detail-cell"><strong>개선 예정일</strong><input data-improvement-date type="date" /><small>날짜를 눌러 달력에서 선택</small></label>
              <label class="ppt-detail-cell"><strong>담당자</strong><input data-owner placeholder="담당자 이름" /></label>
              <label class="ppt-detail-cell ppt-participants"><strong>위험성평가 참여자</strong><textarea data-participants rows="2" placeholder="이름을 직접 입력 · 여러 명은 쉼표로 구분"></textarea></label>
            </div>
          </section>
          <aside class="ppt-risk-column">
            <div class="ppt-section-title">개선 전, 후 위험성(리스크) 평가</div>
            <p class="matrix-selection-hint">먼저 위험도 숫자를 눌러 개선 전(빨간색)을 선택하세요.</p>
            <div class="matrix-legend"><span>개선 전 <i class="legend-before">○</i></span><span>개선 후 <i class="legend-after">○</i></span></div>
            <table class="risk-matrix" aria-label="빈도와 강도별 위험도 선택"></table>
            <button class="matrix-reset-button" type="button">③ 초기화 · 동그라미 모두 지우기</button>
            <div class="ppt-section-title risk-grade-title">위험도 수준</div>
            <table class="risk-grade-table">
              <thead><tr><th>등급</th><th>위험도 수준</th><th>위험도</th></tr></thead>
              <tbody>
                <tr class="grade-1"><th>1</th><td>무시할 수 있는 위험</td><td>1~3</td></tr>
                <tr class="grade-2"><th>2</th><td>미미한 위험 (필요 시 개선)</td><td>4~6</td></tr>
                <tr class="grade-3"><th>3</th><td>경미한 위험 (계획적 개선)</td><td>8</td></tr>
                <tr class="grade-4"><th>4</th><td>상당한 위험 (조건부 작업, 개선)</td><td>9~12</td></tr>
                <tr class="grade-5"><th>5</th><td>중대한 위험 (신속 개선)</td><td>15</td></tr>
                <tr class="grade-6"><th>6</th><td>허용 불가 위험 (즉시 작업 중지)</td><td>16~20</td></tr>
              </tbody>
            </table>
            <label class="ppt-notes"><strong>비고</strong><textarea data-notes rows="4" placeholder="추가 메모"></textarea></label>
          </aside>
        </div>
        <footer class="ppt-sheet-footer"><span>유첨 · 1/1</span><strong>깨끗한나라 · 위험성평가</strong></footer>`

      formSheet.querySelector('.ppt-sheet-title').textContent = `유첨) ${assessmentDate.value.slice(0, 4)}년 ${assessmentType.value} 위험성평가(개선 필요 건)`
      formSheet.querySelector('[data-sheet-team]').value = team.value.trim()
      formSheet.querySelector('[data-sheet-process]').value = process.value.trim()
      formSheet.querySelector('[data-sheet-date]').value = assessmentDate.value
      formSheet.querySelector('[data-sheet-team]').addEventListener('input', event => { team.value = event.target.value })
      formSheet.querySelector('[data-sheet-process]').addEventListener('input', event => { process.value = event.target.value })
      formSheet.querySelector('[data-sheet-date]').addEventListener('input', event => { assessmentDate.value = event.target.value })
      buildRiskMatrix()
      createPhotoPicker('before', '개선 전', '사진 파일 선택')
      createPhotoPicker('after', '개선 후', '사진 파일 선택')
      formSheet.querySelector('.matrix-reset-button').addEventListener('click', () => {
        selectedBeforeCell?.classList.remove('selected-before')
        selectedAfterCell?.classList.remove('selected-after')
        formSheet.querySelectorAll('.matrix-marker').forEach(marker => { marker.hidden = true })
        selectedBeforeCell = null
        selectedAfterCell = null
        beforeRisk = ''
        afterRisk = ''
        formSheet.querySelector('[data-before-grade]').value = ''
        formSheet.querySelector('[data-after-grade]').value = ''
        formSheet.querySelector('[data-before-grade-label]').textContent = ''
        formSheet.querySelector('[data-after-grade-label]').textContent = ''
        formSheet.querySelector('.matrix-selection-hint').textContent = '먼저 위험도 숫자를 눌러 개선 전(빨간색)을 선택하세요.'
      })
      formSheet.querySelector('[data-hazard]').value = ''
    }

    showModal('새 위험성평가 만들기', '기본 정보를 입력한 뒤 PPT 양식으로 위험성평가서를 작성합니다.', intro, '평가 시작', (backdrop) => {
      if (phase === 'start') {
        if (!team.value.trim() || !process.value.trim() || !assessmentDate.value) {
          toast('부서, 공정명, 평가일을 입력해 주세요.')
          return
        }
        if (assessmentType.value === '수시' && !reason.value) {
          toast('수시 평가 사유를 선택해 주세요.')
          return
        }
        buildFormSheet()
        phase = 'sheet'
        backdrop.querySelector('.modal-card').classList.add('ppt-modal-card')
        backdrop.querySelector('#dialog-title').textContent = '위험성평가서 작성'
        backdrop.querySelector('.modal-head p').textContent = '참고 PPT 형식으로 위험요인, 개선대책, 사진과 위험도를 작성하세요.'
        backdrop.querySelector('.modal-body').replaceChildren(formSheet)
        backdrop.querySelector('.modal-body').scrollTop = 0
        backdrop.querySelector('.modal-submit').textContent = '평가 저장'
        return
      }

      const hazard = formSheet.querySelector('[data-hazard]').value.trim()
      const accident = formSheet.querySelector('[data-accident]').value.trim()
      const countermeasure = formSheet.querySelector('[data-countermeasure]').value.trim()
      if (!hazard || !accident || !countermeasure) {
        toast('위험요인, 재해형태, 개선(예방)대책을 입력해 주세요.')
        return
      }
      if (!beforeRisk || !afterRisk) {
        toast('개선 전 빨간색과 개선 후 초록색 위험도를 순서대로 선택해 주세요.')
        return
      }
      const tbody = document.querySelector('#assessment-table-body')
      const row = document.createElement('tr')
      row.dataset.type = assessmentType.value === '정기' ? 'regular' : 'adhoc'
      row.dataset.search = `${team.value} ${process.value} ${assessmentType.value} ${hazard} ${accident} ${formSheet.querySelector('[data-participants]').value}`
      row.innerHTML = `
        <td><div class="assessment-name"><span class="assessment-symbol symbol-mint"></span><span><strong></strong><small></small></span></div></td>
        <td><span class="type-badge"></span></td><td><span class="author-cell"><i class="author-avatar avatar-teal">김</i> 김안전</span></td>
        <td><div class="progress-cell"><div class="table-progress"><span style="width:0%"></span></div><small>0%</small></div></td>
        <td><span class="risk-count risk-high"></span></td><td><span class="status-badge status-progress"><i></i> 작성 중</span></td><td><button class="row-menu" type="button" aria-label="평가 메뉴">···</button></td>`
      row.querySelector('.assessment-symbol').textContent = team.value.trim().slice(0, 1)
      row.querySelector('.assessment-name strong').textContent = process.value.trim() + ' 위험성평가'
      row.querySelector('.assessment-name small').textContent = `${team.value.trim()} · ${process.value.trim()} · ${formSheet.querySelector('[data-participants]').value.trim() || '참여자 미입력'}`
      row.querySelector('.risk-count').textContent = `${beforeRisk} → ${afterRisk}`
      const badge = row.querySelector('.type-badge')
      badge.textContent = assessmentType.value
      badge.classList.add(assessmentType.value === '정기' ? 'type-regular' : 'type-adhoc')
      tbody.prepend(row)
      document.querySelector('#total-count').textContent = String(Number(document.querySelector('#total-count').textContent) + 1)
      Object.values(photoObjectUrls).flat().forEach(url => URL.revokeObjectURL(url))
      backdrop.remove()
      toast(`${process.value.trim()} 평가 초안을 저장했습니다. (현재 브라우저 미리보기)`)
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
