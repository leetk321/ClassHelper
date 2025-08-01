
window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("forceLogout") === "true") {
    localStorage.removeItem("forceLogout");
    return;
  }
  fetch('/session_check')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data) {
        document.getElementById("idname").value = data.idname;
        document.getElementById("password").value = data.password;
        lookup(); // 자동 로그인
      }
    });
});

async function lookup() {
  const idname = document.getElementById("idname").value.trim();
  const inputPassword = document.getElementById("password").value.trim();
  const password = inputPassword;
  const resultDiv = document.getElementById("result");
  const loginBox = document.querySelector(".login-box");


  resultDiv.innerHTML = "";

  try {
    const res = await fetch("/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idname, password })
    });

    const data = await res.json();
    if (!res.ok) {
      resultDiv.innerHTML = `
      <div class="result-box" style="width: 500px; margin: 20px auto; text-align: center;">
        <p style="color:red;">${data.error}</p>
      </div>`;
      return;
    }

    const scoreData = data.score_data || [];

    if (!res.ok) {
      resultDiv.innerHTML = `
      <div class="result-box" style="width: 500px; margin: 20px auto; text-align: center;">
        <p style="color:red;">${data.error}</p>
      </div>`;
      return;
    }

    loginBox.style.display = "none";
    document.querySelector('.title').innerText = '🖥️ ㅇㅇ중 정보 수업 도우미'; //배포시 학교명 삭제
    const rowNum = data.row;

    if (inputPassword === "기본 비밀번호 입력") {  //배포시 기본 비밀번호 삭제
      alert("기본 비밀번호입니다. 보안을 위해 변경해주세요.");
      showPasswordChange(rowNum);
      return;
    }

    const [entryId, entryPw, googleId, googlePw, memo,
      teacherName, teacherNotice, classNotice, personalMsg,
      grade, clazz, inviteCode, rowBlocked, entryInviteCode, entryInviteDatetime] = data.data;
    const safeEntryId = entryId;
    const safeEntryPw = entryPw;
    const safeGoogleId = googleId;
    const safeGooglePw = googlePw;
    const safeMemo = memo;


    resultDiv.innerHTML = `
      <div class="header-box">
      <button class="header-btn back-btn" onclick="logout()">로그아웃</button>
      <button class="header-btn change-btn" onclick="showPasswordChange(${rowNum})">사이트 비밀번호 변경</button>
      </div>
      <div class="result-box">
        <p style="text-align:left; margin-bottom:10px;">
          ☺️ ${grade}학년 ${clazz}반 ${idname.replace(/^\d+\s*/, '')}님 환영합니다.
        </p>
${rowBlocked.trim() === "" ? `
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
` : ""}

${rowBlocked.trim() === "" && scoreData.length > 0 ? `
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
` : ""}

        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
</div>
      <div class="account-section">
          <div class="account-box">
            <div class="field-header">
              <span class="field-label">엔트리</span>

<div class="entry-btn-group">
  ${rowBlocked.trim() === "" ? `
    <button class="copy-btn" id="entryInviteCodeBtn">초대코드</button>
  ` : ""}
  
  <a href="https://playentry.org" target="_blank" class="link-button">엔트리 바로가기</a>
</div>
            </div>
            <div class="field-group">
              <label>ID</label>
              <div class="editable-wrap">
                <div class="editable" contenteditable="true" data-placeholder="계정 정보를 알려주세요">${safeEntryId}</div>
                <button onclick="copyToClipboard(document.querySelectorAll('.editable')[0].innerText, this)" class="copy-btn">복사</button>
              </div>
            </div>
            <div class="field-group">
              <label>비밀번호</label>
              <div class="editable-wrap">
                <div class="editable" contenteditable="true" data-placeholder="계정 정보를 알려주세요">${safeEntryPw}</div>
                <button onclick="copyToClipboard(document.querySelectorAll('.editable')[1].innerText, this)" class="copy-btn">복사</button>
              </div>
            </div>
            <button class="change-btn red" onclick="saveAccount(${rowNum}, 'entry', [
              document.querySelectorAll('.editable')[0].innerText.trim(),
              document.querySelectorAll('.editable')[1].innerText.trim()
            ])">엔트리 아이디 / 비밀번호 변경 기록하기</button>
          </div>

          <div class="account-box">
            <div class="field-header">
              <span class="field-label">Google</span>

<div class="google-btn-group">
  ${rowBlocked.trim() === "" ? `
    <button class="copy-btn" id="inviteCodeBtn">초대코드</button>
  ` : ""}

  <a href="https://classroom.google.com/" target="_blank" class="link-button">클래스룸 바로가기</a>
</div>
            </div>
            <div class="field-group">
              <label>ID (변경 불가)</label>
              <div class="editable-wrap">
                <div class="editable" contenteditable="false" data-placeholder="선생님께 문의하세요">${safeGoogleId}</div>
                <button onclick="copyToClipboard(document.querySelectorAll('.editable')[2].innerText, this)" class="copy-btn">복사</button>
              </div>
            </div>
            <div class="field-group">
              <label>비밀번호</label>
              <div class="editable-wrap">
                <div class="editable" contenteditable="true" data-placeholder="계정 정보를 알려주세요">${safeGooglePw}</div>
                <button onclick="copyToClipboard(document.querySelectorAll('.editable')[3].innerText, this)" class="copy-btn">복사</button>
              </div>
            </div>
            <button class="change-btn red" onclick="saveAccount(${rowNum}, 'google', [
              document.querySelectorAll('.editable')[3].innerText.trim()
            ])">Google 비밀번호 변경 기록하기</button>
          </div>

          <div class="account-box memo-box">
            <div class="field-label">메모</div>
            <div id="memoCell" class="editable memo-area" contenteditable="true" data-placeholder="메모를 입력하세요">${safeMemo}</div>
            <button class="save-btn" onclick="saveMemo(${rowNum})">메모 저장</button>
          </div>
        </div>
        <p style="margin-top:30px; font-size:13px; color:#555; text-align:center">
          ※ 아이디나 비밀번호를 변경한 경우, 변경 버튼을 눌러 계정 정보를 기록해주세요.<br/><br/>
          사이트 제작 : 2025.07.30. 이태근 // 본 사이트의 목적 외 사용을 금합니다.
        </p>
      </div>
    `;

    // 초대코드 복사 버튼 이벤트
    if (rowBlocked.trim() === "") {
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

      const entryInviteBtn = document.getElementById("entryInviteCodeBtn");
      if (entryInviteBtn) {
        entryInviteBtn.addEventListener('click', () => {
          if (!entryInviteCode) {
            alert("초대코드를 확인할 수 없습니다.");
            return;
          }

          // ✅ 초대코드 일시 유효성 확인
          if (entryInviteDatetime) {
            try {
              // 오전/오후 → AM/PM 으로 변환
              const dateStr = entryInviteDatetime
                .replace("오전", "AM")
                .replace("오후", "PM")
                .replace(/\./g, "-")   // Date가 yyyy-mm-dd 형태로 파싱 잘 됨
                .replace(/\s+/g, " ")  // 공백 정리
                .trim();

              const parsedDate = new Date(dateStr);
              const now = new Date();

              if (isNaN(parsedDate.getTime())) {
                console.warn("초대코드 발급일 파싱 실패:", entryInviteDatetime);
              } else {
                const diffDays = (now - parsedDate) / (1000 * 60 * 60 * 24);
                if (diffDays > 7) {
                  alert("초대코드가 만료되었습니다.\n선생님께 초대코드 재발급을 요청하세요.");
                  return;
                }
              }
            } catch (err) {
              console.error("날짜 파싱 중 오류:", err);
            }
          }

          copyToClipboard(entryInviteCode, entryInviteBtn, true);
        });
      }
    }
  } catch (e) {
    console.error(e);
  }
}

