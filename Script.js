
// useable pay - Intuitive, No localStorage, Session Only
const storesEl = document.getElementById('stores');
const emptyEl = document.getElementById('empty');
const addBtn = document.getElementById('addBtn');
const scanBtn = document.getElementById('scanBtn');
const quickPayBtn = document.getElementById('quickPayBtn');
const cashOutBtn = document.getElementById('cashOutBtn');
const sendMoneyBtn = document.getElementById('sendMoneyBtn');

const addModal = document.getElementById('addModal');
const payModal = document.getElementById('payModal');
const scanModal = document.getElementById('scanModal');
const cashModal = document.getElementById('cashModal');
const sendModal = document.getElementById('sendModal');

const toast = document.getElementById('toast');
const storesTab = document.getElementById('storesTab');
const txTab = document.getElementById('txTab');
const storesView = document.getElementById('storesView');
const txView = document.getElementById('txView');

let stores = [];
let transactions = [];
let currentStore = null;
let stream = null;

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function renderStores() {
  storesEl.innerHTML = '';
  if (!stores.length) { emptyEl.style.display = 'block'; return; }
  emptyEl.style.display = 'none';
  stores.forEach(s => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="store-row">
        <div>
          <div class="store-name">${s.name}</div>
          <span class="badge ${s.network}">${s.network.toUpperCase()} • ${s.network === 'mtn' ? 'MoMo' : s.network === 'airtel' ? 'Airtel' : 'Kwacha'}</span>
        </div>
        <div class="agent-num">${s.agent}</div>
      </div>
      <div class="row" style="margin-top:12px;">
        <button class="btn btn-ghost btn-sm" onclick="editStore('${s.id}')">Edit</button>
        <button class="btn btn-primary btn-sm" onclick="openPay('${s.id}')">Pay K</button>
      </div>
    `;
    storesEl.appendChild(card);
  });
}

function renderTx() {
  const txList = document.getElementById('txList');
  const txEmpty = document.getElementById('txEmpty');
  if (!transactions.length) { txList.innerHTML = ''; txEmpty.style.display = 'block'; return; }
  txEmpty.style.display = 'none';
  txList.innerHTML = [...transactions].reverse().map(tx => `
    <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-weight:700;">${tx.storeName}</div>
        <div style="font-size:12px; color:#6B7280;">${new Date(tx.timestamp).toLocaleString()} • ${tx.network.toUpperCase()}</div>
        <div style="font-family:monospace; font-size:11px; color:#9CA3AF; margin-top:2px;">${tx.ussd}</div>
      </div>
      <div style="font-weight:800; font-size:16px; color:${tx.amount < 0 ? '#DC2626' : '#198A00'};">${tx.amount < 0 ? '-' : ''}K${Math.abs(tx.amount).toFixed(2)}</div>
    </div>
  `).join('');
}

// Tabs
storesTab.onclick = () => {
  storesTab.classList.add('active'); txTab.classList.remove('active');
  storesView.classList.remove('hidden'); txView.classList.add('hidden');
};
txTab.onclick = () => {
  txTab.classList.add('active'); storesTab.classList.remove('active');
  txView.classList.remove('hidden'); storesView.classList.add('hidden');
  renderTx();
};

// Helpers - auto-detect network from number
function detectNetwork(num) {
  const n = num.replace(/\D/g,'');
  if (n.startsWith('076') || n.startsWith('077') || n.startsWith('26076') || n.startsWith('26077')) return 'mtn';
  if (n.startsWith('095') && n.length <= 6) return 'zamtel'; // ambiguous, default to airtel for 10-digit
  if (n.startsWith('097') || n.startsWith('095') || n.startsWith('096')) return 'airtel';
  return 'airtel';
}

// Add Store
addBtn.onclick = () => {
  document.getElementById('modalTitle').textContent = 'Add Store';
  document.getElementById('storeName').value = '';
  document.getElementById('agentNum').value = '';
  document.getElementById('network').value = 'airtel';
  document.getElementById('saveStore').onclick = saveNewStore;
  addModal.classList.add('show');
  setTimeout(() => document.getElementById('storeName').focus(), 100);
};

quickPayBtn.onclick = () => addBtn.onclick();

function saveNewStore() {
  const name = document.getElementById('storeName').value.trim();
  const network = document.getElementById('network').value;
  const agent = document.getElementById('agentNum').value.trim().replace(/\D/g,'');
  if (!name) return showToast('Enter store name — e.g. CHEERIBX');
  if (!agent || agent.length < 5) return showToast('Enter till number — e.g. 889003070');
  stores.push({ id: Date.now().toString(), name, network, agent });
  renderStores();
  addModal.classList.remove('show');
  showToast(`Saved ${name}`);
}

window.editStore = (id) => {
  const s = stores.find(x => x.id === id);
  document.getElementById('modalTitle').textContent = 'Edit Store';
  document.getElementById('storeName').value = s.name;
  document.getElementById('network').value = s.network;
  document.getElementById('agentNum').value = s.agent;
  document.getElementById('saveStore').onclick = () => {
    const name = document.getElementById('storeName').value.trim();
    const agent = document.getElementById('agentNum').value.trim().replace(/\D/g,'');
    if (!name || !agent) return showToast('Fill all fields');
    s.name = name; s.network = document.getElementById('network').value; s.agent = agent;
    renderStores(); addModal.classList.remove('show'); showToast('Updated');
  };
  addModal.classList.add('show');
};

document.getElementById('cancelAdd').onclick = () => addModal.classList.remove('show');

// Pay Flow - Intuitive with chips
window.openPay = (id) => {
  currentStore = stores.find(x => x.id === id);
  document.getElementById('payTitle').textContent = `Pay ${currentStore.name}`;
  document.getElementById('paySub').textContent = `${currentStore.network.toUpperCase()} • Till ${currentStore.agent}`;
  document.getElementById('amount').value = '';
  document.getElementById('ussdBox').classList.add('hidden');
  document.getElementById('dialRow').classList.add('hidden');
  document.getElementById('genUssd').classList.remove('hidden');
  payModal.classList.add('show');
  setTimeout(() => document.getElementById('amount').focus(), 100);
};

document.querySelectorAll('#amountChips .chip').forEach(chip => {
  chip.onclick = () => {
    document.querySelectorAll('#amountChips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    document.getElementById('amount').value = chip.dataset.amt;
  };
});

function buildUssd(network, agent, amount) {
  if (network === 'mtn') return `*115*1*1*${agent}*${amount}#`;
  if (network === 'airtel') return `*115*8*${agent}*${amount}#`;
  if (network === 'zamtel') return `*344*${agent}*${amount}#`;
  return `*115*8*${agent}*${amount}#`;
}

document.getElementById('genUssd').onclick = () => {
  const amount = parseFloat(document.getElementById('amount').value);
  if (!amount || amount <= 0) return showToast('Enter amount — e.g. 50');
  const ussd = buildUssd(currentStore.network, currentStore.agent, amount);
  transactions.push({ id: Date.now().toString(), storeName: currentStore.name, network: currentStore.network, agent: currentStore.agent, amount, timestamp: Date.now(), ussd });
  renderTx();
  document.getElementById('ussdBox').textContent = ussd;
  document.getElementById('ussdBox').classList.remove('hidden');
  document.getElementById('dialRow').classList.remove('hidden');
  document.getElementById('genUssd').classList.add('hidden');
  document.getElementById('dialNow').onclick = () => window.location.href = `tel:${encodeURIComponent(ussd)}`;
  document.getElementById('copyUssd').onclick = () => { navigator.clipboard.writeText(ussd); showToast('Copied! Paste in dialer if needed'); };
};

document.getElementById('cancelPay').onclick = () => payModal.classList.remove('show');

// Cash Out - Intuitive
cashOutBtn.onclick = () => {
  document.getElementById('agentCode').value = '';
  document.getElementById('cashAmount').value = '';
  document.getElementById('cashUssdBox').classList.add('hidden');
  document.getElementById('cashDialRow').classList.add('hidden');
  document.getElementById('genCashUssd').classList.remove('hidden');
  cashModal.classList.add('show');
};

document.getElementById('genCashUssd').onclick = () => {
  const amount = parseFloat(document.getElementById('cashAmount').value);
  const agent = document.getElementById('agentCode').value.trim().replace(/\D/g,'');
  const network = document.getElementById('cashNetwork').value;
  if (!agent) return showToast('Enter agent code');
  if (!amount || amount <= 0) return showToast('Enter amount — e.g. 100');
  let ussd = '';
  if (network === 'mtn') ussd = `*115*2*${agent}*${amount}#`;
  else if (network === 'airtel') ussd = `*115*1*5*${agent}*${amount}#`;
  else ussd = `*344*2*${agent}*${amount}#`;
  transactions.push({ id: Date.now().toString(), storeName: `Cash Out • ${agent}`, network, agent, amount: -amount, timestamp: Date.now(), ussd, type: 'cashout' });
  renderTx();
  document.getElementById('cashUssdBox').textContent = ussd;
  document.getElementById('cashUssdBox').classList.remove('hidden');
  document.getElementById('cashDialRow').classList.remove('hidden');
  document.getElementById('genCashUssd').classList.add('hidden');
  document.getElementById('dialCash').onclick = () => window.location.href = `tel:${encodeURIComponent(ussd)}`;
  document.getElementById('copyCash').onclick = () => { navigator.clipboard.writeText(ussd); showToast('Copied'); };
};
document.getElementById('cancelCash').onclick = () => cashModal.classList.remove('show');

// Send Money - Intuitive + auto-detect
sendMoneyBtn.onclick = () => {
  document.getElementById('recipientNum').value = '';
  document.getElementById('sendAmount').value = '';
  document.getElementById('sendUssdBox').classList.add('hidden');
  document.getElementById('sendDialRow').classList.add('hidden');
  document.getElementById('genSendUssd').classList.remove('hidden');
  sendModal.classList.add('show');
};

document.getElementById('recipientNum').addEventListener('input', (e) => {
  const num = e.target.value.replace(/\D/g,'');
  if (num.length >= 6) {
    const detected = detectNetwork(num);
    document.getElementById('sendNetwork').value = detected;
  }
});

document.getElementById('genSendUssd').onclick = () => {
  const amount = parseFloat(document.getElementById('sendAmount').value);
  const recipient = document.getElementById('recipientNum').value.trim().replace(/\D/g,'');
  const network = document.getElementById('sendNetwork').value;
  if (recipient.length < 10) return showToast('Enter full number — e.g. 0977123456');
  if (!amount || amount <= 0) return showToast('Enter amount — e.g. 50');
  let ussd = '';
  if (network === 'mtn') ussd = `*115*1*1*${recipient}*${amount}#`;
  else if (network === 'airtel') ussd = `*115*1*1*${recipient}*${amount}#`;
  else ussd = `*344*1*1*${recipient}*${amount}#`;
  transactions.push({ id: Date.now().toString(), storeName: `Send to ${recipient}`, network, agent: recipient, amount: -amount, timestamp: Date.now(), ussd, type: 'send' });
  renderTx();
  document.getElementById('sendUssdBox').textContent = ussd;
  document.getElementById('sendUssdBox').classList.remove('hidden');
  document.getElementById('sendDialRow').classList.remove('hidden');
  document.getElementById('genSendUssd').classList.add('hidden');
  document.getElementById('dialSend').onclick = () => window.location.href = `tel:${encodeURIComponent(ussd)}`;
  document.getElementById('copySend').onclick = () => { navigator.clipboard.writeText(ussd); showToast('Copied'); };
};
document.getElementById('cancelSend').onclick = () => sendModal.classList.remove('show');

// Scan Flow - Intuitive
scanBtn.onclick = async () => {
  scanModal.classList.add('show');
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    document.getElementById('video').srcObject = stream;
  } catch(e) { showToast('Camera denied — allow camera in settings'); scanModal.classList.remove('show'); }
};

