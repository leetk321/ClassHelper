from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from google.oauth2 import service_account
from googleapiclient.discovery import build
from werkzeug.utils import secure_filename
from flask import send_file
from werkzeug.utils import safe_join
import os
from datetime import timedelta

def is_sequential(pw: str) -> bool:
    pw = pw.lower()
    if pw.isdigit() or pw.isalpha():           # 숫자만 또는 영문자만
        asc  = all(ord(pw[i]) - ord(pw[i-1]) ==  1 for i in range(1, len(pw)))
        desc = all(ord(pw[i]) - ord(pw[i-1]) == -1 for i in range(1, len(pw)))
        return asc or desc
    return False

app = Flask(__name__)
app.secret_key = 'your_secret_key'
app.permanent_session_lifetime = timedelta(hours=1)

UPLOAD_FOLDER = 'file'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 배포시 SPREADSHEET_ID 삭제
SPREADSHEET_ID = '스프레드시트 아이디입력'
RANGE = 'A:X'
NOTICE_RANGE = '공지사항!A:H'

creds = service_account.Credentials.from_service_account_file(
    'credentials.json',
    scopes=['https://www.googleapis.com/auth/spreadsheets']
)

service = build('sheets', 'v4', credentials=creds)
sheet = service.spreadsheets()

@app.route('/')
def index():
    # 세션에 사용자 정보가 있는지 확인
    if 'user' in session:
        try:
            # 세션의 사용자 정보로 실제 로그인 확인
            user_info = session['user']
            idname = user_info.get('idname', '').strip()
            password = user_info.get('password', '').strip()
            
            if not idname or not password:
                # 세션 정보가 불완전한 경우
                session.clear()
                return redirect(url_for('login_page'))
            
            # Google Sheets에서 사용자 정보 재확인
            values = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range='A:X').execute().get('values', [])
            
            user_found = False
            for row in values:
                if len(row) >= 7:
                    sheet_idname = row[5].strip()
                    sheet_password = row[6].strip()
                    if sheet_idname == idname and sheet_password == password:
                        user_found = True
                        break
            
            if user_found:
                # 유효한 세션이므로 메인 페이지로 리디렉션
                return redirect(url_for('main_page'))
            else:
                # 세션 정보와 실제 정보가 일치하지 않음 (비밀번호 변경 등)
                session.clear()
                return redirect(url_for('login_page'))
                
        except Exception as e:
            # 오류 발생 시 세션 클리어 후 로그인 페이지로
            print(f"세션 확인 중 오류: {e}")
            session.clear()
            return redirect(url_for('login_page'))
    else:
        # 세션이 없으므로 로그인 페이지로
        return redirect(url_for('login_page'))

@app.route('/login')
def login_page():
    # 세션에 사용자 정보가 남아 있으면 메인으로
    if 'user' in session:
        try:
            idname   = session['user'].get('idname', '').strip()
            password = session['user'].get('password', '').strip()

            # 세션 값이 비어 있으면 세션 삭제 후 로그인 페이지로
            if not idname or not password:
                session.clear()
                return render_template('login.html')

            # (선택) 실제 스프레드시트 데이터와 일치 여부를 재확인
            values = sheet.values().get(
                spreadsheetId=SPREADSHEET_ID,
                range='A:X'
            ).execute().get('values', [])

            for row in values:
                if len(row) >= 7 and row[5].strip() == idname and row[6].strip() == password:
                    # 일치 → 정상 세션
                    return redirect(url_for('main_page'))

            # 일치하지 않으면 세션 파기
            session.clear()
        except Exception as e:
            print(f"/login 세션 검증 오류: {e}")
            session.clear()

    # 세션이 없거나 무효 → 로그인 페이지 렌더링
    return render_template('login.html')

@app.route('/main')
def main_page():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    return render_template('main.html')

@app.route('/change_password')
def change_password_page():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    return render_template('change_pw.html')

