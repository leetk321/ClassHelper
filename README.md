## 하루만에 뚝딱 만든 간이 LMS - ClassHelper

> **아직도 수행평가 점수 한 명씩 보여주시나요?**
> 
> **"선생님 계정 까먹었어요" "초대코드 알려주세요" 에서도 벗어나 봅시다!**

---

### 📅 제작기간 : 2.5일(!)

- **<ins>기본 기능 제작 (1일)</ins>**
- 파일 업/다운로드 기능 추가 제작 (1일), Bug Fix 및 안정화 (0.5일)

### 👨‍💻 사용 언어
- HTML+CSS+JS+Flask, Google Apps Script / Google Sheets API 활용


### 💻 구축 시 필요 환경
- Flask 서버 및 접속을 위한 도메인


### 💡 특징
1. 학생의 학번이름+비밀번호로 로그인, 개별화된 기능 제공 (처음 로그인할 때 비밀번호 설정)
2. 구글 스프레드시트를 DB로 사용해 보안 문제를 해결하고 계정 정보, 평가 결과, 공지 등 모든 내용을 교사가 간편하게 확인하고 바꿀 수 있음


### 🔍 주요 기능
- 담당 교사별, 학급별 공지, 개별 메시지 표시
- 엔트리 계정 정보, 구글 계정 정보 저장 (학생이 수정 입력도 가능)
- 저장된 계정 정보는 복사 버튼을 눌러서 간편하게 복사 가능
- 반별 초대코드도 복사 버튼을 눌러서 복사 가능
- 엔트리, 구글 클래스룸 바로가기 버튼
- 수행평가 점수 확인 가능 (한 명씩 부르거나 종이 자를 필요 없음)
- 메모 기능 : 학생이 입력, 수정 가능. 시트에 입력 내용이 저장되어 컴퓨터실 PC 재부팅 시 초기화로 인한 불편을 줄여줌. 마찬가지로 구글 시트에서 교사가 내용 확인 가능하므로, 교사에게 메시지 전달 용도로도 사용 가능.
- (코드 업로드 예정) 파일 업/다운로드 기능 : 교사가 파일을 업로드하면 학생이 다운받을 수 있음.


### ❗️ 주요 예외처리
- 수행평가 점수를 입력하지 않은 경우 해당 항목은 뜨지 않음. 모든 영역을 입력하지 않으면 수행평가 점수 영역 전체가 표시되지 않음.
- 진급 등으로 수업을 듣지 않는 경우 계정 조회용으로 사용할 수 있도록 계정 정보 영역은 표시되게 함.
- 교사인 경우에만 업로드 기능 사용 가능. 다운로드는 교사, 학생 모두 가능.


### ❓ 문의
- 세팅 방법은 ChatGPT 에게 소스코드를 첨부하여 질문하면 친절하게 알려 줄 것임.


### 🔗 외부 링크

- 구글 스프레드시트(DB) 양식 : [링크](https://docs.google.com/spreadsheets/d/14zHWgtie9eSD8jBkaXTQbpvZwc3tFF7ukGF877n0X5Q/edit?usp=sharing) (읽기 전용 / 구축 시 사본 만들어서 사용)
- 기능 확인을 위한 샘플 사이트 : [링크](https://class.sa1t.me/) (계정 정보는 사이트 하단 관리자 페이지에서 확인)
