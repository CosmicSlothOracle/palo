/**
 * Kosge-Berlin Groq-powered chatbot widget.
 * Requires `window.GROQ_API_KEY` injected by chatbotKey.js.
 */

(function () {
    if (!window.GROQ_API_KEY) {
        console.error('Groq API key not found. Ensure chatbotKey.js is loaded.');
        return;
    }

    const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
    const MODEL = 'mixtral-8x7b';
    const LANG = document.documentElement.lang || 'de';
    const KB_URL = `/kb/${LANG}.json`;
    let knowledge = null;

    // Prefetch knowledge base file
    fetch(KB_URL).then(r => r.ok ? r.json() : null).then(d => (knowledge = d)).catch(() => {});

    // Chat state
    let history = JSON.parse(sessionStorage.getItem('kosge_chat_history') || '[]');
    function persist() {
        sessionStorage.setItem('kosge_chat_history', JSON.stringify(history.slice(-15)));
    }

    // === UI construction ===
    const style = document.createElement('style');
    style.textContent = `
#kosge-chat-btn{position:fixed;bottom:24px;right:24px;width:60px;height:60px;border-radius:50%;background:var(--secondary-color,#007bff);color:#fff;border:none;cursor:pointer;font-size:28px;z-index:1000;display:flex;align-items:center;justify-content:center}
#kosge-chat-dialog{position:fixed;bottom:100px;right:24px;width:320px;max-height:70vh;display:none;flex-direction:column;border:1px solid #ccc;border-radius:8px;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:1000}
#kosge-chat-dialog header{background:var(--secondary-color,#007bff);color:#fff;padding:8px 12px;font-weight:bold;display:flex;justify-content:space-between;align-items:center}
#kosge-chat-dialog .messages{flex:1;padding:8px;overflow-y:auto;font-size:14px}
#kosge-chat-dialog form{display:flex;border-top:1px solid #ddd}
#kosge-chat-dialog input{flex:1;border:none;padding:8px;font-size:14px}
#kosge-chat-dialog button[type="submit"]{border:none;background:transparent;color:var(--secondary-color,#007bff);padding:0 12px;font-size:16px;cursor:pointer}
#kosge-chat-dialog .user{text-align:right;margin:4px 0}
#kosge-chat-dialog .assistant{text-align:left;margin:4px 0}
    `;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.id = 'kosge-chat-btn';
    btn.setAttribute('aria-label', 'Chatbot – Hilfe');
    btn.innerHTML = '&#128172;';
    document.body.appendChild(btn);

    const dialog = document.createElement('div');
    dialog.id = 'kosge-chat-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.innerHTML = `
<header><span>Hilfe</span><button aria-label="Schließen" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer">&times;</button></header>
<div class="messages"></div>
<form><input type="text" placeholder="Ihre Frage…" aria-label="Nachricht eingeben" required><button type="submit">&#10148;</button></form>`;
    document.body.appendChild(dialog);

    const closeBtn = dialog.querySelector('header button');
    const form = dialog.querySelector('form');
    const input = dialog.querySelector('input');
    const messagesDiv = dialog.querySelector('.messages');

    function addMsg(role, text) {
        const div = document.createElement('div');
        div.className = role;
        div.textContent = text;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function renderHistory() {
        messagesDiv.innerHTML = '';
        history.forEach(m => addMsg(m.role === 'user' ? 'user' : 'assistant', m.content));
    }

    renderHistory();

    let lastFocused = null;

    function openChat() {
        lastFocused = document.activeElement;
        dialog.style.display = 'flex';
        renderHistory();
        setTimeout(() => input.focus(), 0);
    }

    function closeChat() {
        dialog.style.display = 'none';
        if (lastFocused) lastFocused.focus();
    }

    btn.addEventListener('click', openChat);
    closeBtn.addEventListener('click', closeChat);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && dialog.style.display === 'flex') closeChat();
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const question = input.value.trim();
        if (!question) return;
        input.value = '';
        history.push({ role: 'user', content: question });
        addMsg('user', question);

        addMsg('assistant', '…');
        const loadingDiv = messagesDiv.lastChild;

        const payload = {
            model: MODEL,
            messages: [
                { role: 'system', content: `You are the helpful Kosge-Berlin assistant. Answer in ${LANG}. Knowledge: ${knowledge ? JSON.stringify(knowledge) : 'none'}` },
                ...history.slice(-10),
            ],
            temperature: 0.4,
        };

        try {
            const res = await fetch(ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${window.GROQ_API_KEY}`,
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            const answer =
                data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
                    ? data.choices[0].message.content.trim()
                    : 'Entschuldigung, ein Fehler ist aufgetreten.';
            loadingDiv.remove();
            addMsg('assistant', answer);
            history.push({ role: 'assistant', content: answer });
            persist();
        } catch (err) {
            loadingDiv.textContent = 'Netzwerkfehler.';
        }
    });
})();