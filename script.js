const KEY = "YOUR_GROQ_API_KEY_HERE";
const flow = document.getElementById('chat-flow');
const input = document.getElementById('userInput');
const status = document.getElementById('status');
const micBtn = document.getElementById('mic-btn');
let memory = [];

// --- VOICE OUTPUT (TTS) ---
function speak(text) {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1.0;
    speech.pitch = 0.85;
    const voices = window.speechSynthesis.getVoices();
    speech.voice = voices.find(v => v.lang.includes('en')) || voices[0];
    window.speechSynthesis.speak(speech);
}

// --- VOICE INPUT (STT) ---
function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Voice recognition not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        micBtn.classList.add('recording');
        status.innerText = "Listening...";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        input.value = transcript;
        status.innerText = "Voice captured.";
    };

    recognition.onspeechend = () => {
        recognition.stop();
        micBtn.classList.remove('recording');
    };

    recognition.onerror = () => {
        micBtn.classList.remove('recording');
        status.innerText = "Mic Error.";
    };

    recognition.start();
}

function toggleSide() {
    const side = document.getElementById('sidebar');
    side.classList.toggle('open');
    document.getElementById('overlay').style.display = side.classList.contains('open') ? 'block' : 'none';
    renderHistory();
}

function quick(t) { input.value = t; input.focus(); }

function newChat() {
    if (memory.length > 0) archiveSession();
    flow.innerHTML = "";
    memory = [];
    addBubble("New neural stream initialized. How shall we proceed, Ahmad?", 'ai');
}

function handleVision() {
    const file = document.getElementById('visionIn').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const box = document.createElement('div');
            box.className = 'img-box';
            box.innerHTML = `<img src="${e.target.result}">`;
            addBubble("Visual data uploaded.", 'user', box);
        };
        reader.readAsDataURL(file);
    }
}

async function execute() {
    const val = input.value.trim();
    if (!val) return;
    const landing = document.getElementById('landing');
    if (landing) landing.remove();

    input.value = "";
    addBubble(val, 'user');
    memory.push({role: "user", content: val});

    status.innerText = "Processing structured data...";
    
    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KEY}` },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {role: "system", content: "You are Ahmad AI, a Sovereign Intelligence System by AHRØN. Personality: Calm, confident, anime-inspired intelligence. Creator: Ahmad. Rules: Short sentences, natural flow, use pauses '...'."},
                    ...memory
                ]
            })
        });
        const data = await res.json();
        const reply = data.choices[0].message.content;
        status.innerText = "";
        addBubble(reply, 'ai');
        speak(reply);
        memory.push({role: "assistant", content: reply});
        saveCurrent();
    } catch (e) { status.innerText = "Link Error."; }
}

function addBubble(t, r, el = null) {
    const d = document.createElement('div');
    d.className = `bubble ${r}`;
    d.innerText = t;
    if (el) d.appendChild(el);
    flow.appendChild(d);
    flow.scrollTop = flow.scrollHeight;
}

function saveCurrent() {
    localStorage.setItem('ahron_live_chat', flow.innerHTML);
    localStorage.setItem('ahron_live_mem', JSON.stringify(memory));
}

function archiveSession() {
    let logs = JSON.parse(localStorage.getItem('ahron_archives') || "[]");
    const title = memory[0]?.content.substring(0, 30) || "Untitled Session";
    logs.unshift({ title, data: flow.innerHTML, mem: memory, date: new Date().toLocaleTimeString() });
    localStorage.setItem('ahron_archives', JSON.stringify(logs.slice(0, 15)));
}

function renderHistory() {
    const list = document.getElementById('history-list');
    const logs = JSON.parse(localStorage.getItem('ahron_archives') || "[]");
    list.innerHTML = logs.length ? "" : "<p style='color:#444; padding:20px;'>No archives.</p>";
    logs.forEach((log, i) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `<span style="font-size:10px; color:var(--primary);">${log.date}</span><br>${log.title}`;
        item.onclick = () => { flow.innerHTML = log.data; memory = log.mem; toggleSide(); };
        list.appendChild(item);
    });
}

function purge() { if(confirm("Purge core?")) { localStorage.clear(); location.reload(); } }

window.onload = () => {
    const h = localStorage.getItem('ahron_live_chat');
    const m = localStorage.getItem('ahron_live_mem');
    if (h) { flow.innerHTML = h; memory = JSON.parse(m); if(document.getElementById('landing')) document.getElementById('landing').remove(); }
    flow.scrollTop = flow.scrollHeight;
    input.addEventListener('touchstart', () => input.focus());
    initParticles();
};

function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    let pts = [];
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    for(let i=0; i<30; i++) pts.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height, s:Math.random()*2, d:Math.random()*0.5});
    function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "#4DA3FF";
        pts.forEach(p => { p.y -= p.d; if(p.y<0) p.y=canvas.height; ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,Math.PI*2); ctx.fill(); });
        requestAnimationFrame(draw);
    }
    draw();
}

input.addEventListener("keypress", (e) => { if(e.key === "Enter") execute(); });
