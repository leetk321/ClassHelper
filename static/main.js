// ---------- 전역 변수 ----------
let currentUserData = null;
let currentRow = null;
let isAdmin = false;

// ---------- 진입점 ----------
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const sRes = await fetch('/session_check');
    if (!sRes.ok) return location.href = '/login';

    const sess = await sRes.json();
    await loadUserData(sess.idname, sess.password);
  } catch (e) {
    console.error('세션 확인 실패', e);
    location.href = '/login';
  }
});

// ---------- 데이터 불러오기 ----------
async function loadUserData(idname, password) {
  try {
    const res = await fetch('/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idname, password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      currentUserData = data;
      currentRow = data.row;
      displayMainContent(data);
    } else {
      showError(`데이터 로드 실패: ${data.error || '오류'}`);
    }
  } catch (e) {
    console.error('데이터 로드 오류', e);
    showError('네트워크 오류가 발생했습니다.');
  }
}

function showError(msg) {
  document.getElementById('main-content').innerHTML = `<div style="color:red; text-align:center; padding:20px;">${msg}</div>`;
}

// ---------- 메인 화면 구성 ----------
function displayMainContent(payload) {
  const data = payload.data;
  const scoreData = payload.score_data || [];
  const [entryId, entryPw, googleId, googlePw, memo, teacherName, teacherNotice,
    classNotice, personalMsg, grade, clazz, inviteCode, rowBlocked,
    entryInviteCode, entryInviteDatetime] = data;

  isAdmin = rowBlocked.trim() === '관리자';
  const idname = payload.username;
  const rowNum = payload.row;

  // 메인 컨텐츠 생성
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = generateMainHTML(data, scoreData, idname, grade, clazz, rowNum, isAdmin);

  // 이벤트 바인딩
  setupEventListeners(rowBlocked, inviteCode, entryInviteCode, entryInviteDatetime, rowNum);

  // 다운로드 목록 로드
  loadDownloadList();
}

function generateMainHTML(data, scoreData, idname, grade, clazz, rowNum, isAdmin) {
  const [entryId, entryPw, googleId, googlePw, memo, teacherName, teacherNotice,
    classNotice, personalMsg, grade2, clazz2, inviteCode, rowBlocked] = data;

  const greeting = isAdmin
    ? `${idname.replace(/^\d+\s*/, '')} 선생님`
    : `${grade}학년 ${clazz}반 ${idname.replace(/^\d+\s*/, '')}님`;

  return `
    <div class="top-box">
      <div class="title-box"><h2>📚 ㅇㅇ중 정보 수업 도우미</h2></div> <!-- 배포시 학교명 삭제 -->
      <div id="uploadArea"></div>
    </div>
    <div class="result-box">
      <div class="header-box">
        <p class="greeting">☺️ ${greeting} 환영합니다.</p>

  <!-- 버튼들을 묶어 주면 정렬·간격 제어가 쉬워집니다 -->
  <div class="header-actions">
    <button class="header-btn back-btn"   onclick="logout()">로그아웃</button>
    <button class="header-btn change-btn" onclick="location.href='/change_password'">
      사이트 비밀번호 변경
    </button>
  </div>
</div>
      
      ${generateNoticesHTML(rowBlocked, teacherName, teacherNotice, classNotice, personalMsg, grade, clazz)}
      ${generateScoreHTML(rowBlocked, scoreData)}
      ${generateAccountsHTML(entryId, entryPw, googleId, googlePw, memo, rowBlocked, rowNum)}
      
      <p style="margin-top:30px; font-size:13px; color:#555; text-align:center">
        ※ 아이디나 비밀번호를 변경한 경우, 변경 버튼을 눌러 계정 정보를 기록해주세요.<br/>
      </p>
    </div>
  `;
}

function generateNoticesHTML(rowBlocked, teacherName, teacherNotice, classNotice, personalMsg, grade, clazz) {
  if (rowBlocked.trim() === "v") return "";

  return `
    <div class="notices-row">
      <div class="notice-box red">
        <strong>📢 ${teacherName ? teacherName + " 선생님" : "선생님"} 공지사항</strong>
        <p>${(teacherNotice || "공지사항이 없습니다.").replace(/\n/g, "<br>")}</p>
      </div>
      <div class="notice-box yellow">
        <strong>📢 ${grade}학년 ${clazz}반 공지사항</strong>
        <p>${(classNotice || "공지사항이 없습니다.").replace(/\n/g, "<br>")}</p>
      </div>
      <div class="notice-box blue">
        <strong>📬 선생님의 개별 메시지</strong>
        <p>${(personalMsg || "메시지가 없습니다.").replace(/\n/g, "<br>")}</p>
      </div>
    </div>
  `;
}

