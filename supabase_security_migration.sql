-- =====================================================
-- 🔒 보안 최강화 마이그레이션 스크립트
-- =====================================================
-- 이 스크립트는 비밀번호를 bcrypt로 해시화하여
-- F12 개발자도구로도 절대 비밀번호를 볼 수 없게 합니다.
-- =====================================================

-- 1. pgcrypto extension 활성화 (bcrypt 사용)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. admin 테이블 생성 (해시 비밀번호 저장)
CREATE TABLE IF NOT EXISTS admin (
  id SERIAL PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. posts 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT,
  password_hash TEXT NOT NULL,
  doc_number TEXT,
  data JSONB,
  attachments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. comments 테이블 생성
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 기존 평문 비밀번호가 있다면 해시로 변환
-- posts 테이블에 password 컬럼이 있고 password_hash가 없는 경우
DO $$
BEGIN
  -- password 컬럼이 존재하는지 확인
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'password'
  ) THEN
    -- password_hash 컬럼이 없으면 추가
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'posts' AND column_name = 'password_hash'
    ) THEN
      ALTER TABLE posts ADD COLUMN password_hash TEXT;
    END IF;

    -- 평문 비밀번호를 해시로 변환
    UPDATE posts
    SET password_hash = crypt(password, gen_salt('bf'))
    WHERE password IS NOT NULL AND password_hash IS NULL;

    -- 평문 비밀번호 컬럼 삭제
    ALTER TABLE posts DROP COLUMN IF EXISTS password;
  END IF;

  -- password_hash 컬럼을 NOT NULL로 설정
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE posts ALTER COLUMN password_hash SET NOT NULL;
  END IF;
END $$;

-- 6. 관리자 초기 비밀번호 설정
-- ⚠️ 아래의 'CHANGE_ME_INITIAL_PASSWORD'를 반드시 원하는 비밀번호로 변경 후 실행하세요!
-- 실행 후 이 SQL 파일에서 비밀번호를 삭제하세요.
INSERT INTO admin (id, password_hash)
VALUES (1, crypt('CHANGE_ME_INITIAL_PASSWORD', gen_salt('bf')))
ON CONFLICT (id) DO UPDATE
SET password_hash = crypt('CHANGE_ME_INITIAL_PASSWORD', gen_salt('bf')),
    updated_at = NOW();

