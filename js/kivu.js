// ── Error helper (silent in production) ──
const logError = (ctx, err) => { if (location.hostname === 'localhost') console.error(ctx, err); };

// ── Alpine.js App ──
function app() {
  return {
    theme: localStorage.getItem('kivu-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    init() {
      document.documentElement.setAttribute('data-theme', this.theme);
      document.documentElement.style.setProperty('color-scheme', this.theme);
    },
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('kivu-theme', this.theme);
      document.documentElement.setAttribute('data-theme', this.theme);
      document.documentElement.style.setProperty('color-scheme', this.theme);
      if (typeof refreshMapTheme === 'function') refreshMapTheme();
    }
  };
}

// ── Curseur ──
const c = document.getElementById('cur'), cr = document.getElementById('cur-r');
let mx=0, my=0, rx=0, ry=0;
document.addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; });

// ── Toast & Confirm ──
function showToast(msg, isError) {
  const existing = document.querySelector('.kivu-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'kivu-toast';
  Object.assign(toast.style, {
    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    background: isError ? '#8A1C42' : '#28613A', color: '#fff',
    padding: '14px 24px', borderRadius: '10px', fontFamily: 'var(--font-sans)',
    fontSize: '0.9rem', fontWeight: '600', zIndex: '99999',
    boxShadow: '0 8px 30px rgba(0,0,0,0.2)', animation: 'fadeInUp .3s forwards',
  });
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 4000);
}
function confirmAction(msg) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', background: 'rgba(20,16,8,0.6)', zIndex: '99999',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)',
    });
    const box = document.createElement('div');
    Object.assign(box.style, {
      background: '#fff', borderRadius: '12px', padding: '28px', maxWidth: '360px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center',
    });
    box.innerHTML = `<p style="font-size:1rem;color:var(--noir);margin-bottom:20px;line-height:1.5;">${msg}</p>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="btn btn-dark" style="flex:1;justify-content:center;" id="confirm-yes">Confirmer</button>
        <button class="btn btn-outline" style="flex:1;justify-content:center;" id="confirm-no">Annuler</button>
      </div>`;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.getElementById('confirm-yes').addEventListener('click', () => { overlay.remove(); resolve(true); });
    document.getElementById('confirm-no').addEventListener('click', () => { overlay.remove(); resolve(false); });
    overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
    document.getElementById('confirm-yes').focus();
  });
}
document.addEventListener('error', e => {
  if (e.target instanceof HTMLImageElement && !e.target.dataset.fallback) {
    e.target.dataset.fallback = '1';
    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" fill="%23EDE3CC"%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".1em" fill="%23C4AA7A" font-family="sans-serif" font-size="18"%3EKIVU%3C/text%3E%3C/svg%3E';
  }
}, true);
(function anim() {
  c.style.left=mx+'px'; c.style.top=my+'px';
  rx+=(mx-rx)*0.14; ry+=(my-ry)*0.14;
  cr.style.left=rx+'px'; cr.style.top=ry+'px';
  requestAnimationFrame(anim);
})();
document.querySelectorAll('a,button,.market-card,.artisan-card,.lit-card,.plat-card,.archi-type,.agenda-card').forEach(el=>{
  el.addEventListener('mouseenter',()=>{ c.style.width='18px';c.style.height='18px';cr.style.width='52px';cr.style.height='52px'; });
  el.addEventListener('mouseleave',()=>{ c.style.width='10px';c.style.height='10px';cr.style.width='36px';cr.style.height='36px'; });
});

// ── Mobile nav toggle ──
function toggleNav() {
  const menu = document.getElementById('nav-menu');
  const toggle = document.getElementById('nav-toggle');
  const isOpen = menu.classList.toggle('open');
  toggle.classList.toggle('open', isOpen);
  toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  document.body.classList.toggle('body-scroll-lock', isOpen);
}
function closeNav() {
  const menu = document.getElementById('nav-menu');
  const toggle = document.getElementById('nav-toggle');
  menu.classList.remove('open');
  toggle.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('body-scroll-lock');
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const menu = document.getElementById('nav-menu');
    if (menu.classList.contains('open')) closeNav();
  }
});
document.addEventListener('click', e => {
  const menu = document.getElementById('nav-menu');
  const toggle = document.getElementById('nav-toggle');
  if (menu.classList.contains('open') && !menu.contains(e.target) && !toggle.contains(e.target)) {
    closeNav();
  }
});

// ── Nav scroll ──
window.addEventListener('scroll',()=>{
  document.getElementById('nav').classList.toggle('up', window.scrollY>60);
});

// ── Scroll reveal ──
const obs = new IntersectionObserver(entries=>{
  entries.forEach(e=>{ if(e.isIntersecting){e.target.classList.add('on');obs.unobserve(e.target);} });
},{threshold:0.1});
document.querySelectorAll('.rv').forEach(el=>obs.observe(el));

// ── Piliers nav active ──
const sections = ['arts','architecture','artisanat','technologie'];
const navItems = document.querySelectorAll('.pillar-nav-item');
window.addEventListener('scroll',()=>{
  let cur='';
  sections.forEach(id=>{
    const s=document.getElementById(id);
    if(s && window.scrollY >= s.offsetTop - 200) cur=id;
  });
  navItems.forEach(item=>{
    item.classList.remove('active');
    if(item.getAttribute('href')==='#'+cur) item.classList.add('active');
  });
});

// ── Authentification Supabase ──
const authModal = document.getElementById('modal');
const authFormView = document.getElementById('auth-form-view');
const accountView = document.getElementById('account-view');
const authForm = document.getElementById('auth-form');
const authSubmit = document.getElementById('auth-submit');
const authFeedback = document.getElementById('auth-feedback');
const accountFeedback = document.getElementById('auth-account-feedback');
const authPassword = document.getElementById('auth-password');
const authConfirmPassword = document.getElementById('auth-confirm-password');
const authSignupFields = document.getElementById('auth-signup-fields');
const authConfirmField = document.getElementById('auth-confirm-field');
const authNavLink = document.getElementById('auth-nav-link');
const authConfig = window.KIVU_SUPABASE_CONFIG || {};
const authIsConfigured = Boolean(
  authConfig.url &&
  authConfig.anonKey &&
  !authConfig.url.includes('YOUR_') &&
  !authConfig.anonKey.includes('YOUR_')
);
let authClient = null;
let currentUser = null;
let authMode = 'signup';

if (authIsConfigured && window.supabase && typeof window.supabase.createClient === 'function') {
  try {
    authClient = window.supabase.createClient(authConfig.url, authConfig.anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
      }
    });
  } catch (error) {
    logError('Supabase initialization failed:', error);
  }
}

const roleLabels = {
  artisan: 'Artiste / Artisan / Createur',
  collector: 'Collectionneur',
  operator: 'Operateur culturel / Galerie',
  admin: 'Administrateur'
};

function setAuthFeedback(element, message, type) {
  element.textContent = message || '';
  element.className = 'auth-feedback' + (type ? ' ' + type : '');
  element.hidden = !message;
}