function generateScoreHTML(rowBlocked, scoreData) {
  if (rowBlocked.trim() !== "" || scoreData.length === 0) return "";

  return `
    <div class="score-section">
      <div class="score-title">📊 수행평가 점수</div>
      <div class="score-list">
        ${scoreData.map(s => `
          <div class="score-item">
            <span class="score-name">${s.name}</span>
            <span class="score-title">${s.title}</span>
            <span class="score-value">${s.score} / ${s.max}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function generateAccountsHTML(entryId, entryPw, googleId, googlePw, memo, rowBlocked, rowNum) {
  return `
    <div class="account-section">
      ${generateEntryAccountHTML(entryId, entryPw, rowBlocked, rowNum)}
      ${generateGoogleAccountHTML(googleId, googlePw, rowBlocked, rowNum)}
      ${generateMemoHTML(memo, rowNum)}
      <div id="downloadArea"></div>
    </div>
  `;
}

function generateEntryAccountHTML(entryId, entryPw, rowBlocked, rowNum) {
  return `
    <div class="account-box">
      <div class="field-header">
        <span class="field-label">엔트리</span>
        <div class="entry-btn-group">
          ${rowBlocked.trim() === "" ? '<button class="copy-btn" id="entryInviteCodeBtn">초대코드</button>' : ""}
          <a href="https://playentry.org" target="_blank" class="link-button">엔트리 바로가기</a>
        </div>
      </div>
      <div class="field-group">
        <label>ID</label>
        <div class="editable-wrap">
          <div class="editable" contenteditable="true" data-placeholder="계정 정보를 알려주세요">${entryId}</div>
          <button onclick="copyToClipboard(document.querySelectorAll('.editable')[0].innerText, this)" class="copy-btn">복사</button>
        </div>
      </div>
      <div class="field-group">
        <label>비밀번호</label>
        <div class="editable-wrap">
          <div class="editable" contenteditable="true" data-placeholder="계정 정보를 알려주세요">${entryPw}</div>
          <button onclick="copyToClipboard(document.querySelectorAll('.editable')[1].innerText, this)" class="copy-btn">복사</button>
        </div>
      </div>
      <button class="change-btn red" onclick="saveAccount(${rowNum}, 'entry', [
        document.querySelectorAll('.editable')[0].innerText.trim(),
        document.querySelectorAll('.editable')[1].innerText.trim()
      ])">엔트리 아이디 / 비밀번호 변경 기록하기</button>
    </div>
  `;
}

function generateGoogleAccountHTML(googleId, googlePw, rowBlocked, rowNum) {
  return `
    <div class="account-box">
      <div class="field-header">
        <span class="field-label">Google</span>
        <div class="google-btn-group">
          ${rowBlocked.trim() === "" ? '<button class="copy-btn" id="inviteCodeBtn">초대코드</button>' : ""}
          <a href="https://classroom.google.com/" target="_blank" class="link-button">클래스룸 바로가기</a>
        </div>
      </div>
      <div class="field-group">
        <label>ID (변경 불가)</label>
        <div class="editable-wrap">
          <div class="editable" contenteditable="false" data-placeholder="선생님께 문의하세요">${googleId}</div>
          <button onclick="copyToClipboard(document.querySelectorAll('.editable')[2].innerText, this)" class="copy-btn">복사</button>
        </div>
      </div>
      <div class="field-group">
        <label>비밀번호</label>
        <div class="editable-wrap">
          <div class="editable" contenteditable="true" data-placeholder="계정 정보를 알려주세요">${googlePw}</div>
          <button onclick="copyToClipboard(document.querySelectorAll('.editable')[3].innerText, this)" class="copy-btn">복사</button>
        </div>
      </div>
      <button class="change-btn red" onclick="saveAccount(${rowNum}, 'google', [
        document.querySelectorAll('.editable')[3].innerText.trim()
      ])">Google 비밀번호 변경 기록하기</button>
    </div>
  `;
}

function generateMemoHTML(memo, rowNum) {
  return `
    <div class="account-box memo-box">
      <div class="field-label">📝 메모</div>
      <div id="memoCell" class="editable memo-area" contenteditable="true" data-placeholder="메모를 입력하세요">${memo}</div>
      <button class="save-btn" onclick="saveMemo(${rowNum})">메모 저장</button>
    </div>
  `;
}

// ---------- 이벤트 리스너 설정 ----------
function setupEventListeners(rowBlocked, inviteCode, entryInviteCode, entryInviteDatetime, rowNum) {
  setupInviteCodeButtons(rowBlocked, inviteCode, entryInviteCode, entryInviteDatetime);
  setupUploadArea(rowNum);
}

function setupInviteCodeButtons(rowBlocked, inviteCode, entryInviteCode, entryInviteDatetime) {
  if (rowBlocked.trim() !== "") return;

  // Google 초대코드 버튼
  const inviteBtn = document.getElementById("inviteCodeBtn");
  if (inviteBtn) {
    inviteBtn.addEventListener('click', () => {
      if (inviteCode) {
        copyToClipboard(inviteCode, inviteBtn, true);
      } else {
        alert("초대코드를 확인할 수 없습니다.");
      }
    });
  }

  // Entry 초대코드 버튼
  const entryInviteBtn = document.getElementById("entryInviteCodeBtn");
  if (entryInviteBtn) {
    entryInviteBtn.addEventListener('click', () => {
      if (!entryInviteCode) {
        alert("초대코드를 확인할 수 없습니다.");
        return;
      }

      // 초대코드 유효성 확인
      if (isEntryInviteCodeExpired(entryInviteDatetime)) {
        alert("초대코드가 만료되었습니다.\n선생님께 초대코드 재발급을 요청하세요.");
        return;
      }

      copyToClipboard(entryInviteCode, entryInviteBtn, true);
    });
  }
}

function setupUploadArea(rowNum) {
  if (!isAdmin) return;

  const uploadArea = document.getElementById('uploadArea');
  uploadArea.innerHTML = `
    <div class="upload-top-right">
      <div class="upload-header">
        <div class="field-label">📎 파일 업로드</div>
        <button class="upload-btn" type="button" onclick="uploadFile(${rowNum})">업로드</button>
      </div>
      <div id="fileDropZone" class="drop-zone">
        <span>이 곳에 파일을 끌어놓거나 클릭하세요</span>
        <input type="file" id="uploadFileInput" class="file-input" />
      </div>
    </div>
  `;

  setupDropZone(rowNum);
}

// ---------- 유틸리티 함수 ----------
function isEntryInviteCodeExpired(entryInviteDatetime) {
  if (!entryInviteDatetime) return false;

  try {
    const dateStr = entryInviteDatetime
      .replace("오전", "AM")
      .replace("오후", "PM")
      .replace(/\./g, "-")
      .replace(/\s+/g, " ")
      .trim();

    const parsedDate = new Date(dateStr);
    const now = new Date();

    if (isNaN(parsedDate.getTime())) {
      console.warn("초대코드 발급일 파싱 실패:", entryInviteDatetime);
      return false;
    }

    const diffDays = (now - parsedDate) / (1000 * 60 * 60 * 24);
    return diffDays > 7;
  } catch (err) {
    console.error("날짜 파싱 중 오류:", err);
    return false;
  }
}

// ---------- API 호출 함수 ----------
async function logout() {
  try {
    await fetch("/logout", { method: "POST" });
    location.href = '/login';
  } catch (e) {
    console.error('로그아웃 실패:', e);
    location.href = '/login';
  }
}

async function saveMemo(row) {
  const newMemo = document.getElementById("memoCell").innerText.trim();
  try {
    const res = await fetch("/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row, memo: newMemo })
    });

    if (res.ok) {
      alert("메모가 저장되었습니다!");
    } else {
      throw new Error('저장 실패');
    }
  } catch (e) {
    console.error(e);
    alert("저장 실패");
  }
}

