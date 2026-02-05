// Supabase 설정
const SUPABASE_URL = 'https://duezqoujpeoooyzucgvy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1ZXpxb3VqcGVvb295enVjZ3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTk5NDgsImV4cCI6MjA4MzMzNTk0OH0.9cF2qa4HanWIjoNgqSs7PJELSDZny-vrS3n73t2ViDQ';

// 상수
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_DIMENSION = 1920;
const IMAGE_QUALITY = 0.8;
const KST_LOCALE_OPTIONS = { timeZone: 'Asia/Seoul' };

const supabase = {
    async fetch(endpoint, options = {}) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
            ...options,
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': options.prefer || 'return=representation', ...options.headers }
        });
        return res;
    },
    async rpc(functionName, params = {}) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        return res.json();
    },
    async uploadFile(file, path) {
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/attachments/${path}`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': file.type },
            body: file
        });
        return res;
    },
    getFileUrl(path) {
        return `${SUPABASE_URL}/storage/v1/object/public/attachments/${path}`;
    }
};

const state = { posts: [], currentPage: 1, postsPerPage: 10, isAdmin: false, selectedFiles: [], currentPostId: null, isEditing: false, editingPostId: null, uploadProgress: 0, currentPostDetail: null };
let elements = {};

function initElements() {
    elements = {
        boardList: document.getElementById('board-list'),
        writeForm: document.getElementById('write-form'),
        viewPost: document.getElementById('view-post'),
        postList: document.getElementById('post-list'),
        pagination: document.getElementById('pagination'),
        writeBtn: document.getElementById('write-btn'),
        adminBtn: document.getElementById('admin-btn'),
        csvBtn: document.getElementById('csv-download-btn'),
        backToList: document.getElementById('back-to-list'),
        backToListView: document.getElementById('back-to-list-view'),
        cancelBtn: document.getElementById('cancel-btn'),
        submitBtn: document.getElementById('submit-btn'),
        rescueForm: document.getElementById('rescue-form'),
        postContent: document.getElementById('post-content'),
        passwordModal: document.getElementById('password-modal'),
        adminModal: document.getElementById('admin-modal'),
        deleteModal: document.getElementById('delete-modal'),
        editModal: document.getElementById('edit-modal'),
        loadingOverlay: document.getElementById('loading-overlay'),
        uploadZone: document.getElementById('upload-zone'),
        fileInput: document.getElementById('file-input'),
        themeToggle: document.getElementById('theme-toggle'),
        filePreview: document.getElementById('file-preview'),
        uploadProgress: document.getElementById('upload-progress'),
        progressFill: document.getElementById('progress-fill'),
        progressText: document.getElementById('progress-text'),
        docNumber: document.getElementById('doc-number'),
        writeDate: document.getElementById('write-date'),
        editPostBtn: document.getElementById('edit-post-btn'),
        deletePostBtn: document.getElementById('delete-post-btn'),
        printPostBtn: document.getElementById('print-post-btn'),
        pdfPostBtn: document.getElementById('pdf-post-btn'),
        kstClock: document.getElementById('kst-clock'),
        familyRows: document.getElementById('family-rows'),
        budgetRows: document.getElementById('budget-rows'),
        budgetTotal: document.getElementById('budget-total'),
        commentList: document.getElementById('comment-list'),
        commentInput: document.getElementById('comment-input'),
        commentSubmit: document.getElementById('comment-submit'),
        commentSection: document.getElementById('comment-section'),
        commentCount: document.getElementById('comment-count')
    };
}

// 에러 표시 유틸리티
function showError(msg) {
    alert(msg);
}

document.addEventListener('DOMContentLoaded', () => {
    initElements();
    loadPosts();
    setupEventListeners();
    setCurrentDate();
    startKSTClock();
    initTheme();

    if (elements.commentSection) {
        elements.commentSection.classList.add('hidden');
    }

    // 관리자 상태 복원 (sessionStorage 기반)
    if (sessionStorage.getItem('isAdmin') === 'true') {
        state.isAdmin = true;
        elements.adminBtn.textContent = '관리자 로그아웃';
        elements.adminBtn.classList.add('logged-in');
        elements.csvBtn.classList.remove('hidden');
    }

    window.addEventListener('popstate', (e) => {
        if (e.state) {
            if (e.state.page === 'list') {
                showBoardList(false);
            } else if (e.state.page === 'write') {
                showWriteForm(false);
            } else if (e.state.page === 'view' && e.state.postId) {
                showBoardList(false);
            }
        } else {
            showBoardList(false);
        }
    });

    history.replaceState({ page: 'list' }, '', window.location.pathname);
});

function startKSTClock() {
    const update = () => {
        const now = new Date().toLocaleString('ko-KR', { ...KST_LOCALE_OPTIONS, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        elements.kstClock.textContent = '대한민국 ' + now;
    };
    update();
    setInterval(update, 1000);
}

function getKSTDate() {
    return new Date().toLocaleString('ko-KR', { ...KST_LOCALE_OPTIONS, year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '');
}

function formatKSTDateTime(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('ko-KR', KST_LOCALE_OPTIONS);
}

function formatKSTDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ko-KR', { ...KST_LOCALE_OPTIONS, year: 'numeric', month: 'long', day: 'numeric' });
}

function setCurrentDate() {
    elements.writeDate.textContent = getKSTDate();
}

function setupEventListeners() {
    elements.writeBtn.addEventListener('click', () => showWriteForm(true));
    elements.backToList.addEventListener('click', () => showBoardList(true));
    elements.backToListView.addEventListener('click', () => showBoardList(true));
    elements.cancelBtn.addEventListener('click', () => showBoardList(true));
    elements.rescueForm.addEventListener('submit', handleSubmit);
    elements.adminBtn.addEventListener('click', showAdminModal);
    elements.csvBtn?.addEventListener('click', downloadCSV);
    elements.themeToggle?.addEventListener('click', toggleTheme);
    document.getElementById('admin-submit').addEventListener('click', handleAdminLogin);
    document.getElementById('admin-cancel').addEventListener('click', hideAdminModal);
    document.getElementById('modal-submit').addEventListener('click', handlePasswordSubmit);
    document.getElementById('modal-cancel').addEventListener('click', hidePasswordModal);
    document.getElementById('delete-confirm').addEventListener('click', handleDeleteConfirm);
    document.getElementById('delete-cancel').addEventListener('click', hideDeleteModal);
    document.getElementById('edit-confirm').addEventListener('click', handleEditConfirm);
    document.getElementById('edit-cancel').addEventListener('click', hideEditModal);
    elements.editPostBtn?.addEventListener('click', (e) => { e.preventDefault(); showEditModal(); });
    elements.deletePostBtn?.addEventListener('click', (e) => { e.preventDefault(); showDeleteModal(); });
    elements.printPostBtn?.addEventListener('click', (e) => { e.preventDefault(); window.print(); });
    elements.pdfPostBtn?.addEventListener('click', (e) => { e.preventDefault(); generatePDF(); });
    document.getElementById('word-post-btn')?.addEventListener('click', (e) => { e.preventDefault(); generateWord(); });
    elements.uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); elements.uploadZone.classList.add('dragover'); });
    elements.uploadZone.addEventListener('dragleave', (e) => { e.preventDefault(); elements.uploadZone.classList.remove('dragover'); });
    elements.uploadZone.addEventListener('drop', (e) => { e.preventDefault(); elements.uploadZone.classList.remove('dragover'); processFiles(Array.from(e.dataTransfer.files)); });
    elements.fileInput.addEventListener('change', (e) => processFiles(Array.from(e.target.files)));
    elements.commentSubmit?.addEventListener('click', handleCommentSubmit);
    elements.commentInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleCommentSubmit();
        }
    });

    // Enter 키로 모달 제출
    const modalKeyMap = {
        'modal-password': 'modal-submit',
        'admin-password': 'admin-submit',
        'delete-password': 'delete-confirm',
        'edit-password': 'edit-confirm'
    };
    Object.entries(modalKeyMap).forEach(([inputId, btnId]) => {
        document.getElementById(inputId)?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById(btnId)?.click();
        });
    });

    // 동적 행 추가/삭제 버튼 이벤트 위임
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        if (action === 'add-family-row') addFamilyRow();
        else if (action === 'remove-last-family-row') removeLastFamilyRow();
        else if (action === 'add-budget-row') addBudgetRow();
        else if (action === 'remove-last-budget-row') removeLastBudgetRow();
    });

    // 예산 금액 입력 이벤트 위임
    document.addEventListener('input', (e) => {
        if (e.target.name === 'budget_amount[]') calcBudgetTotal();
    });
}

async function loadPosts() {
    try {
        const res = await supabase.fetch('posts_public?select=*&order=created_at.desc');
        if (!res.ok) throw new Error('게시글 로드 실패');
        state.posts = await res.json() || [];
    } catch (e) {
        console.error('Failed to load posts:', e);
        state.posts = [];
    }
    renderPosts();
}

function renderPosts() {
    const start = (state.currentPage - 1) * state.postsPerPage, end = start + state.postsPerPage;
    const wrapper = document.querySelector('.board-table-wrapper');
    wrapper.innerHTML = state.posts.slice(start, end).map((post, i) => {
        const country = post.country || '';
        const dateText = formatKSTDate(post.created_at);
        const countryBadge = country ? `<span class="country-badge">${escapeHtml(country)}</span>` : '';
        return `
            <div class="post-card" data-id="${post.id}">
                <div class="post-card-body">
                    <div class="post-card-title">
                        <svg class="lock-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="11" width="18" height="11" rx="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        구조요청
                        ${countryBadge}
                    </div>
                    <div class="post-card-meta">
                        <span class="post-card-number">No.${state.posts.length - start - i}</span>
                        <span class="post-card-dot"></span>
                        <span class="post-card-date">${dateText}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    wrapper.querySelectorAll('.post-card').forEach(card => card.addEventListener('click', () => handlePostClick(card.dataset.id)));
    renderPagination();
    updateStats();
}

