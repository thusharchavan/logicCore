/* ==========================================================================
   LogicCore AI - Unified Enterprise State & Application Engine (app.js)
   Works across index.html, auth.html, and dashboard.html
   ========================================================================== */

const STORAGE_KEYS = {
  USERS: 'logiccore_users_v1',
  SESSION: 'logiccore_session_v1',
  PROJECTS: 'logiccore_projects_v1',
  PENDING_QUOTE: 'logiccore_pending_quote_v1',
  LEADS: 'logiccore_leads_v1'
};

// --- Helper Utilities ---
function getStore(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function formatINR(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

function getCurrentUser() {
  return getStore(STORAGE_KEYS.SESSION, null);
}

// --- Seed Initial Demo Data if Empty ---
function ensureSeedData() {
  const projects = getStore(STORAGE_KEYS.PROJECTS, []);
  if (projects.length === 0) {
    const sampleProjects = [
      {
        id: 'LC-901',
        ownerEmail: 'demo@logiccore.ai',
        title: 'Autonomous WhatsApp Lead & CRM AI Agent',
        category: 'AI Agent Architecture',
        budget: 37000,
        timeline: '2 Weeks (Rapid Sprint)',
        progress: 70,
        status: 'In Engineering',
        desc: '24/7 customer inquiry handling, automated pricing quotation, and Google Sheets + CRM webhook sync.',
        createdAt: '2026-10-20'
      },
      {
        id: 'LC-902',
        ownerEmail: 'demo@logiccore.ai',
        title: 'Enterprise Operations ERP & Analytics Portal',
        category: 'Custom Software / ERP',
        budget: 65000,
        timeline: '4 Weeks (Standard Production)',
        progress: 40,
        status: 'Architecture Ready',
        desc: 'Role-based client portal, automated invoicing, real-time risk KPI charts, and cloud database setup.',
        createdAt: '2026-10-22'
      }
    ];
    setStore(STORAGE_KEYS.PROJECTS, sampleProjects);
  }
}

// ============================================================================
// 1. LANDING PAGE LOGIC (index.html)
// ============================================================================
function initLandingPage() {
  const user = getCurrentUser();
  const navAuthArea = document.getElementById('nav-auth-area');

  if (user && navAuthArea) {
    navAuthArea.innerHTML = `
      <a href="dashboard.html" class="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-lg flex items-center gap-2">
        <i class="fa-solid fa-gauge-high"></i> Dashboard (${user.name.split(' ')[0]})
      </a>
    `;
  }

  // Interactive Project Cost Estimator
  const serviceSelect = document.getElementById('calc-service');
  const scaleRadios = document.querySelectorAll('input[name="calc-scale"]');
  const addonChecks = document.querySelectorAll('.calc-addon');
  const priceEl = document.getElementById('calc-total-price');
  const weeksEl = document.getElementById('calc-total-weeks');
  const lockBtn = document.getElementById('btn-lock-estimate');

  function calculateEstimate() {
    if (!serviceSelect) return null;
    const selectedOpt = serviceSelect.options[serviceSelect.selectedIndex];
    const basePrice = Number(selectedOpt.getAttribute('data-base') || 25000);
    const baseWeeks = Number(selectedOpt.getAttribute('data-weeks') || 2);

    let scaleMultiplier = 1;
    scaleRadios.forEach((r) => {
      if (r.checked) scaleMultiplier = Number(r.value);
    });

    let addonsTotal = 0;
    const selectedAddons = [];
    addonChecks.forEach((chk) => {
      if (chk.checked) {
        addonsTotal += Number(chk.value);
        selectedAddons.push(chk.getAttribute('data-addon-name'));
      }
    });

    const totalBudget = Math.round(basePrice * scaleMultiplier + addonsTotal);
    const totalWeeks = Math.max(1, Math.round(baseWeeks * (scaleMultiplier === 2.2 ? 1.5 : 1)));

    if (priceEl) priceEl.textContent = formatINR(totalBudget);
    if (weeksEl) weeksEl.textContent = `${totalWeeks} Weeks`;

    return {
      serviceName: selectedOpt.text.split(' (')[0],
      totalBudget,
      totalWeeks: `${totalWeeks} Weeks`,
      addons: selectedAddons
    };
  }

  if (serviceSelect) {
    serviceSelect.addEventListener('change', calculateEstimate);
    scaleRadios.forEach((r) => r.addEventListener('change', calculateEstimate));
    addonChecks.forEach((c) => c.addEventListener('change', calculateEstimate));
    calculateEstimate();
  }

  if (lockBtn) {
    lockBtn.addEventListener('click', () => {
      const quote = calculateEstimate();
      if (quote) {
        setStore(STORAGE_KEYS.PENDING_QUOTE, quote);
      }
      if (getCurrentUser()) {
        window.location.href = 'dashboard.html?tab=new-project';
      } else {
        window.location.href = 'auth.html?mode=signup';
      }
    });
  }

  // Lead Consultation Form
  const leadForm = document.getElementById('lead-form');
  const leadFeedback = document.getElementById('lead-feedback');
  if (leadForm) {
    leadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const leads = getStore(STORAGE_KEYS.LEADS, []);
      leads.push({
        name: document.getElementById('lead-name').value.trim(),
        contact: document.getElementById('lead-contact').value.trim(),
        message: document.getElementById('lead-message').value.trim(),
        date: new Date().toISOString()
      });
      setStore(STORAGE_KEYS.LEADS, leads);
      leadForm.reset();
      if (leadFeedback) {
        leadFeedback.classList.remove('hidden');
        leadFeedback.innerHTML = `<i class="fa-solid fa-circle-check mr-2"></i> Thank you! Your inquiry has been logged with LogicCore AI. You can also create a Client Portal account to track your project live.`;
      }
    });
  }
}

