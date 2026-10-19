/* ============================================================
   app.js — UI, state, and wiring for the reply engine
   ============================================================ */
(function () {
  'use strict';

  const D = window.DATA;
  const E = window.Engine;

  /* ==========================================================
     STATE
     ========================================================== */
  const state = {
    conversations: {},
    order: [],
    active: null,
    filter: 'all',
    search: '',
    infoOpen: false,
    replyTo: null,
    typing: null,
    unreadTotal: 0
  };

  let uidCounter = 0;
  function uid() {
    return 'm' + Date.now().toString(36) + '_' + (++uidCounter);
  }

  /* ==========================================================
     DOM HELPERS
     ========================================================== */
  function $(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        const v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
        else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else node.setAttribute(k, v);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function svg(path, size) {
    const s = size || 20;
    return el('span', { html: '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" aria-hidden="true"><path fill="currentColor" d="' + path + '"/></svg>' });
  }

  const ICONS = {
    verified: 'M12 2 9.1 4.6 5.3 4.1 4.8 7.9 1.5 10l2.1 3.4-1.2 3.7 3.8.8 1.9 3.4 3.5-1.7 3.5 1.7 1.9-3.4 3.8-.8-1.2-3.7L22.5 10l-3.3-2.1-.5-3.8-3.8.5L12 2zm-1.2 12.8-3.2-3.2 1.4-1.4 1.8 1.8 4.6-4.6 1.4 1.4-6 6z',
    reply: 'M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z',
    more: 'M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    smile: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-3.5 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM12 18c-2.5 0-4.6-1.6-5.3-3.8h10.6A5.5 5.5 0 0 1 12 18z',
    doc: 'M6 2h8l4 4v16H6V2zm7 1.5V7h3.5L13 3.5z',
    pin: 'M16 3l5 5-3 1-4 4 1 5-2 2-4.5-4.5L4 20l-1-1 4.5-4.5L3 10l2-2 5 1 4-4 1-3z',
    mute: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z',
    search: 'M8.5 3a5.5 5.5 0 1 0 3.48 9.76l3.63 3.63 1.06-1.06-3.63-3.63A5.5 5.5 0 0 0 8.5 3zm0 1.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z',
    user: 'M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2c-4 0-8 2-8 4.5V21h16v-2.5c0-2.5-4-4.5-8-4.5z',
    bell: 'M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm7-6v-5a7 7 0 0 0-5.5-6.84V3a1.5 1.5 0 0 0-3 0v1.16A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2z',
    image: 'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v9.5l4-4 3 3 3.5-4.5L20 16V6H5zm3.5 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z',
    link: 'M10.6 13.4a3 3 0 0 0 4.2 0l2.8-2.8a3 3 0 0 0-4.2-4.2l-1.4 1.4 1.4 1.4 1.4-1.4a1 1 0 0 1 1.4 1.4l-2.8 2.8a1 1 0 0 1-1.4 0l-1.4 1.4zm2.8-2.8a3 3 0 0 0-4.2 0l-2.8 2.8a3 3 0 0 0 4.2 4.2l1.4-1.4-1.4-1.4-1.4 1.4a1 1 0 0 1-1.4-1.4l2.8-2.8a1 1 0 0 1 1.4 0l1.4-1.4z',
    star: 'M12 2l3 6.6 7 .8-5.2 4.8 1.4 7-6.2-3.6L5.8 21l1.4-7L2 9.4l7-.8L12 2z',
    phone: 'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.28-.28.7-.36 1.05-.24 1.14.38 2.37.58 3.65.58.6 0 1.1.5 1.1 1.1v3.5c0 .6-.5 1.1-1.1 1.1C10.9 21.24 2.76 13.1 2.76 3.1 2.76 2.5 3.26 2 3.86 2h3.5c.6 0 1.1.5 1.1 1.1 0 1.28.2 2.5.58 3.65.12.35.04.76-.24 1.05l-2.2 2.2z'
  };

  /* ==========================================================
     ENTITY LOOKUP
     ========================================================== */
  function entity(id) {
    if (id === 'me') return D.ME;
    return D.PEOPLE[id] || D.EXTRA_PEOPLE[id] || D.BRANDS[id] || D.GROUPS[id] || null;
  }

  function displayName(id) {
    if (id === 'me') return 'You';
    const e = entity(id);
    return e ? e.name : id;
  }

  /* ==========================================================
     AVATARS
     ========================================================== */
  function avatarNode(id, sizeClass, opts) {
    const o = opts || {};
    const e = entity(id);
    const wrap = el('div', { class: 'avatar ' + (sizeClass || '') });

    if (!e) {
      wrap.appendChild(el('img', { src: 'assets/avatars/me.jpg', alt: '' }));
      return wrap;
    }

    if (e.kind === 'group') {
      wrap.classList.add('composite');
      const members = e.members.slice(0, 4);
      members.forEach(function (mid) {
        const me2 = entity(mid);
        if (me2) wrap.appendChild(el('img', { src: me2.avatar, alt: '' }));
      });
      if (members.length === 1) wrap.classList.add('single');
    } else {
      wrap.appendChild(el('img', { src: e.avatar, alt: e.name }));
      if (e.kind === 'brand') wrap.classList.add('brand');
    }

    if (o.status && e.kind === 'person') {
      const dot = el('span', {
        class: 'online-dot' + (e.status === 'offline' ? ' offline' : e.status === 'away' || e.status === 'busy' ? ' mobile' : '')
      });
      wrap.appendChild(dot);
    }
    return wrap;
  }

  function verifiedNode() {
    const s = el('span', { class: 'verified', html: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="' + ICONS.verified + '"/></svg>' });
    return s;
  }

  /* ==========================================================
     INITIAL DATA
     ========================================================== */
  function buildConversations() {
    Object.keys(D.SEEDS).forEach(function (id) {
      const seed = D.SEEDS[id];
      state.conversations[id] = {
        id: id,
        messages: seed.messages.map(function (m) { return Object.assign({}, m); }),
        unread: seed.unread || 0,
        pinned: !!seed.pinned,
        muted: false,
        ctx: {},
        typing: false
      };
    });
    sortOrder();
    updateUnreadTotal();
  }

  function sortOrder() {
    state.order = Object.keys(state.conversations).sort(function (a, b) {
      const ca = state.conversations[a];
      const cb = state.conversations[b];
      const ta = ca.messages.length ? ca.messages[ca.messages.length - 1].ts : 0;
      const tb = cb.messages.length ? cb.messages[cb.messages.length - 1].ts : 0;
      return tb - ta;
    });
  }

  function updateUnreadTotal() {
    let n = 0;
    Object.keys(state.conversations).forEach(function (k) {
      if (!state.conversations[k].muted) n += state.conversations[k].unread || 0;
    });
    state.unreadTotal = n;
    const dot = qs('.tab-dot');
    if (dot) dot.classList.toggle('on', n > 0);
    const tab = qs('.tab[data-tab="chats"]');
    if (tab) tab.setAttribute('aria-label', n > 0 ? 'Chats, ' + n + ' unread' : 'Chats');
  }

  /* ==========================================================
     TIME FORMATTING
     ========================================================== */
  function fmtTime(ts) {
    const d = new Date(ts);
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m + ' ' + ap;
  }

  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  }

  function fmtListTime(ts) {
    const now = new Date();
    const today = startOfDay(now);
    const day = startOfDay(ts);
    const diff = (today - day) / 86400000;
    if (diff === 0) return fmtTime(ts);
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(ts).getDay()];
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function fmtDayDivider(ts) {
    const now = new Date();
    const today = startOfDay(now);
    const day = startOfDay(ts);
    const diff = (today - day) / 86400000;
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(ts).getDay()];
    return new Date(ts).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }

  /* ==========================================================
     PREVIEW TEXT
     ========================================================== */
  function previewOf(msg, conv) {
    const wrap = el('span', { class: 'chat-preview' });
    let prefix = '';
    if (msg.from === 'me') prefix = 'You: ';
    else if (entity(conv.id) && entity(conv.id).kind === 'group') prefix = displayName(msg.from).split(' ')[0] + ': ';
    if (prefix) wrap.appendChild(el('span', { class: 'you', text: prefix }));

    if (msg.type === 'image') {
      wrap.appendChild(el('span', { class: 'preview-emoji', text: '📷' }));
      wrap.appendChild(document.createTextNode(' Photo' + (msg.caption ? ' · ' + msg.caption : '')));
    } else if (msg.type === 'sticker') {
      wrap.appendChild(el('span', { class: 'preview-emoji', text: msg.sticker }));
    } else if (msg.type === 'link') {
      wrap.appendChild(el('span', { class: 'preview-emoji', text: '🔗' }));
      wrap.appendChild(document.createTextNode(' ' + msg.title));
    } else if (msg.type === 'file') {
      wrap.appendChild(el('span', { class: 'preview-emoji', text: '📎' }));
      wrap.appendChild(document.createTextNode(' ' + msg.name));
    } else if (msg.type === 'voice') {
      wrap.appendChild(el('span', { class: 'preview-emoji', text: '🎤' }));
      wrap.appendChild(document.createTextNode(' Voice message'));
    } else {
      wrap.appendChild(document.createTextNode(msg.text || ''));
    }
    return wrap;
  }

  /* ==========================================================
     CHAT LIST
     ========================================================== */
  function renderChatList() {
    const list = $('chatList');
    list.innerHTML = '';

    const q = state.search.trim().toLowerCase();
    let ids = state.order.slice();

    if (state.filter === 'unread') ids = ids.filter(function (id) { return state.conversations[id].unread > 0; });
    if (state.filter === 'groups') ids = ids.filter(function (id) { const e = entity(id); return e && e.kind === 'group'; });
    if (state.filter === 'brands') ids = ids.filter(function (id) { const e = entity(id); return e && e.kind === 'brand'; });

    if (q) {
      ids = ids.filter(function (id) {
        const e = entity(id);
        if (e && e.name.toLowerCase().indexOf(q) !== -1) return true;
        return state.conversations[id].messages.some(function (m) {
          return (m.text || '').toLowerCase().indexOf(q) !== -1;
        });
      });
    }

    if (!ids.length) {
      list.appendChild(el('div', {
        class: 'list-empty',
        text: q ? 'No chats match "' + state.search + '".' : 'Nothing here yet.'
      }));
      return;
    }

    ids.forEach(function (id) {
      list.appendChild(chatRow(id));
    });
  }

  function chatRow(id) {
    const conv = state.conversations[id];
    const e = entity(id);
    const last = conv.messages[conv.messages.length - 1];

    const row = el('div', {
      class: 'chat-row' + (state.active === id ? ' active' : '') + (conv.unread > 0 ? ' unread' : ''),
      role: 'listitem',
      tabindex: '0',
      onclick: function () { openConversation(id); },
      onkeydown: function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openConversation(id); } }
    });

    row.appendChild(avatarNode(id, '', { status: true }));

    const main = el('div', { class: 'chat-main' });
    const top = el('div', { class: 'chat-top' });
    const name = el('span', { class: 'chat-name' });
    name.appendChild(document.createTextNode(e ? e.name : id));
    if (e && e.verified) name.appendChild(verifiedNode());
    top.appendChild(name);
    top.appendChild(el('span', { class: 'chat-time', text: last ? fmtListTime(last.ts) : '' }));
    main.appendChild(top);

    const bottom = el('div', { class: 'chat-bottom' });
    if (last) bottom.appendChild(previewOf(last, conv));
    else bottom.appendChild(el('span', { class: 'chat-preview', text: 'Say hi 👋' }));

    if (conv.unread > 0) {
      bottom.appendChild(el('span', { class: 'unread-badge', text: conv.unread > 9 ? '9+' : String(conv.unread) }));
    } else if (conv.muted) {
      bottom.appendChild(el('span', {
        class: 'muted-icon',
        html: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="' + ICONS.mute + '"/></svg>'
      }));
    }
    main.appendChild(bottom);
    row.appendChild(main);
    return row;
  }

  /* ==========================================================
     THREAD HEADER
     ========================================================== */
  function renderHeader(conv) {
    const e = entity(conv.id);
    const stack = $('threadAvatar');
    stack.innerHTML = '';

    if (e && e.kind === 'group') {
      e.members.slice(0, 2).forEach(function (mid) {
        const m = entity(mid);
        if (m) stack.appendChild(el('div', { class: 'avatar', html: '<img src="' + m.avatar + '" alt="">' }));
      });
    } else if (e) {
      stack.appendChild(el('div', { class: 'avatar', html: '<img src="' + e.avatar + '" alt="">' }));
    }

    const name = $('threadName');
    name.innerHTML = '';
    name.appendChild(document.createTextNode(e ? e.name : conv.id));
    if (e && e.verified) name.appendChild(verifiedNode());

    const sub = $('threadSub');
    let subtitle = '';
    let cls = 'thread-sub';
    if (e && e.kind === 'group') {
      subtitle = e.subtitle || e.members.length + ' members';
    } else if (e && e.kind === 'brand') {
      subtitle = e.subtitle || 'Business account';
    } else if (e) {
      subtitle = e.subtitle || '';
      if (e.status === 'online') cls += ' online';
    }
    sub.className = cls;
    sub.textContent = subtitle;

    const pinned = $('pinnedBanner');
    if (e && e.pinnedText && e.kind === 'group') {
      pinned.hidden = false;
      $('pinnedText').textContent = e.pinnedText;
    } else {
      pinned.hidden = true;
    }
  }

  /* ==========================================================
     MESSAGE RENDERING
     ========================================================== */
  function messageNode(msg, prev, next, conv) {
    const isOut = msg.from === 'me';
    const e = entity(conv.id);
    const isGroup = e && e.kind === 'group';

    const sameSenderAsPrev = prev && prev.from === msg.from && (msg.ts - prev.ts) < 5 * 60000 && prev.type !== 'day';
    const sameSenderAsNext = next && next.from === msg.from && (next.ts - msg.ts) < 5 * 60000;
    const first = !sameSenderAsPrev;
    const last = !sameSenderAsNext;

    const row = el('div', {
      class: 'msg-row' + (isOut ? ' out' : '') + (first ? ' first' : '') + (last ? ' last' : ''),
      dataset: { id: msg.id }
    });

    if (!isOut) {
      if (isGroup && first) {
        row.appendChild(el('div', { class: 'msg-avatar', html: '<img src="' + (entity(msg.from) ? entity(msg.from).avatar : '') + '" alt="">' }));
      } else {
        row.appendChild(el('div', { class: 'msg-avatar placeholder' }));
      }
    }

    const stack = el('div', { class: 'msg-stack' });

    if (!isOut && isGroup && first) {
      stack.appendChild(el('div', { class: 'msg-sender', text: displayName(msg.from) }));
    }

    const bubble = el('div', { class: 'bubble' });

    if (msg.replyTo) {
      const q = el('div', { class: 'quoted' });
      q.appendChild(el('span', { class: 'q-name', text: displayName(msg.replyTo.from) }));
      q.appendChild(el('span', { class: 'q-text', text: msg.replyTo.text || 'Attachment' }));
      bubble.appendChild(q);
    }

    if (msg.type === 'image') {
      bubble.classList.add('media');
      bubble.appendChild(el('img', {
        src: msg.src,
        alt: msg.caption || 'Photo',
        onclick: function () { openLightbox(msg.src); }
      }));
      if (msg.caption) bubble.appendChild(el('div', { class: 'media-caption', text: msg.caption }));
    } else if (msg.type === 'sticker') {
      bubble.classList.add('sticker');
      bubble.appendChild(el('div', {
        class: 'sticker-art',
        style: { fontSize: '104px', lineHeight: '128px', textAlign: 'center' },
        text: msg.sticker
      }));
    } else if (msg.type === 'link') {
      bubble.classList.add('media');
      const card = el('div', { class: 'link-card' });
      if (msg.img) card.appendChild(el('div', { class: 'link-img', html: '<img src="' + msg.img + '" alt="">' }));
      const body = el('div', { class: 'link-body' });
      body.appendChild(el('div', { class: 'link-site', text: msg.site || '' }));
      body.appendChild(el('div', { class: 'link-title', text: msg.title || '' }));
      if (msg.desc) body.appendChild(el('div', { class: 'link-desc', text: msg.desc }));
      card.appendChild(body);
      bubble.appendChild(card);
    } else if (msg.type === 'file') {
      bubble.classList.add('media');
      const card = el('div', { class: 'file-card' });
      card.appendChild(el('div', { class: 'file-ico', html: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="' + ICONS.doc + '"/></svg>' }));
      const meta = el('div', { class: 'file-meta' });
      meta.appendChild(el('div', { class: 'file-name', text: msg.name }));
      meta.appendChild(el('div', { class: 'file-size', text: msg.size || '' }));
      card.appendChild(meta);
      bubble.appendChild(card);
    } else if (msg.type === 'voice') {
      bubble.classList.add('media');
      bubble.appendChild(voiceNode(msg));
    } else {
      if (E.emojiOnly(msg.text || '')) bubble.classList.add('emoji-only');
      bubble.appendChild(document.createTextNode(msg.text || ''));
    }

    stack.appendChild(bubble);

    if (msg.reactions && msg.reactions.length) {
      const bar = el('div', { class: 'reactions' });
      const grouped = {};
      msg.reactions.forEach(function (r) { grouped[r] = (grouped[r] || 0) + 1; });
      Object.keys(grouped).forEach(function (rx) {
        bar.appendChild(el('div', {
          class: 'reaction-chip',
          onclick: function () { toggleReaction(conv, msg, rx); }
        }, [
          el('span', { class: 'rx', text: rx }),
          grouped[rx] > 1 ? el('span', { class: 'rx-count', text: String(grouped[rx]) }) : null
        ]));
      });
      stack.appendChild(bar);
    }

    const meta = el('div', { class: 'msg-meta' });
    meta.appendChild(el('span', { text: fmtTime(msg.ts) }));
    if (isOut && last) {
      meta.appendChild(el('span', { class: 'seen-avatar', html: '<img src="' + (e && e.kind === 'person' ? e.avatar : 'assets/avatars/me.jpg') + '" alt="">' }));
    }
    stack.appendChild(meta);

    row.appendChild(stack);
    row.appendChild(hoverActions(conv, msg));
    return row;
  }

  function voiceNode(msg) {
    const wrap = el('div', {
      class: 'voice-card',
      style: {
        display: 'flex', alignItems: 'center', gap: '10px',
        minWidth: '190px', padding: '6px 10px 6px 6px'
      }
    });
    const btn = el('button', {
      class: 'voice-play',
      style: {
        width: '32px', height: '32px', borderRadius: '50%',
        background: '#fff', color: '#006aff', display: 'grid',
        placeItems: 'center', flex: '0 0 auto'
      },
      html: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>'
    });
    const bars = el('div', {
      class: 'voice-bars',
      style: { display: 'flex', alignItems: 'center', gap: '2px', flex: '1 1 auto', height: '24px' }
    });
    for (let i = 0; i < 24; i++) {
      const h = 6 + Math.abs(Math.sin(i * 1.7)) * 16;
      bars.appendChild(el('span', {
        style: {
          width: '2.5px', height: Math.round(h) + 'px', borderRadius: '2px',
          background: msg.from === 'me' ? 'rgba(255,255,255,.75)' : '#9aa0aa'
        }
      }));
    }
    wrap.appendChild(btn);
    wrap.appendChild(bars);
    wrap.appendChild(el('span', {
      class: 'voice-time',
      style: { fontSize: '12px', color: msg.from === 'me' ? 'rgba(255,255,255,.85)' : '#65676b' },
      text: '0:34'
    }));

    btn.addEventListener('click', function () {
      if (btn.dataset.playing === '1') {
        btn.dataset.playing = '0';
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
        qsa('span', bars).forEach(function (b) { b.style.opacity = '1'; });
        return;
      }
      btn.dataset.playing = '1';
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
      qsa('span', bars).forEach(function (b, i) {
        b.style.opacity = '1';
        setTimeout(function () { b.style.opacity = '.35'; }, (i + 1) * (msg.duration || 34) * 1000 / 24);
      });
      setTimeout(function () {
        btn.dataset.playing = '0';
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
        qsa('span', bars).forEach(function (b) { b.style.opacity = '1'; });
      }, (msg.duration || 34) * 1000);
    });

    return wrap;
  }

  function hoverActions(conv, msg) {
    const bar = el('div', { class: 'msg-hover-actions' });

    bar.appendChild(el('button', {
      title: 'React',
      html: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="' + ICONS.smile + '"/></svg>',
      onclick: function (ev) {
        ev.stopPropagation();
        openQuickReactions(ev.currentTarget, conv, msg);
      }
    }));

    bar.appendChild(el('button', {
      title: 'Reply',
      html: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="' + ICONS.reply + '"/></svg>',
      onclick: function (ev) {
        ev.stopPropagation();
        startReply(conv, msg);
      }
    }));

    bar.appendChild(el('button', {
      title: 'More',
      html: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="' + ICONS.more + '"/></svg>',
      onclick: function (ev) {
        ev.stopPropagation();
        openMessageMenu(ev.currentTarget, conv, msg);
      }
    }));

    return bar;
  }

  function renderThread(conv, opts) {
    const box = $('messages');
    box.innerHTML = '';

    const msgs = conv.messages;
    let lastDay = null;

    msgs.forEach(function (msg, i) {
      const day = startOfDay(msg.ts);
      if (day !== lastDay) {
        box.appendChild(el('div', { class: 'day-divider' }, [el('span', { text: fmtDayDivider(msg.ts) })]));
        lastDay = day;
      }
      const prev = msgs[i - 1];
      const next = msgs[i + 1];
      box.appendChild(messageNode(msg, prev, next, conv));
    });

    // suggestion chips from the final message
    const last = msgs[msgs.length - 1];
    if (last && last.chips && last.chips.length) {
      box.appendChild(chipRow(conv, last));
    }

    if (opts && opts.keepScroll) {
      // leave scroll position
    } else {
      scrollToBottom(opts && opts.smooth ? 'smooth' : 'auto');
    }
  }

  function chipRow(conv, msg) {
    const wrap = el('div', {
      style: {
        display: 'flex', flexWrap: 'wrap', gap: '6px',
        margin: '10px 0 4px 36px', maxWidth: '70%'
      }
    });
    msg.chips.forEach(function (label) {
      wrap.appendChild(el('button', {
        style: {
          border: '1.5px solid #b9d5ff',
          color: '#006aff',
          background: '#fff',
          borderRadius: '18px',
          padding: '7px 13px',
          fontSize: '13.5px',
          fontWeight: '600'
        },
        onmouseenter: function (ev) { ev.currentTarget.style.background = '#f0f6ff'; },
        onmouseleave: function (ev) { ev.currentTarget.style.background = '#fff'; },
        text: label,
        onclick: function () {
          msg.chips = null;
          sendMessage(label);
        }
      }));
    });
    return wrap;
  }

  function scrollToBottom(behavior) {
    const s = $('threadScroll');
    if (!s) return;
    requestAnimationFrame(function () {
      s.scrollTo({ top: s.scrollHeight, behavior: behavior || 'auto' });
    });
  }

  /* ==========================================================
     OPEN / CLOSE CONVERSATION
     ========================================================== */
  function openConversation(id) {
    if (!state.conversations[id]) createConversation(id);
    const conv = state.conversations[id];
    state.active = id;
    conv.unread = 0;
    updateUnreadTotal();

    $('threadEmpty').hidden = true;
    $('threadWrap').hidden = false;
    $('app').classList.add('thread-open');

    renderHeader(conv);
    renderThread(conv);
    renderChatList();
    closeInfo();
    hideTyping();
    clearReply();
    $('messageInput').focus();
    hideAllPopovers();
  }

  function createConversation(id) {
    if (state.conversations[id]) return state.conversations[id];
    const e = entity(id);
    state.conversations[id] = {
      id: id,
      messages: [],
      unread: 0,
      pinned: false,
      muted: false,
      ctx: {},
      typing: false
    };
    state.order.unshift(id);
    if (e && e.kind === 'brand') {
      // brands greet you
      const conv = state.conversations[id];
      setTimeout(function () {
        pushReplies(conv, [{ type: 'text', text: "Hi Alex! How can we help you today?", delay: 700 }], ['Talk to a person']);
      }, 400);
    }
    return state.conversations[id];
  }

  /* ==========================================================
     SENDING
     ========================================================== */
  function sendMessage(text, opts) {
    const id = state.active;
    if (!id) return;
    const conv = state.conversations[id];
    const trimmed = String(text || '').trim();
    if (!trimmed && !(opts && opts.extra)) return;

    const msg = Object.assign({
      id: uid(),
      from: 'me',
      type: 'text',
      text: trimmed,
      ts: Date.now(),
      replyTo: state.replyTo
    }, opts && opts.extra ? opts.extra : {});

    conv.messages.push(msg);
    conv.unread = 0;
    clearReply();
    sortOrder();
    renderChatList();
    renderThread(conv);
    resetComposer();
    updateUnreadTotal();

    scheduleReply(conv, trimmed, msg);
  }

  function resetComposer() {
    const input = $('messageInput');
    input.value = '';
    input.style.height = 'auto';
    updateSendState();
  }

  function scheduleReply(conv, text, userMsg) {
    let result;
    try {
      result = E.respond(conv, text);
    } catch (err) {
      console.error('Engine error', err);
      result = { replies: [{ type: 'text', text: 'Sorry — my brain glitched. Say that again?', delay: 700 }], chips: [] };
    }

    const replies = (result.replies || []).filter(function (r) {
      return r && (r.type !== 'text' || (r.text && String(r.text).trim()));
    });
    if (!replies.length) return;

    const lead = replies[0];
    const delay = Math.max(450, Math.min(lead.delay || 900, 1800));

    // typing indicator
    const typers = replies.map(function (r) { return r.from || conv.id; });
    showTyping(conv, typers[0], delay);

    setTimeout(function () {
      hideTyping();
      pushReplies(conv, replies, result.chips, userMsg);
    }, delay);
  }

  function pushReplies(conv, replies, chips, userMsg) {
    let totalDelay = 0;
    let lastFrom = null;

    replies.forEach(function (r, i) {
      const gap = i === 0 ? 0 : Math.max(500, Math.min(r.delay || 900, 2200));
      totalDelay += gap;

      setTimeout(function () {
        if (r.type === 'reaction') {
          const target = userMsg || lastOutgoing(conv);
          if (target) {
            if (!target.reactions) target.reactions = [];
            if (target.reactions.indexOf(r.emoji) === -1) target.reactions.push(r.emoji);
          }
        } else {
          const msg = {
            id: uid(),
            from: r.from || conv.id,
            type: r.type || 'text',
            text: r.text || '',
            src: r.src,
            caption: r.caption,
            sticker: r.sticker,
            url: r.url,
            site: r.site,
            title: r.title,
            desc: r.desc,
            img: r.img,
            name: r.name,
            size: r.size,
            duration: r.duration,
            ts: Date.now()
          };
          if (r.type === 'text' && E.emojiOnly(r.text || '')) msg.emojiOnly = true;
          conv.messages.push(msg);
          lastFrom = msg.from;
        }

        if (i === replies.length - 1 && chips && chips.length) {
          const last = conv.messages[conv.messages.length - 1];
          if (last) last.chips = chips;
        }

        if (state.active === conv.id) {
          renderThread(conv, { smooth: true });
        } else {
          conv.unread += 1;
          updateUnreadTotal();
        }
        sortOrder();
        renderChatList();
      }, totalDelay);
    });

    // if replies are staggered, keep the typing indicator going between them
    if (replies.length > 1) {
      let acc = 0;
      replies.forEach(function (r, i) {
        if (i === 0) return;
        acc += Math.max(500, Math.min(r.delay || 900, 2200));
        setTimeout(function () {
          if (i < replies.length) showTyping(conv, r.from || conv.id, 500);
        }, acc - 260);
      });
    }
  }

  function lastOutgoing(conv) {
    for (let i = conv.messages.length - 1; i >= 0; i--) {
      if (conv.messages[i].from === 'me') return conv.messages[i];
    }
    return null;
  }

  /* ==========================================================
     TYPING INDICATOR
     ========================================================== */
  let typingTimer = null;

  function showTyping(conv, from, ms) {
    if (state.active !== conv.id) return;
    const row = $('typingRow');
    const e = entity(conv.id);
    const isGroup = e && e.kind === 'group';
    let label = (entity(from) ? entity(from).name.split(' ')[0] : 'Someone') + ' is typing…';
    if (!isGroup) label = (entity(conv.id) ? entity(conv.id).name.split(' ')[0] : 'They') + ' is typing…';
    $('typingLabel').textContent = label;
    row.hidden = false;
    scrollToBottom('smooth');
    clearTimeout(typingTimer);
    typingTimer = setTimeout(hideTyping, ms || 1600);
  }

  function hideTyping() {
    clearTimeout(typingTimer);
    const row = $('typingRow');
    if (row) row.hidden = true;
  }

  /* ==========================================================
     REPLY
     ========================================================== */
  function startReply(conv, msg) {
    state.replyTo = {
      from: msg.from,
      text: msg.text || (msg.type === 'image' ? 'Photo' : msg.type === 'sticker' ? msg.sticker : msg.type === 'link' ? msg.title : msg.type === 'file' ? msg.name : 'Attachment')
    };
    const p = $('replyPreview');
    p.hidden = false;
    $('replyName').textContent = msg.from === 'me' ? 'You' : displayName(msg.from);
    $('replyText').textContent = state.replyTo.text;
    $('messageInput').focus();
  }

  function clearReply() {
    state.replyTo = null;
    const p = $('replyPreview');
    if (p) p.hidden = true;
  }

  /* ==========================================================
     REACTIONS
     ========================================================== */
  function toggleReaction(conv, msg, emoji) {
    if (!msg.reactions) msg.reactions = [];
    const i = msg.reactions.indexOf(emoji);
    if (i === -1) msg.reactions.push(emoji);
    else msg.reactions.splice(i, 1);
    if (state.active === conv.id) renderThread(conv, { keepScroll: true });
  }

  function openQuickReactions(anchor, conv, msg) {
    hideAllPopovers();
    const rect = anchor.getBoundingClientRect();
    const bar = el('div', { class: 'quick-reactions' });
    D.QUICK_REACTIONS.forEach(function (rx) {
      bar.appendChild(el('button', {
        text: rx,
        onclick: function () {
          toggleReaction(conv, msg, rx);
          bar.remove();
        }
      }));
    });
    bar.style.position = 'fixed';
    bar.style.left = Math.min(rect.left, window.innerWidth - 260) + 'px';
    bar.style.top = (rect.top - 48) + 'px';
    bar.style.bottom = 'auto';
    document.body.appendChild(bar);
    setTimeout(function () {
      document.addEventListener('click', function closeRx() {
        bar.remove();
        document.removeEventListener('click', closeRx);
      });
    }, 0);
  }

  function openMessageMenu(anchor, conv, msg) {
    hideAllPopovers();
    const rect = anchor.getBoundingClientRect();
    const menu = el('div', { class: 'popover', style: { width: '180px', padding: '6px' } });

    const item = function (label, fn, danger) {
      return el('button', {
        style: {
          display: 'block', width: '100%', textAlign: 'left', padding: '9px 10px',
          borderRadius: '8px', fontSize: '14px', color: danger ? '#e41e3f' : '#050505'
        },
        onmouseenter: function (ev) { ev.currentTarget.style.background = '#f2f2f2'; },
        onmouseleave: function (ev) { ev.currentTarget.style.background = 'transparent'; },
        text: label,
        onclick: function () { fn(); menu.remove(); }
      });
    };

    menu.appendChild(item('Copy text', function () {
      const txt = msg.text || '';
      if (navigator.clipboard) navigator.clipboard.writeText(txt);
      toast('Copied');
    }));
    menu.appendChild(item('Reply', function () { startReply(conv, msg); }));
    if (msg.from === 'me') {
      menu.appendChild(item('Delete message', function () {
        const i = conv.messages.indexOf(msg);
        if (i > -1) conv.messages.splice(i, 1);
        renderThread(conv, { keepScroll: true });
        renderChatList();
      }, true));
    }

    menu.style.position = 'fixed';
    menu.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
    menu.style.top = (rect.bottom + 6) + 'px';
    document.body.appendChild(menu);
    setTimeout(function () {
      document.addEventListener('click', function closeMenu() {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      });
    }, 0);
  }

  /* ==========================================================
     COMPOSER
     ========================================================== */
  function updateSendState() {
    const v = $('messageInput').value.trim();
    $('btnSend').disabled = !v;
  }

  function autoGrow() {
    const input = $('messageInput');
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 132) + 'px';
  }

  /* ==========================================================
     EMOJI PICKER
     ========================================================== */
  function openEmojiPicker(anchor) {
    const pop = $('emojiPopover');
    if (!pop.hidden) { pop.hidden = true; return; }

    pop.innerHTML = '';
    pop.className = 'popover emoji-pop';

    const tabs = el('div', { class: 'emoji-tabs' });
    const body = el('div', { class: 'emoji-body' });

    D.EMOJI_CATEGORIES.forEach(function (cat, idx) {
      tabs.appendChild(el('button', {
        class: 'emoji-tab' + (idx === 0 ? ' active' : ''),
        text: cat.icon,
        title: cat.name,
        onclick: function (ev) {
          qsa('.emoji-tab', tabs).forEach(function (b) { b.classList.remove('active'); });
          ev.currentTarget.classList.add('active');
          renderCat(idx);
        }
      }));
    });

    function renderCat(idx) {
      body.innerHTML = '';
      body.appendChild(el('div', { class: 'emoji-cat-label', text: D.EMOJI_CATEGORIES[idx].name }));
      const grid = el('div', { class: 'emoji-grid' });
      D.EMOJI_CATEGORIES[idx].emojis.forEach(function (em) {
        grid.appendChild(el('button', {
          text: em,
          onclick: function () {
            const input = $('messageInput');
            input.value += em;
            input.focus();
            updateSendState();
          }
        }));
      });
      body.appendChild(grid);
    }

    renderCat(0);
    pop.appendChild(tabs);
    pop.appendChild(body);
    positionPopover(pop, anchor, 336);
    pop.hidden = false;
  }

  /* ==========================================================
     GIF / STICKER PICKERS
     ========================================================== */
  function openGifPicker(anchor) {
    const pop = $('gifPopover');
    if (!pop.hidden) { pop.hidden = true; return; }
    const grid = $('gifGrid');
    grid.innerHTML = '';
    D.GIFS.forEach(function (g) {
      grid.appendChild(el('button', {
        title: g.label,
        text: g.emoji,
        onclick: function () {
          pop.hidden = true;
          sendMessage('', { extra: { type: 'sticker', sticker: g.emoji, text: '' } });
        }
      }));
    });
    positionPopover(pop, anchor, 340);
    pop.hidden = false;
  }

  function openStickerPicker(anchor) {
    const pop = $('stickerPopover');
    if (!pop.hidden) { pop.hidden = true; return; }
    const grid = $('stickerGrid');
    grid.innerHTML = '';
    D.STICKERS.forEach(function (s) {
      grid.appendChild(el('button', {
        text: s,
        onclick: function () {
          pop.hidden = true;
          sendMessage('', { extra: { type: 'sticker', sticker: s, text: '' } });
        }
      }));
    });
    positionPopover(pop, anchor, 340);
    pop.hidden = false;
  }

  function openAttach(anchor) {
    const pop = $('attachPopover');
    if (!pop.hidden) { pop.hidden = true; return; }
    positionPopover(pop, anchor, 190);
    pop.hidden = false;
  }

  function positionPopover(pop, anchor, width) {
    const rect = anchor.getBoundingClientRect();
    pop.style.position = 'fixed';
    pop.style.left = Math.max(8, Math.min(rect.left - width + 40, window.innerWidth - width - 12)) + 'px';
    pop.style.top = Math.max(8, rect.top - 8) + 'px';
    pop.style.bottom = 'auto';
    // measure and lift above composer if needed
    requestAnimationFrame(function () {
      const h = pop.offsetHeight;
      if (rect.top - h - 10 > 8) {
        pop.style.top = (rect.top - h - 10) + 'px';
      }
    });
  }

  function hideAllPopovers() {
    ['emojiPopover', 'gifPopover', 'stickerPopover', 'attachPopover'].forEach(function (id) {
      const p = $(id);
      if (p) p.hidden = true;
    });
    qsa('.quick-reactions').forEach(function (n) { n.remove(); });
  }

  /* ==========================================================
     INFO PANEL
     ========================================================== */
  function openInfo() {
    const conv = state.conversations[state.active];
    if (!conv) return;
    const e = entity(conv.id);
    if (!e) return;

    const panel = $('infoPanel');
    const body = $('infoScroll');
    body.innerHTML = '';
    $('infoTitle').textContent = e.kind === 'group' ? 'Group info' : e.kind === 'brand' ? 'Business info' : 'Profile';

    const profile = el('div', { class: 'info-profile' });
    profile.appendChild(avatarNode(conv.id, ''));
    const nameRow = el('div', { class: 'info-name' });
    nameRow.appendChild(document.createTextNode(e.name));
    if (e.verified) nameRow.appendChild(verifiedNode());
    profile.appendChild(nameRow);
    if (e.handle) profile.appendChild(el('div', { class: 'info-handle', text: e.handle }));
    if (e.kind === 'brand' && e.category) profile.appendChild(el('div', { class: 'info-handle', text: e.category }));
    if (e.kind === 'group') profile.appendChild(el('div', { class: 'info-handle', text: e.subtitle || '' }));
    if (e.bio) profile.appendChild(el('div', { class: 'info-status', text: e.bio }));

    const actions = el('div', { class: 'info-actions' });
    const actionDefs = e.kind === 'brand'
      ? [['Call', ICONS.phone], ['Search', ICONS.search], ['Mute', ICONS.mute], ['More', ICONS.more]]
      : e.kind === 'group'
        ? [['Mute', ICONS.mute], ['Search', ICONS.search], ['Members', ICONS.user], ['More', ICONS.more]]
        : [['Call', ICONS.phone], ['Search', ICONS.search], ['Mute', ICONS.mute], ['More', ICONS.more]];

    actionDefs.forEach(function (a) {
      actions.appendChild(el('button', {
        class: 'info-action',
        onclick: function () {
          if (a[0] === 'Mute') { conv.muted = !conv.muted; renderChatList(); updateUnreadTotal(); toast(conv.muted ? 'Muted' : 'Unmuted'); }
          else if (a[0] === 'Call') toast('Calling ' + e.name.split(' ')[0] + '… (demo)');
          else if (a[0] === 'Search') { closeInfo(); $('chatSearch').focus(); }
          else if (a[0] === 'Members') { body.scrollIntoView({ behavior: 'smooth' }); }
          else toast('More options (demo)');
        }
      }, [
        el('span', { html: '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path fill="currentColor" d="' + a[1] + '"/></svg>' }),
        el('span', { text: a[0] })
      ]));
    });
    profile.appendChild(actions);
    body.appendChild(profile);

    // group members
    if (e.kind === 'group') {
      const sec = el('div', { class: 'info-section' });
      const head = el('div', { class: 'info-section-head' });
      head.appendChild(el('h3', { text: 'Members' }));
      head.appendChild(el('span', { style: { fontSize: '13px', color: '#65676b' }, text: String(e.members.length + 1) }));
      sec.appendChild(head);

      const list = el('div', { class: 'member-list' });
      list.appendChild(memberRow('me', 'Admin'));
      e.members.forEach(function (mid, i) {
        list.appendChild(memberRow(mid, i === 0 ? 'Admin' : ''));
      });
      sec.appendChild(list);
      body.appendChild(sec);
    }

    // brand card
    if (e.kind === 'brand') {
      const sec = el('div', { class: 'info-section' });
      sec.appendChild(el('div', { class: 'info-section-head' }, [el('h3', { text: 'Business' })]));
      const card = el('div', { class: 'brand-card' });
      card.appendChild(avatarNode(e.id, 'sm'));
      const info = el('div');
      info.appendChild(el('div', { class: 'brand-name', text: e.name }));
      info.appendChild(el('div', { class: 'brand-cat', text: (e.website || '') + ' · ' + (e.category || '') }));
      card.appendChild(info);
      sec.appendChild(card);
      sec.appendChild(el('div', {
        class: 'info-row',
        onclick: function () { toast('Opening ' + (e.website || 'website') + ' (demo)'); }
      }, [
        el('span', { html: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="' + ICONS.link + '"/></svg>' }),
        el('span', { class: 'row-label', text: 'Visit website' }),
        el('span', { class: 'row-value', text: e.website || '' })
      ]));
      body.appendChild(sec);
    }

    // shared media
    const mediaSec = el('div', { class: 'info-section' });
    const mediaHead = el('div', { class: 'info-section-head' });
    mediaHead.appendChild(el('h3', { text: 'Shared media' }));
    mediaHead.appendChild(el('button', { text: 'See all', onclick: function () { toast('All media (demo)'); } }));
    mediaSec.appendChild(mediaHead);

    const imgs = conv.messages.filter(function (m) { return m.type === 'image'; });
    const fallbackImgs = ['assets/img/trip.jpg', 'assets/img/coffee.jpg', 'assets/img/setup.jpg', 'assets/img/dog.jpg', 'assets/img/concert.jpg', 'assets/img/sneaker.jpg'];
    const tiles = imgs.length ? imgs.slice(0, 6) : fallbackImgs.map(function (s) { return { src: s }; });
    const grid = el('div', { class: 'media-grid' });
    tiles.slice(0, 6).forEach(function (m) {
      grid.appendChild(el('div', {
        class: 'media-tile',
        onclick: function () { openLightbox(m.src); }
      }, [el('img', { src: m.src, alt: '' })]));
    });
    mediaSec.appendChild(grid);
    body.appendChild(mediaSec);

    // toggles
    const setSec = el('div', { class: 'info-section' });
    const muteRow = el('div', { class: 'info-toggle', onclick: function () {
      conv.muted = !conv.muted;
      qs('.switch', muteRow).classList.toggle('on', conv.muted);
      renderChatList();
      updateUnreadTotal();
    } });
    const muteText = el('div');
    muteText.appendChild(el('div', { text: 'Mute conversation' }));
    muteText.appendChild(el('div', { class: 'toggle-sub', text: 'No notifications for this chat' }));
    muteRow.appendChild(muteText);
    muteRow.appendChild(el('div', { class: 'switch' + (conv.muted ? ' on' : '') }));
    setSec.appendChild(muteRow);

    setSec.appendChild(el('div', {
      class: 'info-row',
      onclick: function () {
        if (confirm('Clear this conversation?')) {
          conv.messages = [];
          renderThread(conv);
          renderChatList();
          toast('Conversation cleared');
        }
      }
    }, [
      el('span', { html: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="' + ICONS.doc + '"/></svg>' }),
      el('span', { class: 'row-label', text: 'Clear conversation' })
    ]));

    if (e.kind === 'person' && e.location) {
      setSec.appendChild(el('div', { class: 'info-row' }, [
        el('span', { html: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>' }),
        el('span', { class: 'row-label', text: 'Lives in' }),
        el('span', { class: 'row-value', text: e.location })
      ]));
    }

    if (e.joined) {
      setSec.appendChild(el('div', { class: 'info-row' }, [
        el('span', { html: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="' + ICONS.user + '"/></svg>' }),
        el('span', { class: 'row-label', text: 'Connected' }),
        el('span', { class: 'row-value', text: e.joined })
      ]));
    }
    body.appendChild(setSec);

    $('app').classList.add('info-open');
    panel.hidden = false;
    state.infoOpen = true;
  }

  function memberRow(id, role) {
    const e = entity(id);
    const row = el('div', { class: 'member-row' });
    row.appendChild(avatarNode(id, 'sm', { status: true }));
    const nameWrap = el('div', { style: { flex: '1 1 auto', minWidth: '0' } });
    const n = el('div', { class: 'member-name', text: id === 'me' ? 'You' : (e ? e.name : id) });
    nameWrap.appendChild(n);
    row.appendChild(nameWrap);
    if (role) row.appendChild(el('span', { class: 'member-role ' + (role === 'Admin' ? 'admin' : ''), text: role }));
    return row;
  }

  function closeInfo() {
    $('infoPanel').hidden = true;
    $('app').classList.remove('info-open');
    state.infoOpen = false;
  }

  /* ==========================================================
     MODALS
     ========================================================== */
  function openModal(builder) {
    const modal = $('modal');
    modal.innerHTML = '';
    builder(modal);
    $('modalBackdrop').hidden = false;
  }

  function closeModal() {
    $('modalBackdrop').hidden = true;
  }

  function modalHeader(title, sub) {
    const head = el('div', { class: 'modal-head' });
    head.appendChild(el('h2', { text: title }));
    if (sub) head.appendChild(el('p', { text: sub }));
    head.appendChild(el('button', {
      class: 'icon-btn modal-close',
      html: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.7 2.89 18.3 9.17 12 2.89 5.71 4.3 4.29l6.29 6.3 6.3-6.3z"/></svg>',
      onclick: closeModal
    }));
    return head;
  }

  function openNewChat() {
    openModal(function (modal) {
      modal.appendChild(modalHeader('New message', 'Pick someone to start a conversation'));

      const body = el('div', { class: 'modal-body' });
      const search = el('input', {
        type: 'text', placeholder: 'Search people and businesses',
        style: { width: '100%', border: '1px solid #ccd0d5', borderRadius: '18px', padding: '9px 14px', outline: 'none', marginBottom: '12px' }
      });
      body.appendChild(search);

      const list = el('div', { class: 'modal-list' });
      body.appendChild(list);

      function render(q) {
        list.innerHTML = '';
        const all = Object.keys(D.PEOPLE).concat(Object.keys(D.EXTRA_PEOPLE)).concat(Object.keys(D.BRANDS));
        const filtered = all.filter(function (id) {
          const e = entity(id);
          return e && (!q || e.name.toLowerCase().indexOf(q) !== -1);
        });
        filtered.forEach(function (id) {
          const e = entity(id);
          list.appendChild(el('button', {
            class: 'modal-list-row',
            onclick: function () {
              closeModal();
              openConversation(id);
            }
          }, [
            avatarNode(id, 'sm'),
            el('div', {}, [
              el('div', { class: 'mlr-name', text: e.name }),
              el('div', { class: 'mlr-sub', text: e.kind === 'brand' ? e.category : (e.handle || '') })
            ])
          ]));
        });
        if (!filtered.length) list.appendChild(el('div', { class: 'list-empty', text: 'No matches.' }));
      }

      search.addEventListener('input', function () { render(search.value.trim().toLowerCase()); });
      render('');
      modal.appendChild(body);
      setTimeout(function () { search.focus(); }, 30);
    });
  }

  function openNewGroup() {
    const selected = {};

    openModal(function (modal) {
      modal.appendChild(modalHeader('Create a group', 'Add people and give your group a name'));

      const body = el('div', { class: 'modal-body' });
      const nameField = el('div', { class: 'field' });
      nameField.appendChild(el('label', { text: 'Group name' }));
      const nameInput = el('input', { type: 'text', placeholder: 'e.g. Saturday Hikers', maxlength: '48' });
      nameField.appendChild(nameInput);
      body.appendChild(nameField);

      body.appendChild(el('label', {
        text: 'Members',
        style: { display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#65676b', marginBottom: '6px' }
      }));

      const list = el('div', { class: 'modal-list' });
      const ids = Object.keys(D.PEOPLE).concat(Object.keys(D.EXTRA_PEOPLE));
      ids.forEach(function (id) {
        const e = entity(id);
        const row = el('button', { class: 'modal-list-row' }, [
          avatarNode(id, 'sm'),
          el('div', {}, [
            el('div', { class: 'mlr-name', text: e.name }),
            el('div', { class: 'mlr-sub', text: e.handle || '' })
          ]),
          el('span', { class: 'check', text: '' })
        ]);
        row.addEventListener('click', function () {
          if (selected[id]) { delete selected[id]; row.classList.remove('selected'); qs('.check', row).textContent = ''; }
          else { selected[id] = true; row.classList.add('selected'); qs('.check', row).textContent = '✓'; }
        });
        list.appendChild(row);
      });
      body.appendChild(list);
      modal.appendChild(body);

      const foot = el('div', { class: 'modal-foot' });
      const createBtn = el('button', { class: 'primary-btn', text: 'Create group', disabled: true });
      foot.appendChild(el('button', { class: 'ghost-btn', text: 'Cancel', onclick: closeModal }));
      foot.appendChild(createBtn);
      modal.appendChild(foot);

      function refresh() {
        createBtn.disabled = Object.keys(selected).length < 2 || !nameInput.value.trim();
      }
      nameInput.addEventListener('input', refresh);

      createBtn.addEventListener('click', function () {
        const id = 'group_' + Date.now();
        D.GROUPS[id] = {
          id: id,
          kind: 'group',
          name: nameInput.value.trim(),
          members: Object.keys(selected),
          subtitle: (Object.keys(selected).length + 1) + ' members',
          pinnedText: '',
          color: '#006aff'
        };
        state.conversations[id] = {
          id: id, messages: [], unread: 0, pinned: false, muted: false, ctx: {}, typing: false
        };
        state.order.unshift(id);
        closeModal();
        openConversation(id);
        toast('Group created');
        // first greeting from the group
        const first = Object.keys(selected)[0];
        setTimeout(function () {
          pushReplies(state.conversations[id], [
            { from: first, type: 'text', text: 'hey! what is this group for?', delay: 700 }
          ], ['Good question']);
        }, 500);
      });
    });
  }

  function openSettings() {
    openModal(function (modal) {
      modal.appendChild(modalHeader('Preferences', 'Demo settings — nothing leaves this page'));
      const body = el('div', { class: 'modal-body' });

      const rows = [
        ['Message sounds', 'Play a sound for new messages', true],
        ['Desktop notifications', 'Show a notification banner', false],
        ['Enter to send', 'Shift + Enter adds a new line', true],
        ['Show read receipts', 'Let people see when you have read', true]
      ];

      rows.forEach(function (r) {
        const row = el('div', { class: 'settings-row' });
        const text = el('div');
        text.appendChild(el('div', { class: 'sr-title', text: r[0] }));
        text.appendChild(el('div', { class: 'sr-sub', text: r[1] }));
        row.appendChild(text);
        const sw = el('div', { class: 'switch' + (r[2] ? ' on' : '') });
        row.appendChild(sw);
        row.addEventListener('click', function () { sw.classList.toggle('on'); });
        body.appendChild(row);
      });

      const resetRow = el('div', { class: 'settings-row' });
      const rt = el('div');
      rt.appendChild(el('div', { class: 'sr-title', text: 'Reset all conversations' }));
      rt.appendChild(el('div', { class: 'sr-sub', text: 'Restore the original seeded chats' }));
      resetRow.appendChild(rt);
      resetRow.appendChild(el('button', {
        class: 'ghost-btn', text: 'Reset',
        onclick: function () {
          if (confirm('Reset everything back to the seeded conversations?')) {
            state.conversations = {};
            state.order = [];
            state.active = null;
            buildConversations();
            renderChatList();
            $('threadWrap').hidden = true;
            $('threadEmpty').hidden = false;
            closeModal();
            closeInfo();
            toast('Conversations reset');
          }
        }
      }));
      body.appendChild(resetRow);

      body.appendChild(el('div', {
        style: { fontSize: '12px', color: '#8a8d91', padding: '14px 4px 4px', lineHeight: '1.5' },
        text: 'This is a self-contained demo: every reply is scripted with if/else logic, and each conversation remembers what you talked about.'
      }));

      modal.appendChild(body);
      modal.appendChild(el('div', { class: 'modal-foot' }, [
        el('button', { class: 'primary-btn', text: 'Done', onclick: closeModal })
      ]));
    });
  }

  /* ==========================================================
     LIGHTBOX
     ========================================================== */
  function openLightbox(src) {
    const back = el('div', {
      style: {
        position: 'fixed', inset: '0', background: 'rgba(0,0,0,.9)',
        zIndex: '400', display: 'grid', placeItems: 'center', padding: '30px',
        cursor: 'zoom-out'
      },
      onclick: function () { back.remove(); }
    });
    back.appendChild(el('img', {
      src: src,
      style: { maxWidth: '100%', maxHeight: '100%', borderRadius: '8px', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }
    }));
    document.body.appendChild(back);
  }

  /* ==========================================================
     TOAST
     ========================================================== */
  function toast(text) {
    const t = el('div', { class: 'toast', text: text });
    $('toastStack').appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { t.remove(); }, 220);
    }, 2200);
  }

  /* ==========================================================
     EVENT WIRING
     ========================================================== */
  function wire() {
    // composer
    const input = $('messageInput');
    input.addEventListener('input', function () {
      updateSendState();
      autoGrow();
    });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        if (input.value.trim()) sendMessage(input.value);
      }
    });
    $('btnSend').addEventListener('click', function () {
      if (input.value.trim()) sendMessage(input.value);
    });

    $('btnCancelReply').addEventListener('click', clearReply);

    $('btnEmoji').addEventListener('click', function (ev) {
      ev.stopPropagation();
      openEmojiPicker(ev.currentTarget);
    });
    $('btnGif').addEventListener('click', function (ev) {
      ev.stopPropagation();
      openGifPicker(ev.currentTarget);
    });
    $('btnSticker').addEventListener('click', function (ev) {
      ev.stopPropagation();
      openStickerPicker(ev.currentTarget);
    });
    $('btnAttach').addEventListener('click', function (ev) {
      ev.stopPropagation();
      openAttach(ev.currentTarget);
    });

    qsa('[data-attach]').forEach(function (b) {
      b.addEventListener('click', function () {
        const kind = b.dataset.attach;
        hideAllPopovers();
        if (kind === 'photo') {
          sendMessage('', { extra: { type: 'image', src: 'assets/img/setup.jpg', caption: '' } });
        } else if (kind === 'file') {
          sendMessage('', { extra: { type: 'file', name: 'portfolio-2026.pdf', size: '4.2 MB' } });
        } else if (kind === 'poll') {
          sendMessage('', { extra: { type: 'text', text: '📊 Poll: Where should we go this weekend?\n• Cabin\n• Stay home\n• Day trip' } });
        } else if (kind === 'location') {
          sendMessage('', { extra: { type: 'text', text: '📍 Shared location: Prospect Park, Brooklyn' } });
        }
      });
    });

    // like button
    $('btnLike').addEventListener('click', function () {
      const conv = state.conversations[state.active];
      if (!conv) return;
      const last = conv.messages[conv.messages.length - 1];
      if (last) toggleReaction(conv, last, '👍');
    });

    // search
    $('globalSearch').addEventListener('input', function (ev) {
      state.search = ev.target.value;
      $('chatSearch').value = state.search;
      renderChatList();
    });
    $('chatSearch').addEventListener('input', function (ev) {
      state.search = ev.target.value;
      $('globalSearch').value = state.search;
      renderChatList();
    });

    // filters
    qsa('.filter-pill').forEach(function (b) {
      b.addEventListener('click', function () {
        qsa('.filter-pill').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        state.filter = b.dataset.filter;
        renderChatList();
      });
    });

    // thread header
    $('btnInfo').addEventListener('click', function () {
      if (state.infoOpen) closeInfo();
      else openInfo();
    });
    $('btnCloseInfo').addEventListener('click', closeInfo);
    $('threadPerson').addEventListener('click', function () {
      if (state.infoOpen) closeInfo();
      else openInfo();
    });
    $('btnBack').addEventListener('click', function () {
      $('app').classList.remove('thread-open');
      state.active = null;
      $('threadWrap').hidden = true;
      $('threadEmpty').hidden = false;
      closeInfo();
      renderChatList();
    });

    $('btnCall').addEventListener('click', function () {
      const e = entity(state.active);
      toast('Calling ' + (e ? e.name.split(' ')[0] : '') + '… (demo)');
    });
    $('btnVideo').addEventListener('click', function () {
      const e = entity(state.active);
      toast('Starting video call with ' + (e ? e.name.split(' ')[0] : '') + '… (demo)');
    });

    // new chat / group
    $('btnNewChat').addEventListener('click', openNewChat);
    $('btnEmptyNew').addEventListener('click', openNewChat);
    $('btnNewGroup').addEventListener('click', openNewGroup);
    $('btnSettings').addEventListener('click', openSettings);
    $('btnProfile').addEventListener('click', function () { toast('Signed in as ' + D.ME.name); });
    $('btnMarkRead').addEventListener('click', function () {
      Object.keys(state.conversations).forEach(function (k) { state.conversations[k].unread = 0; });
      updateUnreadTotal();
      renderChatList();
      toast('All caught up');
    });
    $('btnMoreChats').addEventListener('click', function () { toast('Chat options (demo)'); });

    // modal backdrop
    $('modalBackdrop').addEventListener('click', function (ev) {
      if (ev.target === $('modalBackdrop')) closeModal();
    });

    // tabs
    qsa('.tab').forEach(function (t) {
      t.addEventListener('click', function () {
        qsa('.tab').forEach(function (x) { x.classList.remove('active'); });
        t.classList.add('active');
        if (t.dataset.tab !== 'chats') {
          toast(t.dataset.tab === 'people' ? 'People directory (demo)' : 'Stories (demo)');
        }
      });
    });

    // global click closes popovers
    document.addEventListener('click', function (ev) {
      const inside = ev.target.closest('.popover') ||
        ev.target.closest('#btnEmoji') || ev.target.closest('#btnGif') ||
        ev.target.closest('#btnSticker') || ev.target.closest('#btnAttach') ||
        ev.target.closest('.quick-reactions');
      if (!inside) hideAllPopovers();
    });

    // keyboard
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        hideAllPopovers();
        if (!$('modalBackdrop').hidden) closeModal();
        else if (state.infoOpen) closeInfo();
      }
    });
  }

  /* ==========================================================
     BOOT
     ========================================================== */
  function boot() {
    buildConversations();
    wire();
    renderChatList();

    // open the first conversation on wide screens
    if (window.innerWidth > 860) {
      openConversation(state.order[0]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.APP = { state: state, openConversation: openConversation, toast: toast };
})();