function updateStats() {
    const totalEl = document.getElementById('stat-total');
    const todayEl = document.getElementById('stat-today');
    const countriesEl = document.getElementById('stat-countries');
    if (!totalEl) return;

    totalEl.textContent = state.posts.length;

    const todayStr = getKSTDate();
    const todayCount = state.posts.filter(p => {
        const d = new Date(p.created_at).toLocaleString('ko-KR', { ...KST_LOCALE_OPTIONS, year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '');
        return d === todayStr;
    }).length;
    todayEl.textContent = todayCount;

    const countries = new Set(state.posts.map(p => p.country).filter(Boolean));
    countriesEl.textContent = countries.size;
}

function renderPagination() {
    const total = Math.ceil(state.posts.length / state.postsPerPage);
    if (total <= 1) { elements.pagination.innerHTML = ''; return; }
    let html = state.currentPage > 1 ? `<button data-page="${state.currentPage - 1}">‹</button>` : '';
    for (let i = 1; i <= total; i++) html += `<button data-page="${i}" class="${i === state.currentPage ? 'active' : ''}">${i}</button>`;
    if (state.currentPage < total) html += `<button data-page="${state.currentPage + 1}">›</button>`;
    elements.pagination.innerHTML = html;
    elements.pagination.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => { state.currentPage = parseInt(btn.dataset.page); renderPosts(); }));
}

// 통합된 화면 전환 함수들 (pushHistory 파라미터로 중복 제거)
function showBoardList(pushHistory) {
    elements.boardList.classList.remove('hidden');
    elements.writeForm.classList.add('hidden');
    elements.viewPost.classList.add('hidden');
    if (elements.commentSection) {
        elements.commentSection.classList.add('hidden');
    }
    loadPosts();
    window.scrollTo(0, 0);
    if (pushHistory) {
        history.pushState({ page: 'list' }, '', window.location.pathname);
    }
}