// ============================================================================
// 2. AUTHENTICATION PORTAL LOGIC (auth.html)
// ============================================================================
function initAuthPage() {
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');
  const alertBox = document.getElementById('auth-alert');
  const demoBtn = document.getElementById('btn-demo-login');

  if (!tabLogin || !formLogin) return;

  function showAlert(msg, isError = true) {
    alertBox.classList.remove('hidden', 'bg-rose-950/70', 'text-rose-300', 'border-rose-500/40', 'bg-emerald-950/70', 'text-emerald-300', 'border-emerald-500/40');
    if (isError) {
      alertBox.classList.add('bg-rose-950/70', 'text-rose-300', 'border', 'border-rose-500/40');
    } else {
      alertBox.classList.add('bg-emerald-950/70', 'text-emerald-300', 'border', 'border-emerald-500/40');
    }
    alertBox.textContent = msg;
  }

  function switchAuthMode(mode) {
    alertBox.classList.add('hidden');
    if (mode === 'signup') {
      tabSignup.className = 'py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white transition';
      tabLogin.className = 'py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition';
      formSignup.classList.remove('hidden');
      formLogin.classList.add('hidden');
    } else {
      tabLogin.className = 'py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white transition';
      tabSignup.className = 'py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition';
      formLogin.classList.remove('hidden');
      formSignup.classList.add('hidden');
    }
  }

  tabLogin.addEventListener('click', () => switchAuthMode('login'));
  tabSignup.addEventListener('click', () => switchAuthMode('signup'));

  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'signup') {
    switchAuthMode('signup');
  }

  // Handle Sign Up
  formSignup.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const company = document.getElementById('signup-company').value.trim();
    const email = document.getElementById('signup-email').value.trim().toLowerCase();
    const password = document.getElementById('signup-password').value;

    const users = getStore(STORAGE_KEYS.USERS, []);
    if (users.some((u) => u.email === email)) {
      showAlert('Yeh email pehle se registered hai. Kripya Log In karein.');
      return;
    }

    const newUser = { name, company, email, password, createdAt: new Date().toISOString() };
    users.push(newUser);
    setStore(STORAGE_KEYS.USERS, users);
    setStore(STORAGE_KEYS.SESSION, { name, company, email });

    showAlert('Account successfully created! Redirecting to Client Portal...', false);
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 600);
  });

  // Handle Log In
  formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    const users = getStore(STORAGE_KEYS.USERS, []);
    const found = users.find((u) => u.email === email && u.password === password);

    if (!found) {
      showAlert('Invalid email ya password! Naya account banayein ya 1-Click Demo Login use karein.');
      return;
    }

    setStore(STORAGE_KEYS.SESSION, { name: found.name, company: found.company, email: found.email });
    showAlert('Login successful! Opening Command Center...', false);
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
  });

  // 1-Click Demo Login
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      const demoUser = {
        name: 'Tushar Chavan',
        company: 'LogicCore Enterprise Partner',
        email: 'demo@logiccore.ai'
      };
      setStore(STORAGE_KEYS.SESSION, demoUser);
      window.location.href = 'dashboard.html';
    });
  }
}

