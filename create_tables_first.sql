-- =====================================================
-- 🔧 테이블 생성 우선 실행 스크립트
-- =====================================================
-- admin 테이블이 없거나 구조가 다를 때 먼저 실행하세요
-- =====================================================

-- 1. 기존 admin 테이블이 있다면 삭제 (주의: 데이터 손실)
DROP TABLE IF EXISTS admin CASCADE;

-- 2. admin 테이블 새로 생성
CREATE TABLE admin (
  id SERIAL PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. pgcrypto extension 활성화
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4. 관리자 초기 비밀번호 설정
-- ⚠️ 아래의 'CHANGE_ME_INITIAL_PASSWORD'를 반드시 원하는 비밀번호로 변경 후 실행하세요!
-- 실행 후 이 SQL 파일에서 비밀번호를 삭제하세요.
INSERT INTO admin (id, password_hash)
VALUES (1, crypt('CHANGE_ME_INITIAL_PASSWORD', gen_salt('bf')));

-- 5. posts 테이블 구조 확인 및 수정
DO $$
BEGIN
  -- password 컬럼이 있으면 password_hash로 변경
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'password'
  ) THEN
    -- password_hash 컬럼 추가
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'posts' AND column_name = 'password_hash'
    ) THEN
      ALTER TABLE posts ADD COLUMN password_hash TEXT;

      -- 기존 평문 비밀번호를 해시로 변환
      UPDATE posts
      SET password_hash = crypt(password, gen_salt('bf'))
      WHERE password IS NOT NULL;
    END IF;

    -- password 컬럼 삭제
    ALTER TABLE posts DROP COLUMN password;
  END IF;

  -- password_hash가 없으면 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE posts ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- 6. 관리자 비밀번호 검증 함수
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

-- 7. 게시글 비밀번호 검증 함수
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

-- 8. 게시글 상세 정보 조회 함수 (비밀번호 검증 후)
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

  -- 상세 정보 반환
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

-- 9. 게시글 생성 함수 (비밀번호 자동 해시화)
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

-- 10. 게시글 수정 함수
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

-- 11. 게시글 삭제 함수
CREATE OR REPLACE FUNCTION delete_post(post_id UUID, input_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF verify_post_password(post_id, input_password) THEN
    DELETE FROM posts WHERE id = post_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. 관리자 비밀번호 변경 함수
CREATE OR REPLACE FUNCTION change_admin_password(
  old_password TEXT,
  new_password TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT verify_admin_password(old_password) THEN
    RETURN FALSE;
  END IF;

  UPDATE admin
  SET password_hash = crypt(new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = 1;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. posts_public VIEW 생성 (민감 정보 차단)
CREATE OR REPLACE VIEW posts_public AS
SELECT
  id,
  country,
  created_at
FROM posts;

-- 14. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 테이블 생성 완료!';
  RAISE NOTICE '✅ 관리자 초기 비밀번호가 설정되었습니다. 반드시 변경하세요!';
  RAISE NOTICE '✅ 모든 함수 생성 완료!';
END $$;

-- =====================================================
-- 실행 완료!
-- =====================================================
-- 이제 다음을 테스트하세요:
--
-- 1. 관리자 로그인 테스트:
-- SELECT verify_admin_password('설정한비밀번호');
-- → true가 나와야 함
--
-- 2. 관리자 정보 확인:
-- SELECT * FROM admin;
-- → password_hash만 보여야 함 (평문 비밀번호 없음)
--
-- 3. 관리자 비밀번호 변경:
-- SELECT change_admin_password('현재비밀번호', '새비밀번호');
-- =====================================================
