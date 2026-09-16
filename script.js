
    const storesEl = document.getElementById('stores');
    const emptyEl = document.getElementById('empty');
    const addBtn = document.getElementById('addBtn');
    const scanBtn = document.getElementById('scanBtn');
    const addModal = document.getElementById('addModal');
    const payModal = document.getElementById('payModal');
    const scanModal = document.getElementById('scanModal');
    const loginModal = document.getElementById('loginModal');
    const toast = document.getElementById('toast');
    const storesTab = document.getElementById('storesTab');
    const txTab = document.getElementById('txTab');
    const storesView = document.getElementById('storesView');
    const txView = document.getElementById('txView');
    const profileBtn = document.getElementById('profileBtn');
    
    let currentProfile = null;
    let stores = [];
    let transactions = [];
    let currentStore = null;
    let stream = null;

    // Simple hash for PIN - not cryptographically secure but ok for local
    function hashPin(pin) { return btoa(pin + 'useable'); }

    function loadProfile(phone, pinHash) {
      const key = `useable_profile_${phone}`;
      const data = localStorage.getItem(key);
      if (!data) return null;
      const profile = JSON.parse(data);
      if (profile.pinHash !== pinHash) return null;
      return profile;
    }

    function saveProfile() {
      if (!currentProfile) return;
      const key = `useable_profile_${currentProfile.phone}`;
      localStorage.setItem(key, JSON.stringify({
        phone: currentProfile.phone,
        pinHash: currentProfile.pinHash,
        name: currentProfile.name || 'Blessed',
        stores: stores,
        transactions: transactions
      }));
    }

    function updateSplash() {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0,0,0,0);
      const monthTx = transactions.filter(tx => tx.timestamp >= monthStart.getTime());
      const monthTotal = monthTx.reduce((sum, tx) => sum + tx.amount, 0);
      document.getElementById('splashWelcome').textContent = currentProfile ? `Welcome, ${currentProfile.name}` : 'Welcome';
      document.getElementById('splashSpent').textContent = `K${monthTotal.toFixed(2)} this month`;
    }

    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function renderStores() {
      stores.sort((a,b) => b.starred - a.starred || a.name.localeCompare(b.name));
      storesEl.innerHTML = '';
      if (!stores.length) { emptyEl.style.display = 'block'; return; }
      emptyEl.style.display = 'none';
      stores.forEach(s => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div class="store-name">${s.starred ? '⭐ ' : ''}${s.name}</div>
          <span class="badge ${s.network}">${s.network === 'mtn' ? 'MTN MoMo' : s.network === 'airtel' ? 'Airtel Money' : 'Zamtel Kwacha'}</span>
          <div class="agent">Agent/Till: ${s.agent}</div>
          <button class="btn btn-primary" onclick="openPay('${s.id}')">Pay</button>
          <button class="btn btn-secondary" onclick="editStore('${s.id}')">Edit</button>
        `;
        storesEl.appendChild(card);
      });
    }

    function renderTx() {
      const txList = document.getElementById('txList');
      const txEmpty = document.getElementById('txEmpty');
      const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      document.getElementById('totalSpent').textContent = `K${totalSpent.toFixed(2)}`;
      document.getElementById('txCount').textContent = transactions.length;
      document.getElementById('profileInfo').textContent = currentProfile ? `Logged in: ${currentProfile.phone}` : 'Not logged in - transactions won't save';
      
      if (!transactions.length) { 
        txList.innerHTML = '';
        txEmpty.style.display = 'block'; 
        return; 
      }
      txEmpty.style.display = 'none';
      txList.innerHTML = '';
      
      [...transactions].reverse().forEach(tx => {
        const date = new Date(tx.timestamp);
        const item = document.createElement('div');
        item.className = 'tx-item';
        item.innerHTML = `
          <div class="tx-left">
            <div class="tx-store">${tx.storeName}</div>
            <div class="tx-date">${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          </div>
          <div>
            <div class="tx-amount">K${tx.amount.toFixed(2)}</div>
            <div class="tx-network">${tx.network.toUpperCase()}</div>
          </div>
        `;
        txList.appendChild(item);
      });
    }

    // Tab switching
    storesTab.onclick = () => {
      storesTab.classList.add('active');
      txTab.classList.remove('active');
      storesView.classList.remove('hidden');
      txView.classList.add('hidden');
    };
    txTab.onclick = () => {
      txTab.classList.add('active');
      storesTab.classList.remove('active');
      txView.classList.remove('hidden');
      storesView.classList.add('hidden');
      renderTx();
    };

    // Profile/Login
    profileBtn.onclick = () => loginModal.classList.add('show');
    document.getElementById('cancelLogin').onclick = () => loginModal.classList.remove('show');
    
    document.getElementById('doLogin').onclick = () => {
      const phone = document.getElementById('loginPhone').value.trim();
      const pin = document.getElementById('loginPin').value.trim();
      if (!phone || pin.length !== 4) return showToast('Enter phone + 4-digit PIN');
      
      const profile = loadProfile(phone, hashPin(pin));
      if (!profile) return showToast('Wrong phone or PIN');
      
      currentProfile = profile;
      stores = profile.stores || [];
      transactions = profile.transactions || [];
      loginModal.classList.remove('show');
      document.getElementById('headerSub').textContent = `Logged in as ${phone}`;
      showToast('Profile loaded');
      renderStores();
      renderTx();
      updateSplash();
    };

    document.getElementById('createProfile').onclick = () => {
      const phone = document.getElementById('loginPhone').value.trim();
      const pin = document.getElementById('loginPin').value.trim();
      if (!phone || pin.length !== 4) return showToast('Enter phone + 4-digit PIN');
      
      const key = `useable_profile_${phone}`;
      if (localStorage.getItem(key)) return showToast('Profile exists - use Login');
      
      currentProfile = { phone, pinHash: hashPin(pin), name: 'Blessed' };
      stores = [{ id: '1', name: 'CHEERIBX', network: 'airtel', agent: '889003070', starred: true }];
      transactions = [];
      saveProfile();
      loginModal.classList.remove('show');
      document.getElementById('headerSub').textContent = `Logged in as ${phone}`;
      showToast('Profile created');
      renderStores();
      renderTx();
      updateSplash();
    };

    // Add Store
    addBtn.onclick = () => {
      if (!currentProfile) { showToast('Login first to save stores'); loginModal.classList.add('show'); return; }
      document.getElementById('modalTitle').textContent = 'Add Store';
      document.getElementById('storeName').value = '';
      document.getElementById('agentNum').value = '';
      document.getElementById('starred').checked = false;
      document.getElementById('saveStore').onclick = addStore;
      addModal.classList.add('show');
    };

    function addStore() {
      const name = document.getElementById('storeName').value.trim();
      const network = document.getElementById('network').value;
      const agent = document.getElementById('agentNum').value.trim();
      if (!name || !agent) return showToast('Fill all fields');
      stores.push({ id: Date.now().toString(), name, network, agent, starred: document.getElementById('starred').checked });
      saveProfile();
      renderStores();
      addModal.classList.remove('show');
      showToast('Store saved');
    }

    window.editStore = (id) => {
      if (!currentProfile) return showToast('Login first');
      const s = stores.find(x => x.id === id);
      document.getElementById('modalTitle').textContent = 'Edit Store';
      document.getElementById('storeName').value = s.name;
      document.getElementById('network').value = s.network;
      document.getElementById('agentNum').value = s.agent;
      document.getElementById('starred').checked = s.starred;
      document.getElementById('saveStore').onclick = () => {
        s.name = document.getElementById('storeName').value.trim();
        s.network = document.getElementById('network').value;
        s.agent = document.getElementById('agentNum').value.trim();
        s.starred = document.getElementById('starred').checked;
        saveProfile();
        renderStores();
        addModal.classList.remove('show');
        showToast('Store updated');
      };
      addModal.classList.add('show');
    };

    document.getElementById('cancelAdd').onclick = () => addModal.classList.remove('show');

    // Pay Flow
    window.openPay = (id) => {
      if (!currentProfile) { showToast('Login first to track transactions'); loginModal.classList.add('show'); return; }
      currentStore = stores.find(x => x.id === id);
      document.getElementById('payTitle').textContent = `Pay ${currentStore.name}`;
      document.getElementById('amount').value = '';
      document.getElementById('pin').value = '';
      document.getElementById('ussdBox').classList.add('hidden');
      document.getElementById('dialRow').classList.add('hidden');
      document.getElementById('genUssd').classList.remove('hidden');
      payModal.classList.add('show');
    };

    document.getElementById('genUssd').onclick = () => {
      const amount = parseFloat(document.getElementById('amount').value);
      if (!amount || amount <= 0) return showToast('Enter valid amount');
      
      let ussd = '';
      if (currentStore.network === 'mtn') ussd = `*115*1*1*${currentStore.agent}*${amount}#`;
      else if (currentStore.network === 'airtel') ussd = `*115*8*${currentStore.agent}*${amount}#`;
      else if (currentStore.network === 'zamtel') ussd = `*344*${currentStore.agent}*${amount}#`;
      
      // Save transaction to profile
      transactions.push({
        id: Date.now().toString(),
        storeId: currentStore.id,
        storeName: currentStore.name,
        network: currentStore.network,
        agent: currentStore.agent,
        amount: amount,
        timestamp: Date.now(),
        ussd: ussd
      });
      saveProfile();
      renderTx();
      
      document.getElementById('ussdBox').textContent = ussd;
      document.getElementById('ussdBox').classList.remove('hidden');
      document.getElementById('dialRow').classList.remove('hidden');
      document.getElementById('genUssd').classList.add('hidden');
      
      document.getElementById('dialNow').onclick = () => window.location.href = `tel:${encodeURIComponent(ussd)}`;
      document.getElementById('copyUssd').onclick = () => {
        navigator.clipboard.writeText(ussd);
        showToast('USSD copied');
      };
    };

    document.getElementById('cancelPay').onclick = () => payModal.classList.remove('show');

    // Scan Flow
    scanBtn.onclick = async () => {
      if (!currentProfile) { showToast('Login first to save scanned stores'); loginModal.classList.add('show'); return; }
      scanModal.classList.add('show');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        document.getElementById('video').srcObject = stream;
      } catch(e) { showToast('Camera access denied'); scanModal.classList.remove('show'); }
    };

    document.getElementById('cancelScan').onclick = () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      scanModal.classList.remove('show');
    };

    document.getElementById('captureBtn').onclick = async () => {
      const video = document.getElementById('video');
      const canvas = document.getElementById('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      if (stream) stream.getTracks().forEach(t => t.stop());
      scanModal.classList.remove('show');
      showToast('Scanning number...');
      
      const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
      const match = text.match(/(\d{9,11})/);
      let network = 'airtel';
      if (/mtn|momo/i.test(text)) network = 'mtn';
      else if (/zamtel|kwacha/i.test(text)) network = 'zamtel';
      
      if (match) {
        document.getElementById('agentNum').value = match[1];
        document.getElementById('network').value = network;
        document.getElementById('modalTitle').textContent = 'Save Scanned Store';
        document.getElementById('storeName').value = '';
        document.getElementById('saveStore').onclick = () => {
          const name = document.getElementById('storeName').value.trim() || 'Scanned Store';
          stores.push({ id: Date.now().toString(), name, network, agent: match[1], starred: false });
          saveProfile();
          renderStores();
          addModal.classList.remove('show');
          showToast('Store saved from scan');
        };
        addModal.classList.add('show');
      } else {
        showToast('No agent number found. Try again');
      }
    };

    // Splash screen - 6 seconds
    window.addEventListener('load', () => {
      updateSplash();
      setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) {
          splash.style.opacity = '0';
          setTimeout(() => splash.remove(), 500);
        }
      }, 5000);
    });

    // PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    renderStores();
    renderTx();
  