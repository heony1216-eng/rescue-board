// Supabase 설정
const SUPABASE_URL = 'https://duezqoujpeoooyzucgvy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1ZXpxb3VqcGVvb295enVjZ3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTk5NDgsImV4cCI6MjA4MzMzNTk0OH0.9cF2qa4HanWIjoNgqSs7PJELSDZny-vrS3n73t2ViDQ';

const supabase = {
    async fetch(endpoint, options = {}) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
            ...options,
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': options.prefer || 'return=representation', ...options.headers }
        });
        return res;
    }
};

const state = { posts: [], currentPage: 1, postsPerPage: 10, isAdmin: false, adminPassword: null, selectedFiles: [], currentPostId: null, isEditing: false, editingPostId: null };
let elements = {};

function initElements() {
    elements = { boardList: document.getElementById('board-list'), writeForm: document.getElementById('write-form'), viewPost: document.getElementById('view-post'), postList: document.getElementById('post-list'), pagination: document.getElementById('pagination'), writeBtn: document.getElementById('write-btn'), adminBtn: document.getElementById('admin-btn'), backToList: document.getElementById('back-to-list'), backToListView: document.getElementById('back-to-list-view'), cancelBtn: document.getElementById('cancel-btn'), rescueForm: document.getElementById('rescue-form'), postContent: document.getElementById('post-content'), passwordModal: document.getElementById('password-modal'), adminModal: document.getElementById('admin-modal'), deleteModal: document.getElementById('delete-modal'), editModal: document.getElementById('edit-modal'), loadingOverlay: document.getElementById('loading-overlay'), uploadZone: document.getElementById('upload-zone'), fileInput: document.getElementById('file-input'), filePreview: document.getElementById('file-preview'), docNumber: document.getElementById('doc-number'), writeDate: document.getElementById('write-date'), editPostBtn: document.getElementById('edit-post-btn'), deletePostBtn: document.getElementById('delete-post-btn'), printPostBtn: document.getElementById('print-post-btn') };
}

document.addEventListener('DOMContentLoaded', () => { initElements(); loadPosts(); loadAdminPassword(); setupEventListeners(); setCurrentDate(); });

async function loadAdminPassword() {
    try { const res = await supabase.fetch('admin?select=password&limit=1'); const data = await res.json(); if (data && data.length > 0) state.adminPassword = data[0].password; } catch (e) { console.error(e); }
}

function setupEventListeners() {
    elements.writeBtn.addEventListener('click', showWriteForm);
    elements.backToList.addEventListener('click', showBoardList);
    elements.backToListView.addEventListener('click', showBoardList);
    elements.cancelBtn.addEventListener('click', showBoardList);
    elements.rescueForm.addEventListener('submit', handleSubmit);
    elements.adminBtn.addEventListener('click', showAdminModal);
    document.getElementById('admin-submit').addEventListener('click', handleAdminLogin);
    document.getElementById('admin-cancel').addEventListener('click', hideAdminModal);
    document.getElementById('modal-submit').addEventListener('click', handlePasswordSubmit);
    document.getElementById('modal-cancel').addEventListener('click', hidePasswordModal);
    document.getElementById('delete-confirm').addEventListener('click', handleDeleteConfirm);
    document.getElementById('delete-cancel').addEventListener('click', hideDeleteModal);
    document.getElementById('edit-confirm').addEventListener('click', handleEditConfirm);
    document.getElementById('edit-cancel').addEventListener('click', hideEditModal);
    if (elements.editPostBtn) elements.editPostBtn.addEventListener('click', (e) => { e.preventDefault(); showEditModal(); });
    if (elements.deletePostBtn) elements.deletePostBtn.addEventListener('click', (e) => { e.preventDefault(); showDeleteModal(); });
    if (elements.printPostBtn) elements.printPostBtn.addEventListener('click', (e) => { e.preventDefault(); window.print(); });
    elements.uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); elements.uploadZone.classList.add('dragover'); });
    elements.uploadZone.addEventListener('dragleave', (e) => { e.preventDefault(); elements.uploadZone.classList.remove('dragover'); });
    elements.uploadZone.addEventListener('drop', (e) => { e.preventDefault(); elements.uploadZone.classList.remove('dragover'); processFiles(Array.from(e.dataTransfer.files)); });
    elements.fileInput.addEventListener('change', (e) => processFiles(Array.from(e.target.files)));
    document.getElementById('modal-password').addEventListener('keypress', (e) => { if (e.key === 'Enter') handlePasswordSubmit(); });
    document.getElementById('admin-password').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAdminLogin(); });
    document.getElementById('delete-password').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleDeleteConfirm(); });
    document.getElementById('edit-password').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleEditConfirm(); });
}

