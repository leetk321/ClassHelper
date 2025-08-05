window.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname !== '/login') {
        return;
    }
    const idInput = document.getElementById("idname");
    const pwInput = document.getElementById("password");

    // ✅ null 체크 추가
    if (!idInput || !pwInput) {
        return;
    }
    
    // 세션 확인
    fetch('/session_check')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            if (data) {
                idInput.value = data.idname;
                pwInput.value = data.password;
            }
        })
        .catch(() => {
            // 세션이 없으면 무시
        });

    // Enter 키 이벤트
    [idInput, pwInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                login();
            }
        });
    });
});

async function login() {
    const idname = document.getElementById("idname").value.trim();
    const password = document.getElementById("password").value.trim();
    const resultDiv = document.getElementById("result");

    if (!idname || !password) {
        resultDiv.innerHTML = '<p style="color: red;">아이디와 비밀번호를 모두 입력해주세요.</p>';
        return;
    }

    const DEFAULT_PW = "기본비번"; // ← 기본 비밀번호 상수 - 배포시 삭제

    resultDiv.innerHTML = '<p>로그인 중...</p>';
    try {
        const res = await fetch("/lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idname, password })
        });

        const data = await res.json();

        if (res.ok && data.success) {

            // ① 기본 비밀번호 여부 확인
            if (password === DEFAULT_PW) {
                resultDiv.innerHTML =
                  '<p>기본 비밀번호입니다. 비밀번호를 먼저 변경해주세요!</p>';
                setTimeout(() => {            // change_pw 페이지로
                    window.location.href = '/change_password';
                }, 1000);
            } else {
                resultDiv.innerHTML =
                  '<p>로그인 성공! 메인 페이지로 이동합니다...</p>';
                setTimeout(() => {
                    window.location.href = '/main';
                }, 1000);
            }
        } else {
            resultDiv.innerHTML = `<p>${data.error || '로그인 실패'}</p>`;
        }
    } catch (error) {
        console.error('로그인 오류:', error);
        resultDiv.innerHTML = '<p style="color: red;">네트워크 오류가 발생했습니다.</p>';
    }
}