function showWriteForm(pushHistory) {
    elements.boardList.classList.add('hidden');
    elements.writeForm.classList.remove('hidden');
    elements.viewPost.classList.add('hidden');
    if (elements.commentSection) {
        elements.commentSection.classList.add('hidden');
    }
    state.isEditing = false;
    state.editingPostId = null;
    elements.writeForm.querySelector('.form-header h2').textContent = '구조 요청 신청서 작성';
    resetForm();
    setCurrentDate();
    window.scrollTo(0, 0);
    if (pushHistory) {
        history.pushState({ page: 'write' }, '', window.location.pathname + '?write');
    }
}

function showViewPost(post, pushHistory) {
    elements.boardList.classList.add('hidden');
    elements.writeForm.classList.add('hidden');
    elements.viewPost.classList.remove('hidden');
    state.currentPostId = post.id;
    state.currentPostDetail = post;
    renderPostContent(post);
    loadComments(post.id);
    if (elements.commentSection) {
        elements.commentSection.classList.remove('hidden');
    }
    document.getElementById('pdf-post-btn')?.classList.toggle('hidden', !state.isAdmin);
    document.getElementById('word-post-btn')?.classList.toggle('hidden', !state.isAdmin);
    window.scrollTo(0, 0);
    if (pushHistory) {
        history.pushState({ page: 'view', postId: post.id }, '', window.location.pathname + '?view=' + post.id);
    }
}

function resetForm() {
    elements.rescueForm.reset();
    state.selectedFiles = [];
    elements.filePreview.innerHTML = '';
    elements.uploadProgress.classList.add('hidden');
    elements.docNumber.value = '';
    elements.familyRows.innerHTML = '<tr><td data-label="성명"><input type="text" name="family_name[]" class="form-input"></td><td data-label="관계"><input type="text" name="family_relation[]" class="form-input"></td><td data-label="나이"><input type="text" name="family_age[]" class="form-input"></td><td data-label="연락처"><input type="text" name="family_contact[]" class="form-input"></td></tr>';
    elements.budgetRows.innerHTML = '<tr><td data-label="세부항목"><input type="text" name="budget_item[]" class="form-input"></td><td data-label="산출근거"><input type="text" name="budget_basis[]" class="form-input"></td><td data-label="금액"><input type="text" name="budget_amount[]" class="form-input"></td></tr>';
    elements.budgetTotal.value = '';
    elements.submitBtn.disabled = false;
}

async function handlePostClick(postId) {
    state.currentPostId = postId;

    if (state.isAdmin) {
        await loadPostDetail(postId, null);
        return;
    }

    showPasswordModal();
}

function showPasswordModal() {
    elements.passwordModal.classList.remove('hidden');
    document.getElementById('modal-password').value = '';
    document.getElementById('modal-password').focus();
}

function hidePasswordModal() {
    elements.passwordModal.classList.add('hidden');
}

async function handlePasswordSubmit() {
    const pw = document.getElementById('modal-password').value;
    if (!pw) {
        showError('비밀번호를 입력하세요.');
        return;
    }

    showLoading();
    try {
        await loadPostDetail(state.currentPostId, pw);
        hidePasswordModal();
        hideLoading();
    } catch (e) {
        hideLoading();
        console.error(e);
        showError('비밀번호가 일치하지 않습니다.');
        document.getElementById('modal-password').value = '';
    }
}

async function loadPostDetail(postId, password) {
    try {
        let postDetail;

        if (state.isAdmin) {
            const res = await supabase.fetch(`posts?id=eq.${postId}&select=id,country,doc_number,data,attachments,created_at`);
            if (!res.ok) throw new Error('게시글 조회 실패');
            const posts = await res.json();
            if (!posts || posts.length === 0) {
                throw new Error('게시글을 찾을 수 없습니다.');
            }
            postDetail = posts[0];
        } else {
            const result = await supabase.rpc('get_post_detail', {
                post_id: postId,
                input_password: password
            });

            if (!result || result.length === 0) {
                throw new Error('비밀번호가 일치하지 않습니다.');
            }
            postDetail = result[0];
        }

        showViewPost(postDetail, true);
    } catch (e) {
        console.error('게시글 로드 실패:', e);
        throw e;
    }
}

function showAdminModal() {
    if (state.isAdmin) {
        state.isAdmin = false;
        sessionStorage.removeItem('isAdmin');
        elements.adminBtn.textContent = '관리자 로그인';
        elements.adminBtn.classList.remove('logged-in');
        elements.csvBtn.classList.add('hidden');
        renderPosts();
        showError('로그아웃 되었습니다.');
        return;
    }
    elements.adminModal.classList.remove('hidden');
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-password').focus();
}

function hideAdminModal() { elements.adminModal.classList.add('hidden'); }

async function handleAdminLogin() {
    const pw = document.getElementById('admin-password').value;

    if (!pw) {
        showError('비밀번호를 입력하세요.');
        return;
    }

    try {
        const isValid = await supabase.rpc('verify_admin_password', { input_password: pw });

        if (isValid) {
            state.isAdmin = true;
            sessionStorage.setItem('isAdmin', 'true');

            elements.adminBtn.textContent = '관리자 로그아웃';
            elements.adminBtn.classList.add('logged-in');
            elements.csvBtn.classList.remove('hidden');
            hideAdminModal();
            renderPosts();
            showError('관리자로 로그인되었습니다.');
        } else {
            showError('비밀번호가 일치하지 않습니다.');
            document.getElementById('admin-password').value = '';
        }
    } catch (e) {
        console.error(e);
        showError('오류가 발생했습니다.');
    }
}