@app.route('/lookup', methods=['POST'])
def lookup():
    try:
        data = request.json or {}
        input_id = data.get('idname', '').strip()
        input_pw = data.get('password', '').strip()

        # ⭐ 안전한 batchGet 처리
        try:
            ranges = ['A:X', '공지사항!A:H', 'V2:V5', 'W2:W5', 'X2:X5']
            batch_response = sheet.values().batchGet(
                spreadsheetId=SPREADSHEET_ID,
                ranges=ranges
            ).execute()
            
            ranges_data = batch_response.get('valueRanges', [])
            print(f"BatchGet 성공: {len(ranges_data)}개 범위 반환")
            
            # 안전한 데이터 추출
            values = ranges_data[0].get('values', []) if len(ranges_data) > 0 else []
            notices = ranges_data[1].get('values', []) if len(ranges_data) > 1 else []
            
            score_names = []
            score_titles = []
            score_maxes = []
            
            if len(ranges_data) > 2:
                score_names = [r[0] if r else '' for r in ranges_data[2].get('values', [])]
            if len(ranges_data) > 3:
                score_titles = [r[0] if r else '' for r in ranges_data[3].get('values', [])]
            if len(ranges_data) > 4:
                score_maxes = [r[0] if r else '' for r in ranges_data[4].get('values', [])]
                
        except Exception as batch_error:
            print(f"BatchGet 실패, 기존 방식 사용: {batch_error}")
            # fallback to individual calls
            values = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range='A:X').execute().get('values', [])
            notices = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range='공지사항!A:H').execute().get('values', [])
            
            score_names_resp = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range="V2:V5").execute()
            score_titles_resp = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range="W2:W5").execute()
            score_maxes_resp = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range="X2:X5").execute()
            
            score_names = [row[0] if len(row) > 0 else '' for row in score_names_resp.get('values', [])]
            score_titles = [row[0] if len(row) > 0 else '' for row in score_titles_resp.get('values', [])]
            score_maxes = [row[0] if len(row) > 0 else '' for row in score_maxes_resp.get('values', [])]

        # 사용자 검색
        for i, row in enumerate(values):
            if len(row) >= 7:
                idname = row[5].strip()
                password = row[6].strip()

                if idname == input_id and password == input_pw:
                    session.permanent = True
                    session['user'] = {'idname': input_id, 'password': input_pw}

                    # 데이터 안전하게 추출
                    h_to_l = [row[j] if j < len(row) else '' for j in range(7, 12)]
                    grade = row[0] if len(row) > 0 else ''
                    clazz = row[1] if len(row) > 1 else ''
                    teacher = row[13] if len(row) > 13 else ''
                    personal_msg = row[12] if len(row) > 12 else ''
                    row_blocked = row[18] if len(row) > 18 else ''

                    # 공지사항 처리
                    teacher_notice = ""
                    for nrow in notices:
                        if len(nrow) >= 2 and nrow[0].strip() == teacher:
                            teacher_notice = nrow[1]
                            break

                    class_notice = ""
                    invite_code = ""
                    entry_invite_code = ""
                    entry_invite_datetime = ""

                    # 수정 코드
                    for nrow in notices:
                        # C열(학년)·D열(반)만 있으면 매칭 가능
                        if len(nrow) > 3 and nrow[2].strip() == grade and nrow[3].strip() == clazz:
                            class_notice           = nrow[4] if len(nrow) > 4 else ""   # E열
                            invite_code            = nrow[5] if len(nrow) > 5 else ""   # F열
                            entry_invite_code      = nrow[6] if len(nrow) > 6 else ""   # G열
                            entry_invite_datetime  = nrow[7] if len(nrow) > 7 else ""   # H열
                            break

                    # 수행평가 점수 처리
                    score_data = []
                    student_scores = row[14:18] if len(row) >= 18 else []

                    if any(str(s).strip() for s in student_scores if s is not None):
                        for idx in range(4):
                            name = score_names[idx] if idx < len(score_names) else f"수행{idx+1}"
                            max_score = score_maxes[idx] if idx < len(score_maxes) else ''
                            score = student_scores[idx] if idx < len(student_scores) else ''

                            if str(score).strip():
                                score_data.append({
                                    'name': name,
                                    'title': score_titles[idx] if idx < len(score_titles) else '',
                                    'score': str(score),
                                    'max': str(max_score)
                                })

                    return jsonify({
                        'success': True,
                        'row': i + 1,
                        'username': input_id,  # ⭐ idname 전달
                        'data': h_to_l + [teacher, teacher_notice, class_notice, personal_msg, grade, clazz, invite_code, row_blocked, entry_invite_code, entry_invite_datetime],
                        'score_data': score_data
                    })

        return jsonify({'error': '일치하는 정보 없음'}), 404

    except Exception as e:
        import traceback
        print("🔥 lookup 예외 발생:", traceback.format_exc())
        return jsonify({'error': '서버 내부 오류 발생', 'detail': str(e)}), 500

@app.route('/session_check', methods=['GET'])
def session_check():
    if 'user' in session:
        try:
            user_info = session['user']
            idname = user_info.get('idname', '').strip()
            password = user_info.get('password', '').strip()
            
            if not idname or not password:
                session.clear()
                return jsonify({'error': 'invalid session'}), 401
            
            # 실제 스프레드시트 데이터와 세션 정보 일치 확인 (선택사항)
            # 성능을 위해 주석 처리하되, 보안이 중요한 경우 활성화
            """
            values = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range='A:X').execute().get('values', [])
            user_found = False
            for row in values:
                if len(row) >= 7 and row[5].strip() == idname and row[6].strip() == password:
                    user_found = True
                    break
            
            if not user_found:
                session.clear()
                return jsonify({'error': 'session expired'}), 401
            """
            return jsonify(session['user'])
        except Exception as e:
            print(f"세션 확인 중 오류: {e}")
            session.clear()
            return jsonify({'error': 'session error'}), 500
    return jsonify({'error': 'no session'}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'status': 'logged out'})

