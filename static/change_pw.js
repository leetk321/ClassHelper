window.addEventListener("DOMContentLoaded", async () => {
    // 세션 확인
    try {
        const sessionRes = await fetch('/session_check');
        if (!sessionRes.ok) {
            window.location.href = '/login';
            return;
        }
    } catch (error) {
        console.error('세션 확인 실패:', error);
        window.location.href = '/login';
    }

    // Enter 키 이벤트 바인딩
    const inputs = ['current-password', 'new-password', 'confirm-password'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                changePassword();
            }
        });
    });
});

function isSequential(str) {
    const s = str.toLowerCase();
    if (!(s.match(/^[a-z]+$/) || s.match(/^[0-9]+$/))) return false;  // 영문 또는 숫자로만 구성된 경우만 검사

    let asc = true, desc = true;
    for (let i = 1; i < s.length; i++) {
        const diff = s.charCodeAt(i) - s.charCodeAt(i - 1);
        if (diff !== 1)  asc  = false;      // 오름차순이 아님
        if (diff !== -1) desc = false;      // 내림차순이 아님
    }
    return asc || desc;                     // 둘 중 하나라도 전부 만족하면 연속 문자열
}

async function changePassword() {
    const currentPassword = document.getElementById('current-password').value.trim();
    const newPassword = document.getElementById('new-password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();
    const resultDiv = document.getElementById('result');

    // 입력 검증
    if (!currentPassword || !newPassword || !confirmPassword) {
        resultDiv.innerHTML = '<p style="color: red;">모든 필드를 입력해주세요.</p>';
        return;
    }

    if (newPassword.length < 4) {
        resultDiv.innerHTML = '<p style="color: red;">새 비밀번호는 4자리 이상이어야 합니다.</p>';
        return;
    }

    if (newPassword !== confirmPassword) {
        resultDiv.innerHTML = '<p style="color: red;">새 비밀번호가 일치하지 않습니다.</p>';
        return;
    }

    if (currentPassword === newPassword) {
        resultDiv.innerHTML = '<p style="color: red;">현재 비밀번호와 새 비밀번호가 동일합니다.</p>';
        return;
    }

    resultDiv.innerHTML = '<p>비밀번호를 변경하는 중...</p>';

    try {
        // 현재 세션 정보 가져오기
        const sessionRes = await fetch('/session_check');
        const sessionData = await sessionRes.json();

        // 현재 비밀번호 확인
        if (sessionData.password !== currentPassword) {
            resultDiv.innerHTML = '<p style="color: red;">현재 비밀번호가 올바르지 않습니다.</p>';
            return;
        }

        // 사용자 정보로 행 번호 찾기
        const lookupRes = await fetch('/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idname: sessionData.idname,
                password: currentPassword
            })
        });

        const lookupData = await lookupRes.json();

        if (!lookupRes.ok || !lookupData.success) {
            resultDiv.innerHTML = '<p style="color: red;">사용자 정보를 찾을 수 없습니다.</p>';
            return;
        }

        // 비밀번호 업데이트
        const updateRes = await fetch('/update_password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                row: lookupData.row,
                password: newPassword
            })
        });

        const updateResult = await updateRes.json();

        // change_pw.js - 수정된 비밀번호 변경 성공 처리 부분
        if (updateRes.ok) {
            resultDiv.innerHTML = '<p style="color: green;">비밀번호가 성공적으로 변경되었습니다! 보안을 위해 다시 로그인해주세요.</p>';

            // 입력 필드 초기화
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';

            // 세션 무효화 및 로그인 페이지로 리디렉션
            setTimeout(async () => {
                try {
                    await fetch('/logout', { method: 'POST' });
                } catch (error) {
                    console.error('로그아웃 처리 중 오류:', error);
                }
                window.location.href = '/login';
            }, 3000);
        } else {
            resultDiv.innerHTML = `<p style="color: red;">비밀번호 변경 실패: ${updateResult.error}</p>`;
        }
    } catch (error) {
        console.error('비밀번호 변경 오류:', error);
        resultDiv.innerHTML = '<p style="color: red;">네트워크 오류가 발생했습니다.</p>';
    }
}

function goBack() {
    window.location.href = '/main';
}