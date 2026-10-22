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

  const savedAssessments = []
  const newAssessmentButton = document.querySelector('#new-assessment-button')
  newAssessmentButton?.addEventListener('click', () => {
    const startForm = document.createElement('div')
    startForm.className = 'excel-assessment-start'
    const assessmentType = document.createElement('select')
    assessmentType.innerHTML = '<option value="정기">정기 위험성평가</option><option value="수시">수시 위험성평가</option>'
    const team = document.createElement('input')
    team.placeholder = '예: 화장지생산팀 가공파트'
    const process = document.createElement('input')
    process.placeholder = '예: 가공 3호기'
    const assessmentDate = document.createElement('input')
    assessmentDate.type = 'date'
    assessmentDate.value = new Date().toISOString().slice(0, 10)
    const evaluator = document.createElement('textarea')
    evaluator.rows = 2
    evaluator.placeholder = '평가자 이름을 입력해 주세요.'
    const participants = document.createElement('textarea')
    participants.rows = 2
    participants.placeholder = '참여자 이름을 쉼표로 구분해 입력해 주세요.'
    const reason = document.createElement('select')
    reason.innerHTML = '<option value="">사유 선택</option><option>사고 발생</option><option>공정 변경</option><option>신규 공정·설비 추가</option><option>정비·보수</option><option>작업방법 변경</option><option>기타</option>'
    const reasonField = field('수시 평가 사유', reason)
    reasonField.hidden = true
    assessmentType.addEventListener('change', () => { reasonField.hidden = assessmentType.value !== '수시' })
    startForm.append(
      field('평가 유형', assessmentType),
      field('부서 / 팀', team),
      field('공정명', process),
      field('평가일시', assessmentDate),
      field('평가자', evaluator),
      field('위험성평가 참여자', participants),
      reasonField,
    )

    let phase = 'start'
    let excelEditor
    let formSheet
    let excelRows = []
    let currentRecord = null
    let currentItem = null
    let currentBeforeRisk = ''
    let currentAfterRisk = ''
    let selectedBeforeCell = null
    let selectedAfterCell = null
    const photoObjectUrls = { before: [], after: [] }

    const makeRiskRow = () => ({
      work: '',
      hazard: '',
      currentState: '',
      frequency: '',
      severity: '',
      currentRisk: '',
      countermeasure: '',
      afterRiskEstimate: '',
      improvementDate: '',
      completionDate: '',
      owner: '',
      notes: '',
      ppt: null,
    })

    const excelRiskScore = (row) => {
      const frequency = Number(row.frequency)
      const severity = Number(row.severity)
      return frequency > 0 && severity > 0 ? frequency * severity : ''
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

    const renderExcelTable = () => {
      const body = excelEditor.querySelector('.excel-entry-body')
      body.replaceChildren()
      excelRows.forEach((row, index) => {
        const tr = document.createElement('tr')
        const number = document.createElement('th')
        number.scope = 'row'
        number.textContent = String(index + 1)
        tr.append(number)
        const column = (element, className = '') => {
          const td = document.createElement('td')
          if (className) td.className = className
          td.append(element)
          tr.append(td)
          return td
        }
        const textInput = (key, placeholder, tag = 'input') => {
          const control = document.createElement(tag)
          if (tag === 'textarea') control.rows = 2
          control.value = row[key] || ''
          control.placeholder = placeholder
          control.setAttribute('aria-label', placeholder)
          control.addEventListener('input', () => { row[key] = control.value })
          return control
        }
        const selectInput = (key, label, max) => {
          const control = document.createElement('select')
          control.setAttribute('aria-label', label)
          control.innerHTML = `<option value="">선택</option>${Array.from({ length: max }, (_, n) => `<option value="${n + 1}">${n + 1}</option>`).join('')}`
          control.value = row[key] || ''
          control.addEventListener('change', () => {
            row[key] = control.value
            row.currentRisk = excelRiskScore(row)
            const score = tr.querySelector('.excel-risk-score')
            score.textContent = row.currentRisk || '—'
            score.classList.toggle('high-risk-score', Number(row.currentRisk) >= 8)
            tr.classList.toggle('excel-high-risk-row', Number(row.currentRisk) >= 8)
            updateExcelRiskCount()
          })
          return control
        }
        column(textInput('work', '작업내용', 'textarea'))
        column(textInput('hazard', '유해 위험요인', 'textarea'))
        column(textInput('currentState', '현재상태 및 조치', 'textarea'))
        column(selectInput('frequency', '가능성 빈도', 5), 'excel-score-input')
        column(selectInput('severity', '중대성 강도', 4), 'excel-score-input')
        const score = document.createElement('strong')
        score.className = 'excel-risk-score'
        row.currentRisk = excelRiskScore(row)
        score.textContent = row.currentRisk || '—'
        score.classList.toggle('high-risk-score', Number(row.currentRisk) >= 8)
        column(score, 'excel-risk-result')
        tr.classList.toggle('excel-high-risk-row', Number(row.currentRisk) >= 8)
        column(textInput('countermeasure', '감소 대책 (위험도 8 이상 필수)', 'textarea'))
        const afterEstimate = document.createElement('input')
        afterEstimate.type = 'number'
        afterEstimate.min = '1'
        afterEstimate.max = '20'
        afterEstimate.value = row.afterRiskEstimate || ''
        afterEstimate.placeholder = '예상'
        afterEstimate.setAttribute('aria-label', '개선 후 위험성 예상 점수')
        afterEstimate.addEventListener('input', () => { row.afterRiskEstimate = afterEstimate.value })
        column(afterEstimate)
        const dateInput = (key, label) => {
          const control = document.createElement('input')
          control.setAttribute('aria-label', key === 'completionDate' ? '완료일 (안전보건팀 전용)' : label)
          control.value = row[key] || ''
          if (key === 'completionDate') {
            control.type = 'text'
            control.readOnly = true
            control.placeholder = '안전보건팀 입력'
            control.title = '완료일은 안전보건팀에서 입력합니다.'
            control.className = 'excel-team-only-input'
            return control
          }
          control.type = 'date'
          control.addEventListener('change', () => { row[key] = control.value })
          return control
        }
        column(dateInput('improvementDate', '개선일'))
        column(dateInput('completionDate', '완료일'))
        column(textInput('owner', '담당자'))
        column(textInput('notes', '비고'))
        const remove = document.createElement('button')
        remove.type = 'button'
        remove.className = 'excel-remove-row'
        remove.textContent = '삭제'
        remove.setAttribute('aria-label', `${index + 1}번 위험요인 삭제`)
        remove.addEventListener('click', () => {
          excelRows.splice(index, 1)
          renderExcelTable()
          updateExcelRiskCount()
        })
        column(remove)
        body.append(tr)
      })
      updateExcelRiskCount()
    }

    const updateExcelRiskCount = () => {
      const count = excelRows.filter(row => Number(row.currentRisk) >= 8).length
      const target = excelEditor?.querySelector('.excel-risk-count')
      if (target) target.textContent = `${count}건 · 위험도 8 이상이면 PPT 추가 작성`
    }

    const buildExcelEditor = () => {
      excelEditor = document.createElement('div')
      excelEditor.className = 'excel-assessment-editor'
      excelEditor.innerHTML = `
        <header class="excel-editor-head">
          <div><h3></h3><p>빈도 × 강도로 현재 위험도를 자동 계산합니다. 위험도 8점 이상인 항목은 저장 후 PPT 양식으로 추가 작성합니다.</p></div>
          <strong class="excel-risk-count">0건 · 위험도 8 이상이면 PPT 추가 작성</strong>
        </header>
        <div class="excel-table-wrap">
          <table class="excel-entry-table">
            <thead><tr>
              <th>번호</th><th>작업내용</th><th>유해 위험요인</th><th>현재상태 및 조치</th>
              <th>가능성<br />(빈도)</th><th>중대성<br />(강도)</th><th>현재 위험성</th>
              <th>감소 대책<br />(위험도 8 이상)</th><th>개선 후 위험성<br />(추정)</th><th>개선일</th><th>완료일</th><th>담당자</th><th>비고</th><th></th>
            </tr></thead><tbody class="excel-entry-body"></tbody>
          </table>
        </div>
        <div class="excel-editor-actions"><button class="excel-add-row" type="button">＋ 위험요인 추가</button><span>위험도 계산: 빈도 1~5 × 강도 1~4 (최대 20점)</span></div>`
      excelEditor.querySelector('.excel-editor-head h3').textContent = `${team.value.trim()} · ${process.value.trim()} 위험성평가`
      excelEditor.querySelector('.excel-add-row').addEventListener('click', () => {
        excelRows.push(makeRiskRow())
        renderExcelTable()
      })
      excelRows = [makeRiskRow()]
      renderExcelTable()
    }

    const appendAssessmentRow = (record) => {
      const tbody = document.querySelector('#assessment-table-body')
      const tableRow = document.createElement('tr')
      const highCount = record.rows.filter(row => Number(row.currentRisk) >= 8).length
      tableRow.dataset.type = record.type === '정기' ? 'regular' : 'adhoc'
      tableRow.dataset.search = `${record.team} ${record.process} ${record.rows.map(row => `${row.work} ${row.hazard} ${row.owner}`).join(' ')}`
      tableRow.innerHTML = `
        <td><div class="assessment-name"><span class="assessment-symbol symbol-mint"></span><span><strong></strong><small></small></span></div></td>
        <td><span class="type-badge"></span></td><td><span class="author-cell"><i class="author-avatar avatar-teal">김</i> 김안전</span></td>
        <td><div class="progress-cell"><div class="table-progress"><span style="width:0%"></span></div><small>0%</small></div></td>
        <td><span class="risk-count"></span></td><td><span class="status-badge status-progress"><i></i> 작성 중</span></td><td><button class="row-menu" type="button" aria-label="평가 메뉴">···</button></td>`
      tableRow.querySelector('.assessment-symbol').textContent = record.team.slice(0, 1)
      tableRow.querySelector('.assessment-name strong').textContent = `${record.process} 위험성평가`
      tableRow.querySelector('.assessment-name small').textContent = `${record.team} · ${record.rows.length}개 위험요인`
      const badge = tableRow.querySelector('.type-badge')
      badge.textContent = record.type
      badge.classList.add(record.type === '정기' ? 'type-regular' : 'type-adhoc')
      const riskCount = tableRow.querySelector('.risk-count')
      riskCount.textContent = `${highCount}건`
      riskCount.classList.toggle('risk-high', highCount > 0)
      tbody.prepend(tableRow)
      document.querySelector('#total-count').textContent = String(Number(document.querySelector('#total-count').textContent) + 1)
    }

    const renderHighRiskQueue = () => {
      const queue = document.createElement('div')
      queue.className = 'high-risk-queue'
      const highRiskRows = currentRecord.rows.filter(row => Number(row.currentRisk) >= 8)
      const heading = document.createElement('div')
      heading.className = 'queue-summary'
      const title = document.createElement('h3')
      title.textContent = '위험도 8점 이상 · PPT 추가 작성 대상'
      const subtitle = document.createElement('p')
      subtitle.textContent = highRiskRows.length
        ? `${highRiskRows.length}개 항목이 PPT 위험성평가 대상입니다. 각 항목을 열어 개선 전·후 평가를 작성하세요.`
        : '위험도 8점 이상인 항목이 없습니다. Excel형 평가 내용이 등록되었습니다.'
      heading.append(title, subtitle)
      queue.append(heading)
      if (highRiskRows.length) {
        const list = document.createElement('div')
        list.className = 'high-risk-queue-list'
        highRiskRows.forEach((row, index) => {
          const item = document.createElement('article')
          item.className = 'high-risk-queue-item'
          const description = document.createElement('div')
          description.className = 'queue-item-description'
          const strong = document.createElement('strong')
          strong.textContent = `${index + 1}. ${row.work || '작업내용 미입력'}`
          const details = document.createElement('small')
          details.textContent = `${row.hazard} · 빈도 ${row.frequency} × 강도 ${row.severity}`
          description.append(strong, details)
          const score = document.createElement('span')
          score.className = 'queue-risk-score'
          score.textContent = `${row.currentRisk}점`
          const button = document.createElement('button')
          button.type = 'button'
          button.className = 'button button-primary queue-ppt-button'
          button.textContent = row.ppt ? 'PPT 작성 완료 · 수정' : 'PPT 작성'
          button.addEventListener('click', () => openPptForm(row))
          item.append(description, score, button)
          list.append(item)
        })
        queue.append(list)
      }
      return queue
    }

    const setModalPhase = (backdrop, { title, subtitle, content, submitText, classToAdd, classToRemove }) => {
      const card = backdrop.querySelector('.modal-card')
      if (classToRemove) card.classList.remove(...classToRemove.split(' ').filter(Boolean))
      if (classToAdd) card.classList.add(classToAdd)
      backdrop.querySelector('#dialog-title').textContent = title
      backdrop.querySelector('.modal-head p').textContent = subtitle
      backdrop.querySelector('.modal-body').replaceChildren(content)
      backdrop.querySelector('.modal-body').scrollTop = 0
      backdrop.querySelector('.modal-submit').textContent = submitText
    }

    const buildPhotoPreview = (kind, label, existingUrls = []) => {
      const picker = document.createElement('div')
      picker.className = 'ppt-photo-cell'
      const button = document.createElement('button')
      button.className = 'ppt-photo-button'
      button.type = 'button'
      button.innerHTML = `<span class="ppt-photo-empty">사진</span><strong>${label} 사진 추가</strong><small>사진 파일 선택</small>`
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.multiple = true
      input.hidden = true
      const previews = document.createElement('div')
      previews.className = 'ppt-photo-preview'
      const renderPhotos = (urls, names = []) => {
        previews.replaceChildren()
        urls.forEach((url, index) => {
          const image = document.createElement('img')
          image.src = url
          image.alt = `${label} 사진 ${index + 1}`
          image.title = names[index] || `${label} 사진 ${index + 1}`
          previews.append(image)
        })
        button.querySelector('small').textContent = urls.length ? `${urls.length}장 선택` : '사진 파일 선택'
      }
      renderPhotos(existingUrls)
      button.addEventListener('click', () => input.click())
      input.addEventListener('change', () => {
        photoObjectUrls[kind] = Array.from(input.files || []).map(file => URL.createObjectURL(file))
        renderPhotos(photoObjectUrls[kind], Array.from(input.files || []).map(file => file.name))
      })
      picker.append(button, input, previews)
      return picker
    }

    const buildRiskMatrix = (record, row) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'ppt-risk-column'
      wrapper.innerHTML = `
        <div class="ppt-section-title">개선 전, 후 위험성(리스크) 평가</div>
        <p class="matrix-selection-hint">Excel 계산값 ${row.currentRisk}점과 같은 칸을 빨간색(개선 전)으로 선택하세요.</p>
        <div class="matrix-legend"><span>개선 전 <i class="legend-before">○</i></span><span>개선 후 <i class="legend-after">○</i></span></div>
        <table class="risk-matrix" aria-label="빈도와 강도별 위험도 선택"></table>
        <button class="matrix-reset-button" type="button">③ 초기화 · 동그라미 모두 지우기</button>
        <div class="ppt-section-title risk-grade-title">위험도 수준</div>
        <table class="risk-grade-table"><thead><tr><th>등급</th><th>위험도 수준</th><th>위험도</th></tr></thead><tbody>
          <tr class="grade-1"><th>1</th><td>무시할 수 있는 위험</td><td>1~3</td></tr>
          <tr class="grade-2"><th>2</th><td>미미한 위험 (필요 시 개선)</td><td>4~6</td></tr>
          <tr class="grade-3"><th>3</th><td>경미한 위험 (계획적 개선)</td><td>8</td></tr>
          <tr class="grade-4"><th>4</th><td>상당한 위험 (조건부 작업, 개선)</td><td>9~12</td></tr>
          <tr class="grade-5"><th>5</th><td>중대한 위험 (신속 개선)</td><td>15</td></tr>
          <tr class="grade-6"><th>6</th><td>허용 불가 위험 (즉시 작업 중지)</td><td>16~20</td></tr>
        </tbody></table>
        <label class="ppt-notes"><strong>비고</strong><textarea data-notes rows="3" placeholder="추가 메모"></textarea></label>`
      const table = wrapper.querySelector('.risk-matrix')
      const severities = [['영향 없음', 1], ['경미한 재해', 2], ['경중한 재해', 3], ['중대 재해', 4]]
      const frequencies = [['거의 없음', 1], ['낮음', 2], ['있음', 3], ['높음', 4], ['빈번함', 5]]
      const thead = document.createElement('thead')
      const header = document.createElement('tr')
      const corner = document.createElement('th')
      corner.textContent = '빈도 / 강도'
      header.append(corner)
      severities.forEach(([label, value]) => {
        const th = document.createElement('th')
        th.innerHTML = `<span></span><small>${value}</small>`
        th.querySelector('span').textContent = label
        header.append(th)
      })
      thead.append(header)
      const tbody = document.createElement('tbody')
      frequencies.forEach(([frequencyName, frequency]) => {
        const tr = document.createElement('tr')
        const frequencyCell = document.createElement('th')
        frequencyCell.innerHTML = '<span></span><small></small>'
        frequencyCell.querySelector('span').textContent = frequencyName
        frequencyCell.querySelector('small').textContent = String(frequency)
        tr.append(frequencyCell)
        severities.forEach(([, severity]) => {
          const score = Number(frequency) * Number(severity)
          const td = document.createElement('td')
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
            if (!currentBeforeRisk) {
              if (score !== Number(row.currentRisk)) {
                toast(`Excel 입력 위험도 ${row.currentRisk}점과 같은 칸을 개선 전으로 선택해 주세요.`)
                return
              }
              selectedBeforeCell = button
              currentBeforeRisk = String(score)
              beforeMarker.hidden = false
              button.classList.add('selected-before')
              formSheet.querySelector('[data-before-grade]').value = currentBeforeRisk
              formSheet.querySelector('[data-before-grade-label]').textContent = `등급 ${riskGrade(score)}`
              wrapper.querySelector('.matrix-selection-hint').textContent = '개선 전 선택 완료. 이제 개선 후 위험도를 초록색으로 선택하세요.'
              return
            }
            if (!currentAfterRisk) {
              selectedAfterCell = button
              currentAfterRisk = String(score)
              afterMarker.hidden = false
              button.classList.add('selected-after')
              formSheet.querySelector('[data-after-grade]').value = currentAfterRisk
              formSheet.querySelector('[data-after-grade-label]').textContent = `등급 ${riskGrade(score)}`
              wrapper.querySelector('.matrix-selection-hint').textContent = '개선 전·후 위험도가 선택되었습니다.'
              return
            }
            toast('위험도를 바꾸려면 ③ 초기화를 먼저 눌러 주세요.')
          })
          td.append(button)
          tr.append(td)
        })
        tbody.append(tr)
      })
      table.append(thead, tbody)

      const reset = wrapper.querySelector('.matrix-reset-button')
      reset.addEventListener('click', () => {
        selectedBeforeCell?.classList.remove('selected-before')
        selectedAfterCell?.classList.remove('selected-after')
        wrapper.querySelectorAll('.matrix-marker').forEach(marker => { marker.hidden = true })
        selectedBeforeCell = null
        selectedAfterCell = null
        currentBeforeRisk = ''
        currentAfterRisk = ''
        formSheet.querySelector('[data-before-grade]').value = ''
        formSheet.querySelector('[data-after-grade]').value = ''
        formSheet.querySelector('[data-before-grade-label]').textContent = ''
        formSheet.querySelector('[data-after-grade-label]').textContent = ''
        wrapper.querySelector('.matrix-selection-hint').textContent = `Excel 계산값 ${row.currentRisk}점과 같은 칸을 빨간색(개선 전)으로 선택하세요.`
      })
        if (row.ppt) {
          const beforeCell = Array.from(table.querySelectorAll('.matrix-cell')).find(cell => Number(cell.dataset.score) === Number(row.ppt.beforeRisk))
          const afterCell = Array.from(table.querySelectorAll('.matrix-cell')).find(cell => Number(cell.dataset.score) === Number(row.ppt.afterRisk))
        if (beforeCell && afterCell) {
          currentBeforeRisk = row.ppt.beforeRisk
          currentAfterRisk = row.ppt.afterRisk
          selectedBeforeCell = beforeCell
          selectedAfterCell = afterCell
          beforeCell.querySelector('.marker-before').hidden = false
          beforeCell.classList.add('selected-before')
          afterCell.querySelector('.marker-after').hidden = false
          afterCell.classList.add('selected-after')
        }
      }
      return wrapper
    }

    const buildPptForm = (record, row) => {
      const oldPpt = row.ppt
      photoObjectUrls.before = [...(oldPpt?.beforePhotos || [])]
      photoObjectUrls.after = [...(oldPpt?.afterPhotos || [])]
      currentBeforeRisk = ''
      currentAfterRisk = ''
      selectedBeforeCell = null
      selectedAfterCell = null
      formSheet = document.createElement('div')
      formSheet.className = 'ppt-assessment-sheet'
      formSheet.innerHTML = `
        <header class="ppt-sheet-header"><h3 class="ppt-sheet-title">위험성 평가 ( 개선 필요 건 )</h3><div class="ppt-sheet-meta">
          <span data-meta-team></span><span data-meta-process></span><span data-meta-date></span>
        </div></header>
        <div class="ppt-progress-ribbon" aria-label="공정 단계">
          <span class="ribbon-active">8점 이상 위험</span><span>현장 확인 및 협의 중</span><span>공무팀 검토</span><span>공사진행</span><span>공사 검토</span><span>공사완료</span>
        </div>
        <div class="ppt-assessment-grid">
          <section class="ppt-main-column">
            <div class="ppt-description-grid">
              <div class="ppt-section-title">위험요인 및 재해형태</div><div class="ppt-section-title">개선(예방)대책</div>
              <div class="ppt-sheet-cell">
                <label class="ppt-text-label">유해 위험요인<textarea data-hazard rows="3"></textarea></label>
                <label class="ppt-text-label">재해형태<textarea data-accident rows="2" placeholder="예: 추락, 끼임, 충돌"></textarea></label>
              </div>
              <label class="ppt-sheet-cell ppt-text-label"><span class="sr-only">개선(예방)대책</span><textarea data-countermeasure rows="6" placeholder="위험을 줄이기 위한 조치"></textarea></label>
            </div>
            <div class="ppt-photo-section"><div class="ppt-section-title">개선 전</div><div class="ppt-section-title">개선 후</div></div>
            <div class="ppt-photo-row"><div data-before-photo></div><div data-after-photo></div></div>
            <div class="ppt-detail-grid">
              <label class="ppt-detail-cell detail-before"><strong>개선전 위험등급</strong><input data-before-grade readonly placeholder="빨간색 동그라미 자동 입력" /><small data-before-grade-label></small></label>
              <label class="ppt-detail-cell detail-after"><strong>개선후 위험등급</strong><input data-after-grade readonly placeholder="초록색 동그라미 자동 입력" /><small data-after-grade-label></small></label>
              <label class="ppt-detail-cell"><strong>개선 예정일</strong><input data-improvement-date type="date" /><small>달력에서 날짜 선택</small></label>
              <label class="ppt-detail-cell"><strong>담당자</strong><input data-owner /></label>
              <label class="ppt-detail-cell ppt-participants"><strong>위험성평가 참여자</strong><textarea data-participants rows="2"></textarea></label>
            </div>
          </section>
          <aside data-risk-matrix></aside>
        </div>
        <footer class="ppt-sheet-footer"><span>위험성평가 · 추가 개선대책</span><strong>깨끗한나라 청주공장</strong></footer>`
      formSheet.querySelector('[data-meta-team]').textContent = `부서: ${record.team}`
      formSheet.querySelector('[data-meta-process]').textContent = `공정: ${record.process}`
      formSheet.querySelector('[data-meta-date]').textContent = `평가일: ${record.date}`
      const hazard = formSheet.querySelector('[data-hazard]')
      hazard.value = oldPpt?.hazard || row.hazard
      formSheet.querySelector('[data-accident]').value = oldPpt?.accident || ''
      formSheet.querySelector('[data-countermeasure]').value = oldPpt?.countermeasure || row.countermeasure
      formSheet.querySelector('[data-improvement-date]').value = oldPpt?.improvementDate || row.improvementDate || ''
      formSheet.querySelector('[data-owner]').value = oldPpt?.owner || row.owner || ''
      formSheet.querySelector('[data-participants]').value = oldPpt?.participants || record.participants || ''
      formSheet.querySelector('[data-before-grade]').value = oldPpt?.beforeRisk || ''
      formSheet.querySelector('[data-after-grade]').value = oldPpt?.afterRisk || ''
      formSheet.querySelector('[data-before-grade-label]').textContent = oldPpt?.beforeRisk ? `등급 ${riskGrade(oldPpt.beforeRisk)}` : ''
      formSheet.querySelector('[data-after-grade-label]').textContent = oldPpt?.afterRisk ? `등급 ${riskGrade(oldPpt.afterRisk)}` : ''
      formSheet.querySelector('[data-before-photo]').append(buildPhotoPreview('before', '개선 전', oldPpt?.beforePhotos || []))
      formSheet.querySelector('[data-after-photo]').append(buildPhotoPreview('after', '개선 후', oldPpt?.afterPhotos || []))
      formSheet.querySelector('[data-risk-matrix]').replaceWith(buildRiskMatrix(record, row))
      formSheet.querySelector('[data-notes]').value = oldPpt?.notes || row.notes || ''
      return formSheet
    }

    const openPptForm = (row) => {
      currentItem = row
      const backdrop = document.querySelector('.modal-backdrop')
      if (!backdrop) return
      phase = 'ppt'
      const content = buildPptForm(currentRecord, row)
      setModalPhase(backdrop, {
        title: 'PPT 위험성평가 추가 작성',
        subtitle: `${row.work} · Excel 위험도 ${row.currentRisk}점 (위험도 8 이상)`,
        content,
        submitText: row.ppt ? 'PPT 내용 수정 저장' : 'PPT 양식 저장',
        classToAdd: 'ppt-modal-card',
        classToRemove: 'excel-modal-card queue-modal-card',
      })
      backButton.hidden = false
      backButton.textContent = '고위험 목록'
    }

    const returnToQueue = () => {
      const backdrop = document.querySelector('.modal-backdrop')
      if (!backdrop) return
      phase = 'queue'
      setModalPhase(backdrop, {
        title: '위험도 8점 이상 · PPT 추가 작성',
        subtitle: 'Excel 평가에서 위험도 8점 이상으로 계산된 항목만 PPT 양식으로 작성합니다.',
        content: renderHighRiskQueue(),
        submitText: '완료',
        classToAdd: 'queue-modal-card',
        classToRemove: 'ppt-modal-card excel-modal-card',
      })
      backButton.hidden = true
    }

    const completePptForm = () => {
      const hazard = formSheet.querySelector('[data-hazard]').value.trim()
      const accident = formSheet.querySelector('[data-accident]').value.trim()
      const countermeasure = formSheet.querySelector('[data-countermeasure]').value.trim()
      if (!hazard || !accident || !countermeasure) {
        toast('유해 위험요인, 재해형태, 개선(예방)대책을 입력해 주세요.')
        return false
      }
      if (!currentBeforeRisk || !currentAfterRisk) {
        toast('Excel 위험도와 일치하는 개선 전 빨간색, 개선 후 초록색을 선택해 주세요.')
        return false
      }
      const item = currentItem
      const oldPhotoUrls = [...(item.ppt?.beforePhotos || []), ...(item.ppt?.afterPhotos || [])]
      item.ppt = {
        hazard,
        accident,
        countermeasure,
        beforeRisk: currentBeforeRisk,
        afterRisk: currentAfterRisk,
        beforeGrade: riskGrade(currentBeforeRisk),
        afterGrade: riskGrade(currentAfterRisk),
        improvementDate: formSheet.querySelector('[data-improvement-date]').value,
        owner: formSheet.querySelector('[data-owner]').value.trim(),
        participants: formSheet.querySelector('[data-participants]').value.trim(),
        notes: formSheet.querySelector('[data-notes]').value.trim(),
        beforePhotos: [...photoObjectUrls.before],
        afterPhotos: [...photoObjectUrls.after],
      }
      item.countermeasure = countermeasure
      item.improvementDate = item.ppt.improvementDate
      item.owner = item.ppt.owner
      oldPhotoUrls.filter(url => !item.ppt.beforePhotos.includes(url) && !item.ppt.afterPhotos.includes(url)).forEach(url => URL.revokeObjectURL(url))
      return true
    }

    showModal('새 위험성평가 만들기', '먼저 Excel형 평가 기본정보를 입력해 주세요.', startForm, '평가 시작', (backdrop) => {
      if (phase === 'start') {
        if (!team.value.trim() || !process.value.trim() || !assessmentDate.value) {
          toast('부서, 공정명, 평가일을 입력해 주세요.')
          return
        }
        if (assessmentType.value === '수시' && !reason.value) {
          toast('수시 평가 사유를 선택해 주세요.')
          return
        }
        if (!excelEditor) buildExcelEditor()
        phase = 'excel'
        setModalPhase(backdrop, {
          title: 'Excel형 위험성평가 입력',
          subtitle: `${team.value.trim()} · ${process.value.trim()} · 빈도 × 강도 자동 계산`,
          content: excelEditor,
          submitText: 'Excel 평가 저장 · 고위험 확인',
          classToAdd: 'excel-modal-card',
          classToRemove: 'queue-modal-card ppt-modal-card',
        })
        backButton.hidden = false
        backButton.textContent = '기본정보'
        return
      }
      if (phase === 'excel') {
        if (!excelRows.length) {
          toast('최소 한 개의 위험요인을 추가해 주세요.')
          return
        }
        const incomplete = excelRows.find(row => !row.work.trim() || !row.hazard.trim() || !row.frequency || !row.severity)
        if (incomplete) {
          toast('각 행의 작업내용, 유해 위험요인, 빈도와 강도를 입력해 주세요.')
          return
        }
        const highRiskWithoutControl = excelRows.find(row => Number(row.currentRisk) >= 8 && !row.countermeasure.trim())
        if (highRiskWithoutControl) {
          toast('위험도 8점 이상 항목의 감소 대책을 입력해 주세요.')
          return
        }
        currentRecord = {
          type: assessmentType.value === '정기' ? '정기' : '수시',
          team: team.value.trim(),
          process: process.value.trim(),
          date: assessmentDate.value,
          evaluator: evaluator.value.trim(),
          participants: participants.value.trim(),
          reason: reason.value,
          rows: excelRows,
        }
        savedAssessments.push(currentRecord)
        appendAssessmentRow(currentRecord)
        phase = 'queue'
        setModalPhase(backdrop, {
          title: '위험도 8점 이상 · PPT 추가 작성',
          subtitle: 'Excel 평가에서 위험도 8점 이상으로 계산된 항목만 PPT 양식으로 작성합니다.',
          content: renderHighRiskQueue(),
          submitText: '완료',
          classToAdd: 'queue-modal-card',
          classToRemove: 'excel-modal-card ppt-modal-card',
        })
        backButton.hidden = true
        return
      }
      if (phase === 'ppt') {
        if (!completePptForm()) return
        returnToQueue()
        toast('PPT 위험성평가 내용을 저장했습니다. (현재 브라우저 미리보기)')
        return
      }
      backdrop.remove()
      toast(`${currentRecord.process} Excel형 평가를 등록했습니다.`)
      Object.values(photoObjectUrls).flat().forEach(url => URL.revokeObjectURL(url))
    })

    const backButton = document.createElement('button')
    backButton.type = 'button'
    backButton.className = 'button button-secondary excel-back-button'
    backButton.textContent = '기본정보'
    backButton.hidden = true
    backButton.addEventListener('click', () => {
      const backdrop = document.querySelector('.modal-backdrop')
      if (!backdrop) return
      if (phase === 'ppt') {
        returnToQueue()
        return
      }
      if (phase === 'excel') {
        phase = 'start'
        setModalPhase(backdrop, {
          title: '새 위험성평가 만들기',
          subtitle: '먼저 Excel형 평가 기본정보를 입력해 주세요.',
          content: startForm,
          submitText: '평가 시작',
          classToAdd: '',
          classToRemove: 'excel-modal-card',
        })
        backButton.hidden = true
      }
    })
    document.querySelector('.modal-foot').prepend(backButton)
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