async function saveAccount(row, field, newValue) {
  if (!confirm("변경한 계정 정보를 기록하시겠습니까?")) return;

  try {
    const res = await fetch("/update_account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row, field, value: newValue })
    });

    if (res.ok) {
      alert("계정 정보가 저장되었습니다!");
    } else {
      throw new Error('저장 실패');
    }
  } catch (e) {
    console.error(e);
    alert("저장 실패");
  }
}

// ---------- 클립보드 복사 ----------
function copyToClipboard(text, buttonElement, above = false) {
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    console.error("클립보드 API를 사용할 수 없습니다.");
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    showCopySuccess(buttonElement);
  }).catch(err => {
    console.error("복사 실패:", err);
  });
}

function showCopySuccess(buttonElement) {
  const copiedSpan = document.createElement("span");
  copiedSpan.innerText = "복사 완료!";
  copiedSpan.classList.add("copied-msg");

  copiedSpan.style.position = "absolute";
  copiedSpan.style.left = "50%";
  copiedSpan.style.bottom = "100%";
  copiedSpan.style.transform = "translate(-50%, -5px)";
  copiedSpan.style.fontSize = "13px";
  copiedSpan.style.color = "red";
  copiedSpan.style.whiteSpace = "nowrap";

  buttonElement.style.position = "relative";
  buttonElement.appendChild(copiedSpan);
  setTimeout(() => copiedSpan.remove(), 3000);
}

