// --- CONFIGURATION ---
const p1 = "gsk_C9K6bjL2jsG5Zwx9gUStWGdy"; 
const p2 = "b3FYmQ75HrKi8VKrxM43203l0R8V";
const KEY = p1 + p2;

const flow = document.getElementById('chat-flow');
const input = document.getElementById('userInput');
const status = document.getElementById('status');
const micBtn = document.getElementById('mic-btn');
let memory = [];
let currentImageBase64 = null; 

// --- VISION HANDLER ---
function handleVision() {
    const file = document.getElementById('visionIn').files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        currentImageBase64 = e.target.result;
        
        const imgBox = document.createElement('div');
        imgBox.className = 'img-box';
        imgBox.style.textAlign = 'right';
        imgBox.innerHTML = `<img src="${currentImageBase64}" style="max-width:200px; border-radius:15px; border:2px solid var(--primary); margin:10px 0; box-shadow: 0 0 15px rgba(77,163,255,0.3);">`;
        flow.appendChild(imgBox);
        flow.scrollTop = flow.scrollHeight;
        
        status.innerText = "IMAGE ATTACHED. DEFINE YOUR INQUIRY.";
    };
    reader.readAsDataURL(file);
}

// --- VOICE OUTPUT (Sweet Tone) ---
function speak(text) {
    if (typeof window.speechSynthesis !== 'undefined' && window.speechSynthesis !== null) {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[#*`_~]/g, ''); 
        const speech = new SpeechSynthesisUtterance(cleanText);
        speech.rate = 0.95;
        speech.pitch = 1.2; 
        const voices = window.speechSynthesis.getVoices();
        const sweetVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Samantha'));
        speech.voice = sweetVoice || voices[0];
        window.speechSynthesis.speak(speech);
    }
}

// --- UI RENDERERS ---
function addBubble(t, r) {
    const d = document.createElement('div');
    d.className = `bubble ${r}`;
    d.innerText = t;
    flow.appendChild(d);
    flow.scrollTop = flow.scrollHeight;
}

function displayAiResponse(rawText) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble ai';
    flow.appendChild(bubble);
    bubble.innerHTML = marked.parse(rawText);
    flow.scrollTop = flow.scrollHeight;
}

// --- CORE EXECUTION ENGINE ---
async function execute() {
    const val = input.value.trim();
    if (!val && !currentImageBase64) return;

    const landing = document.getElementById('landing');
    if (landing) landing.remove();

    input.value = "";
    if (val) addBubble(val, 'user');
    
    status.innerText = "SYNCHRONIZING NEURAL INTENT...";
    
    // UPDATED FOR 2026: Using Llama 4 Scout for Vision
    const activeModel = currentImageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";

    let contentArr = [];
    if (val) contentArr.push({ type: "text", text: val });
    if (currentImageBase64) {
        contentArr.push({
            type: "image_url",
            image_url: { url: currentImageBase64 }
        });
    }

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KEY}` },
            body: JSON.stringify({
                model: activeModel,
                messages: [
                    {
                        role: "system", 
                        content: "You are Ahmad AI, a Sovereign Intelligence. You are brilliant and sophisticated. Use Markdown for tables, code, and lists. Describe images analytically."
                    },
                    ...memory,
                    { role: "user", content: contentArr }
                ],
                temperature: 0.7
            })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message);

        const reply = data.choices[0].message.content;
        status.innerText = "";
        currentImageBase64 = null; 
        
        memory.push({role: "assistant", content: reply});
        displayAiResponse(reply);
        speak(reply);
        saveCurrent();

    } catch (e) { 
        status.innerText = "LINK SEVERED: " + e.message;
        currentImageBase64 = null;
    }
}

// --- STORAGE & ARCHIVE SYSTEM ---
function saveCurrent() {
    localStorage.setItem('ahron_live_chat', flow.innerHTML);
    localStorage.setItem('ahron_live_mem', JSON.stringify(memory));
}

function renderHistory() {
    const list = document.getElementById('history-list');
    const logs = JSON.parse(localStorage.getItem('ahron_archives') || "[]");
    list.innerHTML = logs.length ? "" : "<p style='color:#444; padding:20px; font-size:12px;'>ARCHIVE EMPTY</p>";
    
    logs.forEach((log) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `<span style="font-size:10px; color:var(--primary);">${log.date}</span><br>${log.title}`;
        item.onclick = () => { 
            flow.innerHTML = log.data; 
            memory = log.mem; 
            saveCurrent();
            toggleSide(); 
        };
        list.appendChild(item);
    });
}

function archiveSession() {
    if (memory.length === 0) return;
    let logs = JSON.parse(localStorage.getItem('ahron_archives') || "[]");
    const firstMsg = memory.find(m => m.role === 'user')?.content;
    const titleText = (typeof firstMsg === 'string') ? firstMsg : "Visual Inquiry";

    const sessionData = { 
        title: titleText.substring(0, 30) + "...", 
        data: flow.innerHTML, 
        mem: [...memory], 
        date: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
    };
    logs.unshift(sessionData);
    localStorage.setItem('ahron_archives', JSON.stringify(logs.slice(0, 15)));
}

function newChat() {
    archiveSession();
    flow.innerHTML = "";
    memory = [];
    saveCurrent();
    displayAiResponse("Neural bridge reset. State your next objective.");
}

function purge() { if(confirm("Purge all archives?")) { localStorage.clear(); location.reload(); } }

// --- UTILITIES ---
function toggleSide() {
    const side = document.getElementById('sidebar');
    side.classList.toggle('open');
    document.getElementById('overlay').style.display = side.classList.contains('open') ? 'block' : 'none';
    renderHistory();
}

function quick(t) { input.value = t; execute(); }

function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.onstart = () => { micBtn.classList.add('recording'); status.innerText = "Listening..."; };
    recognition.onresult = (e) => { input.value = e.results[0][0].transcript; execute(); };
    recognition.onspeechend = () => { recognition.stop(); micBtn.classList.remove('recording'); };
    recognition.start();
}

// --- INITIALIZATION ---
window.onload = () => {
    const h = localStorage.getItem('ahron_live_chat');
    const m = localStorage.getItem('ahron_live_mem');
    if (h && m) { 
        flow.innerHTML = h; 
        memory = JSON.parse(m); 
        const landing = document.getElementById('landing');
        if (landing) landing.remove();
    }
    initParticles();
    renderHistory();
};

function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    let pts = [];
    for(let i=0; i<40; i++) pts.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height, s:Math.random()*2, d:Math.random()*0.3});
    function draw() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "rgba(77, 163, 255, 0.2)";
        pts.forEach(p => { p.y -= p.d; if(p.y<0) p.y=canvas.height; ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,Math.PI*2); ctx.fill(); });
        requestAnimationFrame(draw);
    }
    draw();
}

input.addEventListener("keypress", (e) => { if(e.key === "Enter") execute(); });
