# 🔐 소스 코드 난독화 가이드

## 개요

JavaScript 코드를 난독화하여 F12로 봐도 이해하기 어렵게 만듭니다.

## ⚠️ 중요 사항

**완전히 숨기는 것은 불가능합니다!**
- 브라우저에서 실행되는 코드는 항상 다운로드됨
- 난독화는 **읽기 어렵게** 만드는 것일 뿐
- 충분한 시간과 노력을 들이면 역난독화 가능

하지만 대부분의 사용자는 난독화된 코드를 이해할 수 없습니다.

---

## 🚀 난독화 방법

### 방법 1: JavaScript Obfuscator (온라인)

1. **웹사이트 접속**
   ```
   https://obfuscator.io/
   ```

2. **app.js 코드 복사**

3. **설정 추천:**
   - String Array Encoding: `rc4`
   - Control Flow Flattening: `0.75`
   - Dead Code Injection: `0.4`
   - Debug Protection: ✅
   - Self Defending: ✅
   - Rename Properties: ✅
   - Compact Code: ✅

4. **Obfuscate 버튼 클릭**

5. **난독화된 코드를 `app.obfuscated.js`로 저장**

6. **index.html 수정:**
   ```html
   <!-- 기존 -->
   <script src="app.js"></script>

   <!-- 변경 -->
   <script src="app.obfuscated.js"></script>
   ```

---

### 방법 2: webpack + terser (자동화)

#### 1. 프로젝트 설정

```bash
npm init -y
npm install --save-dev webpack webpack-cli terser-webpack-plugin
```

#### 2. webpack.config.js 생성

```javascript
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './app.js',
  output: {
    filename: 'app.min.js',
    path: __dirname
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: {
            properties: {
              regex: /^_/
            }
          },
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info']
          },
          format: {
            comments: false
          }
        }
      })
    ]
  }
};
```

#### 3. 빌드 실행

```bash
npx webpack
```

#### 4. index.html 수정

```html
<script src="app.min.js"></script>
```

---

## 🛡️ 추가 보호 방법

### 1. 개발자 도구 차단 (비추천)

```javascript
// app.js 맨 위에 추가
setInterval(function() {
  const threshold = 160;
  if (window.outerWidth - window.innerWidth > threshold ||
      window.outerHeight - window.innerHeight > threshold) {
    // 개발자 도구 감지
    document.body.innerHTML = '개발자 도구를 닫아주세요.';
  }
}, 1000);
```

**단점:**
- 우회 가능
- 정당한 개발자도 차단됨
- 사용자 경험 저하

### 2. 콘솔 로그 제거

난독화 시 자동으로 `console.log` 제거

### 3. 디버거 방지

```javascript
setInterval(function() {
  debugger;
}, 100);
```

**단점:**
- 브라우저가 느려짐
- 우회 쉬움

---

## 📊 난독화 전후 비교

### ❌ 난독화 전 (원본)

```javascript
async function handleAdminLogin() {
    const pw = document.getElementById('admin-password').value;
    const isValid = await supabase.rpc('verify_admin_password', {
        input_password: pw
    });

    if (isValid) {
        state.isAdmin = true;
        localStorage.setItem('isAdmin', 'true');
        alert('관리자로 로그인되었습니다.');
    } else {
        alert('비밀번호가 일치하지 않습니다.');
    }
}
```

**문제점:**
- 함수명, 변수명이 명확함
- 로직을 쉽게 이해할 수 있음
- API 호출 내용이 그대로 노출

### ✅ 난독화 후

```javascript
var _0x4d2a=['admin-password','value','verify_admin_password','input_password',
'isAdmin','setItem','관리자로\x20로그인되었습니다.','비밀번호가\x20일치하지\x20않습니다.'];
(function(_0x15c4b8,_0x4d2a17){var _0x3e8f9c=function(_0x2b4d51){while(--_0x2b4d51){
_0x15c4b8['push'](_0x15c4b8['shift']());}};_0x3e8f9c(++_0x4d2a17);}(_0x4d2a,0x1a3));
var _0x3e8f=function(_0x15c4b8,_0x4d2a17){_0x15c4b8=_0x15c4b8-0x0;var _0x3e8f9c=_0x4d2a[_0x15c4b8];
return _0x3e8f9c;};async function _0x2f4c8d(){const _0x1a2b3c=document[_0x3e8f('0x2')]
(_0x3e8f('0x0'))[_0x3e8f('0x1')];const _0x4d5e6f=await supabase['rpc'](_0x3e8f('0x3'),
{[_0x3e8f('0x4')]:_0x1a2b3c});if(_0x4d5e6f){state[_0x3e8f('0x5')]=!![];localStorage
[_0x3e8f('0x6')](_0x3e8f('0x5'),'true');alert(_0x3e8f('0x7'));}else{alert(_0x3e8f('0x8'));}}
```