function authErrorMessage(error) {
  const message = (error && error.message ? error.message : '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (message.includes('user already registered')) return 'Cette adresse email est deja utilisee.';
  if (message.includes('password')) return 'Le mot de passe doit contenir au moins 8 caracteres.';
  if (message.includes('email')) return 'Veuillez saisir une adresse email valide.';
  return (error && error.message) || 'Une erreur est survenue. Veuillez reessayer.';
}

function setAuthMode(mode) {
  authMode = mode === 'login' ? 'login' : 'signup';
  const isSignup = authMode === 'signup';
  const profileFields = authSignupFields.querySelectorAll('input, select');

  document.querySelectorAll('[data-auth-mode]').forEach(button => {
    const active = button.dataset.authMode === authMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  authSignupFields.hidden = !isSignup;
  authConfirmField.hidden = !isSignup;
  profileFields.forEach(field => { field.required = isSignup; });
  authConfirmPassword.required = isSignup;
  authPassword.minLength = isSignup ? 8 : 1;
  authPassword.autocomplete = isSignup ? 'new-password' : 'current-password';
  authPassword.placeholder = isSignup ? '8 caracteres minimum' : 'Votre mot de passe';
  document.getElementById('modal-title').textContent = isSignup ? 'Rejoindre KIVU' : 'Se connecter';
  document.getElementById('auth-modal-sub').textContent = isSignup
    ? 'Artiste, artisan, collectionneur ou operateur culturel — votre espace en 2 minutes.'
    : 'Retrouvez votre espace, vos oeuvres et vos commandes KIVU.';
  authSubmit.textContent = isSignup ? 'Creer mon compte — Gratuit' : 'Se connecter';
  document.getElementById('auth-reset-link').hidden = isSignup;
  document.getElementById('auth-note').textContent = isSignup
    ? 'Aucune commission sur les 3 premieres ventes. 80% reverses a l’artisan.'
    : 'La session reste active sur cet appareil.';
  setAuthFeedback(authFeedback, '', '');
  if (!authClient) {
    setAuthFeedback(authFeedback, 'Configurez supabase-config.js puis executez supabase-schema.sql pour activer l’authentification.', 'error');
  }
}

function updateAuthNav() {
  authNavLink.textContent = currentUser ? 'Mon compte' : 'Rejoindre';
  authNavLink.setAttribute('aria-label', currentUser ? 'Ouvrir mon compte' : 'Rejoindre KIVU');
}

function renderLoggedOutView() {
  authFormView.hidden = false;
  accountView.hidden = true;
  authSubmit.disabled = !authClient;
  setAuthMode(authMode);
}

function renderLoggedInView() {
  authFormView.hidden = true;
  accountView.hidden = false;
  document.getElementById('auth-user-email').textContent = currentUser.email;
  setAuthFeedback(accountFeedback, '', '');
  loadProfile();
}

function openModal(mode) {
  if (currentUser) {
    renderLoggedInView();
  } else {
    if (mode) setAuthMode(mode);
    renderLoggedOutView();
  }
  authModal.classList.add('open');
  authModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  window.requestAnimationFrame(() => {
    const focusTarget = currentUser ? document.getElementById('auth-signout') : document.getElementById('auth-email');
    if (focusTarget) focusTarget.focus();
  });
  previousFocus = document.activeElement;
}

function closeModal() {
  cancelEdit();
  adminSubTab = 'dashboard';
  document.getElementById('purchase-view').hidden = true;
  document.getElementById('artisan-public-view').hidden = true;
  document.getElementById('auth-form-view').hidden = false;
  document.getElementById('account-view').hidden = true;
  document.querySelector('.modal').classList.remove('modal-wide');
  document.getElementById('modal').setAttribute('aria-labelledby', 'modal-title');
  authModal.classList.remove('open');
  authModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (previousFocus) { previousFocus.focus(); previousFocus = null; }
}

document.querySelectorAll('[data-auth-mode]').forEach(button => {
  button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
});

authForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!authClient) {
    setAuthFeedback(authFeedback, 'Configurez Supabase avant de continuer.', 'error');
    return;
  }
  if (!authForm.reportValidity()) return;

  const formData = new FormData(authForm);
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  authSubmit.disabled = true;
  authSubmit.textContent = authMode === 'signup' ? 'Creation en cours...' : 'Connexion en cours...';
  setAuthFeedback(authFeedback, '', '');

  try {
    if (authMode === 'signup') {
      const confirmPassword = String(formData.get('confirm_password') || '');
      if (password !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas.');
      }
      const { data, error } = await authClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            city: String(formData.get('city') || '').trim(),
            first_name: String(formData.get('first_name') || '').trim(),
            last_name: String(formData.get('last_name') || '').trim(),
            role: String(formData.get('role') || 'collector')
          }
        }
      });
      if (error) throw error;
      authForm.reset();
      document.getElementById('auth-role').value = 'collector';
      if (data.session && data.user) {
        currentUser = data.user;
        updateAuthNav();
        renderLoggedInView();
        setAuthFeedback(accountFeedback, 'Compte cree avec succes.', 'success');
      } else {
        setAuthFeedback(authFeedback, 'Compte cree. Consultez votre email pour confirmer votre adresse avant de vous connecter.', 'success');
      }
    } else {
      const { data, error } = await authClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      currentUser = data.user;
      updateAuthNav();
      renderLoggedInView();
    }
  } catch (error) {
    setAuthFeedback(authFeedback, error.message === 'Les mots de passe ne correspondent pas.' ? error.message : authErrorMessage(error), 'error');
  } finally {
    authSubmit.disabled = !authClient;
    if (!currentUser) authSubmit.textContent = authMode === 'signup' ? 'Creer mon compte — Gratuit' : 'Se connecter';
  }
});

document.getElementById('auth-signout').addEventListener('click', async () => {
  if (!authClient) return;
  const signoutButton = document.getElementById('auth-signout');
  signoutButton.disabled = true;
  const { error } = await authClient.auth.signOut();
  signoutButton.disabled = false;
  if (error) {
    setAuthFeedback(accountFeedback, authErrorMessage(error), 'error');
    return;
  }
  currentUser = null;
  updateAuthNav();
  setAuthMode('signup');
  renderLoggedOutView();
  setAuthFeedback(authFeedback, 'Vous etes deconnecte.', 'success');
});

let previousFocus = null;

authModal.addEventListener('click', function(event) { if (event.target === this) closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && authModal.classList.contains('open')) closeModal(); });

// Focus trap
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Tab' || !authModal.classList.contains('open')) return;
  const focusable = authModal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

updateAuthNav();
setAuthMode('signup');
if (authClient) {
  authClient.auth.onAuthStateChange((_event, session) => {
    const wasOAuth = sessionStorage.getItem('kivu_oauth_pending');
    currentUser = session && session.user ? session.user : null;
    updateAuthNav();
    if (authModal.classList.contains('open')) {
      if (currentUser) renderLoggedInView();
      else renderLoggedOutView();
    }
    if (currentUser && wasOAuth) {
      sessionStorage.removeItem('kivu_oauth_pending');
      openModal();
    }
  });
  authClient.auth.getSession().then(({ data }) => {
    const wasOAuth = sessionStorage.getItem('kivu_oauth_pending');
    currentUser = data.session && data.session.user ? data.session.user : null;
    updateAuthNav();
    if (currentUser && wasOAuth) {
      sessionStorage.removeItem('kivu_oauth_pending');
      openModal();
    }
  });
}