document.getElementById('cancelScan').onclick = () => {
  if (stream) stream.getTracks().forEach(t => t.stop());
  scanModal.classList.remove('show');
};

document.getElementById('captureBtn').onclick = async () => {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  if (stream) stream.getTracks().forEach(t => t.stop());
  scanModal.classList.remove('show');
  showToast('Reading number... 🔍');
  try {
    const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
    const matches = text.match(/\b(\d{6,11})\b/g) || [];
    const best = matches.sort((a,b) => b.length - a.length)[0];
    let network = 'airtel';
    if (/mtn|momo/i.test(text)) network = 'mtn';
    else if (/zamtel|kwacha/i.test(text)) network = 'zamtel';
    if (best) {
      document.getElementById('agentNum').value = best;
      document.getElementById('network').value = network;
      document.getElementById('storeName').value = '';
      document.getElementById('modalTitle').textContent = 'Save Scanned Store';
      document.getElementById('saveStore').onclick = () => {
        const name = document.getElementById('storeName').value.trim() || `Scanned • ${best}`;
        if (!name) return showToast('Enter store name');
        stores.push({ id: Date.now().toString(), name, network, agent: best });
        renderStores(); addModal.classList.remove('show'); showToast(`Saved ${name}`);
      };
      addModal.classList.add('show');
    } else {
      showToast('No number found — try closer, better light');
    }
  } catch(e) {
    showToast('Scan failed — type it manually');
  }
};

// Close modals on backdrop
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('show'); });
});

renderStores();
renderTx();
console.log('useable pay — intuitive session-only, no localStorage');
