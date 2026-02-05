# 구조 요청 게시판 (Rescue Request Board)

구조 요청 신청서를 비밀글로 작성하고 관리할 수 있는 게시판 시스템입니다.

## 기능

1. **비밀글 시스템**: 모든 게시글은 비밀번호로 보호됩니다
2. **관리자 모드**: 관리자 비밀번호로 모든 게시글 열람 가능
3. **파일 첨부**: 이미지, PDF, Word 문서 첨부 및 다운로드 가능
4. **반응형 디자인**: PC와 모바일 모두 지원
5. **양식 자동화**: 구조 요청 양식이 자동으로 입력됩니다

## Netlify 배포 방법

### 방법 1: Netlify Drop (가장 간단)

1. [Netlify Drop](https://app.netlify.com/drop) 페이지 접속
2. 이 폴더 전체를 드래그 앤 드롭
3. 자동으로 배포 완료!

### 방법 2: GitHub 연동

1. 이 프로젝트를 GitHub 저장소에 업로드
2. [Netlify](https://app.netlify.com) 로그인
3. "New site from Git" 클릭
4. GitHub 저장소 선택
5. 배포 설정:
   - Build command: (비워두기)
   - Publish directory: `.`
6. "Deploy site" 클릭

## 🔒 보안 시스템

이 프로젝트는 **bcrypt 해시화**를 사용하여 모든 비밀번호를 안전하게 보호합니다.
- F12 개발자 도구로도 비밀번호를 절대 볼 수 없습니다
- 모든 비밀번호 검증은 서버사이드에서만 실행됩니다

### 관리자 비밀번호 변경

Supabase SQL Editor에서 다음 명령을 실행하세요:

```sql
-- 관리자 비밀번호 변경
SELECT change_admin_password('현재비밀번호', '새비밀번호');
```

자세한 내용은 `SECURITY_UPGRADE_GUIDE.md`를 참고하세요.

## 파일 구조

```
rescue-board/
├── index.html      # 메인 HTML 파일
├── styles.css      # 스타일시트
├── app.js          # JavaScript 애플리케이션
├── netlify.toml    # Netlify 설정
└── README.md       # 이 파일
```

## 데이터 저장

현재 버전은 브라우저의 localStorage를 사용합니다.
- 장점: 서버 없이 동작, 간단한 배포
- 단점: 데이터가 브라우저별로 저장됨, 다른 사용자와 공유 안됨

### 서버 기반 저장소 사용 (선택사항)

실제 운영 환경에서는 다음 옵션을 고려하세요:
- Netlify Functions + Netlify Blobs
- Supabase
- Firebase

## 보안 참고사항

1. 관리자 비밀번호는 클라이언트 코드에 포함되어 있으므로, 보안이 중요한 경우 서버 측 인증을 구현하세요
2. 민감한 정보는 HTTPS로만 전송하세요 (Netlify는 기본으로 HTTPS 제공)
3. 실제 운영 시 데이터베이스 기반 저장소 사용을 권장합니다

## 문의

프로젝트 관련 문의사항이 있으시면 연락주세요.