function showDeleteModal() { elements.deleteModal.classList.remove('hidden'); document.getElementById('delete-password').value = ''; document.getElementById('delete-password').focus(); }
function hideDeleteModal() { elements.deleteModal.classList.add('hidden'); }

async function handleDeleteConfirm() {
    const pw = document.getElementById('delete-password').value;
    if (!pw) { showError('비밀번호를 입력하세요.'); return; }
    showLoading();
    try {
        const result = await supabase.rpc('delete_post', {
            post_id: state.currentPostId,
            input_password: pw
        });
        hideDeleteModal(); hideLoading();
        if (result === true) {
            showError('삭제되었습니다.');
            showBoardList(true);
        } else {
            showError('비밀번호가 일치하지 않습니다.');
        }
    } catch (err) { hideLoading(); showError('오류가 발생했습니다.'); console.error(err); }
}

function showEditModal() {
    elements.editModal.classList.remove('hidden');
    document.getElementById('edit-password').value = '';
    document.getElementById('edit-password').focus();
}

function hideEditModal() {
    elements.editModal.classList.add('hidden');
}

async function handleEditConfirm() {
    const pw = document.getElementById('edit-password').value;
    if (!pw) {
        showError('비밀번호를 입력하세요.');
        return;
    }

    showLoading();
    try {
        let postDetail;

        if (state.isAdmin) {
            const res = await supabase.fetch(`posts?id=eq.${state.currentPostId}&select=id,country,doc_number,data,attachments,created_at`);
            if (!res.ok) throw new Error('게시글 조회 실패');
            const posts = await res.json();
            if (!posts || posts.length === 0) {
                throw new Error('게시글을 찾을 수 없습니다.');
            }
            postDetail = posts[0];
        } else {
            const result = await supabase.rpc('get_post_detail', {
                post_id: state.currentPostId,
                input_password: pw
            });

            if (!result || result.length === 0) {
                hideLoading();
                showError('비밀번호가 일치하지 않습니다.');
                document.getElementById('edit-password').value = '';
                return;
            }
            postDetail = result[0];
        }

        hideEditModal();
        hideLoading();
        state.isEditing = true;
        state.editingPostId = state.currentPostId;
        showEditForm(postDetail);
    } catch (e) {
        hideLoading();
        console.error(e);
        showError('오류가 발생했습니다.');
    }
}

function showEditForm(post) {
    elements.boardList.classList.add('hidden');
    elements.viewPost.classList.add('hidden');
    elements.writeForm.classList.remove('hidden');
    elements.writeForm.querySelector('.form-header h2').textContent = '구조 요청 신청서 수정';
    elements.docNumber.value = post.doc_number || '';
    elements.writeDate.textContent = post.created_at
        ? new Date(post.created_at).toLocaleDateString('ko-KR', KST_LOCALE_OPTIONS)
        : getKSTDate();
    document.getElementById('password').value = '';
    document.getElementById('password').placeholder = '수정하려면 원래 비밀번호를 입력하세요';
    const d = post.data;
    ['position', 'country_city', 'name', 'illegal_reason', 'contact', 'illegal_period', 'current_address', 'korea_address', 'recommender_name', 'recommender_contact', 'recommender_org', 'recommender_email', 'recommender_address', 'local_life', 'health_status', 'return_plan', 'case_history', 'expert_opinion'].forEach(n => {
        const f = document.querySelector(`[name="${n}"]`); if (f) f.value = d[n] || '';
    });
    // 가족 행 복원
    const families = d.families || [];
    elements.familyRows.innerHTML = '';
    (families.length ? families : [{}]).forEach(fam => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td data-label="성명"><input type="text" name="family_name[]" class="form-input" value="${escapeHtml(fam.name || '')}"></td><td data-label="관계"><input type="text" name="family_relation[]" class="form-input" value="${escapeHtml(fam.relation || '')}"></td><td data-label="나이"><input type="text" name="family_age[]" class="form-input" value="${escapeHtml(fam.age || '')}"></td><td data-label="연락처"><input type="text" name="family_contact[]" class="form-input" value="${escapeHtml(fam.contact || '')}"></td>`;
        elements.familyRows.appendChild(tr);
    });
    // 상세내용 복원
    const detailTextarea = document.querySelector('.family-detail');
    if (detailTextarea && families.length > 0) {
        detailTextarea.value = families[0].detail || '';
    }
    // 예산 행 복원
    const budgets = d.budgets || [];
    elements.budgetRows.innerHTML = '';
    (budgets.length ? budgets : [{}]).forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td data-label="세부항목"><input type="text" name="budget_item[]" class="form-input" value="${escapeHtml(b.item || '')}"></td><td data-label="산출근거"><input type="text" name="budget_basis[]" class="form-input" value="${escapeHtml(b.basis || '')}"></td><td data-label="금액"><input type="text" name="budget_amount[]" class="form-input" value="${escapeHtml(b.amount || '')}"></td>`;
        elements.budgetRows.appendChild(tr);
    });
    elements.budgetTotal.value = d.budget_total || '';
    state.selectedFiles = post.attachments || [];
    renderFilePreview();
    window.scrollTo(0, 0);
}

