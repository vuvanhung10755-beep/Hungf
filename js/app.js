(function () {
  const STORAGE_KEY = 'hung-ai-conversations';

  // ---------- DOM refs ----------
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const menuBtn = document.getElementById('menuBtn');
  const newChatBtn = document.getElementById('newChatBtn');
  const convoList = document.getElementById('convoList');
  const welcome = document.getElementById('welcome');
  const messagesEl = document.getElementById('messages');
  const suggestions = document.getElementById('suggestions');
  const composer = document.getElementById('composer');
  const input = document.getElementById('input');
  const sendBtn = document.getElementById('sendBtn');

  // ---------- State ----------
  let conversations = loadConversations();
  let currentId = null;
  let typingEl = null;

  // ---------- Storage helpers ----------
  function loadConversations() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveConversations() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
      /* Bộ nhớ trình duyệt đầy hoặc bị chặn — bỏ qua, không chặn trải nghiệm chat. */
    }
  }

  function getCurrentConvo() {
    return conversations.find((c) => c.id === currentId) || null;
  }

  // ---------- Sidebar rendering ----------
  function renderConvoList() {
    convoList.innerHTML = '';
    if (conversations.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'convo-empty';
      empty.textContent = 'Chưa có cuộc trò chuyện nào.';
      convoList.appendChild(empty);
      return;
    }
    const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
    sorted.forEach((c) => {
      const item = document.createElement('div');
      item.className = 'convo-item' + (c.id === currentId ? ' active' : '');

      const title = document.createElement('span');
      title.className = 'convo-title';
      title.textContent = c.title || 'Cuộc trò chuyện mới';
      item.appendChild(title);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'convo-delete';
      delBtn.title = 'Xóa cuộc trò chuyện này';
      delBtn.innerHTML = '&times;';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteConversation(c.id);
      });
      item.appendChild(delBtn);

      item.addEventListener('click', () => openConversation(c.id));
      convoList.appendChild(item);
    });
  }

  function deleteConversation(id) {
    conversations = conversations.filter((c) => c.id !== id);
    saveConversations();
    if (currentId === id) {
      startNewConversation();
    } else {
      renderConvoList();
    }
  }

  function openConversation(id) {
    currentId = id;
    const convo = getCurrentConvo();
    messagesEl.innerHTML = '';
    if (!convo || convo.messages.length === 0) {
      showWelcome();
    } else {
      hideWelcome();
      convo.messages.forEach((m) => renderMessage(m.role, m.text));
    }
    renderConvoList();
    closeSidebarOnMobile();
    scrollToBottom();
  }

  function startNewConversation() {
    currentId = null;
    messagesEl.innerHTML = '';
    showWelcome();
    renderConvoList();
    closeSidebarOnMobile();
    input.focus();
  }

  // ---------- Welcome screen ----------
  function showWelcome() {
    welcome.style.display = 'flex';
    messagesEl.style.display = 'none';
  }
  function hideWelcome() {
    welcome.style.display = 'none';
    messagesEl.style.display = 'flex';
  }

  // ---------- Message rendering ----------
  function renderMessage(role, text) {
    const bubble = document.createElement('div');
    bubble.className = 'msg ' + role;
    if (role === 'ai' && window.marked) {
      bubble.innerHTML = marked.parse(text);
    } else {
      bubble.textContent = text;
    }

    if (role === 'ai') {
      const row = document.createElement('div');
      row.className = 'msg-row';
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = '🐻';
      row.appendChild(avatar);
      row.appendChild(bubble);
      messagesEl.appendChild(row);
      return row;
    }

    messagesEl.appendChild(bubble);
    return bubble;
  }

  function showTyping() {
    const row = document.createElement('div');
    row.className = 'msg-row';
    const avatar = document.createElement('div');
    avatar.className = 'avatar speaking';
    avatar.textContent = '🐻';
    typingEl = document.createElement('div');
    typingEl.className = 'typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    row.appendChild(avatar);
    row.appendChild(typingEl);
    typingEl = row;
    messagesEl.appendChild(row);
    scrollToBottom();
  }
  function hideTyping() {
    if (typingEl) {
      typingEl.remove();
      typingEl = null;
    }
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showError(text) {
    const err = document.createElement('div');
    err.className = 'error-banner';
    err.textContent = text;
    messagesEl.appendChild(err);
    scrollToBottom();
  }

  // ---------- Sidebar open/close (mobile) ----------
  function closeSidebarOnMobile() {
    if (window.innerWidth <= 860) {
      sidebar.classList.remove('open');
      sidebarBackdrop.classList.remove('show');
    }
  }

  menuBtn.addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarBackdrop.classList.add('show');
  });
  sidebarBackdrop.addEventListener('click', closeSidebarOnMobile);
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });

  newChatBtn.addEventListener('click', startNewConversation);

  // ---------- Suggestion chips ----------
  suggestions.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    input.value = chip.dataset.p || chip.textContent;
    updateSendState();
    composer.requestSubmit();
  });

  // ---------- Textarea behaviour ----------
  function updateSendState() {
    sendBtn.disabled = input.value.trim().length === 0;
  }
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
    updateSendState();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) composer.requestSubmit();
    }
  });

  // ---------- Sending messages ----------
  composer.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    // Tạo cuộc trò chuyện mới nếu đây là tin nhắn đầu tiên
    if (!currentId) {
      const id = 'c_' + Date.now();
      conversations.push({
        id,
        title: text.length > 32 ? text.slice(0, 32) + '…' : text,
        messages: [],
        updatedAt: Date.now()
      });
      currentId = id;
    }

    const convo = getCurrentConvo();
    hideWelcome();

    renderMessage('user', text);
    convo.messages.push({ role: 'user', text });
    convo.updatedAt = Date.now();
    saveConversations();
    renderConvoList();

    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;
    scrollToBottom();
    showTyping();

    try {
      const payload = {
        messages: convo.messages.map((m) => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text
        }))
      };

      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || data.error || 'Lỗi không xác định');
      }

      const replyText = (data.content || [])
        .map((block) => (block.type === 'text' ? block.text : ''))
        .filter(Boolean)
        .join('\n');

      hideTyping();
      renderMessage('ai', replyText || '(không có phản hồi)');
      convo.messages.push({ role: 'ai', text: replyText || '(không có phản hồi)' });
      convo.updatedAt = Date.now();
      saveConversations();
      renderConvoList();
    } catch (err) {
      hideTyping();
      showError('Có lỗi xảy ra: ' + err.message);
    } finally {
      updateSendState();
      scrollToBottom();
      input.focus();
    }
  });

  // ---------- Init ----------
  renderConvoList();
  showWelcome();
  updateSendState();
})();