function setCurrentDate() { elements.writeDate.textContent = new Date().toISOString().split('T')[0]; }

async function loadPosts() {
    try { const res = await supabase.fetch('posts?select=*&order=created_at.desc'); state.posts = await res.json() || []; } catch (e) { state.posts = []; }
    renderPosts();
}

function renderPosts() {
    const start = (state.currentPage - 1) * state.postsPerPage, end = start + state.postsPerPage;
    elements.postList.innerHTML = state.posts.slice(start, end).map((post, i) => {
        const country = post.country ? `[${post.country}]` : '', author = state.isAdmin ? (post.data?.name || '익명') : '익명', date = post.created_at ? post.created_at.split('T')[0] : '';
        return `<tr data-id="${post.id}"><td class="col-no" style="text-align:center">${state.posts.length - start - i}</td><td class="col-title"><div class="post-title"><svg class="lock-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span>${country} 구조요청</span></div></td><td class="col-author">${escapeHtml(author)}</td><td class="col-date">${date}</td></tr>`;
    }).join('');
    elements.postList.querySelectorAll('tr').forEach(row => row.addEventListener('click', () => handlePostClick(row.dataset.id)));
    renderPagination();
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

function showBoardList() { elements.boardList.classList.remove('hidden'); elements.writeForm.classList.add('hidden'); elements.viewPost.classList.add('hidden'); loadPosts(); window.scrollTo(0, 0); }
function showWriteForm() { elements.boardList.classList.add('hidden'); elements.writeForm.classList.remove('hidden'); elements.viewPost.classList.add('hidden'); state.isEditing = false; state.editingPostId = null; elements.writeForm.querySelector('.form-header h2').textContent = '구조 요청 신청서 작성'; resetForm(); elements.docNumber.value = ''; setCurrentDate(); window.scrollTo(0, 0); }
function showViewPost(post) { elements.boardList.classList.add('hidden'); elements.writeForm.classList.add('hidden'); elements.viewPost.classList.remove('hidden'); state.currentPostId = post.id; renderPostContent(post); window.scrollTo(0, 0); }
function resetForm() { elements.rescueForm.reset(); state.selectedFiles = []; elements.filePreview.innerHTML = ''; }
function handlePostClick(postId) { state.currentPostId = postId; const post = state.posts.find(p => p.id === postId); if (!post) return; state.isAdmin ? showViewPost(post) : showPasswordModal(); }
function showPasswordModal() { elements.passwordModal.classList.remove('hidden'); document.getElementById('modal-password').value = ''; document.getElementById('modal-password').focus(); }
function hidePasswordModal() { elements.passwordModal.classList.add('hidden'); state.currentPostId = null; }
function handlePasswordSubmit() { const pw = document.getElementById('modal-password').value, post = state.posts.find(p => p.id === state.currentPostId); if (!post) { hidePasswordModal(); return; } if (pw === post.password || pw === state.adminPassword) { hidePasswordModal(); showViewPost(post); } else { alert('비밀번호가 일치하지 않습니다.'); document.getElementById('modal-password').value = ''; } }
function showAdminModal() { if (state.isAdmin) { state.isAdmin = false; elements.adminBtn.textContent = '관리자 로그인'; elements.adminBtn.classList.remove('logged-in'); renderPosts(); alert('로그아웃 되었습니다.'); return; } elements.adminModal.classList.remove('hidden'); document.getElementById('admin-password').value = ''; document.getElementById('admin-password').focus(); }
function hideAdminModal() { elements.adminModal.classList.add('hidden'); }
function handleAdminLogin() { const pw = document.getElementById('admin-password').value; if (pw === state.adminPassword) { state.isAdmin = true; elements.adminBtn.textContent = '관리자 로그아웃'; elements.adminBtn.classList.add('logged-in'); hideAdminModal(); renderPosts(); alert('관리자로 로그인되었습니다.'); } else { alert('비밀번호가 일치하지 않습니다.'); document.getElementById('admin-password').value = ''; } }
function showDeleteModal() { elements.deleteModal.classList.remove('hidden'); document.getElementById('delete-password').value = ''; document.getElementById('delete-password').focus(); }
function hideDeleteModal() { elements.deleteModal.classList.add('hidden'); }
async function handleDeleteConfirm() { const pw = document.getElementById('delete-password').value, post = state.posts.find(p => p.id === state.currentPostId); if (!post) { hideDeleteModal(); return; } if (pw === post.password || pw === state.adminPassword) { showLoading(); await supabase.fetch(`posts?id=eq.${state.currentPostId}`, { method: 'DELETE' }); hideDeleteModal(); hideLoading(); alert('삭제되었습니다.'); showBoardList(); } else { alert('비밀번호가 일치하지 않습니다.'); document.getElementById('delete-password').value = ''; } }
function showEditModal() { elements.editModal.classList.remove('hidden'); document.getElementById('edit-password').value = ''; document.getElementById('edit-password').focus(); }
function hideEditModal() { elements.editModal.classList.add('hidden'); }
function handleEditConfirm() { const pw = document.getElementById('edit-password').value, post = state.posts.find(p => p.id === state.currentPostId); if (!post) { hideEditModal(); return; } if (pw === post.password || pw === state.adminPassword) { hideEditModal(); state.isEditing = true; state.editingPostId = state.currentPostId; showEditForm(post); } else { alert('비밀번호가 일치하지 않습니다.'); document.getElementById('edit-password').value = ''; } }
function showEditForm(post) {
    elements.boardList.classList.add('hidden'); elements.viewPost.classList.add('hidden'); elements.writeForm.classList.remove('hidden');
    elements.writeForm.querySelector('.form-header h2').textContent = '구조 요청 신청서 수정';
    elements.docNumber.value = post.doc_number || ''; elements.writeDate.textContent = post.created_at ? post.created_at.split('T')[0] : '';
    document.getElementById('password').value = post.password;
    const d = post.data, fields = ['position','country_city','name','illegal_reason','contact','illegal_period','current_address','korea_address','recommender_name','recommender_contact','recommender_org','recommender_email','recommender_address','family1_name','family1_relation','family1_age','family1_detail','family1_contact','family2_name','family2_relation','family2_age','family2_detail','family2_contact','budget1_item','budget1_basis','budget1_amount','budget2_item','budget2_basis','budget2_amount','budget_total','local_life','health_status','return_plan','case_history','expert_opinion'];
    fields.forEach(n => { const f = document.querySelector(`[name="${n}"]`); if (f) f.value = d[n] || ''; });
    state.selectedFiles = post.attachments ? [...post.attachments] : []; renderFilePreview(); window.scrollTo(0, 0);
}

function processFiles(files) {
    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) { alert('파일이 너무 큽니다. (최대 10MB)'); return; }
        const reader = new FileReader();
        reader.onload = (e) => { state.selectedFiles.push({ name: file.name, type: file.type, data: e.target.result }); renderFilePreview(); };
        reader.readAsDataURL(file);
    });
}