async function logout() {
  await fetch("/logout", { method: "POST" });
  location.reload();
}

async function saveMemo(row) {
  const newMemo = document.getElementById("memoCell").innerText.trim();
  try {
    const res = await fetch("/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row, memo: newMemo })
    });
    await res.json();
    alert("메모가 저장되었습니다!");
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
    await res.json();
    alert("계정 정보가 저장되었습니다!");
  } catch (e) {
    console.error(e);
    alert("저장 실패");
  }
}

function copyToClipboard(text, buttonElement, above = false) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      const copiedSpan = document.createElement("span");
      copiedSpan.innerText = "복사 완료!";
      copiedSpan.classList.add("copied-msg");

      if (above) {
        // 버튼 기준으로 정확히 위 5px에 배치
        copiedSpan.style.position = "absolute";
        copiedSpan.style.left = "50%";
        copiedSpan.style.bottom = "100%";
        copiedSpan.style.transform = "translate(-50%, -5px)";
        copiedSpan.style.fontSize = "13px";
        copiedSpan.style.color = "red";
        copiedSpan.style.whiteSpace = "nowrap";

        // 🔹 버튼 자신에게 relative 설정
        buttonElement.style.position = "relative";
        buttonElement.appendChild(copiedSpan);
      } else {
        // 기본 오른쪽 표시
        copiedSpan.style.color = "red";
        copiedSpan.style.marginLeft = "8px";
        copiedSpan.style.position = "absolute";
        copiedSpan.style.top = "50%";
        copiedSpan.style.left = "100%";
        copiedSpan.style.transform = "translate(5px, -50%)";
        copiedSpan.style.fontSize = "13px";
        copiedSpan.style.whiteSpace = "nowrap";
        buttonElement.parentElement.style.position = "relative";
        buttonElement.parentElement.appendChild(copiedSpan);
      }

      setTimeout(() => copiedSpan.remove(), 3000);
    }).catch(err => {
      console.error("복사 실패:", err);
    });
  }
}

