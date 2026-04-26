class AlarmApp {
  constructor() {
    this.alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
    this.activeAlarm = null;
    this.audioCtx = null;
    this.alarmInterval = null;

    this.$time    = document.getElementById('currentTime');
    this.$date    = document.getElementById('currentDate');
    this.$list    = document.getElementById('alarmList');
    this.$empty   = document.getElementById('emptyState');
    this.$overlay = document.getElementById('modalOverlay');
    this.$tInput  = document.getElementById('alarmTime');
    this.$lInput  = document.getElementById('alarmLabel');
    this.$notif   = document.getElementById('alarmNotification');
    this.$nTime   = document.getElementById('notifTime');
    this.$nLabel  = document.getElementById('notifLabel');

    document.getElementById('addBtn').addEventListener('click', () => this.openModal());
    document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
    document.getElementById('saveBtn').addEventListener('click', () => this.saveAlarm());
    document.getElementById('snoozeBtn').addEventListener('click', () => this.snooze());
    document.getElementById('dismissBtn').addEventListener('click', () => this.dismiss());

    this.$overlay.addEventListener('click', e => {
      if (e.target === this.$overlay) this.closeModal();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.$notif.classList.contains('active') ? this.dismiss() : this.closeModal();
      }
      if (e.key === 'Enter' && this.$overlay.classList.contains('open')) this.saveAlarm();
    });

    this.render();
    this.startClock();
    this.startAlarmCheck();
  }

  startClock() {
    const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const tick = () => {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      this.$time.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      this.$date.textContent = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  startAlarmCheck() {
    setInterval(() => {
      if (this.activeAlarm) return;
      const now = new Date();
      if (now.getSeconds() !== 0) return;
      const pad = n => String(n).padStart(2, '0');
      const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const hit = this.alarms.find(a => a.enabled && a.time === hhmm);
      if (hit) this.triggerAlarm(hit);
    }, 1000);
  }

  triggerAlarm(alarm) {
    this.activeAlarm = alarm;
    this.$nTime.textContent  = alarm.time;
    this.$nLabel.textContent = alarm.label || 'Alarm';
    this.$notif.classList.add('active');
    this.playSound();
  }

  playSound() {
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const beep = () => {
        if (!this.audioCtx) return;
        const osc  = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.type = 'sine';
        const t = this.audioCtx.currentTime;
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.setValueAtTime(1100, t + 0.1);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
      };
      beep();
      this.alarmInterval = setInterval(beep, 700);
    } catch (e) {
      console.warn('Web Audio not available', e);
    }
  }

  stopSound() {
    clearInterval(this.alarmInterval);
    this.alarmInterval = null;
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  snooze() {
    this.stopSound();
    this.$notif.classList.remove('active');

    const snoozeAt = new Date(Date.now() + 5 * 60 * 1000);
    const pad = n => String(n).padStart(2, '0');
    this.alarms.push({
      id: Date.now(),
      time: `${pad(snoozeAt.getHours())}:${pad(snoozeAt.getMinutes())}`,
      label: `${this.activeAlarm.label || 'Alarm'} (Snoozed)`,
      enabled: true,
    });
    this.alarms.sort((a, b) => a.time.localeCompare(b.time));
    this.save();
    this.render();
    this.activeAlarm = null;
  }

  dismiss() {
    this.stopSound();
    this.$notif.classList.remove('active');
    this.activeAlarm = null;
  }

  openModal() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    this.$tInput.value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    this.$lInput.value = '';
    this.$overlay.classList.add('open');
    setTimeout(() => this.$tInput.focus(), 100);
  }

  closeModal() {
    this.$overlay.classList.remove('open');
  }

  saveAlarm() {
    const time = this.$tInput.value;
    if (!time) return;
    this.alarms.push({ id: Date.now(), time, label: this.$lInput.value.trim(), enabled: true });
    this.alarms.sort((a, b) => a.time.localeCompare(b.time));
    this.save();
    this.render();
    this.closeModal();
  }

  deleteAlarm(id) {
    this.alarms = this.alarms.filter(a => a.id !== id);
    this.save();
    this.render();
  }

  toggleAlarm(id) {
    const a = this.alarms.find(a => a.id === id);
    if (a) { a.enabled = !a.enabled; this.save(); this.render(); }
  }

  save() {
    localStorage.setItem('alarms', JSON.stringify(this.alarms));
  }

  render() {
    this.$list.querySelectorAll('.alarm-card').forEach(el => el.remove());

    if (this.alarms.length === 0) {
      this.$empty.style.display = 'block';
      return;
    }
    this.$empty.style.display = 'none';

    this.alarms.forEach(alarm => {
      const card = document.createElement('div');
      card.className = `alarm-card${alarm.enabled ? '' : ' disabled'}`;
      card.innerHTML = `
        <div class="alarm-info">
          <div class="alarm-time">${alarm.time}</div>
          ${alarm.label ? `<div class="alarm-label">${this.esc(alarm.label)}</div>` : ''}
        </div>
        <div class="alarm-controls">
          <label class="toggle" aria-label="Toggle alarm">
            <input type="checkbox" ${alarm.enabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          <button class="delete-btn" aria-label="Delete alarm">✕</button>
        </div>`;

      card.querySelector('input').addEventListener('change', () => this.toggleAlarm(alarm.id));
      card.querySelector('.delete-btn').addEventListener('click', () => this.deleteAlarm(alarm.id));
      this.$list.appendChild(card);
    });
  }

  esc(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}

document.addEventListener('DOMContentLoaded', () => new AlarmApp());
