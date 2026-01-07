// 상태 관리
const state = {
    posts: [],
    currentPage: 1,
    postsPerPage: 10,
    isAdmin: false,
    adminPassword: 'admin1234', // 실제 사용시 환경변수로 관리
    selectedFiles: [],
    currentPostId: null,
    isEditing: false,
    editingPostId: null
};

// DOM 요소 - 기본 요소들
let elements = {};

// DOM 요소 초기화
function initElements() {
    elements = {
        boardList: document.getElementById('board-list'),
        writeForm: document.getElementById('write-form'),
        viewPost: document.getElementById('view-post'),
        postList: document.getElementById('post-list'),
        pagination: document.getElementById('pagination'),
        writeBtn: document.getElementById('write-btn'),
        adminBtn: document.getElementById('admin-btn'),
        backToList: document.getElementById('back-to-list'),
        backToListView: document.getElementById('back-to-list-view'),
        cancelBtn: document.getElementById('cancel-btn'),
        rescueForm: document.getElementById('rescue-form'),
        postContent: document.getElementById('post-content'),
        passwordModal: document.getElementById('password-modal'),
        adminModal: document.getElementById('admin-modal'),
        deleteModal: document.getElementById('delete-modal'),
        editModal: document.getElementById('edit-modal'),
        loadingOverlay: document.getElementById('loading-overlay'),
        uploadZone: document.getElementById('upload-zone'),
        fileInput: document.getElementById('file-input'),
        filePreview: document.getElementById('file-preview'),
        docNumber: document.getElementById('doc-number'),
        writeDate: document.getElementById('write-date'),
        editPostBtn: document.getElementById('edit-post-btn'),
        deletePostBtn: document.getElementById('delete-post-btn'),
        printPostBtn: document.getElementById('print-post-btn')
    };
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    loadPosts();
    setupEventListeners();
    setCurrentDate();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    // 네비게이션
    elements.writeBtn.addEventListener('click', showWriteForm);
    elements.backToList.addEventListener('click', showBoardList);
    elements.backToListView.addEventListener('click', showBoardList);
    elements.cancelBtn.addEventListener('click', showBoardList);

    // 폼 제출
    elements.rescueForm.addEventListener('submit', handleSubmit);

    // 관리자 로그인
    elements.adminBtn.addEventListener('click', showAdminModal);
    document.getElementById('admin-submit').addEventListener('click', handleAdminLogin);
    document.getElementById('admin-cancel').addEventListener('click', hideAdminModal);

    // 비밀번호 모달
    document.getElementById('modal-submit').addEventListener('click', handlePasswordSubmit);
    document.getElementById('modal-cancel').addEventListener('click', hidePasswordModal);

    // 삭제 모달
    document.getElementById('delete-confirm').addEventListener('click', handleDeleteConfirm);
    document.getElementById('delete-cancel').addEventListener('click', hideDeleteModal);

    // 수정 모달
    document.getElementById('edit-confirm').addEventListener('click', handleEditConfirm);
    document.getElementById('edit-cancel').addEventListener('click', hideEditModal);

    // 게시글 액션 버튼 - null 체크 후 이벤트 등록
    if (elements.editPostBtn) {
        elements.editPostBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showEditModal();
        });
    }
    if (elements.deletePostBtn) {
        elements.deletePostBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showDeleteModal();
        });
    }
    if (elements.printPostBtn) {
        elements.printPostBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handlePrint();
        });
    }

    // 파일 업로드
    elements.uploadZone.addEventListener('dragover', handleDragOver);
    elements.uploadZone.addEventListener('dragleave', handleDragLeave);
    elements.uploadZone.addEventListener('drop', handleDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);

    // 키보드 이벤트
    document.getElementById('modal-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handlePasswordSubmit();
    });
    document.getElementById('admin-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAdminLogin();
    });
    document.getElementById('delete-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleDeleteConfirm();
    });
    document.getElementById('edit-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleEditConfirm();
    });
}

// 현재 날짜 설정
function setCurrentDate() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    elements.writeDate.textContent = dateStr;
}

// 게시글 로드 (localStorage 사용 - Netlify 배포 시 API로 교체)
function loadPosts() {
    const saved = localStorage.getItem('rescue_posts');
    if (saved) {
        state.posts = JSON.parse(saved);
    }
    renderPosts();
}

