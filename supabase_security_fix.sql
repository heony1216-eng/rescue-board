-- 비밀번호 노출 보안 취약점 수정을 위한 SQL 함수들
-- Supabase Dashboard > SQL Editor에서 실행하세요

-- 1. 관리자 비밀번호 검증 함수
CREATE OR REPLACE FUNCTION verify_admin_password(input_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin WHERE password = input_password LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 게시글 비밀번호 검증 함수 (관리자 비밀번호로도 접근 가능)
CREATE OR REPLACE FUNCTION verify_post_password(target_post_id UUID, input_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  admin_pw TEXT;
BEGIN
  -- 관리자 비밀번호 확인
  SELECT password INTO admin_pw FROM admin LIMIT 1;
  IF input_password = admin_pw THEN
    RETURN TRUE;
  END IF;
  
  -- 게시글 비밀번호 확인
  RETURN EXISTS (
    SELECT 1 FROM posts WHERE id = target_post_id AND password = input_password
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. delete_post 함수 수정 (admin_pw 파라미터 제거 - 서버에서 직접 조회)
CREATE OR REPLACE FUNCTION delete_post(post_id UUID, input_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  admin_pw TEXT;
  post_pw TEXT;
BEGIN
  -- 관리자 비밀번호 조회
  SELECT password INTO admin_pw FROM admin LIMIT 1;
  -- 게시글 비밀번호 조회
  SELECT password INTO post_pw FROM posts WHERE id = post_id;
  
  IF input_password = admin_pw OR input_password = post_pw THEN
    DELETE FROM posts WHERE id = post_id;
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. update_post 함수 수정 (admin_pw 파라미터 제거 - 서버에서 직접 조회)
CREATE OR REPLACE FUNCTION update_post(
  post_id UUID,
  input_password TEXT,
  new_country TEXT,
  new_doc_number TEXT,
  new_data JSONB,
  new_attachments JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  admin_pw TEXT;
  post_pw TEXT;
BEGIN
  -- 관리자 비밀번호 조회
  SELECT password INTO admin_pw FROM admin LIMIT 1;
  -- 게시글 비밀번호 조회
  SELECT password INTO post_pw FROM posts WHERE id = post_id;
  
  IF input_password = admin_pw OR input_password = post_pw THEN
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