// Handle Stripe checkout return
(function() {
  const params = new URLSearchParams(window.location.search);
  const checkout = params.get('checkout');
  const artworkId = params.get('artwork');
  if (checkout === 'success' || checkout === 'cancel') {
    const url = new URL(window.location);
    url.searchParams.delete('checkout');
    url.searchParams.delete('artwork');
    window.history.replaceState({}, '', url);
    if (checkout === 'success') {
      setTimeout(() => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(20,16,8,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn .3s ease;';
        overlay.innerHTML = `
          <div style="background:var(--blanc);border-radius:16px;padding:48px 40px;max-width:400px;width:100%;text-align:center;animation:fadeInUp .3s forwards;">
            <div style="font-size:3rem;margin-bottom:12px;">🎉</div>
            <h2 style="font-family:var(--font-sans);font-size:1.5rem;font-weight:var(--fw-heading);color:var(--noir);margin-bottom:8px;">Merci !</h2>
            <p style="font-size:0.9rem;color:var(--gris-text);line-height:1.6;margin-bottom:24px;">Votre commande a été confirmée. L'artisan vous contactera sous 48h pour finaliser la livraison.</p>
            ${artworkId ? '<p style="font-size:0.78rem;color:var(--gris-mid);margin-bottom:20px;">Réf. œuvre : ' + artworkId.substring(0,8) + '…</p>' : ''}
            <button onclick="this.closest('div[style]').parentElement.remove();" class="btn btn-lave" style="width:100%;justify-content:center;">Continuer</button>
          </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      }, 500);
    } else {
      setTimeout(() => {
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#8A1C42;color:#fff;padding:14px 24px;border-radius:10px;font-family:var(--font-sans);font-size:0.9rem;font-weight:600;z-index:99999;box-shadow:0 8px 30px rgba(0,0,0,0.2);animation:fadeInUp .3s forwards;';
        toast.textContent = 'Paiement annulé. Vous pouvez réessayer.';
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 4000);
      }, 500);
    }
  }
})();

async function signInWithGoogle() {
  if (!authClient) {
    setAuthFeedback(authFeedback, 'Configurez Supabase avant de continuer.', 'error');
    return;
  }
  const btn = document.getElementById('btn-google-auth');
  btn.disabled = true;
  btn.textContent = 'Redirection vers Google...';
  try {
    sessionStorage.setItem('kivu_oauth_pending', 'google');
    const { error } = await authClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href.split('#')[0].split('?')[0],
      }
    });
    if (error) throw error;
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<svg class="google-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Continuer avec Google';
    setAuthFeedback(authFeedback, err.message || 'Erreur lors de la connexion avec Google.', 'error');
  }
}

async function resetPassword() {
  if (!authClient) return;
  const email = document.getElementById('auth-email').value.trim();
  if (!email || !email.includes('@')) {
    setAuthFeedback(authFeedback, 'Veuillez saisir votre adresse email.', 'error');
    return;
  }
  try {
    const { error } = await authClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/kivu-culture.html',
    });
    if (error) throw error;
    setAuthFeedback(authFeedback, 'Un lien de réinitialisation vous a été envoyé par email.', 'success');
  } catch (err) {
    setAuthFeedback(authFeedback, err.message || 'Erreur lors de l\'envoi du lien.', 'error');
  }
}

// ── Profile & Artwork Management ──
const profileForm = document.getElementById('profile-form');
const acctTabs = document.getElementById('acct-tabs');
const acctProfile = document.getElementById('acct-profile');
const acctMessages = document.getElementById('acct-messages');
const acctFavorites = document.getElementById('acct-favorites');
const acctArtworks = document.getElementById('acct-artworks');
const acctOrders = document.getElementById('acct-orders');
const acctCerts = document.getElementById('acct-certs');
const acctAdmin = document.getElementById('acct-admin');
const artworkForm = document.getElementById('artwork-form');
const artworkListContainer = document.getElementById('artwork-list-container');
const artworkListStatus = document.getElementById('artwork-list-status');
const artworkAddDetails = document.getElementById('artwork-add-details');
const ordersContainer = document.getElementById('orders-container');
const certsContainer = document.getElementById('certs-container');
let currentProfile = null;
let editingArtworkId = null;
const FREE_PUB_LIMIT = 5;

document.querySelectorAll('[data-acct-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.acctView;
    document.querySelectorAll('[data-acct-view]').forEach(b => b.classList.toggle('active', b === btn));
    acctProfile.hidden = view !== 'profile';
    acctMessages.hidden = view !== 'messages';
    acctFavorites.hidden = view !== 'favorites';
    acctArtworks.hidden = view !== 'artworks';
    acctOrders.hidden = view !== 'orders';
    acctCerts.hidden = view !== 'certs';
    acctAdmin.hidden = view !== 'admin';
    if (view === 'artworks') loadMyArtworks();
    if (view === 'orders') loadMyOrders();
    if (view === 'certs') loadMyCertificates();
    if (view === 'admin') loadAdminDashboard();
    if (view === 'favorites') updateFavoritesUI();
    if (view === 'messages') loadConversations();
  });
});

async function loadProfile() {
  if (!authClient || !currentUser) return;
  try {
    const { data, error } = await authClient
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    if (error) throw error;
    currentProfile = data;
    document.getElementById('prof-first-name').value = data.first_name || '';
    document.getElementById('prof-last-name').value = data.last_name || '';
    document.getElementById('prof-city').value = data.city || '';
    acctTabs.hidden = false;
    document.getElementById('acct-admin-tab').hidden = data.role !== 'admin';
    const roleLabel = document.getElementById('auth-user-role');
    roleLabel.textContent = 'Profil : ' + (roleLabels[data.role] || roleLabels.collector);
  } catch (err) {
    logError('Profile load error:', err);
  }
}

profileForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!authClient || !currentUser) return;
  const btn = profileForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Enregistrement…';
  setAuthFeedback(accountFeedback, '', '');
  try {
    const fd = new FormData(profileForm);
    const { error } = await authClient
      .from('profiles')
      .update({
        first_name: String(fd.get('first_name') || '').trim(),
        last_name: String(fd.get('last_name') || '').trim(),
        city: String(fd.get('city') || '').trim() || null,
      })
      .eq('id', currentUser.id);
    if (error) throw error;
    setAuthFeedback(accountFeedback, 'Profil mis à jour.', 'success');
    loadProfile();
  } catch (err) {
    setAuthFeedback(accountFeedback, err.message || 'Erreur lors de la mise à jour.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enregistrer le profil';
  }
});

async function getPublicationCount() {
  if (!authClient || !currentUser) return 0;
  try {
    const { count, error } = await authClient
      .from('artworks')
      .select('*', { count: 'exact', head: true })
      .eq('artisan_id', currentUser.id)
      .eq('status', 'published');
    if (error) throw error;
    return count || 0;
  } catch (err) { logError('getPublicationCount error:', err); return 0; }
}

const artworksById = {};

async function loadMyArtworks() {
  if (!authClient || !currentUser) return;
  if (!artworkListContainer) return;
  artworkListStatus.textContent = 'Chargement de vos œuvres…';
  try {
    const [pubCount, { data, error }] = await Promise.all([
      getPublicationCount(),
      authClient.from('artworks').select('*').eq('artisan_id', currentUser.id).order('created_at', { ascending: false })
    ]);
    if (error) throw error;
    (data || []).forEach(a => { artworksById[a.id] = a; });
    renderMyArtworks(data || [], pubCount);
  } catch (err) {
    artworkListStatus.textContent = 'Erreur de chargement.';
    logError('loadMyArtworks error:', err);
  }
}

function renderPublicationCounter(pubCount) {
  const remaining = Math.max(0, FREE_PUB_LIMIT - pubCount);
  const pct = Math.min(100, (pubCount / FREE_PUB_LIMIT) * 100);
  const reached = pubCount >= FREE_PUB_LIMIT;
  const div = document.createElement('div');
  div.className = 'pub-counter' + (reached ? ' pub-limit-reached' : '');
  div.innerHTML = reached
    ? `<div class="pub-counter-text">Limite de ${FREE_PUB_LIMIT} publications gratuites atteinte</div>
       <p style="font-size:0.8rem;color:var(--gris-text);">Souscrivez à un abonnement pour continuer à publier vos œuvres.</p>`
    : `<div class="pub-counter-text">${pubCount}/${FREE_PUB_LIMIT} publications gratuites utilisées</div>
       <div class="pub-counter-bar"><div class="pub-counter-fill" style="width:${pct}%"></div></div>
       <div class="pub-counter-limit">Encore ${remaining} publication${remaining > 1 ? 's' : ''} gratuite${remaining > 1 ? 's' : ''}</div>`;
  return div;
}

function currencySymbol(currency) {
  return { USD: '$', EUR: '€', GBP: '£', CDF: 'FC' }[currency] || '$';
}

function renderMyArtworks(artworks, pubCount) {
  if (!artworkListContainer) return;
  artworkListContainer.innerHTML = '';
  artworkListContainer.appendChild(renderPublicationCounter(pubCount));

  if (!artworks.length) {
    artworkListContainer.insertAdjacentHTML('beforeend', '<p style="font-size:0.85rem;color:var(--gris-text);margin-top:12px;">Vous n\'avez pas encore d\'œuvre.</p>');
    return;
  }
  const list = document.createElement('div');
  list.className = 'artwork-list';
  artworks.forEach(a => {
    const price = (a.price_cents / 100).toFixed(2);
    const sym = currencySymbol(a.currency || 'USD');
    const statusLabel = a.status === 'published' ? 'Publié' : a.status === 'draft' ? 'Brouillon' : 'Archivé';
    const item = document.createElement('div');
    item.className = 'artwork-item';
    let actionsHtml = '';
    if (a.status === 'draft') {
      actionsHtml = `<div class="artwork-actions">
        <button class="art-action art-publish" onclick="publishArtwork('${a.id}')">Publier</button>
        <button class="art-action art-edit" onclick="editArtwork('${a.id}')">Modifier</button>
        <button class="art-action art-delete" onclick="deleteArtwork('${a.id}')">Supprimer</button>
      </div>`;
    } else if (a.status === 'published') {
      actionsHtml = `<div class="artwork-actions">
        <button class="art-action art-archive" onclick="archiveArtwork('${a.id}')">Archiver</button>
      </div>`;
    } else if (a.status === 'archived') {
      actionsHtml = `<div class="artwork-actions">
        <button class="art-action art-delete" onclick="deleteArtwork('${a.id}')">Supprimer</button>
      </div>`;
    }
    item.innerHTML = `
      <img class="artwork-item-thumb" src="${sanitizeUrl(a.image_path) || 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=150&q=85&fm=webp'}" alt="" loading="lazy">
      <div class="artwork-item-info">
        <div class="artwork-item-title">${escapeHtml(a.title)}</div>
        <div class="artwork-item-meta">${escapeHtml(a.category)} — ${price} ${sym}</div>
      </div>
      <span class="artwork-item-status status-${a.status}">${statusLabel}</span>
      ${actionsHtml}
    `;
    list.appendChild(item);
  });
  artworkListContainer.appendChild(list);
}

async function publishArtwork(id) {
  if (!authClient || !currentUser) return;
  const pubCount = await getPublicationCount();
  if (pubCount >= FREE_PUB_LIMIT) {
    setAuthFeedback(accountFeedback, `Limite de ${FREE_PUB_LIMIT} publications gratuites atteinte. Un abonnement est requis.`, 'error');
    return;
  }
  setAuthFeedback(accountFeedback, '', '');
  try {
    const { error } = await authClient.from('artworks').update({ status: 'published' }).eq('id', id).eq('artisan_id', currentUser.id);
    if (error) throw error;
    setAuthFeedback(accountFeedback, 'Œuvre publiée avec succès.', 'success');
    loadMyArtworks();
  } catch (err) {
    setAuthFeedback(accountFeedback, err.message || 'Erreur lors de la publication.', 'error');
  }
}

async function archiveArtwork(id) {
  if (!authClient || !currentUser) return;
  setAuthFeedback(accountFeedback, '', '');
  try {
    const { error } = await authClient.from('artworks').update({ status: 'archived' }).eq('id', id).eq('artisan_id', currentUser.id);
    if (error) throw error;
    setAuthFeedback(accountFeedback, 'Œuvre archivée.', 'success');
    loadMyArtworks();
  } catch (err) {
    setAuthFeedback(accountFeedback, err.message || 'Erreur.', 'error');
  }
}

async function deleteArtwork(id) {
  if (!authClient || !currentUser) return;
  if (!await confirmAction('Supprimer cette œuvre définitivement ?')) return;
  setAuthFeedback(accountFeedback, '', '');
  try {
    const { error } = await authClient.from('artworks').delete().eq('id', id).eq('artisan_id', currentUser.id);
    if (error) throw error;
    cancelEdit();
    loadMyArtworks();
    setAuthFeedback(accountFeedback, 'Œuvre supprimée.', 'success');
  } catch (err) {
    setAuthFeedback(accountFeedback, err.message || 'Erreur lors de la suppression.', 'error');
  }
}

function editArtwork(id) {
  const a = artworksById[id];
  if (!a) return;

  document.getElementById('art-title').value = a.title || '';
  document.getElementById('art-category').value = a.category || '';
  document.getElementById('art-description').value = a.description || '';
  document.getElementById('art-price').value = (a.price_cents / 100).toFixed(2);
  document.getElementById('art-image').value = a.image_path || '';

  editingArtworkId = id;
  const submitBtn = artworkForm.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Enregistrer les modifications';
  artworkAddDetails.open = true;
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-sm btn-dark';
  cancelBtn.textContent = 'Annuler';
  cancelBtn.id = 'art-cancel-edit';
  cancelBtn.style.cssText = 'width:100%;justify-content:center;margin-top:6px;';
  cancelBtn.addEventListener('click', cancelEdit);
  const existing = document.getElementById('art-cancel-edit');
  if (existing) existing.remove();
  submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling);
}

function cancelEdit() {
  editingArtworkId = null;
  artworkForm.reset();
  const submitBtn = artworkForm.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Publier l\'œuvre';
  const cancelBtn = document.getElementById('art-cancel-edit');
  if (cancelBtn) cancelBtn.remove();
  artworkAddDetails.open = false;
}

artworkForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!authClient || !currentUser) return;
  const btn = artworkForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = editingArtworkId ? 'Enregistrement…' : 'Publication…';
  try {
    const fd = new FormData(artworkForm);
    const priceRaw = parseFloat(fd.get('price'));
    const priceDollars = isNaN(priceRaw) ? 0 : Math.max(0, priceRaw);
    const payload = {
      title: String(fd.get('title') || '').trim(),
      category: String(fd.get('category') || '').trim(),
      description: String(fd.get('description') || '').trim() || null,
      price_cents: Math.round(priceDollars * 100) || 0,
      image_path: String(fd.get('image_path') || '').trim() || null,
    };

    if (editingArtworkId) {
      const { error } = await authClient.from('artworks').update(payload).eq('id', editingArtworkId).eq('artisan_id', currentUser.id);
      if (error) throw error;
      cancelEdit();
      loadMyArtworks();
      setAuthFeedback(accountFeedback, 'Œuvre modifiée.', 'success');
    } else {
      const { error } = await authClient.from('artworks').insert({ ...payload, artisan_id: currentUser.id, status: 'draft' });
      if (error) throw error;
      artworkForm.reset();
      artworkAddDetails.open = false;
      loadMyArtworks();
      setAuthFeedback(accountFeedback, 'Œuvre ajoutée (statut : brouillon).', 'success');
    }
  } catch (err) {
    setAuthFeedback(accountFeedback, err.message || 'Erreur lors de l\'enregistrement.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = editingArtworkId ? 'Enregistrer les modifications' : 'Publier l\'œuvre';
  }
});

// ── Purchase Flow ──
function buyArtwork(artworkId) {
  if (!authClient) { openModal(); return; }
  if (!currentUser) { openModal(); return; }
  const artwork = catalogArtworks.find(a => a.id === artworkId);
  if (!artwork) return;
  const container = document.getElementById('purchase-content');
  const artisanName = artwork.profiles
    ? [artwork.profiles.first_name, artwork.profiles.last_name].filter(Boolean).join(' ') || 'Artisan'
    : 'Artisan';
  const price = (artwork.price_cents / 100).toFixed(2);
  const sym = currencySymbol(artwork.currency || 'USD');
  const img = sanitizeUrl(artwork.image_path) || 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=200&q=85&fm=webp';
  container.innerHTML = `
    <div class="purchase-preview">
      <img class="purchase-preview-img" src="${img}" alt="" loading="lazy">
      <div class="purchase-preview-info">
        <div class="purchase-preview-title">${escapeHtml(artwork.title)}</div>
        <div class="purchase-preview-artist">${escapeHtml(artisanName)}</div>
        <div class="purchase-preview-price">${price} ${sym}</div>
      </div>
    </div>
    <p style="font-size:0.85rem;color:var(--gris-text);margin-bottom:16px;">Vous serez redirigé vers Stripe pour le paiement sécurisé par carte.</p>
    <button class="btn btn-lave" id="confirm-purchase-btn" style="width:100%;justify-content:center;">Confirmer et payer</button>
    <button class="btn btn-outline" style="width:100%;justify-content:center;margin-top:8px;" onclick="closeModal()">Annuler</button>
  `;
  document.getElementById('purchase-title').textContent = 'Confirmer l\'achat';
  document.getElementById('modal').setAttribute('aria-labelledby', 'purchase-title');
  document.getElementById('auth-form-view').hidden = true;
  document.getElementById('account-view').hidden = true;
  document.getElementById('artisan-public-view').hidden = true;
  document.getElementById('purchase-view').hidden = false;
  document.getElementById('modal').classList.add('open');
  document.getElementById('modal').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  document.getElementById('confirm-purchase-btn').onclick = () => createOrder(artwork);
}

async function createOrder(artwork) {
  const btn = document.getElementById('confirm-purchase-btn');
  btn.disabled = true;
  btn.textContent = 'Redirection vers Stripe…';
  try {
    const session = await authClient.auth.getSession();
    const token = session?.data?.session?.access_token;
    if (!token) throw new Error('Session invalide');

    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        artwork_id: artwork.id,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur');

    const { error: orderErr } = await authClient.from('orders').insert({
      buyer_id: currentUser.id,
      artwork_id: artwork.id,
      amount_cents: artwork.price_cents,
      currency: artwork.currency || 'USD',
      status: 'pending',
      payment_reference: data.session_id,
    });
    if (orderErr) throw new Error('Impossible de créer la commande');

    window.location.href = data.url;
  } catch (err) {
    logError('Stripe session error:', err);
    btn.textContent = 'Erreur — ' + (err.message || 'réessayez');
    btn.style.background = '#FCE4EC';
    setTimeout(() => { btn.disabled = false; btn.textContent = 'Confirmer et payer'; btn.style.background = ''; }, 3000);
  }
}

// ── Orders ──
async function loadMyOrders() {
  if (!authClient || !currentUser || !ordersContainer) return;
  ordersContainer.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-mid);">Chargement…</p>';
  try {
    const { data: myArtworks } = await authClient
      .from('artworks').select('id').eq('artisan_id', currentUser.id);
    const myIds = (myArtworks || []).map(a => a.id);
    const filter = myIds.length
      ? 'buyer_id.eq.' + currentUser.id + ',artwork_id.in.(' + myIds.join(',') + ')'
      : 'buyer_id.eq.' + currentUser.id;
    const { data, error } = await authClient
      .from('orders')
      .select('*, artworks:artwork_id(title, category, image_path)')
      .or(filter)
      .order('created_at', { ascending: false });
    if (error) throw error;
    renderOrders(data || []);
  } catch (err) {
    logError('Orders load error:', err);
    ordersContainer.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Erreur de chargement.</p>';
  }
}

function renderOrders(orders) {
  if (!orders.length) {
    ordersContainer.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Aucune commande pour le moment.</p>';
    return;
  }
  const statusLabels = { pending: 'En attente', paid: 'Payée', cancelled: 'Annulée', refunded: 'Remboursée' };
  const statusClasses = { pending: 'ost-pending', paid: 'ost-paid', cancelled: 'ost-cancelled', refunded: 'ost-refunded' };
  let html = '<div class="order-list">';
  orders.forEach(o => {
    const artwork = o.artworks || {};
    const price = (o.amount_cents / 100).toFixed(2);
    const sym = currencySymbol(o.currency || 'USD');
    html += `<div class="order-item">
      <div class="order-item-header">
        <span class="order-item-id">#${o.id.slice(0, 8)}</span>
        <span class="order-item-status ${statusClasses[o.status] || 'ost-pending'}">${statusLabels[o.status] || o.status}</span>
      </div>
      <div class="order-item-artwork">${escapeHtml(artwork.title || 'Œuvre')}</div>
      <div class="order-item-meta">${price} ${sym} — ${new Date(o.created_at).toLocaleDateString('fr-FR')}</div>
    </div>`;
  });
  html += '</div>';
  ordersContainer.innerHTML = html;
}

// ── Certificates ──
async function loadMyCertificates() {
  if (!authClient || !currentUser || !certsContainer) return;
  certsContainer.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-mid);">Chargement…</p>';
  try {
    const { data: myArtworks } = await authClient
      .from('artworks').select('id').eq('artisan_id', currentUser.id);
    const myIds = (myArtworks || []).map(a => a.id);
    if (!myIds.length) { renderCertificates([]); return; }
    const { data, error } = await authClient
      .from('certificates')
      .select('*, artworks:artwork_id(title)')
      .in('artwork_id', myIds);
    if (error) throw error;
    renderCertificates(data || []);
  } catch (err) {
    logError('Certificates load error:', err);
    certsContainer.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Erreur de chargement.</p>';
  }
}

function renderCertificates(certs) {
  if (!certs.length) {
    certsContainer.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Aucun certificat pour le moment. Les certificats sont générés après l\'achat d\'une œuvre.</p>';
    return;
  }
  let html = '<div class="cert-list">';
  certs.forEach(c => {
    const artwork = c.artworks || {};
    html += `<div class="cert-item">
      <div class="cert-icon">&#9670;</div>
      <div class="cert-info">
        <div class="cert-number">${escapeHtml(c.certificate_number)}</div>
        <div class="cert-artwork">${escapeHtml(artwork.title || 'Œuvre')}</div>
      </div>
    </div>`;
  });
  html += '</div>';
  certsContainer.innerHTML = html;
}

// ── Admin Dashboard ──
let adminSubTab = 'dashboard';

async function loadAdminDashboard() {
  document.querySelector('.modal').classList.add('modal-wide');
  const container = document.getElementById('admin-content');
  if (!container || !authClient || !currentUser) return;
  try {
    const { data: profile } = await authClient.from('profiles').select('role').eq('id', currentUser.id).single();
    if (!profile || profile.role !== 'admin') {
      container.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Accès réservé aux administrateurs.</p>';
      return;
    }
    renderAdminMenu(container);
    renderAdminView(container);
  } catch (err) {
    logError('Admin load error:', err);
    container.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Erreur de chargement.</p>';
  }
}

function renderAdminMenu(container) {
  const tabs = ['dashboard', 'users', 'events', 'verifications', 'messages', 'reviews'];
  const labels = { dashboard: 'Tableau de bord', users: 'Utilisateurs', events: 'Événements', verifications: 'Vérifications', messages: 'Messages', reviews: 'Avis' };
  let html = '<div class="admin-sub-tabs">';
  tabs.forEach(t => {
    html += `<button class="admin-sub-tab${adminSubTab === t ? ' active' : ''}" data-admin-tab="${t}">${labels[t]}</button>`;
  });
  html += '</div><div id="admin-sub-content"></div>';
  container.innerHTML = html;
  container.querySelectorAll('[data-admin-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      adminSubTab = btn.dataset.adminTab;
      renderAdminView(document.getElementById('admin-content'));
    });
  });
}

async function renderAdminView(container) {
  const content = document.getElementById('admin-sub-content');
  if (!content) return;
  try {
    if (adminSubTab === 'dashboard') await renderAdminDashboard(content);
    else if (adminSubTab === 'users') await renderAdminUsers(content);
    else if (adminSubTab === 'events') await renderAdminEvents(content);
    else if (adminSubTab === 'verifications') await renderAdminVerifications(content);
    else if (adminSubTab === 'messages') await renderAdminMessages(content);
    else if (adminSubTab === 'reviews') await renderAdminReviews(content);
  } catch (err) {
    logError('Admin view error:', err);
    content.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Erreur de chargement.</p>';
  }
}

async function renderAdminDashboard(el) {
  let html = '<div class="admin-stats">';
  try {
    const [{ count: users }, { count: artworks }, { count: orders }, { count: events }, { count: messages }, { count: reviews }] = await Promise.all([
      authClient.from('profiles').select('*', { count: 'exact', head: true }),
      authClient.from('artworks').select('*', { count: 'exact', head: true }),
      authClient.from('orders').select('*', { count: 'exact', head: true }),
      authClient.from('events').select('*', { count: 'exact', head: true }),
      authClient.from('messages').select('*', { count: 'exact', head: true }),
      authClient.from('reviews').select('*', { count: 'exact', head: true }),
    ]);
    const cards = [
      { num: users ?? 0, label: 'Utilisateurs' },
      { num: artworks ?? 0, label: 'Œuvres' },
      { num: orders ?? 0, label: 'Commandes' },
      { num: events ?? 0, label: 'Événements' },
      { num: messages ?? 0, label: 'Messages' },
      { num: reviews ?? 0, label: 'Avis' },
    ];
    cards.forEach(c => {
      html += `<div class="admin-stat-card"><div class="admin-stat-num">${c.num}</div><div class="admin-stat-label">${c.label}</div></div>`;
    });
  } catch { html += '<div class="admin-stat-card"><div class="admin-stat-num">—</div><div class="admin-stat-label">Erreur</div></div>'; }
  html += '</div>';
  el.innerHTML = html;
}

async function renderAdminUsers(el) {
  try {
    const { data, error } = await authClient.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || !data.length) { el.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Aucun utilisateur.</p>'; return; }
    let html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>ID</th><th>Rôle</th><th>Prénom</th><th>Nom</th><th>Ville</th></tr></thead><tbody>';
    data.forEach(u => {
      const role = roleLabels[u.role] || roleLabels.collector;
      html += `<tr><td>${escapeHtml(u.id.slice(0, 8))}</td><td>${escapeHtml(role)}</td><td>${escapeHtml(u.first_name || '')}</td><td>${escapeHtml(u.last_name || '')}</td><td>${escapeHtml(u.city || '')}</td></tr>`;
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
  } catch (err) {
    logError('Admin users error:', err);
    el.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Erreur de chargement.</p>';
  }
}

async function renderAdminEvents(el) {
  try {
    const { data, error } = await authClient.from('events').select('*').order('starts_at', { ascending: false });
    if (error) throw error;
    if (!data || !data.length) { el.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Aucun événement.</p>'; return; }
    let html = '<div style="margin-bottom:12px;"><button class="btn btn-lave" id="admin-event-add" style="font-size:0.75rem;">+ Ajouter un événement</button></div>';
    html += '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Titre</th><th>Date</th><th>Lieu</th><th>Statut</th><th></th></tr></thead><tbody>';
    data.forEach(e => {
      const d = new Date(e.starts_at);
      const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      html += `<tr><td>${escapeHtml(e.title)}</td><td>${dateStr}</td><td>${escapeHtml(e.location || '')}</td><td>${escapeHtml(e.status || 'draft')}</td>
        <td><button class="admin-sub-tab admin-event-edit" data-id="${e.id}" style="background:var(--gris-light);color:var(--noir);">Edit.</button>
        <button class="admin-sub-tab admin-event-delete" data-id="${e.id}" style="background:var(--lave);color:var(--blanc);">Suppr.</button></td></tr>`;
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
    el.querySelectorAll('.admin-event-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!await confirmAction('Supprimer cet événement ?')) return;
        try {
          const { error: delErr } = await authClient.from('events').delete().eq('id', btn.dataset.id);
          if (delErr) throw delErr;
          renderAdminView(document.getElementById('admin-content'));
        } catch (err) { logError('Event delete error:', err); }
      });
    });
    el.querySelectorAll('.admin-event-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const event = data.find(e => e.id === btn.dataset.id);
        if (event) showAdminEventForm(event);
      });
    });
    const addBtn = document.getElementById('admin-event-add');
    if (addBtn) addBtn.addEventListener('click', showAdminEventForm);
  } catch (err) {
    logError('Admin events error:', err);
    el.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Erreur de chargement.</p>';
  }
}

async function showAdminEventForm(eventToEdit) {
  const content = document.getElementById('admin-sub-content');
  if (!content) return;
  const editing = !!eventToEdit;
  const startVal = editing ? eventToEdit.starts_at.slice(0, 10) : '';
  const endVal = editing && eventToEdit.ends_at ? eventToEdit.ends_at.slice(0, 10) : '';
  content.innerHTML = `<form id="admin-event-form">
    <div class="fg"><label for="aev-title">Titre</label><input id="aev-title" type="text" value="${escapeHtml(eventToEdit ? eventToEdit.title : '')}" required></div>
    <div class="fg"><label for="aev-category">Catégorie</label>
      <select id="aev-category">
        <option value="Exposition">Exposition</option><option value="Atelier">Atelier</option>
        <option value="Marché">Marché</option><option value="Concert">Concert</option><option value="Conférence">Conférence</option>
      </select></div>
    <div class="fg"><label for="aev-desc">Description</label><textarea id="aev-desc" rows="2">${escapeHtml(eventToEdit ? eventToEdit.description || '' : '')}</textarea></div>
    <div class="fg-row">
      <div class="fg"><label for="aev-start">Date début</label><input id="aev-start" type="date" value="${startVal}" required></div>
      <div class="fg"><label for="aev-end">Date fin</label><input id="aev-end" type="date" value="${endVal}"></div>
    </div>
    <div class="fg"><label for="aev-location">Lieu</label><input id="aev-location" type="text" value="${escapeHtml(eventToEdit ? eventToEdit.location || '' : '')}" placeholder="Bukavu, Goma..."></div>
    <div class="fg-row">
      <button class="btn btn-noir" type="button" id="admin-event-cancel" style="flex:1;justify-content:center;">Annuler</button>
      <button class="btn btn-lave" type="submit" style="flex:1;justify-content:center;">${editing ? 'Enregistrer' : 'Publier'}</button>
    </div>
  </form>`;
  if (editing) {
    document.getElementById('aev-category').value = eventToEdit.category || '';
  }
  document.getElementById('admin-event-form').addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      title: document.getElementById('aev-title').value.trim(),
      category: document.getElementById('aev-category').value,
      description: document.getElementById('aev-desc').value.trim() || null,
      starts_at: document.getElementById('aev-start').value,
      ends_at: document.getElementById('aev-end').value || null,
      location: document.getElementById('aev-location').value.trim() || null,
      status: 'published',
    };
    try {
      const { error } = editing
        ? await authClient.from('events').update(payload).eq('id', eventToEdit.id)
        : await authClient.from('events').insert(payload);
      if (error) throw error;
      adminSubTab = 'events';
      renderAdminView(document.getElementById('admin-content'));
    } catch (err) { logError('Event save error:', err); }
  });
  document.getElementById('admin-event-cancel').addEventListener('click', () => {
    adminSubTab = 'events';
    renderAdminView(document.getElementById('admin-content'));
  });
}

// ── Admin Verifications ──
async function renderAdminVerifications(el) {
  try {
    const { data, error } = await authClient.from('profiles').select('*').neq('verification_status', 'verified').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || !data.length) {
      el.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Tous les profils sont vérifiés.</p>';
      return;
    }
    let html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>ID</th><th>Rôle</th><th>Nom</th><th>Ville</th><th>Statut</th><th></th></tr></thead><tbody>';
    data.forEach(u => {
      const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || '—';
      html += `<tr><td>${escapeHtml(u.id.slice(0, 8))}</td><td>${escapeHtml(roleLabels[u.role] || '')}</td><td>${escapeHtml(name)}</td><td>${escapeHtml(u.city || '')}</td><td>${escapeHtml(u.verification_status || 'pending')}</td>
        <td>
          <button class="admin-sub-tab admin-verif-approve" data-id="${u.id}" style="background:#28613A;color:#fff;">Approuver</button>
          <button class="admin-sub-tab admin-verif-reject" data-id="${u.id}" style="background:#8A1C42;color:#fff;">Rejeter</button>
        </td></tr>`;
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
    el.querySelectorAll('.admin-verif-approve').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await authClient.from('profiles').update({ verification_status: 'verified' }).eq('id', btn.dataset.id);
          renderAdminVerifications(el);
        } catch (err) { logError('Verification approve error:', err); }
      });
    });
    el.querySelectorAll('.admin-verif-reject').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await authClient.from('profiles').update({ verification_status: 'rejected' }).eq('id', btn.dataset.id);
          renderAdminVerifications(el);
        } catch (err) { logError('Verification reject error:', err); }
      });
    });
  } catch (err) {
    logError('Admin verifications error:', err);
    el.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Erreur de chargement.</p>';
  }
}

// ── Admin Messages ──
async function renderAdminMessages(el) {
  try {
    const { data, error } = await authClient.from('messages').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || !data.length) { el.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Aucun message de contact.</p>'; return; }
    let html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Date</th><th>Nom</th><th>Email</th><th>Message</th><th></th></tr></thead><tbody>';
    data.forEach(m => {
      const d = new Date(m.created_at);
      const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      html += `<tr><td style="white-space:nowrap;">${dateStr}</td><td>${escapeHtml(m.name)}</td><td><a href="mailto:${escapeHtml(m.email)}">${escapeHtml(m.email)}</a></td><td style="max-width:400px;word-break:break-word;">${escapeHtml(m.message)}</td>
        <td><button class="admin-sub-tab msg-delete-btn" data-id="${m.id}" style="background:var(--lave);color:var(--blanc);">Suppr.</button></td></tr>`;
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
    el.querySelectorAll('.msg-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await authClient.from('messages').delete().eq('id', btn.dataset.id);
          renderAdminMessages(el);
        } catch (err) { logError('Message delete error:', err); }
      });
    });
  } catch (err) {
    logError('Admin messages error:', err);
    el.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Erreur de chargement.</p>';
  }
}

// ── Admin Reviews ──
async function renderAdminReviews(el) {
  try {
    const { data, error } = await authClient.from('reviews').select('*, artworks:artwork_id(title)').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || !data.length) { el.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Aucun avis.</p>'; return; }
    let html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Date</th><th>Œuvre</th><th>Note</th><th>Commentaire</th><th></th></tr></thead><tbody>';
    data.forEach(r => {
      const d = new Date(r.created_at);
      const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      html += `<tr><td style="white-space:nowrap;">${dateStr}</td><td>${escapeHtml(r.artworks?.title || '—')}</td><td style="color:#d4a017;">${stars}</td><td style="max-width:350px;word-break:break-word;">${escapeHtml(r.comment || '')}</td>
        <td><button class="admin-sub-tab admin-review-delete" data-id="${r.id}" style="background:var(--lave);color:var(--blanc);">Suppr.</button></td></tr>`;
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
    el.querySelectorAll('.admin-review-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await authClient.from('reviews').delete().eq('id', btn.dataset.id);
          renderAdminReviews(el);
        } catch (err) { logError('Review delete error:', err); }
      });
    });
  } catch (err) {
    logError('Admin reviews error:', err);
    el.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Erreur de chargement.</p>';
  }
}

// ── Agenda Dynamique ──
const agendaColors = ['var(--lave)', 'var(--foret)', 'var(--foret-light)', 'var(--lave-light)', 'var(--lac)', 'var(--lac-light)'];

const frMonths = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function formatAgendaDate(dateStr) {
  const d = new Date(dateStr);
  return { day: d.getDate(), month: frMonths[d.getMonth()], year: d.getFullYear() };
}

async function loadAgenda() {
  const grid = document.getElementById('agenda-grid');
  const status = document.getElementById('agenda-status');
  if (!grid) return;
  if (!authClient) {
    if (status) status.textContent = '';
    return;
  }
  try {
    const { data, error } = await authClient
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('starts_at', { ascending: true });
    if (error) throw error;
    const events = data || [];
    grid.innerHTML = '';
    if (!events.length) {
      grid.innerHTML = '<div class="catalog-empty">Aucun événement à venir pour le moment.</div>';
      return;
    }
    events.slice(0, 6).forEach((ev, i) => {
      const { day, month, year } = formatAgendaDate(ev.starts_at);
      const monthLabel = month + ' ' + String(year).slice(2);
      const colorIdx = i % agendaColors.length;
      const catLabel = ev.category ? ev.category + (ev.location ? ' — ' + ev.location : '') : (ev.location || 'Événement');
      grid.innerHTML += `
        <div class="agenda-card">
          <div class="agenda-card-bar" style="background:${agendaColors[colorIdx]}"></div>
          <div class="agenda-date-badge"><span class="agenda-day">${day}</span><span class="agenda-month">${monthLabel}</span></div>
          <p class="agenda-cat" style="color:${agendaColors[colorIdx]}">${escapeHtml(catLabel)}</p>
          <h4 class="agenda-title">${escapeHtml(ev.title)}</h4>
          ${ev.description ? '<p class="agenda-loc">' + escapeHtml(ev.description) + '</p>' : ''}
        </div>`;
    });
  } catch (err) {
    logError('Agenda load error:', err);
    if (document.getElementById('agenda-status')) {
      document.getElementById('agenda-status').textContent = 'Impossible de charger l\'agenda.';
    }
  }
}

// ── Artisan Public Profile ──
function openArtisanProfile(profileId) {
  if (!authClient) return;
  document.getElementById('auth-form-view').hidden = true;
  document.getElementById('account-view').hidden = true;
  document.getElementById('artisan-public-view').hidden = false;
  document.getElementById('modal').setAttribute('aria-labelledby', 'artisan-public-content');
  document.getElementById('modal').classList.add('open');
  document.getElementById('modal').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  loadArtisanProfile(profileId);
}

function closeArtisanProfile() {
  document.getElementById('artisan-public-view').hidden = true;
  document.getElementById('modal').classList.remove('open');
  document.getElementById('modal').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

async function loadArtisanProfile(profileId) {
  const container = document.getElementById('artisan-public-content');
  if (!container || !authClient) return;
  container.innerHTML = '<div class="catalog-loading">Chargement du profil…</div>';
  try {
    const [profileRes, artworksRes] = await Promise.all([
      authClient.from('profiles').select('*').eq('id', profileId).single(),
      authClient.from('artworks').select('*').eq('artisan_id', profileId).eq('status', 'published').order('created_at', { ascending: false })
    ]);
    if (profileRes.error) throw profileRes.error;
    if (artworksRes.error) throw artworksRes.error;
    const profile = profileRes.data;
    const artworks = artworksRes.data || [];
    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Artisan KIVU';
    const roleLabel = roleLabels[profile.role] || 'Artisan';
    const avatar = 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=150&q=85&fm=webp';

    let artworksHtml = '';
    if (!artworks.length) {
      artworksHtml = '<p style="grid-column:1/-1;text-align:center;color:var(--gris-text);padding:20px 0;">Cet artisan n\'a pas encore publié d\'œuvre.</p>';
    } else {
      artworksHtml = artworks.map(a => {
        const price = (a.price_cents / 100).toFixed(2);
        const sym = currencySymbol(a.currency || 'USD');
        const img = sanitizeUrl(a.image_path) || 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=200&q=85&fm=webp';
        return `<div class="artisan-profile-card" onclick="closeArtisanProfile();" tabindex="0" role="button" onkeydown="if(event.key==='Enter'||event.key===' ')event.preventDefault(),closeArtisanProfile();">
          <img src="${img}" alt="${escapeHtml(a.title)}" loading="lazy">
          <div class="artisan-profile-card-body">
            <div class="artisan-profile-card-title">${escapeHtml(a.title)}</div>
            <div class="artisan-profile-card-price">${price} ${sym}</div>
          </div>
        </div>`;
      }).join('');
    }

    container.innerHTML = `
      <div class="artisan-profile-header">
        <img class="artisan-profile-avatar" src="${avatar}" alt="" loading="lazy">
        <div class="artisan-profile-name">${escapeHtml(fullName)}</div>
        <div class="artisan-profile-role">${escapeHtml(roleLabel)} ${profile.verification_status === 'verified' ? '<span style="display:inline-block;background:#E8F5E9;color:#28613A;font-size:0.6rem;padding:2px 7px;border-radius:4px;margin-left:6px;font-weight:var(--fw-subheading);">Vérifié</span>' : ''}</div>
        ${profile.city ? '<div class="artisan-profile-loc">' + escapeHtml(profile.city) + '</div>' : ''}
        <button class="btn btn-sm btn-lave" onclick="startConversation('${profileId}', null);" style="margin-top:10px;">Contacter</button>
      </div>
      <h3 style="font-family:var(--font-sans);font-size:1rem;font-weight:var(--fw-subheading);margin-bottom:14px;">Œuvres publiées (${artworks.length})</h3>
      <div class="artisan-profile-grid">${artworksHtml}</div>
    `;
  } catch (err) {
    logError('Artisan profile error:', err);
    container.innerHTML = '<div class="catalog-empty">Impossible de charger le profil de cet artisan.</div>';
  }
}

// ── Catalogue Dynamique ──
const catalogGrid = document.getElementById('catalog-grid');
const catalogStatus = document.getElementById('catalog-status');
const catFilter = document.getElementById('cat-filter');
const sortFilter = document.getElementById('sort-filter');

let catalogArtworks = [];

async function loadCatalog() {
  if (!catalogGrid) return;
  const client = typeof authClient !== 'undefined' ? authClient : null;
  if (!client) {
    catalogStatus.className = 'catalog-empty';
    catalogStatus.textContent = 'Configurez Supabase pour afficher le catalogue.';
    return;
  }
  catalogStatus.className = 'catalog-loading';
  catalogStatus.textContent = 'Chargement des œuvres…';
  try {
    const { data, error } = await client
      .from('artworks')
      .select('*, profiles:artisan_id(first_name, last_name)')
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    if (error) throw error;
    catalogArtworks = data || [];
    renderCatalog();
  } catch (err) {
    logError('Catalog load error:', err);
    catalogStatus.className = 'catalog-empty';
    catalogStatus.textContent = 'Impossible de charger le catalogue pour le moment.';
  }
}

function renderCatalog() {
  const category = catFilter ? catFilter.value : '';
  const sort = sortFilter ? sortFilter.value : 'newest';

  let filtered = catalogArtworks;
  if (category) {
    filtered = filtered.filter(a => a.category === category);
  }

  if (sort === 'price-asc') {
    filtered.sort((a, b) => a.price_cents - b.price_cents);
  } else if (sort === 'price-desc') {
    filtered.sort((a, b) => b.price_cents - a.price_cents);
  } else {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  if (!filtered.length) {
    catalogStatus.className = 'catalog-empty';
    catalogStatus.textContent = category
      ? 'Aucune œuvre dans cette catégorie pour le moment.'
      : 'Le catalogue sera bientôt disponible — les artisans publient leurs premières œuvres.';
    catalogGrid.innerHTML = '';
    catalogGrid.appendChild(catalogStatus);
    return;
  }

  catalogGrid.innerHTML = '';
  filtered.forEach(artwork => {
    const artisanName = artwork.profiles
      ? [artwork.profiles.first_name, artwork.profiles.last_name].filter(Boolean).join(' ') || 'Artisan KIVU'
      : 'Artisan KIVU';
    const price = (artwork.price_cents / 100).toFixed(2);
    const sym = currencySymbol(artwork.currency || 'USD');
    const imgSrc = sanitizeUrl(artwork.image_path) || 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400&q=60&fm=webp';
    const badgeText = 'Certifié';
    const badgeClass = 'mb-auth';

    const card = document.createElement('div');
    card.className = 'market-card';
    const artId = artwork.id;
    const isFav = getFavorites().includes(artId);
    card.innerHTML = `
      <div class="market-img-wrap">
        <img class="market-img" src="${imgSrc}" alt="${artwork.title}" loading="lazy">
        <span class="market-badge ${badgeClass}">${badgeText}</span>
        <button class="fav-btn ${isFav ? 'fav-active' : ''}" onclick="event.stopPropagation();toggleFavorite('${artId}');this.classList.toggle('fav-active');" aria-label="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${isFav ? '❤️' : '🤍'}</button>
      </div>
      <div class="market-body">
        <p class="market-cat">${escapeHtml(artwork.category)}</p>
        <h4 class="market-name">${escapeHtml(artwork.title)}</h4>
        <p class="market-artist" style="cursor:pointer;" onclick="openArtisanProfile('${artwork.artisan_id}')" onkeydown="if(event.key==='Enter'||event.key===' ')event.preventDefault(),openArtisanProfile('${artwork.artisan_id}')" tabindex="0" role="button">${escapeHtml(artisanName)}</p>
        <div class="market-footer">
          <div class="market-price">${price} ${sym}<span>Prix artiste</span></div>
          <button class="btn btn-sm btn-lave" onclick="buyArtwork('${artId}'); return false;">Acheter</button>
        </div>
      </div>
    `;
    catalogGrid.appendChild(card);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function sanitizeUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) return escapeHtml(url);
  return '';
}

if (catFilter) catFilter.addEventListener('change', renderCatalog);
if (sortFilter) sortFilter.addEventListener('change', renderCatalog);

loadAgenda();

if (typeof authClient !== 'undefined') {
  if (authClient) {
    loadCatalog();
  } else {
    const checkClient = setInterval(() => {
      if (typeof authClient !== 'undefined' && authClient) {
        clearInterval(checkClient);
        loadCatalog();
      }
    }, 300);
    setTimeout(() => clearInterval(checkClient), 10000);
  }
}

// ── Messagerie ──
let currentConvId = null;
let msgChannel = null;

function startConversation(artisanId, artworkId) {
  if (!authClient || !currentUser) { openModal(); return; }
  authClient.from('conversations').upsert({
    buyer_id: currentUser.id,
    artisan_id: artisanId,
    artwork_id: artworkId || null
  }, { onConflict: 'buyer_id,artisan_id,artwork_id' }).select().single().then(({ data, error }) => {
    if (error) { showToast('Erreur', true); return; }
    openModal();
    document.getElementById('auth-form-view').hidden = true;
    document.getElementById('account-view').hidden = false;
    document.querySelector('[data-acct-view="messages"]').click();
    setTimeout(() => openConversation(data.id), 300);
  });
}

async function loadConversations() {
  const list = document.getElementById('conversation-list');
  if (!list) return;
  if (!authClient || !currentUser) { list.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Connectez-vous pour voir vos messages.</p>'; return; }
  try {
    const { data } = await authClient.from('conversations').select('*').order('updated_at', { ascending: false });
    if (data && data.length) {
      list.innerHTML = data.map(c => `<div class="conv-item" data-conv="${c.id}" onclick="openConversation('${c.id}')" style="padding:12px;border:1px solid #E8E3DC;border-radius:8px;cursor:pointer;margin-bottom:8px;transition:background .2s;" onmouseover="this.style.background='var(--gris-light)'" onmouseout="this.style.background=''"><strong style="color:var(--noir);">${escapeHtml(c.last_message || 'Nouvelle conversation')}</strong><br><span style="font-size:0.78rem;color:var(--gris-text);">${c.artisan_id === currentUser.id ? 'Acheteur' : 'Artisan'}</span></div>`).join('');
    } else {
      list.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Aucune conversation.</p>';
    }
  } catch { list.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Erreur de chargement.</p>'; }
}

async function openConversation(convId) {
  currentConvId = convId;
  document.getElementById('message-thread').hidden = false;
  const container = document.getElementById('thread-messages');
  container.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Chargement…</p>';
  if (msgChannel) { msgChannel.unsubscribe(); msgChannel = null; }
  try {
    const { data } = await authClient.from('chat_messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
    if (data) renderMessages(data);
    else container.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Aucun message.</p>';
    msgChannel = authClient.channel('msg-' + convId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'conversation_id=eq.' + convId }, payload => {
      const existing = container.querySelector('[data-msg-id="' + payload.new.id + '"]');
      if (!existing) { renderMessages([payload.new], true); }
    }).subscribe();
  } catch { container.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);">Erreur de chargement.</p>'; }
}

function renderMessages(msgs, append) {
  const container = document.getElementById('thread-messages');
  if (!append) container.innerHTML = '';
  msgs.forEach(m => {
    const isMine = m.sender_id === currentUser?.id;
    const div = document.createElement('div');
    div.setAttribute('data-msg-id', m.id);
    div.style.cssText = 'max-width:80%;padding:10px 14px;border-radius:12px;font-size:0.85rem;line-height:1.5;align-self:' + (isMine ? 'flex-end;background:var(--lave);color:var(--noir);' : 'flex-start;background:var(--gris-light);color:var(--noir);');
    div.textContent = m.content;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

document.getElementById('msg-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!currentConvId || !authClient || !currentUser) return;
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  const { error } = await authClient.from('chat_messages').insert({ conversation_id: currentConvId, sender_id: currentUser.id, content: text });
  if (error) showToast('Erreur d\'envoi', true);
  else authClient.from('conversations').update({ last_message: text, last_sender_id: currentUser.id, updated_at: new Date().toISOString() }).eq('id', currentConvId).then();
});

// ── Favoris ──
function getFavorites() {
  try { return JSON.parse(localStorage.getItem('kivu-favs') || '[]'); } catch { return []; }
}
function toggleFavorite(id) {
  let favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx > -1) favs.splice(idx, 1); else favs.push(id);
  localStorage.setItem('kivu-favs', JSON.stringify(favs));
  const count = favs.length;
  const badge = document.getElementById('fav-count');
  if (badge) { badge.textContent = count; badge.style.display = count ? 'flex' : 'none'; }
  updateFavoritesUI();
}
async function updateFavoritesUI() {
  const container = document.getElementById('favorites-container');
  if (!container) return;
  const favs = getFavorites();
  const label = document.getElementById('fav-count-label');
  if (label) label.textContent = favs.length + ' œuvre' + (favs.length > 1 ? 's' : '');
  if (!favs.length) { container.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);grid-column:1/-1;">Aucun favori pour le moment.</p>'; return; }
  if (!authClient) { container.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);grid-column:1/-1;">Connectez-vous pour voir vos favoris.</p>'; return; }
  try {
    const { data } = await authClient.from('artworks').select('*').in('id', favs);
    if (data && data.length) {
      container.innerHTML = data.map(a => {
        const price = (a.price_cents / 100).toFixed(2);
        return `<div class="market-card" style="cursor:default;"><div class="market-body"><h4 class="market-name">${escapeHtml(a.title)}</h4><p class="market-cat">${escapeHtml(a.category||'')}</p><div class="market-footer"><div class="market-price">${price} $<span>Prix</span></div><button class="btn btn-sm btn-lave" onclick="buyArtwork('${a.id}');">Acheter</button></div></div></div>`;
      }).join('');
    } else {
      container.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);grid-column:1/-1;">Œuvres non trouvées.</p>';
    }
  } catch { container.innerHTML = '<p style="font-size:0.85rem;color:var(--gris-text);grid-column:1/-1;">Erreur de chargement.</p>'; }
}

// ── Formulaire de contact ──
document.addEventListener('submit', function(e) {
  if (e.target.id !== 'contact-form') return;
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true; btn.textContent = 'Envoi…';
  const data = Object.fromEntries(new FormData(e.target));
  if (!authClient) { showToast('Service indisponible', true); btn.disabled = false; btn.textContent = 'Envoyer'; return; }
  authClient.from('messages').insert(data).then(({ error }) => {
    if (error) { showToast('Erreur lors de l\'envoi', true); btn.textContent = 'Erreur'; }
    else { showToast('Message envoyé ✓'); e.target.reset(); btn.textContent = 'Envoyé ✓'; }
    setTimeout(() => { btn.disabled = false; btn.textContent = 'Envoyer'; }, 2000);
  });
});

// ── Newsletter ──
document.getElementById('nl-btn').addEventListener('click', async function(e){
  e.preventDefault();
  const input = document.getElementById('nl-email');
  const email = input.value.trim();
  if (!email || !email.includes('@')) {
    input.style.borderColor = '#8A1C42';
    setTimeout(() => input.style.borderColor = '', 2000);
    return;
  }
  if (!authClient) {
    this.textContent = 'Service indisponible';
    setTimeout(() => { this.textContent = "S'abonner"; }, 2000);
    return;
  }
  this.disabled = true;
  this.textContent = 'Abonnement…';
  try {
    const { error } = await authClient.from('newsletter_subscribers').insert({ email });
    if (error) {
      if (error.code === '23505') {
        this.textContent = 'Déjà abonné !';
      } else throw error;
    } else {
      this.textContent = 'Abonné !';
    }
    this.style.background = 'var(--foret-light)';
    input.value = '';
    setTimeout(() => { this.textContent = "S'abonner"; this.style.background = ''; this.disabled = false; }, 2500);
  } catch (err) {
    logError('Newsletter error:', err);
    this.textContent = 'Erreur';
    this.style.background = '#FCE4EC';
    setTimeout(() => { this.textContent = "S'abonner"; this.style.background = ''; this.disabled = false; }, 2000);
  }
});

// ── Newsletter count (dynamic) ──
(async () => {
  const el = document.getElementById('nl-count');
  if (!el || !authClient) return;
  try {
    const { count } = await authClient.from('newsletter_subscribers').select('*', { count: 'exact', head: true });
    if (count != null) el.textContent = count.toLocaleString('fr-FR');
  } catch (_) { /* silent */ }
})();

// ── Carte Leaflet du Kivu ──
const MAP_TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
};
const MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const KIVU_POINTS = [
  { lat: -1.6792, lng: 29.2238, cat: 'a', title: 'Goma — Hub Musical & Arts Contemporains', desc: 'Rumba réinventée, afrobeat swahili et galeries d\'art urbain.' },
  { lat: -1.5216, lng: 29.2467, cat: 'b', title: 'Volcan Nyiragongo', desc: 'Patrimoine naturel qui façonne l\'architecture de lave de Goma.' },
  { lat: -2.4908, lng: 28.8428, cat: 'a', title: 'Bukavu — Littérature & Théâtre', desc: 'Théâtre-forum, prose congolaise et demeures art-déco sur collines.' },
  { lat: -3.3984, lng: 29.1425, cat: 'a', title: 'Uvira — Taarab du Tanganyika', desc: 'Le Taarab mêle influences arabes, africaines et indiennes.' },
  { lat: -2.1500, lng: 29.0500, cat: 'c', title: 'Île d\'Idjwi — Vannerie', desc: 'Paniers et nattes tressés en fibre de palmier doum.' },
  { lat: -1.1823, lng: 29.4463, cat: 'c', title: 'Rutshuru — Tissage Nande', desc: 'Textiles et parures traditionnelles des artisans Nande.' },
  { lat: 0.1314, lng: 29.2904, cat: 'c', title: 'Butembo — Forge & Sculpture', desc: 'Forgerons et sculpteurs sur bois, savoir transmis de père en fils.' },
  { lat: 0.4911, lng: 29.4731, cat: 'd', title: 'Beni — Médias & Café', desc: 'Radios en ligne, presse indépendante et café de terroir.' },
  { lat: -1.3972, lng: 29.0000, cat: 'd', title: 'Masisi — Agriculture de Montagne', desc: 'Billons anti-érosion et coopératives caféicoles des hauts plateaux.' }
];
const KIVU_CAT_LABELS = { a: 'Arts & Musique', b: 'Architecture & Patrimoine', c: 'Artisanat & Saveurs', d: 'Innovation & Technologie' };

let kivuMap = null;
let kivuTiles = null;

function currentMapTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark'
    || localStorage.getItem('kivu-theme') === 'dark' ? 'dark' : 'light';
}

function initMap() {
  const el = document.getElementById('kivu-map');
  if (!el || typeof L === 'undefined' || kivuMap) return;
  const theme = currentMapTheme();
  kivuMap = L.map(el, { zoomControl: true, scrollWheelZoom: false });
  kivuMap.setView([-1.9, 29.0], 9);
  kivuTiles = L.tileLayer(MAP_TILES[theme], { attribution: MAP_ATTRIBUTION, maxZoom: 19 }).addTo(kivuMap);
  KIVU_POINTS.forEach(p => {
    L.marker([p.lat, p.lng], {
      icon: L.divIcon({
        className: '',
        html: '<div class="km-pin km-pin-' + p.cat + '"></div>',
        iconSize: [26, 26],
        iconAnchor: [13, 26],
        popupAnchor: [0, -26]
      })
    })
      .addTo(kivuMap)
      .bindPopup('<div class="km-title">' + p.title + '</div>'
        + '<div class="km-cat km-cat-' + p.cat + '">' + KIVU_CAT_LABELS[p.cat] + '</div>'
        + '<div class="km-desc">' + p.desc + '</div>');
  });
  kivuMap.invalidateSize();
}

function refreshMapTheme() {
  if (!kivuMap || !kivuTiles) return;
  kivuTiles.setUrl(MAP_TILES[currentMapTheme()]);
}

// Lazy-load Leaflet CSS when map section approaches viewport
function loadLeafletCss() {
  if (document.querySelector('link[href*="leaflet.min.css"]')) return Promise.resolve();
  return new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css';
    link.onload = resolve;
    link.onerror = resolve;
    document.head.appendChild(link);
  });
}

initMap();
if (kivuMap) {
  const mapWrap = document.getElementById('map-wrap');
  if (mapWrap) {
    const mapObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          loadLeafletCss().then(() => kivuMap.invalidateSize());
          mapObs.disconnect();
        }
      });
    }, { threshold: 0.05 });
    mapObs.observe(mapWrap);
  }
  window.addEventListener('resize', () => kivuMap.invalidateSize());
}

// ── Back-to-top visibility ──
const btt = document.getElementById('back-to-top');
if (btt) {
  window.addEventListener('scroll', () => {
    btt.hidden = window.scrollY < 400;
  }, { passive: true });
}