function renderFilePreview() {
    elements.filePreview.innerHTML = state.selectedFiles.map((file, i) => `<div class="file-item">${file.type.startsWith('image/') ? `<img src="${file.data}" alt="${file.name}">` : `<div style="height:100px;display:flex;align-items:center;justify-content:center;background:#f2f2f2"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div>`}<div class="file-name">${escapeHtml(file.name)}</div><button type="button" class="remove-file" onclick="removeFile(${i})">×</button></div>`).join('');
}
function removeFile(i) { state.selectedFiles.splice(i, 1); renderFilePreview(); }

async function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target), country = fd.get('country_city'), pw = fd.get('password');
    if (!country || !pw) { alert('국가/도시와 비밀번호는 필수입니다.'); return; }
    showLoading();
    const data = {}, fields = ['position','country_city','name','illegal_reason','contact','illegal_period','current_address','korea_address','recommender_name','recommender_contact','recommender_org','recommender_email','recommender_address','family1_name','family1_relation','family1_age','family1_detail','family1_contact','family2_name','family2_relation','family2_age','family2_detail','family2_contact','budget1_item','budget1_basis','budget1_amount','budget2_item','budget2_basis','budget2_amount','budget_total','local_life','health_status','return_plan','case_history','expert_opinion'];
    fields.forEach(k => data[k] = fd.get(k));
    try {
        if (state.isEditing && state.editingPostId) {
            await supabase.fetch(`posts?id=eq.${state.editingPostId}`, { method: 'PATCH', body: JSON.stringify({ country, password: pw, doc_number: elements.docNumber.value, data, attachments: state.selectedFiles }) });
            state.isEditing = false; state.editingPostId = null; alert('수정되었습니다.');
        } else {
            await supabase.fetch('posts', { method: 'POST', body: JSON.stringify({ country, password: pw, doc_number: elements.docNumber.value, data, attachments: state.selectedFiles }) });
            alert('제출되었습니다.');
        }
        hideLoading(); showBoardList();
    } catch (err) { hideLoading(); alert('오류가 발생했습니다.'); console.error(err); }
}

