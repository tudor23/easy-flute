import { t } from '../i18n/index.js';

// What the flute belt and the piano roll share: header pills, progress, hint box, pop-ups.

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const isLong = (item) => item.duration >= 1;

// FA# -> FA♯, SIb -> SI♭, with the accidental styled so it stands out.
export function noteLabel(name) {
  return esc(name)
    .replace('#', '<span class="acc">♯</span>')
    .replace(/b(?=[',]*$)/, '<span class="acc">♭</span>');
}

export function createHud(root) {
  const $ = (id) => root.querySelector(`#${id}`);
  const hint = $('hint');
  let popupTimer = null;

  const setHint = (html, soft) => {
    hint.className = soft ? 'hint soft' : 'hint';
    hint.innerHTML = html;
  };

  return {
    defaultHint(item, previousItem) {
      if (!item) return;
      const note = `<b>${noteLabel(item.name)}</b>`;
      setHint(`<div>${previousItem?.name === item.name
        ? t('play.hintRepeat', { note })
        : t('play.hintPlay', { note, len: t(isLong(item) ? 'play.lenLong' : 'play.lenShort') })}</div>`);
    },
    wrongHint(heard, target, tip = '') {
      setHint(`<div>${t('play.heard', { heard: `<span class="heard">${noteLabel(heard)}</span>`, note: `<b>${noteLabel(target)}</b>` })}</div>`
        + (tip ? `<div class="tip">${esc(tip)}</div>` : ''), true);
    },
    octaveHint(heard, target, direction) {
      setHint(`<div>${t(direction === 'up' ? 'piano.higher' : 'piano.lower', { heard: `<span class="heard">${noteLabel(heard)}</span>`, note: `<b>${noteLabel(target)}</b>` })}</div>`, true);
    },
    earlyHint(name) {
      setHint(`<div>${t('play.early', { note: `<b>${noteLabel(name)}</b>` })}</div>`, true);
    },
    messageHint(text) {
      setHint(`<div>${esc(text)}</div>`, true);
    },
    setScore({ points, streak }, progress) {
      $('points').textContent = points;
      $('streak').textContent = streak;
      $('progress').style.width = `${progress * 100}%`;
    },
    setLevel(level) {
      $('lvl').style.width = `${Math.min(100, Math.round(level * 400))}%`;
    },
    setTempo({ bpm, listening, count = 0 }) {
      const text = $('metro-text');
      if (listening) {
        text.innerHTML = `♩ = ${Math.round(bpm)} · ${t('play.tempoListening')} <span class="tdots">${[0, 1, 2]
          .map((k) => `<b class="${k < count ? '' : 'o'}"></b>`).join('')}</span>`;
      } else {
        text.textContent = bpm ? `♩ = ${Math.round(bpm)}` : '';
      }
      $('metro').classList.toggle('listening', !!listening);
    },
    setBeat(beatInBar) {
      $('dot1').classList.toggle('on', beatInBar === 0);
      $('dot2').classList.toggle('on', beatInBar === 1);
    },
    popup(text) {
      const el = $('popup');
      el.textContent = text;
      el.classList.remove('show');
      void el.offsetWidth;
      el.classList.add('show');
      clearTimeout(popupTimer);
      popupTimer = setTimeout(() => el.classList.remove('show'), 1400);
    },
  };
}