// 게시글 저장
function savePosts() {
    localStorage.setItem('rescue_posts', JSON.stringify(state.posts));
}

// 게시글 목록 렌더링
function renderPosts() {
    const start = (state.currentPage - 1) * state.postsPerPage;
    const end = start + state.postsPerPage;
    const currentPosts = state.posts.slice(start, end);

    elements.postList.innerHTML = currentPosts.map((post, index) => `
        <tr data-id="${post.id}">
            <td class="col-no" style="text-align: center;">${state.posts.length - start - index}</td>
            <td class="col-title">
                <div class="post-title">
                    <svg class="lock-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span>구조요청</span>
                </div>
            </td>
            <td class="col-author">${escapeHtml(post.author)}</td>
            <td class="col-date">${post.date}</td>
        </tr>
    `).join('');

    // 게시글 클릭 이벤트
    elements.postList.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => {
            const postId = row.dataset.id;
            handlePostClick(postId);
        });
    });

    renderPagination();
}

// 페이지네이션 렌더링
function renderPagination() {
    const totalPages = Math.ceil(state.posts.length / state.postsPerPage);
    if (totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }

    let html = '';
    
    // 이전 버튼
    if (state.currentPage > 1) {
        html += `<button data-page="${state.currentPage - 1}">‹</button>`;
    }

    // 페이지 번호
    for (let i = 1; i <= totalPages; i++) {
        html += `<button data-page="${i}" class="${i === state.currentPage ? 'active' : ''}">${i}</button>`;
    }

    // 다음 버튼
    if (state.currentPage < totalPages) {
        html += `<button data-page="${state.currentPage + 1}">›</button>`;
    }

    elements.pagination.innerHTML = html;

    // 페이지 클릭 이벤트
    elements.pagination.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            state.currentPage = parseInt(btn.dataset.page);
            renderPosts();
        });
    });
}

// 화면 전환 함수들
function showBoardList() {
    elements.boardList.classList.remove('hidden');
    elements.writeForm.classList.add('hidden');
    elements.viewPost.classList.add('hidden');
    window.scrollTo(0, 0);
}

function showWriteForm() {
    elements.boardList.classList.add('hidden');
    elements.writeForm.classList.remove('hidden');
    elements.viewPost.classList.add('hidden');
    
    // 수정 모드 초기화
    state.isEditing = false;
    state.editingPostId = null;
    
    // 폼 제목 복원
    elements.writeForm.querySelector('.form-header h2').textContent = '구조 요청 신청서 작성';
    
    resetForm();
    // 문서번호는 관리자가 직접 입력
    elements.docNumber.value = '';
    setCurrentDate();
    window.scrollTo(0, 0);
}

function showViewPost(post) {
    elements.boardList.classList.add('hidden');
    elements.writeForm.classList.add('hidden');
    elements.viewPost.classList.remove('hidden');
    state.currentPostId = post.id;
    renderPostContent(post);
    window.scrollTo(0, 0);
}

// 폼 초기화
function resetForm() {
    elements.rescueForm.reset();
    state.selectedFiles = [];
    elements.filePreview.innerHTML = '';
}

// 게시글 클릭 처리
function handlePostClick(postId) {
    state.currentPostId = postId;
    const post = state.posts.find(p => p.id === postId);
    
    if (!post) return;

    if (state.isAdmin) {
        showViewPost(post);
    } else {
        showPasswordModal();
    }
}

// 비밀번호 모달 표시/숨김
function showPasswordModal() {
    elements.passwordModal.classList.remove('hidden');
    document.getElementById('modal-password').value = '';
    document.getElementById('modal-password').focus();
}

function hidePasswordModal() {
    elements.passwordModal.classList.add('hidden');
    state.currentPostId = null;
}

// 비밀번호 확인
function handlePasswordSubmit() {
    const inputPassword = document.getElementById('modal-password').value;
    const post = state.posts.find(p => p.id === state.currentPostId);

    if (!post) {
        hidePasswordModal();
        return;
    }

    if (inputPassword === post.password || inputPassword === state.adminPassword) {
        hidePasswordModal();
        showViewPost(post);
    } else {
        alert('비밀번호가 일치하지 않습니다.');
        document.getElementById('modal-password').value = '';
        document.getElementById('modal-password').focus();
    }
}

