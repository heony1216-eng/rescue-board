# 🔒 보안 최강화 업그레이드 가이드

## 📋 개요

이 가이드는 구조 요청 게시판의 보안을 **최강 수준**으로 업그레이드하는 방법을 설명합니다.

### 🛡️ 보안 강화 내용

1. **비밀번호 해시화**: bcrypt를 사용하여 모든 비밀번호를 해시화
2. **클라이언트 노출 차단**: F12를 눌러도 비밀번호의 앞글자조차 볼 수 없음
3. **서버사이드 검증**: 모든 비밀번호 검증은 Supabase 서버에서만 수행
4. **RLS (Row Level Security)**: 데이터베이스 레벨에서 보안 정책 적용

---

## 🚀 업그레이드 단계

### 1단계: Supabase SQL Editor에서 마이그레이션 실행

1. **Supabase Dashboard 접속**
   ```
   https://supabase.com/dashboard/project/duezqoujpeoooyzucgvy
   ```

2. **SQL Editor 열기**
   - 좌측 메뉴에서 "SQL Editor" 클릭

3. **마이그레이션 스크립트 복사 & 실행**
   - `supabase_security_migration.sql` 파일의 전체 내용을 복사
   - SQL Editor에 붙여넣기
   - **Run** 버튼 클릭하여 실행

4. **실행 결과 확인**
   ```sql
   -- 관리자 테이블 확인 (해시만 보여야 함)
   SELECT * FROM admin;

   -- 게시글 테이블 확인 (password_hash 컬럼 존재 확인)
   SELECT id, country, doc_number FROM posts LIMIT 5;
   ```

### 2단계: 기존 평문 비밀번호 처리

마이그레이션 스크립트가 자동으로 처리하지만, 수동 확인이 필요한 경우:

```sql
-- 기존 posts 테이블에 password 컬럼이 남아있는지 확인
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'posts';

-- password 컬럼이 있다면 제거 (마이그레이션이 자동 처리함)
-- ALTER TABLE posts DROP COLUMN IF EXISTS password;
```

### 3단계: 애플리케이션 코드 업데이트

이미 `app.js` 파일이 업데이트 되었습니다. 변경 사항:

- ✅ `loadPosts()`: `posts_public` VIEW 사용 (password_hash 완전 차단)
- ✅ `handleSubmit()`: `create_post` RPC 함수 사용 (자동 해시화)
- ✅ `showEditForm()`: 비밀번호 필드 자동 비우기

### 4단계: 배포

수정된 `app.js` 파일을 배포합니다:

```bash
# Git을 사용하는 경우
git add app.js
git commit -m "🔒 보안 최강화: 비밀번호 bcrypt 해시화 적용"
git push

# 또는 Netlify에 직접 업로드
```

---

## 🔑 관리자 비밀번호 관리

### 초기 비밀번호

마이그레이션 후 관리자 비밀번호는 **`rnwh365kr`**로 설정됩니다.

### 비밀번호 변경 방법

**방법 1: SQL 함수 사용 (권장)**
```sql
-- 기존 비밀번호와 새 비밀번호를 입력
SELECT change_admin_password('rnwh365kr', '새로운비밀번호');
```

**방법 2: 직접 해시 생성**
```sql
-- 새 비밀번호를 직접 해시화하여 업데이트
UPDATE admin
SET password_hash = crypt('새로운비밀번호', gen_salt('bf')),
    updated_at = NOW()
WHERE id = 1;
```

---

## 🧪 보안 테스트

### 1. F12 개발자 도구 테스트

1. 웹사이트 열기
2. F12 누르기
3. Network 탭에서 API 요청 확인
4. **확인사항**: `password`, `password_hash` 등의 필드가 절대 보이지 않아야 함

### 2. 게시글 작성 테스트

1. 새 게시글 작성
2. 비밀번호 입력
3. **확인사항**: 게시글이 정상적으로 생성되어야 함

### 3. 비밀번호 검증 테스트

