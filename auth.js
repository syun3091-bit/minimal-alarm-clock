window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class AuthManager {
  constructor({ onLogin, onLogout }) {
    this._onLogin  = onLogin;
    this._onLogout = onLogout;
    this.mode      = 'signin'; // 'signin' | 'signup' | 'forgot'

    this.$screen  = document.getElementById('loginScreen');
    this.$app     = document.getElementById('mainApp');
    this.$email   = document.getElementById('emailInput');
    this.$pass    = document.getElementById('passwordInput');
    this.$submit  = document.getElementById('authSubmit');
    this.$msg     = document.getElementById('loginMsg');
    this.$toggle  = document.getElementById('toggleMode');
    this.$forgot  = document.getElementById('forgotPass');
    this.$userEmail = document.getElementById('userEmail');
    this.$logout  = document.getElementById('logoutBtn');

    this._bind();
    this._checkSession();
  }

  _bind() {
    this.$submit.addEventListener('click',  () => this._handleSubmit());
    this.$toggle.addEventListener('click',  () => this._toggleMode());
    this.$forgot.addEventListener('click',  () => this._setMode('forgot'));
    this.$logout.addEventListener('click',  () => window.sb.auth.signOut());
    [this.$email, this.$pass].forEach(el =>
      el.addEventListener('keydown', e => { if (e.key === 'Enter') this._handleSubmit(); })
    );
  }

  async _checkSession() {
    const { data: { session } } = await window.sb.auth.getSession();
    if (session) this._showApp(session.user);
    else         this._showLogin();

    window.sb.auth.onAuthStateChange((_event, session) => {
      if (session) this._showApp(session.user);
      else         this._showLogin();
    });
  }

  _showApp(user) {
    this.$screen.style.display  = 'none';
    this.$app.style.display     = 'block';
    this.$userEmail.textContent = user.email;
    this._onLogin(user);
  }

  _showLogin() {
    this.$screen.style.display = 'flex';
    this.$app.style.display    = 'none';
    this._clearMsg();
    this._onLogout();
  }

  _setMode(mode) {
    this.mode = mode;
    this._clearMsg();
    const cfg = {
      signin: { submit: 'Sign In',          toggle: "Don't have an account? Sign up", showPass: true,  showForgot: true  },
      signup: { submit: 'Sign Up',           toggle: 'Already have an account? Sign in', showPass: true,  showForgot: false },
      forgot: { submit: 'Send reset link',   toggle: 'Back to sign in',               showPass: false, showForgot: false },
    }[mode];
    this.$submit.textContent        = cfg.submit;
    this.$toggle.textContent        = cfg.toggle;
    this.$pass.style.display        = cfg.showPass   ? '' : 'none';
    this.$forgot.style.display      = cfg.showForgot ? '' : 'none';
    if (!cfg.showPass) this.$pass.value = '';
  }

  _toggleMode() {
    this._setMode(this.mode === 'signup' ? 'signin' : (this.mode === 'forgot' ? 'signin' : 'signup'));
  }

  async _handleSubmit() {
    const email = this.$email.value.trim();
    const pass  = this.$pass.value;

    if (!email) { this._showMsg('Please enter your email.', false); return; }

    this.$submit.disabled = true;
    const prevLabel = this.$submit.textContent;
    this.$submit.textContent = 'Loading…';

    let error;

    if (this.mode === 'forgot') {
      ({ error } = await window.sb.auth.resetPasswordForEmail(email));
      if (!error) this._showMsg('Password reset link sent! Check your email.', true);
    } else if (this.mode === 'signup') {
      ({ error } = await window.sb.auth.signUp({ email, password: pass }));
      if (!error) this._showMsg('Account created! Check your email to confirm.', true);
    } else {
      ({ error } = await window.sb.auth.signInWithPassword({ email, password: pass }));
    }

    if (error) this._showMsg(error.message, false);
    this.$submit.disabled    = false;
    this.$submit.textContent = prevLabel;
  }

  _showMsg(text, ok) {
    this.$msg.textContent = text;
    this.$msg.className   = 'login-message ' + (ok ? 'ok' : 'err');
  }

  _clearMsg() {
    this.$msg.textContent = '';
    this.$msg.className   = 'login-message';
  }
}
