# GitHub Repository Explorer

GitHub 조직 및 리포지토리의 개발 현황을 트리 형태로 한눈에 파악할 수 있는 모니터링 웹 애플리케이션입니다.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.14-blue.svg)
![React](https://img.shields.io/badge/react-19.1-blue.svg)

## 주요 기능

- **이중 뷰 인터페이스**: 왼쪽 트리뷰와 오른쪽 리스트뷰를 동시에 제공하여 데이터를 다양한 방식으로 탐색
- **고급 검색 및 필터링**:
  - 텍스트 검색으로 이름, 상태, 메타데이터 기반 검색
  - 타입별 멀티셀렉트 필터 (Workflows, Runners, Branches, PRs, Issues 등)
  - 트리뷰와 리스트뷰가 실시간으로 동기화되어 필터링 결과 반영
- **리스트 뷰**: 모든 항목을 테이블 형태로 표시하며 Excel 스타일 컬럼 필터, 정렬, 페이지네이션, 검색 기능 제공
- **계층적 트리 뷰**: 조직, 리포지토리, 워크플로우, PR, 이슈 등을 트리 형태로 직관적으로 표시
- **Lazy Loading**: 리포지토리를 클릭할 때만 상세 정보를 로드하여 초기 로딩 속도 대폭 향상
- **스마트 캐싱**: 한 번 로드한 데이터는 자동으로 캐싱되어 재방문 시 즉시 표시
- **실시간 모니터링**: GitHub Actions 워크플로우 실행 상태 및 러너 상태 확인
- **API 사용량 추적**: GitHub API 토큰 사용량 및 제한 정보를 실시간으로 표시
- **UI 기반 설정**: 브라우저에서 직접 GitHub 토큰 및 조직/리포지토리 설정 가능
- **GitHub Enterprise 지원**: GitHub.com과 GitHub Enterprise 모두 지원
- **로컬 스토리지 저장**: 설정이 브라우저에 안전하게 저장되어 재방문 시 자동 로드
- **모던 UI/UX**: Material-UI 기반의 다크 테마 인터페이스
- **자동 새로고침**: API 사용량 자동 업데이트 (30초마다)

## 트리 구조

```
Organization/User
├── Repository
│   ├── Workflows (워크플로우 목록)
│   │   └── Workflow (개별 워크플로우)
│   ├── Recent Runs (최근 워크플로우 실행)
│   │   └── Workflow Run (실행 결과 및 상태)
│   ├── Runners (자체 호스팅 러너)
│   │   └── Runner (러너 상태)
│   ├── Branches (브랜치 목록)
│   │   └── Branch (개별 브랜치)
│   ├── Pull Requests (PR 목록)
│   │   └── Pull Request (PR 상태 및 정보)
│   └── Issues (이슈 목록)
│       └── Issue (이슈 상태 및 정보)
```

## 기술 스택

### Frontend
- **Framework**: Vite + React 19.1 + TypeScript
- **UI Library**: Material-UI (MUI) v6
- **Icons**: Material Icons
- **HTTP Client**: Axios
- **Styling**: Emotion (CSS-in-JS)

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.14
- **HTTP Client**: httpx
- **Configuration**: pydantic-settings

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Development Server**: Uvicorn (Backend), Vite (Frontend)

## 시작하기

### 사전 요구사항

- Docker & Docker Compose (또는 Python 3.14+ & Node.js 20+)
- GitHub Personal Access Token (필수 권한: `repo`, `workflow`, `read:org`)

### 빠른 시작 (UI 설정 사용)

가장 쉬운 방법은 UI를 통해 설정하는 것입니다:

```bash
# 1. 저장소 클론
git clone <repository-url>
cd github-actions-runner-monitor

# 2. Docker Compose로 실행 (토큰 설정 없이 실행 가능)
docker-compose up -d

# 3. 브라우저에서 http://localhost:5173 접속

# 4. 설정 버튼(⚙️)을 클릭하여:
#    - GitHub API Base URL 설정 (GitHub.com 또는 Enterprise)
#    - GitHub Personal Access Token 입력
#    - 모니터링할 조직/사용자 추가 (선택사항)
#    - 저장 클릭
```

설정은 브라우저의 로컬 스토리지에 안전하게 저장되며, 토큰은 GitHub API로만 전송됩니다.

### GitHub Enterprise 사용

GitHub Enterprise Server를 사용하는 경우:

1. 설정 다이얼로그에서 **GitHub API Base URL**을 Enterprise 서버 URL로 변경:
   - 형식: `https://github.company.com/api/v3`
   - 예시: `https://github.example.com/api/v3`

2. Enterprise에서 발급받은 Personal Access Token 입력

3. 나머지 설정은 GitHub.com과 동일

### 설치 및 실행

#### 1. Docker Compose 사용 (권장)

**환경 변수 없이 실행 (UI에서 설정):**
```bash
# Docker Compose로 실행
docker-compose up -d

# 브라우저에서 http://localhost:5173 접속 후 설정
```

**또는 환경 변수로 설정:**
```bash
# 환경 변수 파일 생성
cp backend/.env.example backend/.env
# backend/.env 파일을 편집하여 GitHub 토큰 설정

# Docker Compose로 실행
docker-compose up -d

# 브라우저에서 접속
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API 문서: http://localhost:8000/docs
```

#### 2. 로컬 개발 환경

**Backend 실행:**

```bash
cd backend

# 가상 환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 GitHub 토큰 설정

# 서버 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend 실행:**

```bash
cd frontend

# 의존성 설치
npm install

# 환경 변수 설정 (선택사항)
cp .env.example .env

# 개발 서버 실행
npm run dev
```

### 환경 변수 설정

**Backend (`backend/.env`):**

```env
GITHUB_TOKEN=your_github_personal_access_token_here
GITHUB_ORG=your_organization_name  # 선택사항: 특정 조직만 표시
```

**Frontend (`frontend/.env`):**

```env
VITE_API_BASE_URL=http://localhost:8000
```

## GitHub Personal Access Token 생성

1. GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token" 클릭
3. 필요한 권한 선택:
   - `repo` (전체 리포지토리 접근)
   - `workflow` (GitHub Actions 워크플로우 접근)
   - `read:org` (조직 정보 읽기)
4. 생성된 토큰을 복사하여 `.env` 파일에 설정

## 성능 최적화

이 애플리케이션은 다음과 같은 성능 최적화 기법을 사용합니다:

### Lazy Loading with Smart Auto-Expansion (지연 로딩 + 스마트 자동 확장)
- **초기 로딩**: 조직과 리포지토리 목록만 가져옵니다 (빠른 첫 화면 ⚡)
- **수동 확장**: 사용자가 리포지토리를 클릭하면 해당 리포지토리의 상세 정보만 로드
- **필터 사용 시**: 필터를 적용하면 모든 리포지토리의 상세 정보를 자동으로 로드하여 필터링
  - 예: "Runner" 타입 선택 → 모든 리포지토리의 Runner 정보 자동 로드 → 필터링 결과 표시
- **캐시 활용**: 한 번 로드한 정보는 캐시되어 재사용
- 이를 통해 초기 API 호출 수를 **90% 이상 감소**시키면서도 필터링 시에는 전체 데이터를 검색 가능

### 스마트 캐싱
- 한 번 로드한 리포지토리 상세 정보는 메모리에 캐싱됩니다
- 같은 리포지토리를 다시 확장할 때는 즉시 표시됩니다 (API 호출 없음)
- 설정 변경 시에만 캐시가 자동으로 초기화됩니다

### 로딩 인디케이터
- 각 노드별로 독립적인 로딩 상태를 표시합니다
- 사용자가 어떤 데이터가 로딩 중인지 명확하게 알 수 있습니다

### 사용 예시
**일반 탐색 (필터 없음):**
1. 초기 로딩: 조직 목록과 리포지토리 목록만 표시 (빠름 ⚡)
2. 관심 있는 리포지토리 클릭: 해당 리포지토리의 workflows, runs, branches 등을 로드
3. 다른 리포지토리 탐색: 필요한 정보만 선택적으로 로드
4. 이전에 본 리포지토리 재방문: 캐시된 데이터로 즉시 표시

**필터 사용 (자동 확장):**
1. "Runner" 타입 필터 선택
2. 모든 리포지토리의 Runner 정보 자동 로드 (캐시 활용으로 빠름)
3. Runner가 있는 리포지토리만 트리뷰와 리스트뷰에 표시
4. 필터 제거 시 원래의 경량 뷰로 복귀

## API 엔드포인트

### `GET /api/tree`
경량화된 리포지토리 트리 구조를 반환합니다 (조직 및 리포지토리 목록만 포함).

**Headers:**
- `X-GitHub-Token` (optional): GitHub Personal Access Token
- `X-GitHub-API-URL` (optional): GitHub API Base URL (기본값: `https://api.github.com`)

**Query Parameters:**
- `orgs` (optional): 콤마로 구분된 조직/사용자 목록 (예: `org1,org2,user1`)

**Response:**
```json
[
  {
    "id": "org-myorg",
    "name": "myorg",
    "type": "organization",
    "children": [...],
    "metadata": {"repo_count": 10},
    "hasChildren": true,
    "isLoaded": true
  }
]
```

### `GET /api/repo-details/{owner}/{repo}`
특정 리포지토리의 상세 정보를 반환합니다 (lazy loading용).

**Headers:**
- `X-GitHub-Token` (optional): GitHub Personal Access Token
- `X-GitHub-API-URL` (optional): GitHub API Base URL (기본값: `https://api.github.com`)

**Path Parameters:**
- `owner`: 리포지토리 소유자 (조직 또는 사용자)
- `repo`: 리포지토리 이름

**Response:**
```json
[
  {
    "id": "workflows-owner-repo",
    "name": "Workflows (5)",
    "type": "workflows",
    "children": [...],
    "hasChildren": true,
    "isLoaded": true
  },
  {
    "id": "runs-owner-repo",
    "name": "Recent Runs (10)",
    "type": "workflow_runs",
    "children": [...],
    "hasChildren": true,
    "isLoaded": true
  }
]
```

### `GET /api/rate-limit`
GitHub API 사용량 정보를 반환합니다.

**Headers:**
- `X-GitHub-Token` (optional): GitHub Personal Access Token
- `X-GitHub-API-URL` (optional): GitHub API Base URL (기본값: `https://api.github.com`)

**Response:**
```json
{
  "limit": 5000,
  "remaining": 4950,
  "reset": 1234567890,
  "used": 50
}
```

> **Note**: 헤더로 토큰을 전달하지 않으면 환경 변수의 토큰을 사용합니다. UI에서 설정한 토큰은 자동으로 헤더에 포함됩니다.

## 프로젝트 구조

```
github-actions-runner-monitor/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 애플리케이션
│   │   ├── config.py            # 설정 관리
│   │   ├── github_client.py     # GitHub API 클라이언트
│   │   └── models.py            # Pydantic 모델
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TreeView.tsx          # 트리 뷰 컴포넌트
│   │   │   ├── RateLimitDisplay.tsx  # API 사용량 표시
│   │   │   └── SettingsDialog.tsx    # 설정 다이얼로그
│   │   ├── utils/
│   │   │   └── storage.ts            # 로컬 스토리지 관리
│   │   ├── types.ts                  # TypeScript 타입 정의
│   │   ├── api.ts                    # API 클라이언트
│   │   └── App.tsx                   # 메인 앱 컴포넌트
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
├── .gitignore
└── README.md
```

## 주요 컴포넌트 설명

### Backend

- **github_client.py**: GitHub REST API와 통신하는 비동기 클라이언트
- **main.py**: FastAPI 라우트 및 비즈니스 로직
- **models.py**: 데이터 모델 정의 (TreeNode, RateLimitInfo)

### Frontend

- **SearchFilter.tsx**: 검색 및 필터링 컴포넌트
  - 텍스트 기반 전체 검색
  - 타입별 멀티셀렉트 필터 (Workflows, Runners, Branches, PRs, Issues)
  - 필터 초기화 기능
  - 실시간 필터링 결과 반영

- **TreeView.tsx**: 재귀적 트리 구조를 렌더링하는 컴포넌트
  - 노드 타입별 아이콘 표시
  - 상태별 색상 구분 (success, failure, pending 등)
  - 확장/축소 기능
  - Lazy loading 지원
  - GitHub 링크 연결

- **ListView.tsx**: 테이블 형태의 리스트 뷰 컴포넌트
  - 계층 구조를 평면화하여 테이블로 표시
  - **Excel 스타일 컬럼 필터**:
    - FilterList 아이콘으로 각 컬럼에 독립적인 필터 제공
    - Popover로 드롭다운 필터 UI 표시
    - 고유 값 자동 추출 및 체크박스 스타일 선택
    - 멀티 선택 지원 (여러 값 동시 필터링)
    - 활성 필터는 파란색으로 표시
  - **컬럼별 정렬**: Path, Name, Type, Status 컬럼을 클릭하여 정렬 (오름차순/내림차순)
  - TableSortLabel로 정렬 방향 표시 (화살표 아이콘)
  - Path 정보로 전체 계층 경로 표시
  - 페이지네이션 (10, 25, 50, 100 rows per page)
  - 리스트 내 추가 검색 기능
  - 상태, 타입, 메타데이터를 Chip으로 시각화

- **RateLimitDisplay.tsx**: API 사용량을 시각화하는 컴포넌트
  - 프로그레스 바
  - 남은 API 호출 횟수
  - 리셋 시간 표시

- **SettingsDialog.tsx**: 설정 관리 다이얼로그
  - GitHub 토큰 입력 및 저장
  - 조직/사용자 추가/삭제
  - GitHub Enterprise API URL 설정
  - 로컬 스토리지 연동

### Utilities

- **filterTree.ts**: 트리 필터링 유틸리티
  - 재귀적으로 트리 노드 필터링
  - 검색 텍스트 및 타입 기반 필터링
  - 자식 노드 매칭 시 부모 노드도 포함
  - 트리 노드 카운팅 기능

## 개발 가이드

### 코드 스타일

**Python:**
- PEP 8 준수
- Type hints 사용

**TypeScript:**
- ESLint 설정 준수
- Functional components + Hooks 사용

### 빌드

```bash
# Frontend 빌드
cd frontend
npm run build

# 빌드된 파일은 frontend/dist/ 에 생성됩니다
```

## 트러블슈팅

### API 토큰 오류
- UI의 설정 다이얼로그(⚙️)에서 올바른 GitHub 토큰이 입력되었는지 확인
- 토큰에 필요한 권한이 부여되었는지 확인 (`repo`, `workflow`, `read:org`)
- 환경 변수를 사용하는 경우 `.env` 파일 확인

### 토큰이 저장되지 않는 경우
- 브라우저의 로컬 스토리지가 활성화되어 있는지 확인
- 시크릿 모드에서는 로컬 스토리지가 제한될 수 있음
- 브라우저 개발자 도구 → Application → Local Storage 확인

### CORS 오류
- Backend의 CORS 설정이 Frontend URL을 포함하는지 확인
- `backend/app/main.py`의 `allow_origins` 확인

### API Rate Limit 초과
- GitHub API는 시간당 5,000회 호출 제한이 있습니다
- Rate limit 정보를 확인하고 필요시 대기

## 라이선스

MIT License

## 기여

이슈 및 풀 리퀘스트를 환영합니다!

## 스크린샷

(실행 후 스크린샷을 추가하세요)

## 사용 방법

### 검색 및 필터링

1. **텍스트 검색**: 상단 검색 필드에 텍스트를 입력하면 이름, 상태, 메타데이터를 기반으로 실시간 검색
2. **타입 필터**: "Filter by Type" 드롭다운에서 원하는 타입을 선택 (Workflows, Runners, Branches, PRs, Issues 등)
3. **멀티 선택**: 여러 타입을 동시에 선택하여 복합 필터링 가능
4. **필터 초기화**: ❌ 버튼을 클릭하여 모든 필터를 한 번에 초기화

**⚡ 자동 확장 (Smart Auto-Expansion)**:
- 필터를 적용하면 모든 리포지토리의 상세 정보가 자동으로 로드됩니다
- 예: "Runner" 타입을 선택하면 모든 리포지토리의 Runner 정보를 자동으로 가져와서 필터링합니다
- 이미 로드된 정보는 캐시를 사용하므로 빠르게 처리됩니다
- 필터를 제거하면 원래의 경량화된 뷰로 돌아갑니다

### 트리 뷰

- 조직/리포지토리를 클릭하여 확장/축소
- 리포지토리를 클릭하면 상세 정보(workflows, runs, runners 등)를 lazy loading
- GitHub 링크가 있는 항목은 클릭하여 바로 이동

### 리스트 뷰

- 모든 항목을 평면화된 테이블 형태로 표시
- **Excel 스타일 컬럼 필터** (새 기능! 🎉):
  - 각 헤더 옆의 필터 아이콘(🔽) 클릭
  - Path, Name, Type, Status 컬럼별로 독립적인 필터링
  - 드롭다운에서 원하는 값만 선택 (멀티 선택 가능)
  - 예: Status 컬럼 필터로 "closed"만 선택 → closed 상태만 표시
  - 활성화된 필터는 파란색 아이콘으로 표시
  - "Clear" 버튼으로 개별 컬럼 필터 제거
- **컬럼 정렬**: Path, Name, Type, Status 헤더를 클릭하여 오름차순/내림차순 정렬
- Path 컬럼에서 전체 계층 구조 확인
- 페이지네이션으로 많은 데이터를 효율적으로 탐색 (10/25/50/100 rows per page)
- 리스트 내 검색 필드로 추가 필터링 가능
- 필터링 결과는 트리뷰와 자동으로 동기화
- 정렬 방향은 화살표 아이콘으로 표시

## 개선 예정 사항

- [x] UI 기반 설정 (GitHub 토큰 및 조직 관리)
- [x] 로컬 스토리지 지원
- [x] GitHub Enterprise 지원
- [x] Lazy Loading 및 성능 최적화
- [x] 스마트 캐싱
- [x] 고급 필터링 및 검색 기능
- [x] 이중 뷰 (트리뷰 + 리스트뷰)
- [x] 컬럼별 정렬 (Path, Name, Type, Status)
- [x] Excel 스타일 컬럼 필터 (개별 컬럼별 값 선택)
- [ ] 즐겨찾기 리포지토리
- [ ] 알림 기능 (워크플로우 실패 시)
- [ ] 다국어 지원
- [ ] 라이트 테마 지원
- [ ] 리포지토리별 상세 통계
- [ ] Export 기능 (JSON, CSV)
- [ ] 컬럼 커스터마이징 (show/hide columns)