// 동적 행 추가/삭제
function addFamilyRow() {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td data-label="성명"><input type="text" name="family_name[]" class="form-input"></td><td data-label="관계"><input type="text" name="family_relation[]" class="form-input"></td><td data-label="나이"><input type="text" name="family_age[]" class="form-input"></td><td data-label="연락처"><input type="text" name="family_contact[]" class="form-input"></td>';
    elements.familyRows.appendChild(tr);
}
function removeLastFamilyRow() {
    const rows = elements.familyRows.querySelectorAll('tr');
    if (rows.length > 1) rows[rows.length - 1].remove();
    else showError('최소 1개의 행이 필요합니다.');
}
function addBudgetRow() {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td data-label="세부항목"><input type="text" name="budget_item[]" class="form-input"></td><td data-label="산출근거"><input type="text" name="budget_basis[]" class="form-input"></td><td data-label="금액"><input type="text" name="budget_amount[]" class="form-input"></td>';
    elements.budgetRows.appendChild(tr);
}
function removeLastBudgetRow() {
    const rows = elements.budgetRows.querySelectorAll('tr');
    if (rows.length > 1) { rows[rows.length - 1].remove(); calcBudgetTotal(); }
    else showError('최소 1개의 행이 필요합니다.');
}
function calcBudgetTotal() {
    let total = 0;
    document.querySelectorAll('[name="budget_amount[]"]').forEach(input => {
        const val = parseInt(input.value.replace(/[^0-9]/g, '')) || 0;
        total += val;
    });
    elements.budgetTotal.value = total ? total.toLocaleString() : '';
}

// 파일 처리
async function processFiles(files) {
    for (const file of files) {
        if (file.size > MAX_FILE_SIZE) { showError(`${file.name}: 10MB 초과`); continue; }
        let processedFile = file;
        if (file.type.startsWith('image/')) {
            processedFile = await compressImage(file);
        }
        elements.submitBtn.disabled = true;
        elements.uploadProgress.classList.remove('hidden');
        try {
            const path = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
            await uploadWithProgress(processedFile, path);
            state.selectedFiles.push({ name: file.name, path: path, url: supabase.getFileUrl(path), type: file.type });
            renderFilePreview();
        } catch (e) { showError('업로드 실패: ' + file.name); console.error(e); }
        elements.uploadProgress.classList.add('hidden');
        elements.submitBtn.disabled = false;
    }
}

async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > MAX_IMAGE_DIMENSION || h > MAX_IMAGE_DIMENSION) {
                    if (w > h) { h = h * MAX_IMAGE_DIMENSION / w; w = MAX_IMAGE_DIMENSION; }
                    else { w = w * MAX_IMAGE_DIMENSION / h; h = MAX_IMAGE_DIMENSION; }
                }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', IMAGE_QUALITY);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function uploadWithProgress(file, path) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                elements.progressFill.style.width = pct + '%';
                elements.progressText.textContent = pct + '%';
            }
        });
        xhr.addEventListener('load', () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed')));
        xhr.addEventListener('error', () => reject(new Error('Upload error')));
        xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/attachments/${path}`);
        xhr.setRequestHeader('apikey', SUPABASE_KEY);
        xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_KEY}`);
        xhr.send(file);
    });
}

function renderFilePreview() {
    elements.filePreview.innerHTML = state.selectedFiles.map((file, i) => {
        const isImg = file.type?.startsWith('image/');
        const src = file.url || file.data;
        return `<div class="file-item">${isImg ? `<img src="${src}" alt="${escapeHtml(file.name)}">` : `<div class="file-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div>`}<div class="file-name">${escapeHtml(file.name)}</div><button type="button" class="remove-file" data-file-index="${i}">×</button></div>`;
    }).join('');

    // 이벤트 위임 대신 직접 바인딩 (파일 수가 적으므로)
    elements.filePreview.querySelectorAll('.remove-file').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.fileIndex);
            state.selectedFiles.splice(idx, 1);
            renderFilePreview();
        });
    });
}

async function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const country = fd.get('country_city'), pw = fd.get('password');
    if (!country || !pw) { showError('국가/도시와 비밀번호는 필수입니다.'); return; }
    showLoading();
    // 가족 데이터 수집
    const families = [];
    const fNames = fd.getAll('family_name[]'), fRels = fd.getAll('family_relation[]'), fAges = fd.getAll('family_age[]'), fDetails = fd.getAll('family_detail[]'), fContacts = fd.getAll('family_contact[]');
    for (let i = 0; i < fNames.length; i++) {
        if (fNames[i] || fRels[i] || fAges[i]) families.push({ name: fNames[i], relation: fRels[i], age: fAges[i], detail: fDetails[i], contact: fContacts[i] });
    }
    // 예산 데이터 수집
    const budgets = [];
    const bItems = fd.getAll('budget_item[]'), bBasis = fd.getAll('budget_basis[]'), bAmounts = fd.getAll('budget_amount[]');
    for (let i = 0; i < bItems.length; i++) {
        if (bItems[i] || bBasis[i] || bAmounts[i]) budgets.push({ item: bItems[i], basis: bBasis[i], amount: bAmounts[i] });
    }
    const data = {
        position: fd.get('position'), country_city: fd.get('country_city'), name: fd.get('name'), illegal_reason: fd.get('illegal_reason'), contact: fd.get('contact'), illegal_period: fd.get('illegal_period'), current_address: fd.get('current_address'), korea_address: fd.get('korea_address'),
        recommender_name: fd.get('recommender_name'), recommender_contact: fd.get('recommender_contact'), recommender_org: fd.get('recommender_org'), recommender_email: fd.get('recommender_email'), recommender_address: fd.get('recommender_address'),
        families, budgets, budget_total: fd.get('budget_total'),
        local_life: fd.get('local_life'), health_status: fd.get('health_status'), return_plan: fd.get('return_plan'), case_history: fd.get('case_history'), expert_opinion: fd.get('expert_opinion')
    };
    try {
        if (state.isEditing && state.editingPostId) {
            const result = await supabase.rpc('update_post', {
                post_id: state.editingPostId,
                input_password: pw,
                new_country: country,
                new_doc_number: elements.docNumber.value,
                new_data: data,
                new_attachments: state.selectedFiles
            });
            if (result === true) {
                state.isEditing = false; state.editingPostId = null;
                showError('수정되었습니다.');
                hideLoading(); showBoardList(true);
            } else {
                hideLoading();
                showError('비밀번호가 일치하지 않습니다.');
            }
        } else {
            await supabase.rpc('create_post', {
                p_country: country,
                p_password: pw,
                p_doc_number: elements.docNumber.value,
                p_data: data,
                p_attachments: state.selectedFiles
            });
            showError('제출되었습니다.');
            hideLoading(); showBoardList(true);
        }
    } catch (err) { hideLoading(); showError('오류가 발생했습니다.'); console.error(err); }
}