function showPasswordChange(rowNum) {
  document.querySelector('.login-box').style.display = 'none';
  document.getElementById("result").innerHTML = `
    <div class="result-box">
      <h3>🔐 비밀번호 변경</h3>
      <input type="password" id="newPw" placeholder="새 비밀번호 (4자리 이상)">
      <input type="password" id="confirmPw" placeholder="비밀번호 재입력">
<div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 15px;">
  <button class="back-btn gray" style="flex: 1;" onclick="location.reload()">← 돌아가기</button>
  <button class="change-btn" style="flex: 1;" onclick="changePassword(${rowNum})">비밀번호 변경</button>
</div>
    </div>
  `;
}

async function changePassword(row) {
  const newPw = document.getElementById("newPw").value.trim();
  const confirmPw = document.getElementById("confirmPw").value.trim();
  if (newPw.length < 4) return alert("비밀번호는 4자리 이상이어야 합니다.");
  if (newPw !== confirmPw) return alert("비밀번호가 일치하지 않습니다.");
  if (/^(\d)\1+$/.test(newPw)) return alert("같은 숫자를 반복한 비밀번호는 사용할 수 없습니다.");
  if (/^\d+$/.test(newPw) && (() => {
    let asc = true, desc = true;
    for (let i = 1; i < newPw.length; i++) {
      const diff = newPw.charCodeAt(i) - newPw.charCodeAt(i - 1);
      if (diff !== 1) asc = false;
      if (diff !== -1) desc = false;
    }
    return asc || desc;
  })()) return alert("연속된 숫자는 비밀번호로 사용할 수 없습니다.");
  try {
    const res = await fetch("/update_password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row, password: newPw })
    });
    await res.json();
    localStorage.setItem("forceLogout", "true");
    alert("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
    document.getElementById("password").value = "";
    document.getElementById("idname").value = "";
    location.reload();
  } catch (e) {
    console.error(e);
    alert("변경 실패");
  }
}