// 관리자 모달 표시/숨김
function showAdminModal() {
    if (state.isAdmin) {
        state.isAdmin = false;
        elements.adminBtn.textContent = '관리자 로그인';
        elements.adminBtn.classList.remove('logged-in');
        alert('관리자 로그아웃 되었습니다.');
        return;
    }
    elements.adminModal.classList.remove('hidden');
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-password').focus();
}

function hideAdminModal() {
    elements.adminModal.classList.add('hidden');
}

// 관리자 로그인
function handleAdminLogin() {
    const inputPassword = document.getElementById('admin-password').value;

    if (inputPassword === state.adminPassword) {
        state.isAdmin = true;
        elements.adminBtn.textContent = '관리자 로그아웃';
        elements.adminBtn.classList.add('logged-in');
        hideAdminModal();
        alert('관리자로 로그인되었습니다. 모든 게시글을 볼 수 있습니다.');
    } else {
        alert('관리자 비밀번호가 일치하지 않습니다.');
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-password').focus();
    }
}

// 삭제 모달 표시/숨김
function showDeleteModal() {
    elements.deleteModal.classList.remove('hidden');
    document.getElementById('delete-password').value = '';
    document.getElementById('delete-password').focus();
}

function hideDeleteModal() {
    elements.deleteModal.classList.add('hidden');
}

// 삭제 확인
function handleDeleteConfirm() {
    const inputPassword = document.getElementById('delete-password').value;
    const post = state.posts.find(p => p.id === state.currentPostId);

    if (!post) {
        hideDeleteModal();
        return;
    }

    if (inputPassword === post.password || inputPassword === state.adminPassword) {
        // 게시글 삭제
        state.posts = state.posts.filter(p => p.id !== state.currentPostId);
        savePosts();
        hideDeleteModal();
        alert('게시글이 삭제되었습니다.');
        showBoardList();
        renderPosts();
    } else {
        alert('비밀번호가 일치하지 않습니다.');
        document.getElementById('delete-password').value = '';
        document.getElementById('delete-password').focus();
    }
}

// 수정 모달 표시/숨김
function showEditModal() {
    elements.editModal.classList.remove('hidden');
    document.getElementById('edit-password').value = '';
    document.getElementById('edit-password').focus();
}

function hideEditModal() {
    elements.editModal.classList.add('hidden');
}

// 수정 확인
function handleEditConfirm() {
    const inputPassword = document.getElementById('edit-password').value;
    const post = state.posts.find(p => p.id === state.currentPostId);

    if (!post) {
        hideEditModal();
        return;
    }

    if (inputPassword === post.password || inputPassword === state.adminPassword) {
        hideEditModal();
        state.isEditing = true;
        state.editingPostId = state.currentPostId;
        showEditForm(post);
    } else {
        alert('비밀번호가 일치하지 않습니다.');
        document.getElementById('edit-password').value = '';
        document.getElementById('edit-password').focus();
    }
}

// 수정 폼 표시
function showEditForm(post) {
    elements.boardList.classList.add('hidden');
    elements.viewPost.classList.add('hidden');
    elements.writeForm.classList.remove('hidden');
    
    // 폼 제목 변경
    elements.writeForm.querySelector('.form-header h2').textContent = '구조 요청 신청서 수정';
    
    // 문서번호와 날짜 설정
    elements.docNumber.value = post.docNumber || '';
    elements.writeDate.textContent = post.date;
    
    // 기본 정보
    document.getElementById('author').value = post.author;
    document.getElementById('password').value = post.password;
    
    // 폼 데이터 채우기
    const d = post.data;
    const formFields = {
        'position': d.position,
        'country_city': d.country_city,
        'name': d.name,
        'illegal_reason': d.illegal_reason,
        'contact': d.contact,
        'illegal_period': d.illegal_period,
        'current_address': d.current_address,
        'korea_address': d.korea_address,
        'recommender_name': d.recommender_name,
        'recommender_contact': d.recommender_contact,
        'recommender_org': d.recommender_org,
        'recommender_email': d.recommender_email,
        'recommender_address': d.recommender_address,
        'family1_name': d.family1_name,
        'family1_relation': d.family1_relation,
        'family1_age': d.family1_age,
        'family1_detail': d.family1_detail,
        'family1_contact': d.family1_contact,
        'family2_name': d.family2_name,
        'family2_relation': d.family2_relation,
        'family2_age': d.family2_age,
        'family2_detail': d.family2_detail,
        'family2_contact': d.family2_contact,
        'budget1_item': d.budget1_item,
        'budget1_basis': d.budget1_basis,
        'budget1_amount': d.budget1_amount,
        'budget2_item': d.budget2_item,
        'budget2_basis': d.budget2_basis,
        'budget2_amount': d.budget2_amount,
        'budget_total': d.budget_total,
        'local_life': d.local_life,
        'health_status': d.health_status,
        'return_plan': d.return_plan,
        'case_history': d.case_history,
        'expert_opinion': d.expert_opinion
    };
    
    for (const [name, value] of Object.entries(formFields)) {
        const field = document.querySelector(`[name="${name}"]`);
        if (field) {
            field.value = value || '';
        }
    }
    
    // 첨부파일 복원
    state.selectedFiles = post.attachments ? [...post.attachments] : [];
    renderFilePreview();
    
    window.scrollTo(0, 0);
}