1. 게시글 열기 시도
2. 올바른 비밀번호 입력 → 성공
3. 잘못된 비밀번호 입력 → 실패
4. **확인사항**: 검증이 정상적으로 작동해야 함

### 4. 관리자 로그인 테스트

1. "관리자 로그인" 버튼 클릭
2. `rnwh365kr` (또는 변경한 비밀번호) 입력
3. **확인사항**: 관리자로 로그인되어야 함

---

## 🔍 보안 기능 상세 설명

### 1. bcrypt 해시화

```javascript
// ❌ 이전 (평문 저장 - 위험!)
password: 'mypassword123'

// ✅ 현재 (bcrypt 해시)
password_hash: '$2a$12$KIXqJ3k4Vq5ZxQJY5WJGXeY...'
```

### 2. 클라이언트 노출 차단

```sql
-- posts_public VIEW는 password_hash를 제외한 모든 컬럼만 반환
CREATE VIEW posts_public AS
SELECT id, country, doc_number, data, attachments, created_at
FROM posts;
```

### 3. 서버사이드 검증

```sql
-- 비밀번호 검증은 Supabase 서버에서만 실행
CREATE FUNCTION verify_admin_password(input_password TEXT)
RETURNS BOOLEAN AS $$
  -- bcrypt로 해시 비교
  RETURN (crypt(input_password, stored_hash) = stored_hash);
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🚨 문제 해결

### 문제 1: 로그인이 안 됨

**원인**: 기존 평문 비밀번호가 해시로 변환되지 않음

**해결**:
```sql
-- 관리자 비밀번호 재설정
UPDATE admin
SET password_hash = crypt('rnwh365kr', gen_salt('bf'))
WHERE id = 1;
```

### 문제 2: 게시글을 볼 수 없음

**원인**: `posts_public` VIEW가 생성되지 않음

**해결**:
```sql
-- VIEW 재생성
CREATE OR REPLACE VIEW posts_public AS
SELECT id, country, doc_number, data, attachments, created_at
FROM posts;
```

### 문제 3: 기존 게시글 비밀번호가 작동하지 않음

**원인**: 기존 평문 비밀번호가 해시로 변환되지 않음

**해결**: 마이그레이션 스크립트의 5번 섹션을 다시 실행
```sql
-- 평문 비밀번호를 해시로 변환
UPDATE posts
SET password_hash = crypt(password, gen_salt('bf'))
WHERE password IS NOT NULL;
```

---

## 📊 보안 수준 비교

| 항목 | 이전 | 현재 |
|------|------|------|
| 비밀번호 저장 | 평문 | bcrypt 해시 |
| F12로 비밀번호 확인 | ✅ 가능 | ❌ 불가능 |
| 클라이언트 노출 | password 필드 노출 | 완전 차단 |
| 검증 방식 | 클라이언트 비교 | 서버사이드 검증 |
| RLS 적용 | ❌ 없음 | ✅ 적용 |
| 보안 등급 | 🔓 매우 낮음 | 🔒 매우 높음 |

---

## ✅ 체크리스트

업그레이드 완료 후 다음을 확인하세요:

- [ ] `supabase_security_migration.sql` 실행 완료
- [ ] `admin` 테이블에 `password_hash` 컬럼 존재
- [ ] `posts` 테이블에 `password_hash` 컬럼 존재, `password` 컬럼 제거됨
- [ ] `posts_public` VIEW 생성됨
- [ ] F12 Network 탭에서 비밀번호 노출 안됨
- [ ] 관리자 로그인 정상 작동
- [ ] 게시글 작성/수정/삭제 정상 작동
- [ ] 게시글 비밀번호 검증 정상 작동

---

## 📞 지원

문제가 발생하면 다음을 확인하세요:

1. Supabase Dashboard의 Logs 확인
2. 브라우저 Console에서 에러 확인
3. SQL Editor에서 테이블 구조 확인

---

**🎉 보안 업그레이드 완료!**

이제 F12를 눌러도 비밀번호의 앞글자조차 볼 수 없는 최강 보안 시스템이 적용되었습니다.
