# 화장품 용기 제작관리 시스템 (MVP)

Next.js 14 · Tailwind CSS · shadcn/ui · PostgreSQL · Prisma 기반의 제작/출고 관리 MVP.

## 핵심 기능
로그인 · 대시보드 · 프로젝트 목록/등록/상세(타임라인)/수정 · 업체 관리 · 공장 관리 · 메모 · 파일 업로드 · 상태 자동 계산 · 엑셀 다운로드

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
#   - DATABASE_URL: PostgreSQL 연결 문자열
#   - NEXTAUTH_SECRET: openssl rand -base64 32 결과값

# 3. DB 스키마 적용
npm run db:push

# 4. 시드 (테스트 계정 + 엑셀 추출 데이터)
npm run db:seed

# 5. 개발 서버
npm run dev   # http://localhost:3000
```

## 테스트 계정
| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 관리자 | admin@example.com | admin1234 |
| 직원 | staff@example.com | staff1234 |

## 상태 자동 계산 규칙 (src/lib/status.ts)
명세 순서대로 평가됩니다.
1. 고객인도일 있으면 → **완료**
2. 한국도착일 있고 고객인도일 없으면 → **인도대기**
3. 생산완료일 있고 출고일 없으면 → **출고대기**
4. 완성예정일 지났고 생산완료일 없으면 → **지연**
5. 사용자가 제작보류 설정 → **제작보류**
6. 그 외 → **진행중**

상태는 프로젝트 등록/수정/단계변경 시 자동 재계산되며, 대시보드·목록 진입 시 일괄 갱신(`recomputeAll`)됩니다.

## DB 테이블
`users` · `clients` · `factories` · `projects` · `project_steps` · `project_files` · `project_memos` · `project_logs`

## 폴더 구조
```
prisma/                  schema.prisma, seed.ts, seed-data.json
src/
  lib/                   prisma, auth, status(상태계산), excel, steps, recompute, utils
  components/            sidebar, project-form, timeline, memo-panel, file-panel,
                         entity-manager, status-badge, ui/*(shadcn)
  app/
    login/               로그인
    (dashboard)/
      dashboard/         대시보드
      projects/          목록 · new(등록) · [id](상세) · [id]/edit(수정)
      clients/           업체 관리
      factories/         공장 관리
    api/
      auth/[...nextauth]/  NextAuth
      projects/            프로젝트 CRUD + steps/memos/files
      clients/ factories/  마스터 CRUD
      upload/              제품사진 업로드
      export/              엑셀 다운로드
```

## 배포 (GitHub → Railway)

### 1. GitHub 푸시
```bash
git init
git add .
git commit -m "init: 화장품 용기 제작관리 MVP"
gh repo create octo-tim/yongki --private --source=. --remote=origin --push
# gh CLI가 없으면:
#   git remote add origin https://github.com/octo-tim/yongki.git
#   git branch -M main && git push -u origin main
```

### 2. Railway 프로젝트 구성
1. Railway → **New Project → Deploy from GitHub repo** → `octo-tim/yongki` 선택
2. **+ New → Database → PostgreSQL** 추가 (자동으로 `DATABASE_URL` 주입됨)
3. 웹 서비스 **Variables** 탭에 추가:
   - `NEXTAUTH_SECRET` = `openssl rand -base64 32` 결과값
   - `NEXTAUTH_URL` = 배포 도메인 (예: `https://yongki-production.up.railway.app`)
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (Reference 변수로 연결)

`railway.json`이 포함되어 있어 배포 시 **pre-deploy 단계에서 `prisma db push`가 자동 실행**되어 스키마가 반영됩니다. 별도 마이그레이션 설정 없이 첫 배포부터 테이블이 생성됩니다.

### 3. 시드 (최초 1회)
배포 완료 후 테스트 계정·초기 데이터를 넣으려면 Railway CLI로 일회성 실행:
```bash
railway run npm run db:seed
```
(또는 Railway 대시보드의 일회성 명령 실행 기능 사용)

### 4. 파일 업로드 영속화 (Volume)
업로드 파일은 `/app/public/uploads`에 기록됩니다. Railway 컨테이너 파일시스템은 재배포 시 초기화되므로, 파일을 유지하려면:
- 서비스 → **Settings → Volumes → Mount path** = `/app/public/uploads`

운영 환경에서는 S3 등 오브젝트 스토리지로 전환하는 것을 권장합니다.

## 비고
- 엑셀 원본의 시트(진행중/제작보류/출고대기/완료)는 상태값으로 매핑되어 시드됩니다.
- `next@14.2.5`에 보안 권고가 있어, 배포 전 `npm i next@latest` 업그레이드를 권장합니다.