// 인쇄 기능
function handlePrint() {
    window.print();
}

// 파일 업로드 핸들러
function handleDragOver(e) {
    e.preventDefault();
    elements.uploadZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
}

function processFiles(files) {
    files.forEach(file => {
        // 파일 크기 제한 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert(`${file.name} 파일이 너무 큽니다. (최대 10MB)`);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const fileData = {
                name: file.name,
                type: file.type,
                data: e.target.result,
                size: file.size
            };
            state.selectedFiles.push(fileData);
            renderFilePreview();
        };
        reader.readAsDataURL(file);
    });
}

function renderFilePreview() {
    elements.filePreview.innerHTML = state.selectedFiles.map((file, index) => {
        const isImage = file.type.startsWith('image/');
        return `
            <div class="file-item">
                ${isImage 
                    ? `<img src="${file.data}" alt="${file.name}">` 
                    : `<div style="height: 100px; display: flex; align-items: center; justify-content: center; background: var(--bg-gray);">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                       </div>`
                }
                <div class="file-name">${escapeHtml(file.name)}</div>
                <button type="button" class="remove-file" onclick="removeFile(${index})">×</button>
            </div>
        `;
    }).join('');
}

function removeFile(index) {
    state.selectedFiles.splice(index, 1);
    renderFilePreview();
}

// 폼 제출
async function handleSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const author = formData.get('author');
    const password = formData.get('password');

    if (!author || !password) {
        alert('글쓴이와 비밀번호는 필수입니다.');
        return;
    }

    showLoading();

    // 약간의 지연 (UX 개선)
    await new Promise(resolve => setTimeout(resolve, 500));

    const postData = {
        position: formData.get('position'),
        country_city: formData.get('country_city'),
        name: formData.get('name'),
        illegal_reason: formData.get('illegal_reason'),
        contact: formData.get('contact'),
        illegal_period: formData.get('illegal_period'),
        current_address: formData.get('current_address'),
        korea_address: formData.get('korea_address'),
        recommender_name: formData.get('recommender_name'),
        recommender_contact: formData.get('recommender_contact'),
        recommender_org: formData.get('recommender_org'),
        recommender_email: formData.get('recommender_email'),
        recommender_address: formData.get('recommender_address'),
        family1_name: formData.get('family1_name'),
        family1_relation: formData.get('family1_relation'),
        family1_age: formData.get('family1_age'),
        family1_detail: formData.get('family1_detail'),
        family1_contact: formData.get('family1_contact'),
        family2_name: formData.get('family2_name'),
        family2_relation: formData.get('family2_relation'),
        family2_age: formData.get('family2_age'),
        family2_detail: formData.get('family2_detail'),
        family2_contact: formData.get('family2_contact'),
        budget1_item: formData.get('budget1_item'),
        budget1_basis: formData.get('budget1_basis'),
        budget1_amount: formData.get('budget1_amount'),
        budget2_item: formData.get('budget2_item'),
        budget2_basis: formData.get('budget2_basis'),
        budget2_amount: formData.get('budget2_amount'),
        budget_total: formData.get('budget_total'),
        local_life: formData.get('local_life'),
        health_status: formData.get('health_status'),
        return_plan: formData.get('return_plan'),
        case_history: formData.get('case_history'),
        expert_opinion: formData.get('expert_opinion')
    };

    if (state.isEditing && state.editingPostId) {
        // 수정 모드
        const postIndex = state.posts.findIndex(p => p.id === state.editingPostId);
        if (postIndex !== -1) {
            state.posts[postIndex] = {
                ...state.posts[postIndex],
                author: author,
                password: password,
                docNumber: elements.docNumber.value || '',
                data: postData,
                attachments: state.selectedFiles,
                modifiedDate: new Date().toISOString().split('T')[0]
            };
        }
        state.isEditing = false;
        state.editingPostId = null;
        hideLoading();
        alert('게시글이 수정되었습니다.');
    } else {
        // 새 글 작성
        const post = {
            id: generateId(),
            author: author,
            password: password,
            date: new Date().toISOString().split('T')[0],
            docNumber: elements.docNumber.value || '',
            data: postData,
            attachments: state.selectedFiles
        };
        state.posts.unshift(post);
        hideLoading();
        alert('구조 요청이 성공적으로 제출되었습니다.');
    }

    savePosts();
    showBoardList();
    renderPosts();
}