// ============================================================================
// 3. CLIENT DASHBOARD PORTAL LOGIC (dashboard.html)
// ============================================================================
window.switchDashboardTab = function (tabName) {
  document.querySelectorAll('.dash-tab').forEach((sec) => sec.classList.add('hidden'));
  const target = document.getElementById(`tab-content-${tabName}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.dash-nav-btn').forEach((btn) => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.className = 'dash-nav-btn w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold bg-indigo-600 text-white transition';
    } else {
      btn.className = 'dash-nav-btn w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold text-slate-300 hover:bg-slate-900 transition';
    }
  });
};

function initDashboardPage() {
  const nameEl = document.getElementById('dash-user-name');
  if (!nameEl) return; // Not on dashboard page

  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }

  ensureSeedData();

  nameEl.textContent = user.name;
  document.getElementById('dash-user-company').textContent = user.company || user.email;

  // Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    window.location.href = 'auth.html';
  });

  // Sidebar Tabs
  document.querySelectorAll('.dash-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.switchDashboardTab(btn.getAttribute('data-tab'));
    });
  });

  // Check if user locked a quote on index.html
  const pendingQuote = getStore(STORAGE_KEYS.PENDING_QUOTE, null);
  if (pendingQuote) {
    document.getElementById('proj-title').value = `${pendingQuote.serviceName} Deployment`;
    document.getElementById('proj-budget').value = pendingQuote.totalBudget;
    document.getElementById('proj-desc').value = `Configured via LogicCore Cost Estimator. Timeline: ${pendingQuote.totalWeeks}. Add-ons: ${pendingQuote.addons.join(', ') || 'Standard Package'}.`;
    localStorage.removeItem(STORAGE_KEYS.PENDING_QUOTE);
    window.switchDashboardTab('new-project');
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('tab')) {
    window.switchDashboardTab(params.get('tab'));
  }

  // Render Projects & Proposals
  function renderUserProjects() {
    const allProjects = getStore(STORAGE_KEYS.PROJECTS, []);
    const listEl = document.getElementById('projects-list');
    const proposalsEl = document.getElementById('proposals-list');

    document.getElementById('stat-project-count').textContent = allProjects.length;
    const totalValue = allProjects.reduce((acc, p) => acc + Number(p.budget || 0), 0);
    document.getElementById('stat-total-budget').textContent = formatINR(totalValue);

    listEl.innerHTML = allProjects
      .map(
        (p) => `
      <div class="glass p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <span class="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">${p.id} • ${p.category}</span>
            <h3 class="text-lg font-bold text-white mt-1">${p.title}</h3>
          </div>
          <div class="text-right">
            <div class="text-lg font-bold text-cyan-400">${formatINR(p.budget)}</div>
            <div class="text-xs text-slate-400">${p.timeline}</div>
          </div>
        </div>
        <p class="text-xs text-slate-400 mb-4">${p.desc}</p>
        <div class="space-y-1.5">
          <div class="flex justify-between text-xs">
            <span class="text-slate-300 font-medium">Status: <span class="text-emerald-400">${p.status}</span></span>
            <span class="text-indigo-400 font-bold">${p.progress}%</span>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
            <div class="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full" style="width: ${p.progress}%"></div>
          </div>
        </div>
      </div>
    `
      )
      .join('');

    proposalsEl.innerHTML = allProjects
      .map(
        (p) => `
      <div class="glass p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="text-xs font-mono text-indigo-400">OFFICIAL PROPOSAL #${p.id} • Date: ${p.createdAt}</div>
          <h4 class="text-base font-bold text-white mt-1">${p.title} (${p.category})</h4>
          <p class="text-xs text-slate-400 mt-1">Client: ${user.name} (${user.company}) • Delivery: ${p.timeline}</p>
        </div>
        <div class="text-left sm:text-right">
          <div class="text-xl font-bold text-emerald-400">${formatINR(p.budget)}</div>
          <span class="inline-block mt-1 px-2.5 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Approved Scope</span>
        </div>
      </div>
    `
      )
      .join('');
  }

  renderUserProjects();

  // New Project Form Submission
  const newProjForm = document.getElementById('form-new-project');
  newProjForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const allProjects = getStore(STORAGE_KEYS.PROJECTS, []);
    const newProj = {
      id: 'LC-' + Math.floor(100 + Math.random() * 900),
      ownerEmail: user.email,
      title: document.getElementById('proj-title').value.trim(),
      category: document.getElementById('proj-category').value,
      budget: Number(document.getElementById('proj-budget').value),
      timeline: document.getElementById('proj-timeline').value,
      progress: 15,
      status: 'Initialized & Architect Assigned',
      desc: document.getElementById('proj-desc').value.trim(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    allProjects.unshift(newProj);
    setStore(STORAGE_KEYS.PROJECTS, allProjects);
    newProjForm.reset();
    renderUserProjects();
    window.switchDashboardTab('overview');
  });

  // AI Agent Sandbox Logic
  const sandboxForm = document.getElementById('form-sandbox');
  const sandboxInput = document.getElementById('sandbox-input');
  const sandboxMessages = document.getElementById('sandbox-messages');
  const personaSelect = document.getElementById('agent-persona');

  function generateAgentReply(query, persona) {
    const q = query.toLowerCase();
    if (q.includes('whatsapp') || q.includes('bot') || q.includes('agent')) {
      return 'LogicCore AI Agent Architecture aapke WhatsApp Business API aur Website se seedha connect hota hai. Yeh 24/7 leads qualify karta hai, pricing quotes bhejta hai, aur aapke CRM mein data save karta hai. Deployment time: 10–14 days.';
    }
    if (q.includes('erp') || q.includes('software') || q.includes('app') || q.includes('website')) {
      return 'Hamara Custom Software & ERP division modular architecture (Frontend UI + Secure API + Cloud DB) par kaam karta hai. Aapko Role-Based Login, Admin Analytics, aur Automated Billing ke saath 100% source code ownership milti hai.';
    }
    if (q.includes('marketing') || q.includes('lead') || q.includes('ads') || q.includes('seo')) {
      return 'Performance Digital Marketing mein hum High-Converting Landing Pages + Meta/Google AI-targeted Ads + Automated WhatsApp Follow-up combine karte hain, jisse lead conversion rate 3x tak badhta hai.';
    }
    if (persona === 'architect') {
      return `[Software Architect Agent]: Aapke "${query}" requirement ke liye hum scalable Cloud + Micro-frontend setup recommend karte hain. Aap 'Launch New Project' tab mein iska official blueprint initialize kar sakte hain.`;
    }
    if (persona === 'marketing') {
      return `[Growth & Risk Agent]: "${query}" ke liye hamara predictive ROI model suggest karta hai ki funnel automation aur risk audit ek saath deploy kiye jayein.`;
    }
    return `[AI Sales Closer]: Bilkul! LogicCore AI "${query}" ko end-to-end execute kar sakta hai. Kya main aapke liye iska estimated budget aur 2-week sprint roadmap 'Launch New Project' tab mein set kar doon?`;
  }

  function appendChatMessage(sender, text, isAgent = false) {
    const div = document.createElement('div');
    if (isAgent) {
      div.className = 'p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-slate-200 max-w-xl';
      div.innerHTML = `<div class="text-[11px] font-bold text-indigo-400 mb-1">${sender}</div>${text}`;
    } else {
      div.className = 'p-3.5 rounded-2xl bg-slate-800 text-white max-w-xl ml-auto';
      div.innerHTML = `<div class="text-[11px] font-bold text-cyan-400 mb-1">${sender}</div>${text}`;
    }
    sandboxMessages.appendChild(div);
    sandboxMessages.scrollTop = sandboxMessages.scrollHeight;
  }

  sandboxForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = sandboxInput.value.trim();
    if (!text) return;
    appendChatMessage(user.name, text, false);
    sandboxInput.value = '';

    setTimeout(() => {
      const reply = generateAgentReply(text, personaSelect.value);
      appendChatMessage('LogicCore AI Agent', reply, true);
    }, 350);
  });

  document.querySelectorAll('.sandbox-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      sandboxInput.value = chip.textContent.trim();
      sandboxForm.dispatchEvent(new Event('submit'));
    });
  });
}

// Initialize based on active page
document.addEventListener('DOMContentLoaded', () => {
  initLandingPage();
  initAuthPage();
      
