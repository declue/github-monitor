# Onefile 모드 구현 가이드

## 왜 onefile 모드가 어려운가?

### 기술적 배경

**Pyloid의 구조:**
- Pyloid는 Qt WebEngine (Chromium 기반)을 사용하는 데스크톱 앱 프레임워크입니다
- Qt와 Chromium은 복잡한 DLL 의존성 구조를 가지고 있습니다

**PyInstaller Onefile 모드의 동작 방식:**
1. 모든 파일을 단일 실행 파일에 압축
2. 실행 시 임시 폴더 `_MEIxxxxxx`에 압축 해제
3. 압축 해제된 파일에서 Python 및 라이브러리 로드
4. 프로그램 종료 시 임시 폴더 삭제

**문제가 발생하는 이유:**

1. **DLL 경로 문제**
   - Qt/Chromium은 특정 경로 구조에서 DLL을 로드합니다
   - 임시 폴더의 경로가 예상과 다를 수 있습니다
   - 시스템 PATH의 다른 버전 DLL과 충돌 가능

2. **Python DLL 로딩 순서**
   - `python311.dll`이 시스템 PATH에서 먼저 로드될 수 있음
   - 번들된 DLL과 버전이 맞지 않으면 메모리 접근 오류 발생

3. **Qt 플러그인 경로**
   - Qt는 플랫폼 플러그인(platform plugins)을 특정 경로에서 찾습니다
   - Onefile 모드에서는 이 경로가 동적으로 변경됩니다

## 해결 방법

### 1. Runtime Hook 사용 (현재 구현)

`runtime_hook_pyloid.py` 파일을 통해 DLL 로딩 전에 경로를 수정합니다:

```python
import os
import sys

if hasattr(sys, '_MEIPASS'):
    bundle_dir = sys._MEIPASS

    # PATH 환경변수에 번들 디렉토리를 최우선으로 추가
    os.environ['PATH'] = bundle_dir + os.pathsep + os.environ.get('PATH', '')

    # Windows에서 DLL 검색 경로 추가 (Python 3.8+)
    if sys.platform == 'win32':
        os.add_dll_directory(bundle_dir)

        # Qt 플러그인 경로 설정
        os.environ['QT_PLUGIN_PATH'] = os.path.join(bundle_dir, 'PyQt5', 'Qt5', 'plugins')
```

### 2. Build.spec 설정

```python
# Runtime hook 등록
runtime_hooks=['runtime_hook_pyloid.py']

# Onefile 모드로 EXE 생성
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,  # 모든 바이너리 포함
    a.zipfiles,  # 모든 zip 파일 포함
    a.datas,     # 모든 데이터 파일 포함
    [],
    name='jhl-github-desktop',
    ...
)
```

## 테스트 및 검증

### Onefile 모드 빌드 테스트

```bash
# 빌드 실행
python build.py

# Windows에서 생성된 파일 확인
ls dist/jhl-github-desktop.exe

# 실행 테스트
./dist/jhl-github-desktop.exe
```

### 발생 가능한 문제와 해결

#### 문제 1: "Failed to load Python DLL"
**원인:** Python DLL 경로 충돌
**해결:** Runtime hook이 제대로 적용되었는지 확인

#### 문제 2: "Could not find Qt platform plugin"
**원인:** Qt 플러그인 경로 문제
**해결:** `QT_PLUGIN_PATH` 환경변수 설정 확인

#### 문제 3: 실행 파일 크기가 너무 큼
**원인:** 불필요한 라이브러리 포함
**해결:** `excludes` 리스트에 미사용 패키지 추가

## Onefile vs Onedir 비교

### Onefile 모드
**장점:**
- ✅ 단일 실행 파일로 배포 간편
- ✅ 사용자가 파일 구조를 신경 쓰지 않아도 됨

**단점:**
- ⚠️ 실행 시마다 압축 해제 시간 필요 (2-5초)
- ⚠️ DLL 로딩 문제 발생 가능성
- ⚠️ 일부 안티바이러스가 의심스러운 동작으로 감지 가능
- ⚠️ 디버깅이 어려움

### Onedir 모드
**장점:**
- ✅ 빠른 실행 속도 (압축 해제 불필요)
- ✅ DLL 로딩이 안정적
- ✅ 디버깅이 쉬움
- ✅ 안티바이러스 오탐 가능성 낮음

**단점:**
- ⚠️ 여러 파일/폴더 구조로 배포
- ⚠️ 사용자가 전체 폴더를 유지해야 함

## 권장 사항

### 일반 사용자 배포
**Onefile 모드 권장** (편의성 우선)
- 단, Runtime hook이 제대로 작동하는지 충분히 테스트 필요
- 각 플랫폼에서 실행 테스트 필수

### 기업/내부 배포
**Onedir 모드 권장** (안정성 우선)
- 설치 프로그램(installer)과 함께 배포
- NSIS, Inno Setup 등으로 설치 관리자 제작

## 현재 상태

현재 `build.spec`은 **onefile 모드로 설정**되어 있으며, runtime hook을 통해 DLL 로딩 문제를 해결하려고 시도합니다.

만약 onefile 모드에서 문제가 계속 발생한다면:

1. `build.spec`에서 onedir 모드로 되돌리기:
```python
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,  # onedir 모드
    ...
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    ...
)
```

2. 또는 설치 프로그램 제작 고려 (NSIS, Inno Setup 등)

## 디버깅 팁

### Onefile 실행 시 로그 확인

```python
# pyloid_main.py에 디버깅 코드 추가
import sys
print(f"Executable: {sys.executable}")
print(f"Frozen: {getattr(sys, 'frozen', False)}")
if hasattr(sys, '_MEIPASS'):
    print(f"Temp dir: {sys._MEIPASS}")
    print(f"PATH: {os.environ['PATH'][:500]}")
```

### 콘솔 모드로 빌드하여 에러 확인

```python
# build.spec에서 임시로 console=True로 설정
exe = EXE(
    ...
    console=True,  # 디버깅용
    ...
)
```

---

**작성자:** JHL (declue)
**최종 수정:** 2025-10-10