function renderPostContent(post) {
    const d = post.data;
    const dateStr = formatKSTDateTime(post.created_at);

    // 가족사항 행
    const famRows = (d.families || []).map(f => `
        <tr>
            <td data-label="성명"><span class="view-text">${escapeHtml(f.name || '')}</span></td>
            <td data-label="관계"><span class="view-text">${escapeHtml(f.relation || '')}</span></td>
            <td data-label="나이"><span class="view-text">${escapeHtml(f.age || '')}</span></td>
            <td data-label="연락처"><span class="view-text">${escapeHtml(f.contact || '')}</span></td>
        </tr>
    `).join('') || '<tr><td colspan="4">-</td></tr>';

    const famDetail = (d.families && d.families[0]) ? d.families[0].detail || '' : '';

    // 예산 행
    const budRows = (d.budgets || []).map(b => `
        <tr>
            <td data-label="세부항목"><span class="view-text">${escapeHtml(b.item || '')}</span></td>
            <td data-label="산출근거"><span class="view-text">${escapeHtml(b.basis || '')}</span></td>
            <td data-label="금액"><span class="view-text">${escapeHtml(b.amount || '')}</span></td>
        </tr>
    `).join('') || '<tr><td colspan="3">-</td></tr>';

    // 첨부파일
    const attHtml = post.attachments?.length ? `
        <h2 class="section-title">첨부파일</h2>
        <div class="attachments-grid">
            ${post.attachments.map(f => `
                <div class="attachment-item">
                    ${f.type?.startsWith('image/') ? `<img src="${f.url}" alt="">` : `<div class="file-icon" style="height:140px;display:flex;align-items:center;justify-content:center;background:#f2f2f2"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div>`}
                    <div class="attachment-info">
                        <span class="attachment-name">${escapeHtml(f.name)}</span>
                        <a href="${f.url}" target="_blank" class="download-btn">다운로드</a>
                    </div>
                </div>
            `).join('')}
        </div>
    ` : '';

    elements.postContent.innerHTML = `
        <div class="form-document" id="print-area">
            <div class="doc-header">
                <table class="info-table">
                    <tr>
                        <td class="label-cell">문서번호</td>
                        <td class="value-cell"><span class="view-text">${escapeHtml(post.doc_number || '')}</span></td>
                    </tr>
                </table>
                <h1 class="doc-title">Intake Report (구조 요청 신청서)</h1>
                <table class="info-table">
                    <tr>
                        <td class="label-cell">담당/직책</td>
                        <td class="value-cell"><span class="view-text">${escapeHtml(d.position || '')}</span></td>
                        <td class="label-cell">작성일</td>
                        <td class="value-cell"><span class="view-text">${dateStr}</span></td>
                    </tr>
                </table>
            </div>

            <h2 class="section-title">1. 구조 대상자 개요</h2>

            <!-- 인적사항 -->
            <div class="table-section">
                <div class="section-label-header"><span class="required">* 인적사항</span></div>
                <table class="data-table no-header">
                    <tr>
                        <td class="label-cell">국가/도시</td>
                        <td colspan="3"><span class="view-text">${escapeHtml(d.country_city || '')}</span></td>
                    </tr>
                    <tr>
                        <td class="label-cell">이름</td>
                        <td><span class="view-text">${escapeHtml(d.name || '')}</span></td>
                        <td class="label-cell">불법체류사유</td>
                        <td><span class="view-text">${escapeHtml(d.illegal_reason || '')}</span></td>
                    </tr>
                    <tr>
                        <td class="label-cell">연락처</td>
                        <td><span class="view-text">${escapeHtml(d.contact || '')}</span></td>
                        <td class="label-cell">불법체류기간</td>
                        <td><span class="view-text">${escapeHtml(d.illegal_period || '')}</span></td>
                    </tr>
                    <tr>
                        <td class="label-cell">현재주소</td>
                        <td colspan="3"><span class="view-text">${escapeHtml(d.current_address || '')}</span></td>
                    </tr>
                    <tr>
                        <td class="label-cell">한국 주소</td>
                        <td colspan="3"><span class="view-text">${escapeHtml(d.korea_address || '')}</span></td>
                    </tr>
                </table>
            </div>

            <!-- 추천인 -->
            <div class="table-section">
                <div class="section-label-header"><span class="required">* 추천인</span></div>
                <table class="data-table no-header">
                    <tr>
                        <td class="label-cell">성명</td>
                        <td><span class="view-text">${escapeHtml(d.recommender_name || '')}</span></td>
                        <td class="label-cell">연락처</td>
                        <td><span class="view-text">${escapeHtml(d.recommender_contact || '')}</span></td>
                    </tr>
                    <tr>
                        <td class="label-cell">소속 기관</td>
                        <td><span class="view-text">${escapeHtml(d.recommender_org || '')}</span></td>
                        <td class="label-cell">이메일</td>
                        <td><span class="view-text">${escapeHtml(d.recommender_email || '')}</span></td>
                    </tr>
                    <tr>
                        <td class="label-cell">기관 주소</td>
                        <td colspan="3"><span class="view-text">${escapeHtml(d.recommender_address || '')}</span></td>
                    </tr>
                </table>
            </div>

            <!-- 가족사항 -->
            <h2 class="section-title">가족사항</h2>
            <div class="dynamic-section">
                <div class="section-label-header mobile-only"><span class="required">* 가족사항</span></div>
                <table class="data-table family-table" id="family-table-view">
                    <thead>
                        <tr>
                            <th class="label-cell">성명</th>
                            <th class="label-cell">관계</th>
                            <th class="label-cell">나이</th>
                            <th class="label-cell">연락처</th>
                        </tr>
                    </thead>
                    <tbody>${famRows}</tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" class="detail-row">
                                <div class="detail-label">상세내용</div>
                                <div class="view-textarea">${escapeHtml(famDetail)}</div>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- 구조 예산안 -->
            <h2 class="section-title">구조 예산안</h2>
            <div class="dynamic-section">
                <div class="budget-table-header mobile-only">구조 예산안</div>
                <table class="data-table budget-table">
                    <thead>
                        <tr>
                            <th class="label-cell">세부항목</th>
                            <th class="label-cell">산출근거</th>
                            <th class="label-cell">금액</th>
                        </tr>
                    </thead>
                    <tbody>${budRows}</tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" class="label-cell">합계</td>
                            <td><span class="view-text">${escapeHtml(d.budget_total || '')}</span></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <h2 class="section-title section-divider">2. 세부사항</h2>

            <div class="detail-section">
                <div class="detail-header"><span class="detail-title"><span class="required">* 현지 생활 현황</span></span></div>
                <div class="view-textarea">${escapeHtml(d.local_life || '')}</div>
            </div>
            <div class="detail-section">
                <div class="detail-header"><span class="detail-title"><span class="required">* 건강상태</span></span></div>
                <div class="view-textarea">${escapeHtml(d.health_status || '')}</div>
            </div>
            <div class="detail-section">
                <div class="detail-header"><span class="detail-title"><span class="required">* 귀국 후 계획</span></span></div>
                <div class="view-textarea">${escapeHtml(d.return_plan || '')}</div>
            </div>
            <div class="detail-section">
                <div class="detail-header"><span class="detail-title"><span class="required">* 사례 접수 경위</span></span></div>
                <div class="view-textarea">${escapeHtml(d.case_history || '')}</div>
            </div>
            <div class="detail-section">
                <div class="detail-header"><span class="detail-title">전문가 의견</span></div>
                <div class="view-textarea">${escapeHtml(d.expert_opinion || '')}</div>
            </div>

            ${attHtml}
        </div>
    `;
}

