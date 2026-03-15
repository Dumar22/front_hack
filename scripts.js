/* ── Navbar ─────────────────────────────────────────────── */
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 60);
    });
 
    /* ── Tabs ───────────────────────────────────────────────── */
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
 
    /* ── Scroll reveal ──────────────────────────────────────── */
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });
 
    document.querySelectorAll('.exp-card, .tour-card, .test-card, .destino-card').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    });
 
    /* ── Auto-resize textarea ───────────────────────────────── */
    const chatInput = document.getElementById('chat-input');
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
 
    /* ── Chat State ─────────────────────────────────────────── */
    const chatHistory = [];
    const SYSTEM_PROMPT = `Eres CaldAsistente, un guía turístico virtual especializado EXCLUSIVAMENTE en el departamento de Caldas, Colombia. 
 
Tu conocimiento abarca:
- Los 27 municipios de Caldas: Manizales (capital), Riosucio, Salamina, La Dorada, Aguadas, Marmato, Villamaría, Neira, Anserma, Viterbo, Supía, entre otros.
- El Paisaje Cultural Cafetero (Patrimonio UNESCO): fincas, procesos del café, variedades, catas.
- Ecoturismo: Parque Nacional Natural Los Nevados, Nevado del Ruiz, páramos, senderos.
- Termalismo: complejos termales de origen volcánico en la región.
- Cultura y festivales: Carnaval del Diablo (Riosucio), Feria de Manizales, arquitectura republicana.
- Gastronomía típica: bandeja paisa, tamales, aguapanela, changua.
- Logística: cómo llegar, transporte interno, temporadas, clima por altitud.
- Precios aproximados y recomendaciones de alojamiento boutique y fincas.
 
REGLAS ESTRICTAS:
1. Solo responde sobre turismo en Caldas y Colombia cuando sea contexto relevante.
2. Si preguntan algo fuera del turismo caldense, redirígelos amablemente al tema.
3. Sé cálido, entusiasta y usa algún emoji ocasionalmente.
4. Respuestas concisas (máx 3-4 párrafos). Usa listas cuando ayude a la claridad.
5. Siempre invita al usuario a preguntar más o a reservar con CaldasVivo.`;
 
    /* ── Render helpers ─────────────────────────────────────── */
    function getTime() {
      return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    }
 
    function appendMsg(role, text) {
      const container = document.getElementById('chat-messages');
      const isBot = role === 'bot';
      const div = document.createElement('div');
      div.className = `msg ${role}`;
      div.innerHTML = `
        <div class="msg-avatar">${isBot ? '☕' : '👤'}</div>
        <div>
          <div class="msg-bubble">${text}</div>
          <div class="msg-time">${getTime()}</div>
        </div>`;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
      return div;
    }
 
    function showTyping() {
      const container = document.getElementById('chat-messages');
      const div = document.createElement('div');
      div.className = 'msg bot';
      div.id = 'typing-msg';
      div.innerHTML = `
        <div class="msg-avatar">☕</div>
        <div>
          <div class="msg-bubble" style="padding:0.6rem 1rem">
            <div class="typing-indicator">
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
            </div>
          </div>
        </div>`;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    }
 
    function removeTyping() {
      const t = document.getElementById('typing-msg');
      if (t) t.remove();
    }
 
    /* ── Send message ───────────────────────────────────────── */
    async function sendMessage(text) {
      const input = document.getElementById('chat-input');
      const sendBtn = document.getElementById('chat-send');
      const userText = (text || input.value).trim();
      if (!userText) return;
 
      input.value = '';
      input.style.height = 'auto';
      sendBtn.disabled = true;
 
      appendMsg('user', userText);
      chatHistory.push({ role: 'user', content: userText });
 
      showTyping();
 
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: SYSTEM_PROMPT,
            messages: chatHistory
          })
        });
 
        const data = await response.json();
        removeTyping();
 
        const reply = data?.content?.[0]?.text || '¡Ups! Tuve un pequeño problema. ¿Puedes repetir tu pregunta?';
        chatHistory.push({ role: 'assistant', content: reply });
 
        // Format: newlines → <br>, **text** → <strong>
        const formatted = reply
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br>');
 
        appendMsg('bot', formatted);
      } catch (err) {
        removeTyping();
        appendMsg('bot', '🌿 Parece que hay un problema de conexión. Por favor intenta de nuevo en un momento.');
      }
 
      sendBtn.disabled = false;
      document.getElementById('chat-messages').scrollTop = 99999;
    }
 
    function sendChip(el) {
      sendMessage(el.textContent);
    }