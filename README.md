# Messenger Chat Demo

A Messenger-style chat interface built with plain HTML, CSS, and JavaScript. No frameworks, no build step, no backend — conversations are generated client-side by a scripted response engine.

**Live demo:** https://rynaricperson-crypto.github.io/messenger-chat-demo/

## What it is

A UI recreation of a desktop messaging app, populated with 29 conversations and a large set of scripted replies. The "people" you talk to are rule-based, not a language model — replies are matched from keyword sets in `js/engine.js`.

## Features

- Chat list with search, avatars, and unread badges
- Conversation view with typing indicators and delayed replies
- Info panel that collapses to an overlay on narrow screens
- Responsive layout down to 320px — the chat list and conversation swap on mobile
- Attachment, GIF, sticker, emoji, and like buttons in the composer

## Structure

```
index.html          markup and app shell
css/style.css       all styling and responsive breakpoints
js/app.js           UI wiring, event handling, state
js/data.js          conversation seed data
js/engine.js        scripted reply engine
assets/             avatars, logos, images
```

## Running locally

No server or install needed. Open `index.html` directly in a browser.

If you'd rather serve it (for correct relative paths across all browsers):

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Notes

This is a front-end demo. Messages are not persisted, nothing is sent anywhere, and all replies come from local scripted rules. It is not affiliated with Meta or Messenger.

## Deployment

Pushes to `main` deploy automatically to GitHub Pages via `.github/workflows/deploy.yml`.