**효과:**
- 변수명/함수명 암호화
- 문자열 난독화
- 코드 흐름 파악 불가능
- 읽기 매우 어려움

---

## 🎯 난독화 레벨

| 레벨 | 설명 | 성능 | 보안 |
|------|------|------|------|
| Low | 변수명만 변경 | 빠름 | 낮음 |
| Medium | 문자열 암호화 | 보통 | 중간 |
| High | 제어 흐름 변경 | 느림 | 높음 |
| Very High | 자가 방어 코드 | 매우 느림 | 매우 높음 |

**권장: Medium ~ High**

---

## 📋 단계별 실행

### 1단계: 백업

```bash
cp app.js app.js.backup
```

### 2단계: 난독화 실행

온라인 도구 사용:
1. https://obfuscator.io/ 접속
2. app.js 내용 복사
3. 설정 조정
4. Obfuscate 클릭
5. 결과를 app.obfuscated.js로 저장

### 3단계: 테스트

```bash
# 로컬에서 테스트
open index.html
```

난독화된 코드가 정상 작동하는지 확인:
- 게시글 목록 로드
- 게시글 작성
- 관리자 로그인
- 모든 기능 테스트

### 4단계: 배포

```bash
# index.html 수정
<script src="app.obfuscated.js"></script>

# Git 푸시
git add .
git commit -m "🔐 소스 코드 난독화 적용"
git push
```

---

## ⚠️ 주의사항

### 1. 원본 보관
난독화된 코드는 수정이 매우 어렵습니다.
- 항상 `app.js` 원본을 보관하세요
- 수정은 원본에서 하고 다시 난독화하세요

### 2. 디버깅 불가
난독화 후에는 에러 위치 파악이 어렵습니다.
- 배포 전에 충분히 테스트하세요
- Source Map은 생성하지 마세요 (보안 위험)

### 3. 성능 저하
높은 난독화 수준은 성능에 영향을 줄 수 있습니다.
- 적절한 레벨 선택
- 실제 환경에서 성능 테스트

### 4. SEO 영향 없음
JavaScript 난독화는 SEO에 영향을 주지 않습니다.
- 검색엔진은 HTML만 크롤링
- 사용자 경험은 동일

---

## 🔍 난독화 효과 확인

난독화 후 F12 → Sources 탭:
```javascript
// 이렇게 보임:
var _0x4a2b=['...'];(function(_0x1a2,_0x4d5){...})();
function _0x2f4c(){...}var _0x3e8f=function(){...};
```

**완전히 이해 불가능!** ✅

---

## 💰 비용

| 방법 | 비용 | 난이도 |
|------|------|--------|
| obfuscator.io | 무료 | 쉬움 |
| webpack + terser | 무료 | 보통 |
| 상용 도구 | $100~500 | 쉬움 |

**추천: obfuscator.io (무료, 쉬움, 효과적)**

---

## 🎉 최종 보안 체크리스트

- [ ] 비밀번호 bcrypt 해시화 ✅ (이미 완료!)
- [ ] F12 Network에서 민감 정보 차단 ✅ (이미 완료!)
- [ ] JavaScript 소스 코드 난독화 ⬅️ 이 가이드로 진행
- [ ] 개발자 도구 차단 (선택사항)
- [ ] 콘솔 로그 제거 (난독화 시 자동)

---

## 결론

난독화 후:
- ✅ F12 Sources에서 코드 이해 불가능
- ✅ 변수명/함수명 암호화
- ✅ 로직 흐름 파악 불가능
- ⚠️ 완전히 숨기는 건 불가능 (브라우저 특성)

**하지만 99%의 사용자는 난독화된 코드를 이해할 수 없습니다!** 🔒