// 게시글 내용 렌더링
function renderPostContent(post) {
    const d = post.data;
    
    const attachmentsHtml = post.attachments && post.attachments.length > 0 ? `
        <div class="attachments-section">
            <h3>첨부파일</h3>
            <div class="attachments-grid">
                ${post.attachments.map((file, index) => {
                    const isImage = file.type.startsWith('image/');
                    return `
                        <div class="attachment-item">
                            ${isImage 
                                ? `<img src="${file.data}" alt="${file.name}">` 
                                : `<div style="height: 150px; display: flex; align-items: center; justify-content: center; background: var(--bg-gray);">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                    </svg>
                                   </div>`
                            }
                            <div class="attachment-info">
                                <span class="attachment-name">${escapeHtml(file.name)}</span>
                                <button class="download-btn" onclick="downloadFile(${index}, '${post.id}')">다운로드</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    ` : '';

    elements.postContent.innerHTML = `
        <div class="form-document">
            <div class="doc-header">
                <table class="info-table">
                    <tr>
                        <td class="label-cell">문서번호</td>
                        <td class="value-cell">${escapeHtml(post.docNumber)}</td>
                    </tr>
                </table>
                <h1 class="doc-title">Intake Report (구조 요청 신청서)</h1>
                <table class="info-table">
                    <tr>
                        <td class="label-cell">담당/직책</td>
                        <td class="value-cell">${escapeHtml(d.position || '')}</td>
                        <td class="label-cell">작성일</td>
                        <td class="value-cell">${escapeHtml(post.date)}</td>
                    </tr>
                </table>
            </div>

            <h2 class="section-title">1. 구조 대상자 개요</h2>

            <table class="data-table">
                <tr>
                    <td rowspan="5" class="section-label"><span class="required">* 인적<br>사항</span></td>
                    <td class="label-cell">국가/도시</td>
                    <td colspan="3">${escapeHtml(d.country_city || '')}</td>
                </tr>
                <tr>
                    <td class="label-cell">이름</td>
                    <td>${escapeHtml(d.name || '')}</td>
                    <td class="label-cell">불법체류사유</td>
                    <td>${escapeHtml(d.illegal_reason || '')}</td>
                </tr>
                <tr>
                    <td class="label-cell">연락처</td>
                    <td>${escapeHtml(d.contact || '')}</td>
                    <td class="label-cell">불법체류기간</td>
                    <td>${escapeHtml(d.illegal_period || '')}</td>
                </tr>
                <tr>
                    <td class="label-cell">현재주소</td>
                    <td colspan="3">${escapeHtml(d.current_address || '')}</td>
                </tr>
                <tr>
                    <td class="label-cell">한국 주소</td>
                    <td colspan="3">${escapeHtml(d.korea_address || '')}</td>
                </tr>
            </table>

            <table class="data-table">
                <tr>
                    <td rowspan="3" class="section-label"><span class="required">*추천인</span></td>
                    <td class="label-cell">성명</td>
                    <td>${escapeHtml(d.recommender_name || '')}</td>
                    <td class="label-cell">연락처</td>
                    <td>${escapeHtml(d.recommender_contact || '')}</td>
                </tr>
                <tr>
                    <td class="label-cell">소속 기관</td>
                    <td>${escapeHtml(d.recommender_org || '')}</td>
                    <td class="label-cell">이메일</td>
                    <td>${escapeHtml(d.recommender_email || '')}</td>
                </tr>
                <tr>
                    <td class="label-cell">기관 주소</td>
                    <td colspan="3">${escapeHtml(d.recommender_address || '')}</td>
                </tr>
            </table>

            <table class="data-table">
                <tr>
                    <td rowspan="3" class="section-label"><span class="required">* 가족<br>사항</span></td>
                    <td class="label-cell header">성명</td>
                    <td class="label-cell header">관계</td>
                    <td class="label-cell header">나이</td>
                    <td class="label-cell header">상세내용</td>
                    <td class="label-cell header">연락처</td>
                </tr>
                <tr>
                    <td>${escapeHtml(d.family1_name || '')}</td>
                    <td>${escapeHtml(d.family1_relation || '')}</td>
                    <td>${escapeHtml(d.family1_age || '')}</td>
                    <td>${escapeHtml(d.family1_detail || '')}</td>
                    <td>${escapeHtml(d.family1_contact || '')}</td>
                </tr>
                <tr>
                    <td>${escapeHtml(d.family2_name || '')}</td>
                    <td>${escapeHtml(d.family2_relation || '')}</td>
                    <td>${escapeHtml(d.family2_age || '')}</td>
                    <td>${escapeHtml(d.family2_detail || '')}</td>
                    <td>${escapeHtml(d.family2_contact || '')}</td>
                </tr>
            </table>

            <h2 class="section-title">구조 예산안</h2>
            <table class="data-table budget-table">
                <thead>
                    <tr>
                        <td class="label-cell header">세부항목</td>
                        <td class="label-cell header">산출근거</td>
                        <td class="label-cell header">금액</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${escapeHtml(d.budget1_item || '')}</td>
                        <td>${escapeHtml(d.budget1_basis || '')}</td>
                        <td>${escapeHtml(d.budget1_amount || '')}</td>
                    </tr>
                    <tr>
                        <td>${escapeHtml(d.budget2_item || '')}</td>
                        <td>${escapeHtml(d.budget2_basis || '')}</td>
                        <td>${escapeHtml(d.budget2_amount || '')}</td>
                    </tr>
                    <tr>
                        <td colspan="2" class="label-cell">합계</td>
                        <td>${escapeHtml(d.budget_total || '')}</td>
                    </tr>
                </tbody>
            </table>

            <h2 class="section-title section-divider">2. 세부사항</h2>

            <div class="detail-section">
                <div class="detail-header">
                    <span class="detail-title"><span class="required">* 현지 생활 현황</span></span>
                </div>
                <div class="form-textarea" style="pointer-events: none; min-height: 80px; white-space: pre-wrap;">${escapeHtml(d.local_life || '')}</div>
            </div>

            <div class="detail-section">
                <div class="detail-header">
                    <span class="detail-title"><span class="required">* 건강상태</span></span>
                </div>
                <div class="form-textarea" style="pointer-events: none; min-height: 80px; white-space: pre-wrap;">${escapeHtml(d.health_status || '')}</div>
            </div>

            <div class="detail-section">
                <div class="detail-header">
                    <span class="detail-title"><span class="required">* 귀국 후 계획</span></span>
                </div>
                <div class="form-textarea" style="pointer-events: none; min-height: 80px; white-space: pre-wrap;">${escapeHtml(d.return_plan || '')}</div>
            </div>

            <div class="detail-section">
                <div class="detail-header">
                    <span class="detail-title"><span class="required">*사례 접수 경위 및 구조 요청 현황</span></span>
                </div>
                <div class="form-textarea" style="pointer-events: none; min-height: 80px; white-space: pre-wrap;">${escapeHtml(d.case_history || '')}</div>
            </div>

            <div class="detail-section">
                <div class="detail-header">
                    <span class="detail-title">전문가 및 담당자 기타 의견</span>
                </div>
                <div class="form-textarea" style="pointer-events: none; min-height: 80px; white-space: pre-wrap;">${escapeHtml(d.expert_opinion || '')}</div>
            </div>
        </div>
        ${attachmentsHtml}
    `;
}

// 파일 다운로드
function downloadFile(fileIndex, postId) {
    const post = state.posts.find(p => p.id === postId);
    if (!post || !post.attachments || !post.attachments[fileIndex]) return;

    const file = post.attachments[fileIndex];
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 유틸리티 함수들
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading() {
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

// 전역 함수로 내보내기 (HTML에서 onclick으로 호출)
window.removeFile = removeFile;
window.downloadFile = downloadFile;