@app.route('/update', methods=['POST'])
def update():
    data = request.json
    row_number = int(data['row'])
    new_memo = data['memo']

    range_name = f"L{row_number}"
    body = {'values': [[new_memo]]}

    sheet.values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=range_name,
        valueInputOption="RAW",
        body=body
    ).execute()

    return jsonify({'status': 'updated'})

@app.route('/update_account', methods=['POST'])
def update_account():
    try:
        data = request.json
        row_number = int(data['row'])
        field = data['field']
        value = data['value']

        if field == 'entry':
            range_name = f"H{row_number}:I{row_number}"
        elif field == 'google':
            range_name = f"K{row_number}"
        else:
            return jsonify({'error': 'invalid field'}), 400

        if not isinstance(value, list):
            return jsonify({'error': 'value must be a list'}), 400

        values = [value]
        body = {'values': values}

        sheet.values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=range_name,
            valueInputOption="RAW",
            body=body
        ).execute()

        return jsonify({'status': 'updated'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/update_password', methods=['POST'])
def update_password():
    try:
        data       = request.json
        row_number = int(data['row'])
        new_pw     = data['password']

        if len(new_pw) < 4:
            return jsonify({'error': '비밀번호는 4자리 이상이어야 합니다.'}), 400
        if is_sequential(new_pw):
            return jsonify({'error': '연속된 문자·숫자로만 이루어진 비밀번호는 사용할 수 없습니다.'}), 400

        range_name = f"G{row_number}"
        sheet.values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=range_name,
            valueInputOption='RAW',
            body={'values': [[new_pw]]}
        ).execute()

        # 세션 암호도 최신화
        if 'user' in session:
            session['user']['password'] = new_pw

        return jsonify({'status': 'password updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'user' not in session:
        return jsonify({'error': '인증되지 않음'}), 401

    file = request.files.get('file')
    row_number = request.form.get('row')

    if not file or file.filename == '':
        return jsonify({'error': '파일이 선택되지 않았습니다'}), 400

    values = sheet.values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=f"S{row_number}"
    ).execute().get('values', [])

    if not values or not values[0] or values[0][0].strip() != '관리자':
        return jsonify({'error': '파일 업로드 권한 없음'}), 403

    all_rows = sheet.values().get(
        spreadsheetId=SPREADSHEET_ID,
        range='A:Z'
    ).execute().get('values', [])

    row_index = int(row_number) - 1

    if len(all_rows) <= row_index:
        return jsonify({'error': '행 번호가 유효하지 않습니다'}), 400

    row_data = all_rows[row_index]

    if len(row_data) <= 13 or not row_data[13].strip():
        return jsonify({'error': '교사명을 확인할 수 없습니다'}), 400

    teacher_name = row_data[13].strip()

    DISALLOWED_EXTENSIONS = {'.exe', '.bat', '.sh', '.php', '.py', '.js', '.html', '.htm', '.dll', '.msi'}
    file_ext = os.path.splitext(file.filename)[1].lower()

    if file_ext in DISALLOWED_EXTENSIONS:
        return jsonify({'error': f'이 확장자({file_ext})의 파일은 업로드할 수 없습니다.'}), 400

    filename = f"{teacher_name}_{file.filename}"
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    file.save(save_path)

    return jsonify({'status': 'uploaded', 'filename': filename})

@app.route('/file/<filename>')
def uploaded_file(filename):
    if 'user' not in session:
        return jsonify({'error': '접근 권한 없음'}), 401

    try:
        full_path = safe_join(app.config['UPLOAD_FOLDER'], filename)
        if not full_path or not os.path.isfile(full_path):
            return jsonify({'error': '파일이 존재하지 않음'}), 404

        return send_file(full_path, as_attachment=True)

    except Exception as e:
        print(f"🔥 다운로드 실패: {e}")
        return jsonify({'error': '서버 내부 오류'}), 500

@app.route('/delete_file', methods=['POST'])
def delete_file():
    data = request.get_json()
    filename = data.get('filename')

    if not filename:
        return jsonify({'error': '파일명이 제공되지 않았습니다.'}), 400

    file_path = os.path.join(UPLOAD_FOLDER, filename)

    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            return jsonify({'success': 'deleted'})
        except Exception as e:
            return jsonify({'error': f'삭제 중 오류 발생: {str(e)}'}), 500
    else:
        return jsonify({'error': '파일이 존재하지 않습니다.'}), 404

@app.route('/file_list')
def file_list():
    if 'user' not in session:
        return jsonify([])

    user_id = session['user']['idname']
    values = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range='A:X').execute().get('values', [])

    teacher_name = ''
    for row in values:
        if len(row) >= 6 and row[5].strip() == user_id:
            teacher_name = row[13] if len(row) > 13 else ''
            break

    if not teacher_name:
        return jsonify([])

    try:
        files = os.listdir(app.config['UPLOAD_FOLDER'])
        matching_files = [f for f in files if f.startswith(f"{teacher_name}_")]
        return jsonify(matching_files)
    except:
        return jsonify([])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=포트번호)