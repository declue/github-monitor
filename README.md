# JHL GitHub Desktop

## 소개
GitHub Desktop처럼 Commit History 관리 뿐만 아니라 Org/Repo에 대한 관리 및 Runner, Issues, PR 등 GitHub 리소스를 손쉽게 파악하고 Inbox 알림을 좀 더 효율적으로 가시화 해주는 솔루션입니다.
또한 Git Commit을 AI Agent를 활용하여 효율적으로 수행할 수 있으며 GitHub Actions에 대한 상황을 한눈에 파악하고 실패 원인 분석을 도와줍니다.


## 주요 특징
- GitHub Repository Explolrer 제공
- Repo 단위의 Git Commit History 뷰어 제공
- GitHub Inbox 알림에 대한 조회 기능 및 토스트 알림 제공 (트레이로 프로그램을 닫아도 상주)
- Stage된 변경 이력에 대한 AI Commit 기능 지원 
- GitHub Actions 현황을 파악할 수 있는 뷰어 제공
- GitHub Actions의 실패 원인을 진단하는 AI Agent 기능 지원
- GitHub Activity에 대한 활동 통계 및 Metrics, Graph를 볼 수 있는 Analytics 모드 제공


## 개발 환경 및 언어, 프레임워크 정보
- node 20 
- python 3.14
- typescript + vite + react
- fastapi + uvicorn
- pyloid

## 개발 환경 구성
```bash
uv venv
uv sync
pnpm install
```

## 개발 모드로 실행하기
```bash
pnpm dev
```

## 빌드하기
```bash
pnpm build
```