function generatePDF() {
    const el = document.getElementById('print-area');
    if (!el) return showError('PDF 생성 영역이 없습니다.');
    const opt = { margin: 10, filename: `구조요청_${Date.now()}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from(el).save();
}

function generateWord() {
    const el = document.getElementById('print-area');
    if (!el) return showError('워드 생성 영역이 없습니다.');

    const styles = `
        <style>
            body { font-family: '맑은 고딕', sans-serif; font-size: 11pt; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
            td, th { border: 1px solid #333; padding: 6px 8px; }
            .section-label, .section-label-header { background-color: #dc3545; color: white; font-weight: bold; }
            .label-cell { background-color: #f2f2f2; text-align: center; }
            .doc-title { text-align: center; font-size: 16pt; font-weight: bold; margin: 15px 0; }
            .section-title { font-size: 12pt; font-weight: bold; margin: 15px 0 10px; }
            .view-textarea { border: 1px solid #ddd; padding: 8px; min-height: 40px; }
        </style>
    `;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            ${styles}
        </head>
        <body>
            ${el.innerHTML}
        </body>
        </html>
    `;

    const converted = htmlDocx.asBlob(html);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(converted);
    link.download = `구조요청_${Date.now()}.docx`;
    link.click();
}

function downloadCSV() {
    if (!state.isAdmin) { showError('관리자만 CSV를 다운로드할 수 있습니다.'); return; }
    // 관리자용: 전체 posts를 서버에서 가져와서 CSV 생성
    showLoading();
    supabase.fetch('posts?select=id,country,doc_number,data,created_at&order=created_at.desc')
        .then(res => {
            if (!res.ok) throw new Error('데이터 조회 실패');
            return res.json();
        })
        .then(posts => {
            hideLoading();
            if (!posts || !posts.length) { showError('데이터가 없습니다.'); return; }
            const headers = ['문서번호', '작성일', '국가/도시', '이름', '연락처', '불법체류사유', '불법체류기간', '현재주소', '한국주소'];
            const rows = posts.map(p => {
                const d = p.data || {};
                return [p.doc_number || '', p.created_at || '', d.country_city || '', d.name || '', d.contact || '', d.illegal_reason || '', d.illegal_period || '', d.current_address || '', d.korea_address || ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
            });
            const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `구조요청_${Date.now()}.csv`; a.click();
        })
        .catch(err => {
            hideLoading();
            console.error(err);
            showError('CSV 다운로드에 실패했습니다.');
        });
}

function escapeHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function showLoading() { elements.loadingOverlay.classList.remove('hidden'); }
function hideLoading() { elements.loadingOverlay.classList.add('hidden'); }

// 다크모드 관련 함수
function initTheme() {
    let theme = localStorage.getItem('theme');

    if (!theme) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            updateThemeIcon(newTheme);
        }
    });
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    if (elements.themeToggle) {
        elements.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// 댓글 기능
async function loadComments(postId) {
    try {
        const res = await supabase.fetch(`comments?post_id=eq.${postId}&select=*&order=created_at.asc`);
        if (!res.ok) throw new Error('댓글 로드 실패');
        const comments = await res.json() || [];
        renderComments(comments);
    } catch (e) {
        console.error('댓글 로드 실패:', e);
        if (elements.commentList) {
            elements.commentList.innerHTML = '<div class="comment-empty">댓글을 불러올 수 없습니다.</div>';
        }
        if (elements.commentCount) {
            elements.commentCount.textContent = '0';
        }
    }
}

function renderComments(comments) {
    if (!elements.commentList) return;

    if (elements.commentCount) {
        elements.commentCount.textContent = comments?.length || 0;
    }

    if (!comments || comments.length === 0) {
        elements.commentList.innerHTML = '<div class="comment-empty">첫 댓글을 남겨보세요.</div>';
        return;
    }

    const currentAuthorName = state.currentPostDetail?.data?.name || '익명';

    const html = comments.map(comment => {
        const isAdmin = comment.is_admin;
        const authorName = comment.author_name;
        const timeStr = formatCommentTime(comment.created_at);

        const canModify = state.isAdmin || (!isAdmin && authorName === currentAuthorName);

        const actionsHtml = canModify ? `
            <div class="comment-actions">
                <button class="btn-edit-comment" data-id="${comment.id}">수정</button>
                <button class="btn-delete-comment" data-id="${comment.id}">삭제</button>
            </div>
        ` : '';

        return `
            <div class="comment-item ${isAdmin ? 'admin' : ''}" data-comment-id="${comment.id}">
                <div class="comment-meta">
                    <div class="comment-meta-left">
                        <span class="comment-author ${isAdmin ? 'admin-badge' : ''}">${escapeHtml(authorName)}</span>
                        <span class="comment-time">${timeStr}</span>
                    </div>
                    ${actionsHtml}
                </div>
                <div class="comment-content" data-original-content="${escapeHtml(comment.content)}">${escapeHtml(comment.content)}</div>
            </div>
        `;
    }).join('');

    elements.commentList.innerHTML = html;

    elements.commentList.querySelectorAll('.btn-edit-comment').forEach(btn => {
        btn.addEventListener('click', () => handleEditComment(btn.dataset.id));
    });
    elements.commentList.querySelectorAll('.btn-delete-comment').forEach(btn => {
        btn.addEventListener('click', () => handleDeleteComment(btn.dataset.id));
    });
}

function formatCommentTime(dateStr) {
    if (!dateStr) return '';
    const commentTime = new Date(dateStr);
    const now = new Date();
    // UTC 기준으로 비교하여 타임존 관계없이 정확한 차이 계산
    const diff = now.getTime() - commentTime.getTime();

    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return Math.floor(diff / 60000) + '분 전';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '시간 전';

    return commentTime.toLocaleDateString('ko-KR', { ...KST_LOCALE_OPTIONS, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function handleCommentSubmit() {
    const content = elements.commentInput?.value.trim();

    if (!content) {
        showError('댓글 내용을 입력하세요.');
        return;
    }

    if (!state.currentPostDetail) {
        showError('게시글 정보를 불러올 수 없습니다.');
        return;
    }

    const isAdmin = state.isAdmin;
    const authorName = isAdmin ? '관리자' : (state.currentPostDetail.data?.name || '익명');

    try {
        showLoading();
        const res = await supabase.fetch('comments', {
            method: 'POST',
            body: JSON.stringify({
                post_id: state.currentPostId,
                content: content,
                author_name: authorName,
                is_admin: isAdmin
            })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || '댓글 등록 실패');
        }

        elements.commentInput.value = '';
        await loadComments(state.currentPostId);
        hideLoading();
    } catch (e) {
        hideLoading();
        console.error('댓글 등록 실패:', e);
        showError('댓글 등록에 실패했습니다.');
    }
}

function handleEditComment(commentId) {
    const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    if (!commentItem) return;

    const contentDiv = commentItem.querySelector('.comment-content');
    const originalContent = contentDiv.getAttribute('data-original-content');

    // 이미 수정 중인 다른 댓글이 있으면 취소
    document.querySelectorAll('.comment-edit-area').forEach(editArea => {
        const item = editArea.closest('.comment-item');
        cancelEditComment(item);
    });

    contentDiv.innerHTML = `
        <div class="comment-edit-area">
            <textarea class="edit-textarea">${originalContent}</textarea>
            <div class="comment-edit-actions">
                <button class="btn-cancel-edit">취소</button>
                <button class="btn-save">저장</button>
            </div>
        </div>
    `;

    const textarea = contentDiv.querySelector('.edit-textarea');
    const saveBtn = contentDiv.querySelector('.btn-save');
    const cancelBtn = contentDiv.querySelector('.btn-cancel-edit');

    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    saveBtn.addEventListener('click', () => saveEditComment(commentId, textarea.value, commentItem));
    cancelBtn.addEventListener('click', () => cancelEditComment(commentItem));

    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            saveEditComment(commentId, textarea.value, commentItem);
        }
    });
}

function cancelEditComment(commentItem) {
    const contentDiv = commentItem.querySelector('.comment-content');
    const originalContent = contentDiv.getAttribute('data-original-content');
    contentDiv.innerHTML = escapeHtml(originalContent);
}

async function saveEditComment(commentId, newContent, commentItem) {
    const trimmedContent = newContent.trim();

    if (!trimmedContent) {
        showError('댓글 내용을 입력하세요.');
        return;
    }

    try {
        showLoading();
        const res = await supabase.fetch(`comments?id=eq.${commentId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                content: trimmedContent
            })
        });

        if (!res.ok) {
            const error = await res.json();
            console.error('댓글 수정 응답 오류:', error);
            throw new Error(error.message || '댓글 수정 실패');
        }

        await loadComments(state.currentPostId);
        hideLoading();
    } catch (e) {
        hideLoading();
        console.error('댓글 수정 실패:', e);
        showError('댓글 수정에 실패했습니다.');
    }
}

async function handleDeleteComment(commentId) {
    if (!confirm('댓글을 삭제하시겠습니까?')) {
        return;
    }

    try {
        showLoading();
        const res = await supabase.fetch(`comments?id=eq.${commentId}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const error = await res.json();
            console.error('댓글 삭제 응답 오류:', error);
            throw new Error(error.message || '댓글 삭제 실패');
        }

        await loadComments(state.currentPostId);
        hideLoading();
    } catch (e) {
        hideLoading();
        console.error('댓글 삭제 실패:', e);
        showError('댓글 삭제에 실패했습니다.');
    }
}