// ---------- 파일 관리 ----------
function loadDownloadList() {
  fetch('/file_list')
    .then(res => res.json())
    .then(fileList => {
      const downloadArea = document.getElementById('downloadArea');
      const files = Array.isArray(fileList) ? fileList : [];

      downloadArea.innerHTML = generateDownloadListHTML(files);
      bindDeleteButtons();
      bindHoverEffectOnDeleteButtons();
    })
    .catch(err => {
      console.error("파일 목록 로딩 실패:", err);
      const downloadArea = document.getElementById('downloadArea');
      downloadArea.innerHTML = `<div class="upload-box"><p style="color:red;">파일 목록을 불러오지 못했습니다.</p></div>`;
    });
}

function generateDownloadListHTML(files) {
  return `
    <div>
      <div class="field-label download-box" style="margin-bottom: 20px;">
        📁 파일 다운로드 (<span id="fileCount">${files.length}</span>)
      </div>
      ${files.length > 0
      ? `<ul class="download-list">
             ${files.map(f => {
        const filenameOnly = f.split('_').slice(1).join('_');
        return `
                 <li class="download-item">
                   <a href="/file/${f}" target="_blank">${filenameOnly}</a>
                   ${isAdmin ? `<button class="delete-btn" data-filename="${f}">🗑️</button>` : ""}
                 </li>
               `;
      }).join('')}
           </ul>`
      : `<p style="padding: 10px; color: #888;">등록된 파일이 없습니다.</p>`
    }
    </div>
  `;
}

async function uploadFile(row) {
  const fileInput = document.getElementById('uploadFileInput');
  const file = fileInput.files[0];

  if (!file) {
    alert('업로드할 파일을 선택하세요.');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('row', row);

  try {
    const res = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error);
    }

    alert('업로드 성공!');
    loadDownloadList();
    resetUploadForm();
  } catch (e) {
    alert('업로드 실패: ' + e.message);
  }
}

function resetUploadForm() {
  const fileInput = document.getElementById('uploadFileInput');
  const dropZone = document.getElementById('fileDropZone');

  if (fileInput) fileInput.value = "";

  if (dropZone) {
    const span = dropZone.querySelector('span');
    if (span) {
      span.textContent = "이 곳에 파일을 끌어놓거나 클릭하세요";
    }
  }
}

function setupDropZone(rowNum) {
  const dropZone = document.getElementById("fileDropZone");
  const fileInput = document.getElementById("uploadFileInput");
  const span = dropZone.querySelector("span");

  if (!dropZone || !fileInput || !span) return;

  dropZone.addEventListener("click", (e) => {
    if (e.target !== fileInput) {
      fileInput.click();
    }
  });

  function updateFileInfoDisplay(file) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    span.textContent = `${file.name} (${sizeMB}MB)`;
  }

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      updateFileInfoDisplay(fileInput.files[0]);
    } else {
      span.textContent = "이 곳에 파일을 끌어놓거나 클릭하세요";
    }
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const dt = new DataTransfer();
      dt.items.add(files[0]);
      fileInput.files = dt.files;

      updateFileInfoDisplay(files[0]);
    }
  });
}

function bindDeleteButtons() {
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = async function () {
      const filename = this.dataset.filename;
      if (confirm(`${filename}\n삭제하시겠습니까?`)) {
        const res = await fetch('/delete_file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename })
        });
        const result = await res.json();
        if (result.success) {
          loadDownloadList();
        } else {
          alert(result.error || '삭제 실패');
        }
      }
    };
  });
}

function bindHoverEffectOnDeleteButtons() {
  document.querySelectorAll('.download-item .delete-btn').forEach(btn => {
    const item = btn.closest('.download-item');
    btn.addEventListener('mouseenter', () => {
      item.classList.add('hovered');
    });
    btn.addEventListener('mouseleave', () => {
      item.classList.remove('hovered');
    });
  });
}