function renderPostContent(post) {
    const d = post.data, att = post.attachments?.length > 0 ? `<div class="attachments-section"><h3>첨부파일</h3><div class="attachments-grid">${post.attachments.map((f, i) => `<div class="attachment-item">${f.type.startsWith('image/') ? `<img src="${f.data}" alt="${f.name}">` : `<div style="height:150px;display:flex;align-items:center;justify-content:center;background:#f2f2f2"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div>`}<div class="attachment-info"><span class="attachment-name">${escapeHtml(f.name)}</span><button class="download-btn" onclick="downloadFile(${i},'${post.id}')">다운로드</button></div></div>`).join('')}</div></div>` : '';
    elements.postContent.innerHTML = `<div class="form-document"><div class="doc-header"><table class="info-table"><tr><td class="label-cell">문서번호</td><td class="value-cell">${escapeHtml(post.doc_number || '')}</td></tr></table><h1 class="doc-title">Intake Report (구조 요청 신청서)</h1><table class="info-table"><tr><td class="label-cell">담당/직책</td><td class="value-cell">${escapeHtml(d.position || '')}</td><td class="label-cell">작성일</td><td class="value-cell">${post.created_at ? post.created_at.split('T')[0] : ''}</td></tr></table></div><h2 class="section-title">1. 구조 대상자 개요</h2><table class="data-table"><tr><td rowspan="5" class="section-label"><span class="required">* 인적사항</span></td><td class="label-cell">국가/도시</td><td colspan="3">${escapeHtml(d.country_city || '')}</td></tr><tr><td class="label-cell">이름</td><td>${escapeHtml(d.name || '')}</td><td class="label-cell">불법체류사유</td><td>${escapeHtml(d.illegal_reason || '')}</td></tr><tr><td class="label-cell">연락처</td><td>${escapeHtml(d.contact || '')}</td><td class="label-cell">불법체류기간</td><td>${escapeHtml(d.illegal_period || '')}</td></tr><tr><td class="label-cell">현재주소</td><td colspan="3">${escapeHtml(d.current_address || '')}</td></tr><tr><td class="label-cell">한국 주소</td><td colspan="3">${escapeHtml(d.korea_address || '')}</td></tr></table><table class="data-table"><tr><td rowspan="3" class="section-label"><span class="required">* 추천인</span></td><td class="label-cell">성명</td><td>${escapeHtml(d.recommender_name || '')}</td><td class="label-cell">연락처</td><td>${escapeHtml(d.recommender_contact || '')}</td></tr><tr><td class="label-cell">소속 기관</td><td>${escapeHtml(d.recommender_org || '')}</td><td class="label-cell">이메일</td><td>${escapeHtml(d.recommender_email || '')}</td></tr><tr><td class="label-cell">기관 주소</td><td colspan="3">${escapeHtml(d.recommender_address || '')}</td></tr></table><table class="data-table"><tr><td rowspan="3" class="section-label"><span class="required">* 가족사항</span></td><td class="label-cell header">성명</td><td class="label-cell header">관계</td><td class="label-cell header">나이</td><td class="label-cell header">상세내용</td><td class="label-cell header">연락처</td></tr><tr><td>${escapeHtml(d.family1_name || '')}</td><td>${escapeHtml(d.family1_relation || '')}</td><td>${escapeHtml(d.family1_age || '')}</td><td>${escapeHtml(d.family1_detail || '')}</td><td>${escapeHtml(d.family1_contact || '')}</td></tr><tr><td>${escapeHtml(d.family2_name || '')}</td><td>${escapeHtml(d.family2_relation || '')}</td><td>${escapeHtml(d.family2_age || '')}</td><td>${escapeHtml(d.family2_detail || '')}</td><td>${escapeHtml(d.family2_contact || '')}</td></tr></table><h2 class="section-title">구조 예산안</h2><table class="data-table budget-table"><thead><tr><td class="label-cell header">세부항목</td><td class="label-cell header">산출근거</td><td class="label-cell header">금액</td></tr></thead><tbody><tr><td>${escapeHtml(d.budget1_item || '')}</td><td>${escapeHtml(d.budget1_basis || '')}</td><td>${escapeHtml(d.budget1_amount || '')}</td></tr><tr><td>${escapeHtml(d.budget2_item || '')}</td><td>${escapeHtml(d.budget2_basis || '')}</td><td>${escapeHtml(d.budget2_amount || '')}</td></tr><tr><td colspan="2" class="label-cell">합계</td><td>${escapeHtml(d.budget_total || '')}</td></tr></tbody></table><h2 class="section-title section-divider">2. 세부사항</h2><div class="detail-section"><div class="detail-header"><span class="detail-title"><span class="required">* 현지 생활 현황</span></span></div><div class="form-textarea" style="min-height:80px;white-space:pre-wrap">${escapeHtml(d.local_life || '')}</div></div><div class="detail-section"><div class="detail-header"><span class="detail-title"><span class="required">* 건강상태</span></span></div><div class="form-textarea" style="min-height:80px;white-space:pre-wrap">${escapeHtml(d.health_status || '')}</div></div><div class="detail-section"><div class="detail-header"><span class="detail-title"><span class="required">* 귀국 후 계획</span></span></div><div class="form-textarea" style="min-height:80px;white-space:pre-wrap">${escapeHtml(d.return_plan || '')}</div></div><div class="detail-section"><div class="detail-header"><span class="detail-title"><span class="required">* 사례 접수 경위</span></span></div><div class="form-textarea" style="min-height:80px;white-space:pre-wrap">${escapeHtml(d.case_history || '')}</div></div><div class="detail-section"><div class="detail-header"><span class="detail-title">전문가 의견</span></div><div class="form-textarea" style="min-height:80px;white-space:pre-wrap">${escapeHtml(d.expert_opinion || '')}</div></div></div>${att}`;
}

function downloadFile(i, postId) { const post = state.posts.find(p => p.id === postId); if (!post?.attachments?.[i]) return; const f = post.attachments[i], a = document.createElement('a'); a.href = f.data; a.download = f.name; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
function escapeHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function showLoading() { elements.loadingOverlay.classList.remove('hidden'); }
function hideLoading() { elements.loadingOverlay.classList.add('hidden'); }
window.removeFile = removeFile;
window.downloadFile = downloadFile;
