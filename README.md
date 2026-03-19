# ClassReg

초중고등학생 대상 진로특강 수강신청 및 관리자 운영 웹앱입니다.  
정적 프론트엔드는 `HTML/CSS/JavaScript`, 서버 로직은 `Netlify Functions`, 데이터 저장은 `Netlify Blobs`를 사용합니다.

## 폴더 구조

```text
.
├── .gitignore
├── README.md
├── netlify.toml
├── package.json
├── netlify
│   ├── data
│   │   └── .gitkeep
│   └── functions
│       ├── admin-login.js
│       ├── applications.js
│       ├── instructors.js
│       ├── lectures.js
│       ├── seed.js
│       ├── stats.js
│       └── lib
│           ├── auth.js
│           ├── response.js
│           ├── sample-data.js
│           ├── stores.js
│           └── validation.js
└── public
    ├── index.html
    ├── admin
    │   └── index.html
    ├── assets
    │   ├── admin.js
    │   ├── api.js
    │   ├── student.js
    │   └── styles.css
    └── student
        └── index.html
```

## 주요 기능

- 학생용 페이지
  - 특강 목록 조회, 필터링, 상세 보기
  - HTML `form` 기반 수강신청
  - `data-netlify="true"` 구조를 포함하여 Netlify Forms 감지 가능성 고려
  - 실제 저장은 `/.netlify/functions/applications`를 통해 Netlify Blobs에 기록
- 관리자용 페이지
  - 데모 로그인 UI
  - 특강 CRUD
  - 강사 CRUD
  - 신청 목록 조회
  - 통계 대시보드
- 저장 구조
  - `lectures-store`
  - `instructors-store`
  - `applications-store`
- 샘플 데이터
  - 첫 실행 시 자동 시드
  - 관리자 페이지에서 강제 재시드 가능

## 데이터 저장 방식

배포 환경에서는 모든 영속 데이터가 Netlify Blobs에 저장됩니다.

- `lectures` 데이터: `lectures-store`
- `instructors` 데이터: `instructors-store`
- `applications` 데이터: `applications-store`

각 레코드는 JSON 형태로 Blob key/value에 저장합니다.

예시 코드:

```js
import { getStore } from "@netlify/blobs";

const store = getStore({ name: "lectures-store" });
await store.setJSON("lec-123", { id: "lec-123", title: "AI 진로특강" });
const lecture = await store.get("lec-123", { type: "json" });
```

이 프로젝트에는 로컬 개발 편의를 위해 fallback 저장소도 포함되어 있습니다.

- `USE_LOCAL_BLOBS=true` 이거나
- 로컬에서 Netlify Blobs 연결이 되지 않는 경우

`netlify/data/*.json` 파일을 동일 인터페이스의 로컬 mock store로 사용합니다.  
배포 시에는 자동으로 Netlify Blobs를 우선 사용합니다.

## 로컬 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. Netlify CLI 로그인

```bash
npx netlify login
```

### 3. 사이트 연결

```bash
npx netlify link
```

이미 Netlify 사이트가 있다면 연결하고, 없다면 새 사이트를 생성해도 됩니다.

### 4. 환경변수 설정

기본 데모 계정은 코드 내 기본값으로 동작하지만, 필요하면 환경변수를 설정할 수 있습니다.

```bash
npx netlify env:set ADMIN_USERNAME admin
npx netlify env:set ADMIN_PASSWORD admin1234
npx netlify env:set ADMIN_TOKEN classreg-demo-admin-token
```

로컬에서 Blob 연결 없이 mock 저장을 사용하려면:

```bash
export USE_LOCAL_BLOBS=true
```

또는 `.env` 파일 대신 셸 환경변수로 설정한 뒤 실행합니다.

### 5. 개발 서버 실행

```bash
npm run dev
```

기본적으로 다음 경로를 사용할 수 있습니다.

- 학생용 페이지: `http://localhost:8888/student/`
- 관리자 페이지: `http://localhost:8888/admin/`
- 랜딩 페이지: `http://localhost:8888/`

## Netlify Blobs 설정 방법

1. Netlify 대시보드에서 해당 사이트를 생성하거나 연결합니다.
2. `Netlify Functions`가 활성화된 상태에서 배포합니다.
3. `@netlify/blobs` 패키지가 설치된 상태로 함수가 배포되면 Blob Store API를 사용할 수 있습니다.
4. 이 프로젝트는 코드에서 `getStore({ name })`로 store를 생성하므로 별도의 외부 DB 설정이 필요하지 않습니다.

실제 데이터는 함수 내부에서 다음 흐름으로 저장됩니다.

1. 요청 수신
2. 입력 검증
3. 해당 Blob store 조회
4. JSON 저장 또는 수정
5. 통계는 `applications`, `lectures`, `instructors`를 읽어서 서버에서 계산

## 배포 방법

### Netlify CLI 배포

```bash
npx netlify deploy
```

운영 배포:

```bash
npx netlify deploy --prod
```

### Git 연동 배포

1. 저장소를 GitHub 등에 push합니다.
2. Netlify에서 저장소를 연결합니다.
3. Build settings:
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
4. 배포 후 `/student/`, `/admin/` 경로로 접근합니다.

## API 엔드포인트

- `POST /.netlify/functions/admin-login`
- `GET|POST|PUT|DELETE /.netlify/functions/lectures`
- `GET|POST|PUT|DELETE /.netlify/functions/instructors`
- `GET|POST /.netlify/functions/applications`
- `GET /.netlify/functions/stats`
- `POST /.netlify/functions/seed`

모든 응답 형식:

```json
{
  "success": true,
  "message": "메시지",
  "data": {}
}
```

오류 형식:

```json
{
  "success": false,
  "message": "오류 메시지",
  "errors": ["상세 오류"]
}
```

## 데모 관리자 계정

- 아이디: `admin`
- 비밀번호: `admin1234`

## 검증 명령

문법 체크:

```bash
npm run check
```
