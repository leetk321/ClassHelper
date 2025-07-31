from flask import Flask, render_template, request, jsonify, session
from google.oauth2 import service_account
from googleapiclient.discovery import build
from datetime import timedelta

app = Flask(__name__)
app.secret_key = 'your_secret_key'
app.permanent_session_lifetime = timedelta(hours=1)

SPREADSHEET_ID = '스프레드시트 ID 입력'
RANGE = 'A:X'
NOTICE_RANGE = '공지사항!A:F'

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
                    session.permanent = True
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
                    for nrow in notices:
                        if len(nrow) >= 6 and nrow[2].strip() == grade and nrow[3].strip() == clazz:
                            class_notice = nrow[4]
                            invite_code = nrow[5]
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
                        'data': h_to_l + [teacher, teacher_notice, class_notice, personal_msg, grade, clazz, invite_code, row_blocked],
                        'score_data': score_data
                    })

        return jsonify({'error': '일치하는 정보 없음'}), 404

    except Exception as e:
        import traceback
        print("🔥 예외 발생:", traceback.format_exc())  # 서버 로그에 출력
        return jsonify({'error': '서버 내부 오류 발생', 'detail': str(e)}), 500

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)