-- 7. 관리자 비밀번호 검증 함수 (해시 비교)
CREATE OR REPLACE FUNCTION verify_admin_password(input_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT password_hash INTO stored_hash FROM admin WHERE id = 1 LIMIT 1;

  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN (crypt(input_password, stored_hash) = stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 게시글 비밀번호 검증 함수 (해시 비교)
CREATE OR REPLACE FUNCTION verify_post_password(target_post_id UUID, input_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  -- 먼저 관리자 비밀번호로 시도
  IF verify_admin_password(input_password) THEN
    RETURN TRUE;
  END IF;

  -- 게시글 비밀번호 확인
  SELECT password_hash INTO stored_hash FROM posts WHERE id = target_post_id;

  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN (crypt(input_password, stored_hash) = stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 게시글 삭제 함수 (해시 검증)
CREATE OR REPLACE FUNCTION delete_post(post_id UUID, input_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- 비밀번호 검증
  IF verify_post_password(post_id, input_password) THEN
    DELETE FROM posts WHERE id = post_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 게시글 수정 함수 (해시 검증)
CREATE OR REPLACE FUNCTION update_post(
  post_id UUID,
  input_password TEXT,
  new_country TEXT,
  new_doc_number TEXT,
  new_data JSONB,
  new_attachments JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
  -- 비밀번호 검증
  IF verify_post_password(post_id, input_password) THEN
    UPDATE posts SET
      country = new_country,
      doc_number = new_doc_number,
      data = new_data,
      attachments = new_attachments
    WHERE id = post_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. 게시글 생성 함수 (비밀번호 자동 해시화)
CREATE OR REPLACE FUNCTION create_post(
  p_country TEXT,
  p_password TEXT,
  p_doc_number TEXT,
  p_data JSONB,
  p_attachments JSONB
)
RETURNS UUID AS $$
DECLARE
  new_post_id UUID;
BEGIN
  INSERT INTO posts (country, password_hash, doc_number, data, attachments)
  VALUES (p_country, crypt(p_password, gen_salt('bf')), p_doc_number, p_data, p_attachments)
  RETURNING id INTO new_post_id;

  RETURN new_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. 관리자 비밀번호 변경 함수
CREATE OR REPLACE FUNCTION change_admin_password(
  old_password TEXT,
  new_password TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- 기존 비밀번호 확인
  IF NOT verify_admin_password(old_password) THEN
    RETURN FALSE;
  END IF;

  -- 새 비밀번호로 업데이트
  UPDATE admin
  SET password_hash = crypt(new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = 1;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. RLS (Row Level Security) 설정
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 14. admin 테이블 정책 - anon 사용자 직접 접근 완전 차단
DROP POLICY IF EXISTS "admin_no_access" ON admin;
CREATE POLICY "admin_no_access" ON admin
  FOR ALL
  USING (false);

-- 15. posts 테이블 정책 - 직접 CRUD 차단 (SECURITY DEFINER 함수만 접근)
-- SELECT: posts_public VIEW만 허용, posts 테이블 직접 조회 차단
DROP POLICY IF EXISTS "posts_select_policy" ON posts;
CREATE POLICY "posts_select_policy" ON posts
  FOR SELECT
  USING (false);

-- INSERT: 직접 삽입 차단 (create_post 함수만 사용)
DROP POLICY IF EXISTS "posts_insert_policy" ON posts;
CREATE POLICY "posts_insert_policy" ON posts
  FOR INSERT
  WITH CHECK (false);

-- DELETE: 직접 삭제 차단 (delete_post 함수만 사용)
DROP POLICY IF EXISTS "posts_delete_policy" ON posts;
CREATE POLICY "posts_delete_policy" ON posts
  FOR DELETE
  USING (false);

-- UPDATE: 직접 수정 차단 (update_post 함수만 사용)
DROP POLICY IF EXISTS "posts_update_policy" ON posts;
CREATE POLICY "posts_update_policy" ON posts
  FOR UPDATE
  USING (false);

-- 16. comments 테이블 정책
-- SELECT: 직접 조회 차단 (get_comments 함수만 사용)
DROP POLICY IF EXISTS "comments_select_policy" ON comments;
CREATE POLICY "comments_select_policy" ON comments
  FOR SELECT
  USING (false);

-- INSERT: 댓글 작성은 create_comment 함수를 통해서만 (is_admin 위조 방지)
DROP POLICY IF EXISTS "comments_insert_policy" ON comments;
CREATE POLICY "comments_insert_policy" ON comments
  FOR INSERT
  WITH CHECK (false);

-- DELETE: 직접 삭제 차단 (delete_comment 함수만 사용)
DROP POLICY IF EXISTS "comments_delete_policy" ON comments;
CREATE POLICY "comments_delete_policy" ON comments
  FOR DELETE
  USING (false);

-- UPDATE: 직접 수정 차단 (update_comment 함수만 사용)
DROP POLICY IF EXISTS "comments_update_policy" ON comments;
CREATE POLICY "comments_update_policy" ON comments
  FOR UPDATE
  USING (false);

-- 17. posts 테이블에서 민감 정보 완전 차단을 위한 VIEW 생성
-- 목록에서는 id, country, created_at만 노출
CREATE OR REPLACE VIEW posts_public AS
SELECT
  id,
  country,
  created_at
FROM posts;

-- posts_public VIEW에 대한 SELECT 권한 부여
GRANT SELECT ON posts_public TO anon, authenticated;

-- 18. 비밀번호 검증 후 게시글 상세 정보를 가져오는 함수
CREATE OR REPLACE FUNCTION get_post_detail(
  post_id UUID,
  input_password TEXT
)
RETURNS TABLE(
  id UUID,
  country TEXT,
  doc_number TEXT,
  data JSONB,
  attachments JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- 비밀번호 검증
  IF NOT verify_post_password(post_id, input_password) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.country,
    p.doc_number,
    p.data,
    p.attachments,
    p.created_at
  FROM posts p
  WHERE p.id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19. 관리자 전용 게시글 상세 조회 함수 (관리자 비밀번호 필수)
CREATE OR REPLACE FUNCTION get_post_detail_admin(
  post_id UUID,
  admin_password TEXT
)
RETURNS TABLE(
  id UUID,
  country TEXT,
  doc_number TEXT,
  data JSONB,
  attachments JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT verify_admin_password(admin_password) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.country,
    p.doc_number,
    p.data,
    p.attachments,
    p.created_at
  FROM posts p
  WHERE p.id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20. 관리자 전용 전체 게시글 조회 함수 (CSV 다운로드용)
CREATE OR REPLACE FUNCTION get_all_posts_admin(admin_password TEXT)
RETURNS TABLE(
  id UUID,
  country TEXT,
  doc_number TEXT,
  data JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT verify_admin_password(admin_password) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.country, p.doc_number, p.data, p.created_at
  FROM posts p
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 21. 댓글 작성 함수 (is_admin 서버 측 검증)
CREATE OR REPLACE FUNCTION create_comment(
  p_post_id UUID,
  p_content TEXT,
  p_author_name TEXT,
  p_admin_password TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_comment_id UUID;
  is_admin_user BOOLEAN := FALSE;
BEGIN
  -- 관리자 비밀번호가 제공되면 검증
  IF p_admin_password IS NOT NULL AND p_admin_password != '' THEN
    is_admin_user := verify_admin_password(p_admin_password);
  END IF;

  INSERT INTO comments (post_id, content, author_name, is_admin)
  VALUES (p_post_id, p_content, CASE WHEN is_admin_user THEN '관리자' ELSE p_author_name END, is_admin_user)
  RETURNING id INTO new_comment_id;

  RETURN new_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 22. 댓글 수정 함수 (권한 검증)
CREATE OR REPLACE FUNCTION update_comment(
  p_comment_id UUID,
  p_content TEXT,
  p_author_name TEXT,
  p_admin_password TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  comment_record RECORD;
  is_admin_user BOOLEAN := FALSE;
BEGIN
  SELECT * INTO comment_record FROM comments WHERE id = p_comment_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  IF p_admin_password IS NOT NULL AND p_admin_password != '' THEN
    is_admin_user := verify_admin_password(p_admin_password);
  END IF;

  -- 관리자이거나, 본인 댓글(관리자 댓글이 아니고 작성자명 일치)인 경우만 수정 허용
  IF is_admin_user OR (NOT comment_record.is_admin AND comment_record.author_name = p_author_name) THEN
    UPDATE comments SET content = p_content WHERE id = p_comment_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 23. 댓글 삭제 함수 (권한 검증)
CREATE OR REPLACE FUNCTION delete_comment(
  p_comment_id UUID,
  p_author_name TEXT,
  p_admin_password TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  comment_record RECORD;
  is_admin_user BOOLEAN := FALSE;
BEGIN
  SELECT * INTO comment_record FROM comments WHERE id = p_comment_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  IF p_admin_password IS NOT NULL AND p_admin_password != '' THEN
    is_admin_user := verify_admin_password(p_admin_password);
  END IF;

  IF is_admin_user OR (NOT comment_record.is_admin AND comment_record.author_name = p_author_name) THEN
    DELETE FROM comments WHERE id = p_comment_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 24. 댓글 조회 함수 (게시글 비밀번호 검증 후 조회)
CREATE OR REPLACE FUNCTION get_comments(
  p_post_id UUID,
  p_password TEXT
)
RETURNS TABLE(
  id UUID,
  post_id UUID,
  content TEXT,
  author_name TEXT,
  is_admin BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- 게시글 비밀번호 또는 관리자 비밀번호 검증
  IF NOT verify_post_password(p_post_id, p_password) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.id, c.post_id, c.content, c.author_name, c.is_admin, c.created_at
  FROM comments c
  WHERE c.post_id = p_post_id
  ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 마이그레이션 완료!
-- =====================================================
-- 이제 다음을 실행하세요:
-- SELECT * FROM admin; -- RLS로 차단됨 (직접 접근 불가)
--
-- 관리자 비밀번호 변경 (초기 설정 후 반드시 변경하세요):
-- SELECT change_admin_password('현재비밀번호', '새비밀번호');
-- =====================================================
