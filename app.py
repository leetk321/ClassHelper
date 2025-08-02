from flask import Flask, render_template, request, jsonify, session
from google.oauth2 import service_account
from googleapiclient.discovery import build
from werkzeug.utils import secure_filename
from flask import send_file
from werkzeug.utils import safe_join
import os
from datetime import timedelta

app = Flask(__name__)
app.secret_key = 'your_secret_key'
app.permanent_session_lifetime = timedelta(hours=1)

UPLOAD_FOLDER = 'file'

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 배포시 SPREADSHEET_ID 삭제
SPREADSHEET_ID = '스프레드시트 ID 입력'
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
    return render_template('index.html')

@app.route('/lookup', methods=['POST'])
def lookup():
    try:
        data = request.json or {}
        input_id = data.get('idname', '').strip()
        input_pw = data.get('password', '').strip()

        values = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range=RANGE).execute().get('values', [])
        notices = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range=NOTICE_RANGE).execute().get('values', [])

        for i, row in enumerate(values):
            if len(row) >= 7:
                idname = row[5].strip()
                password = row[6].strip()
                if idname == input_id and password == input_pw:
                    session.permanent = False
                    session['user'] = {'idname': input_id, 'password': input_pw}

                    h_to_l = [row[j] if j < len(row) else '' for j in range(7, 12)]
                    grade = row[0] if len(row) > 0 else ''
                    clazz = row[1] if len(row) > 1 else ''
                    teacher = row[13] if len(row) > 13 else ''
                    personal_msg = row[12] if len(row) > 12 else ''
                    row_blocked = row[18] if len(row) > 18 else ''

                    teacher_notice = ""
                    for nrow in notices:
                        if len(nrow) >= 2 and nrow[0].strip() == teacher:
                            teacher_notice = nrow[1]
                            break

                    class_notice = ""
                    invite_code = ""
                    entry_invite_code = ""
                    entry_invite_datetime = ""
                    for nrow in notices:
                        if len(nrow) >= 6 and nrow[2].strip() == grade and nrow[3].strip() == clazz:
                            class_notice = nrow[4] if len(nrow) > 4 else ""
                            invite_code = nrow[5] if len(nrow) > 5 else ""
                            entry_invite_code = nrow[6] if len(nrow) > 6 else ""
                            entry_invite_datetime = nrow[7] if len(nrow) > 7 else ""
                            break

                    # 수행 점수 관련 데이터 (score_data)
                    score_data = []
                    # 시트에서 데이터 가져오기
                    score_names_resp = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range="V2:V5").execute()
                    score_titles_resp = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range="W2:W5").execute()
                    score_maxes_resp = sheet.values().get(spreadsheetId=SPREADSHEET_ID, range="X2:X5").execute()

                    # 값 추출 (빈 셀 또는 행이 있어도 오류 안 나게)
                    score_names = [row[0] if len(row) > 0 else '' for row in score_names_resp.get('values', [])]
                    score_titles = [row[0] if len(row) > 0 else '' for row in score_titles_resp.get('values', [])]
                    score_maxes = [row[0] if len(row) > 0 else '' for row in score_maxes_resp.get('values', [])]

                    student_scores = row[14:18] if len(row) >= 18 else []

                    if any(s.strip() for s in student_scores if isinstance(s, str)):
                        for idx in range(4):
                            name = score_names[idx] if idx < len(score_names) else f"수행{idx+1}"
                            if name.startswith("수행"):
                                name = score_names[idx]  # 그대로 표시하지 않고, V열 값을 사용
                            max_score = score_maxes[idx] if idx < len(score_maxes) else ''
                            score = student_scores[idx] if idx < len(student_scores) else ''
                            if isinstance(score, str) and score.strip():
                                score_data.append({
                                    'name': name,
                                    'title': score_titles[idx] if idx < len(score_titles) else '',
                                    'score': score,
                                    'max': max_score
                                })

                    return jsonify({
                        'row': i + 1,
                        'data': h_to_l + [teacher, teacher_notice, class_notice, personal_msg, grade, clazz, invite_code, row_blocked, entry_invite_code, entry_invite_datetime],
                        'score_data': score_data
                    })

        return jsonify({'error': '일치하는 정보 없음'}), 404

    except Exception as e:
        import traceback
        print("🔥 예외 발생:", traceback.format_exc())  # 서버 로그에 출력
        return jsonify({'error': '서버 내부 오류 발생', 'detail': str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json(force=True)
        ...
    except Exception as e:
        print('예외 발생:', e)
        return jsonify({'error': '서버 내부 오류'}), 500

@app.route('/session_check', methods=['GET'])
def session_check():
    if 'user' in session:
        return jsonify(session['user'])
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
        body = { 'values': values }

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
        data = request.json
        row_number = int(data['row'])
        new_pw = data['password']
        if len(new_pw) < 4:
            return jsonify({'error': '비밀번호는 4자리 이상이어야 합니다.'}), 400

        range_name = f"G{row_number}"
        sheet.values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=range_name,
            valueInputOption='RAW',
            body={'values': [[new_pw]]}
        ).execute()

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

    # ✅ S열(인덱스 18)에서 관리자 여부 확인
    values = sheet.values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=f"S{row_number}"
    ).execute().get('values', [])
    if not values or not values[0] or values[0][0].strip() != '관리자':
        return jsonify({'error': '파일 업로드 권한 없음'}), 403

    # ✅ 전체 시트에서 해당 행 가져오기
    all_rows = sheet.values().get(
        spreadsheetId=SPREADSHEET_ID,
        range='A:Z'
    ).execute().get('values', [])
    row_index = int(row_number) - 1

    if len(all_rows) <= row_index:
        return jsonify({'error': '행 번호가 유효하지 않습니다'}), 400

    row_data = all_rows[row_index]

    # ✅ N열(13번 인덱스)에 교사명이 정확히 입력되어 있는지 확인
    if len(row_data) <= 13 or not row_data[13].strip():
        return jsonify({'error': '교사명을 확인할 수 없습니다'}), 400

    teacher_name = row_data[13].strip()

    # 금지된 확장자
    DISALLOWED_EXTENSIONS = {'.exe', '.bat', '.sh', '.php', '.py', '.js', '.html', '.htm', '.dll', '.msi'}

    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext in DISALLOWED_EXTENSIONS:
        return jsonify({'error': f'이 확장자({file_ext})의 파일은 업로드할 수 없습니다.'}), 400

    # ✅ 교사명, 파일명으로 구성된 안전한 파일명 생성
    filename = f"{teacher_name}_{file.filename}"
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    file.save(save_path)

    return jsonify({'status': 'uploaded', 'filename': filename})

@app.route('/file/<path:filename>')
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
    app.run(host='0.0.0.0', port=5000)
