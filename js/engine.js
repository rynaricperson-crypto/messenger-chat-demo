/* ============================================================
   engine.js — scripted reply engine
   Every contact has its own hand-written if/else branch tree.
   Each conversation carries a ctx object that persists, so a
   "yes" three messages later still knows what it is saying yes to.
   ============================================================ */
(function () {
  'use strict';

  /* ==========================================================
     1. TEXT UTILITIES
     ========================================================== */

  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/[’‘`]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Word-boundary phrase match. Handles "im in" vs "i'm in", plus simple plurals.
  function has(text, ...terms) {
    const a = ' ' + norm(text).replace(/[?!.,;:]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
    const b = a.replace(/'/g, '');
    const hit = (hay, needle) => hay.indexOf(' ' + needle + ' ') !== -1;
    for (let i = 0; i < terms.length; i++) {
      const raw = terms[i].toLowerCase();
      const forms = [raw, raw + 's', raw + 'es'];
      if (/s$/.test(raw)) forms.push(raw.slice(0, -1));
      if (/es$/.test(raw)) forms.push(raw.slice(0, -2));
      for (let f = 0; f < forms.length; f++) {
        const t = forms[f];
        if (hit(a, t)) return true;
        const tb = t.replace(/'/g, '');
        if (hit(b, tb)) return true;
      }
    }
    return false;
  }

  function starts(text, ...terms) {
    const n = norm(text).replace(/[?!.,;:]/g, '');
    return terms.some(t => n === t || n.indexOf(t + ' ') === 0);
  }

  const EMOJI_TEST = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/u;
  const EMOJI_STRIP = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\s]/gu;

  function emojiOnly(s) {
    const str = String(s || '');
    if (!EMOJI_TEST.test(str)) return false;
    return str.replace(EMOJI_STRIP, '').length === 0;
  }

  function isQuestion(s) {
    const n = norm(s);
    if (n.indexOf('?') !== -1) return true;
    return starts(s, 'who', 'what', 'when', 'where', 'why', 'how', 'do', 'does', 'did',
      'can', 'could', 'would', 'will', 'is', 'are', 'was', 'were', 'should', 'am', 'have', 'has');
  }

  /* ==========================================================
     2. SHARED INTENT DETECTION
     ========================================================== */

  const I = {
    greet: t => has(t, 'hi', 'hey', 'hello', 'yo', 'sup', 'heyy', 'hii', 'howdy', 'morning', 'evening') ||
      starts(t, 'good morning', 'good evening', 'good afternoon'),
    thanks: t => has(t, 'thanks', 'thank you', 'thx', 'ty', 'appreciate it', 'appreciate you', 'much appreciated'),
    bye: t => has(t, 'bye', 'goodnight', 'good night', 'later', 'talk later', 'gtg', 'gotta go', 'see ya', 'see you', 'cya', 'night'),
    yes: t => has(t, 'yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'sounds good', 'deal', 'for sure',
      'definitely', 'absolutely', 'correct', 'do it', 'lets do it', 'i am in', 'im in', 'count me in',
      'of course', 'why not', 'fine', 'alright', 'all right', 'true', 'right', 'yes please', 'please do'),
    no: t => has(t, 'no', 'nope', 'nah', 'not really', 'no thanks', 'no thank you', 'never', 'not now',
      'maybe later', 'not today', 'cannot', 'cant', 'i cant', 'i cannot', 'i am out', 'im out', 'pass'),
    maybe: t => has(t, 'maybe', 'perhaps', 'not sure', 'unsure', 'i dont know', 'i don t know', 'idk', 'possibly', 'we will see'),
    laugh: t => has(t, 'lol', 'lmao', 'lmfao', 'haha', 'hahaha', 'hehe', 'ha', 'rofl', 'funny', 'hilarious', 'dead', 'im dead'),
    apology: t => has(t, 'sorry', 'my bad', 'apologies', 'my fault', 'i apologize'),
    compliment: t => has(t, 'love it', 'love this', 'love you', 'nice', 'cool', 'awesome', 'great', 'amazing',
      'beautiful', 'sick', 'fire', 'goat', 'perfect', 'brilliant', 'impressive', 'well done', 'good job',
      'thats great', 'that is great', 'looks good', 'looks great', 'proud of you'),
    insult: t => has(t, 'shut up', 'stupid', 'dumb', 'idiot', 'annoying', 'i hate you', 'you suck', 'loser', 'trash', 'useless'),
    bot: t => has(t, 'are you a bot', 'are you real', 'are you human', 'is this a bot', 'is this ai', 'are you an ai',
      'you are a bot', 'youre a bot', 'not a real person', 'am i talking to a bot', 'be honest are you a bot'),
    help: t => has(t, 'what can you do', 'help me', 'how does this work', 'what do i say', 'what should i say', 'help'),
    love: t => has(t, 'i love you', 'love you', 'marry me'),
    who: t => has(t, 'who are you', 'whats your name', 'what is your name', 'your name'),
    howareyou: t => has(t, 'how are you', 'how are you doing', 'hows it going', 'how is it going', 'you good', 'how you doing'),
    question: t => isQuestion(t)
  };

  /* ==========================================================
     3. REPLY BUILDERS
     ========================================================== */

  function say(text, ms) {
    return { type: 'text', text: text, delay: ms };
  }
  function img(src, caption, ms) {
    return { type: 'image', src: src, caption: caption || '', delay: ms };
  }
  function sticker(emoji, ms) {
    return { type: 'sticker', sticker: emoji, delay: ms };
  }
  function link(url, site, title, desc, imgSrc, ms) {
    return { type: 'link', url: url, site: site, title: title, desc: desc, img: imgSrc, delay: ms };
  }
  function file(name, size, ms) {
    return { type: 'file', name: name, size: size, delay: ms };
  }
  function react(emoji) {
    return { type: 'reaction', emoji: emoji };
  }

  // Replies are emitted as objects; delay is filled in by the app if absent.
  function out(replies, chips, extras) {
    return Object.assign({ replies: replies, chips: chips || [] }, extras || {});
  }

  function cycle(c, key, list) {
    const n = (c.ctx[key] || 0) % list.length;
    c.ctx[key] = (c.ctx[key] || 0) + 1;
    return list[n];
  }

  function ctxOf(c) {
    if (!c.ctx) c.ctx = {};
    if (!c.ctx.topic) c.ctx.topic = 'none';
    return c.ctx;
  }

  /* Generic personality responses reused by every person. */
  function commonBot(c, name) {
    return out([
      say("I'm " + name.split(' ')[0] + ". I'm a person. I have a phone and everything.", 700),
      say("This is a demo conversation, though — so technically I'm a very committed script.", 1100)
    ], ['Fair enough', 'So what are you up to?']);
  }

  function commonHelp(c, name) {
    return out([
      say("Just talk to me like normal. Ask me what I'm up to, make a plan, or give me a hard time.", 800),
      say("I'll keep track of what we already talked about, so you can say 'yes' and I'll know what to.", 1100)
    ], ['What are you up to?', 'Tell me something interesting']);
  }

  /* ==========================================================
     4. REGISTRY
     ========================================================== */

  const registry = {};

  function register(id, handler) {
    registry[id] = handler;
  }

  /* ==========================================================
     5. PEOPLE
     ========================================================== */

  /* ---------------- MAYA ---------------- */
  register('maya', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return commonBot(c, 'Maya Chen');
    if (I.help(t)) return commonHelp(c, 'Maya Chen');

    if (I.greet(t)) {
      if (x.cabin === 'booked') {
        x.topic = 'cabin';
        return out([
          say('heyyy! did you get the confirmation email?', 700),
          say('I already started a packing list. it has 34 items. one of them is "good attitude".', 1200)
        ], ['Got it', '34 items??', 'What should I bring?']);
      }
      if (x.cabin === 'declined') {
        return out([
          say('hey! still thinking about the day trip instead?', 800),
          say('no pressure. I just refuse to let the weekend win.', 1100)
        ], ['Day trip sounds good', 'Let me check']);
      }
      return out([
        say('hey!! did you see the cabin??', 700),
        say('I sent it like an hour ago and you have not said anything, which is very on brand for you.', 1200)
      ], ['I saw it', 'Just looking now', 'How much?']);
    }

    // --- cost
    if (has(t, 'how much', 'cost', 'price', 'expensive', 'budget', 'per person', 'each', 'money', 'afford')) {
      x.topic = 'cost';
      x.askedCost = true;
      return out([
        say('$142 each for two nights. that includes the cleaning fee and the hot tub, which is non-negotiable.', 900),
        say('$50 deposit to hold it. I need it by Friday or the host gives it to someone with better follow-through.', 1400)
      ], ['I can do that', 'That’s steep', 'Who’s paying what?']);
    }

    // --- dates
    if (has(t, 'when', 'what weekend', 'dates', 'which weekend', 'how long', 'what day')) {
      x.topic = 'dates';
      return out([
        say('the 24th to the 26th. two nights, Friday to Sunday.', 850),
        say('I know it is soon. that is the point. spontaneous. memorable. slightly irresponsible.', 1300)
      ], ['I’m free', 'That’s soon', 'How far is it?']);
    }

    // --- location
    if (has(t, 'where', 'location', 'how far', 'address', 'drive', 'distance', 'which cabin')) {
      x.topic = 'location';
      return out([
        say('Catskills. about 2.5 hours from the city if Liam drives like a normal person.', 900),
        say('there is a lake, a fire pit, and apparently deer that are "friendly" which I am choosing to believe.', 1400)
      ], ['Sounds perfect', 'Friendly deer?', 'Who’s driving?']);
    }

    // --- who
    if (has(t, 'who is coming', 'whose coming', 'who else', 'who is going', 'whos going', 'the group', 'who all')) {
      x.topic = 'who';
      return out([
        say('you, me, Devon, and Liam.', 700),
        say('I asked Zoe but she is in Lisbon being insufferable about it.', 1200)
      ], ['Good group', 'Is Devon bringing food?', 'What about Nina?']);
    }

    // --- food
    if (has(t, 'food', 'eat', 'groceries', 'cook', 'dinner', 'breakfast', 'grill', 'bbq', 'meal')) {
      x.topic = 'food';
      return out([
        say("Devon's bringing the grill and doing his chicken thing. I'm doing a grocery run Friday.", 900),
        say('send me a list. if you say "whatever" I will buy nine pounds of potatoes out of spite.', 1400)
      ], ['I’ll send a list', 'Whatever', 'I can cook']);
    }

    // --- driving
    if (has(t, 'drive', 'driving', 'car', 'ride', 'lift', 'pick me up', 'transport')) {
      x.topic = 'drive';
      return out([
        say("Liam's driving. he says his car 'hates hills' but it's the only one with roof racks.", 900),
        say('I am choosing to interpret that as a personality quirk and not a safety concern.', 1350)
      ], ['I can drive', 'That’s reassuring', 'What time are we leaving?']);
    }

    // --- packing
    if (has(t, 'pack', 'bring', 'what should i bring', 'clothes', 'gear', 'suitcase')) {
      x.topic = 'packing';
      return out([
        say('layers, hiking shoes, swimsuit for the hot tub, and something warm for the fire pit.', 950),
        say('also snacks. I am not sharing mine. this is a boundary I am setting now.', 1400)
      ], ['Got it', 'Noted', 'What about food?']);
    }

    // --- specific callbacks
    if (has(t, 'saw it', 'i saw it', 'looked', 'just looking', 'looking now', 'see it', 'open it', 'opened')) {
      x.topic = 'cabin';
      return out([
        say('AND?? the photo does not do it justice. there is a hot tub on the deck.', 900),
        say('it is $142 each for two nights. I need an answer tonight because the host has other people asking.', 1400)
      ], ['I’m in', 'That’s steep', 'Who else is coming?']);
    }

    if (has(t, 'hot tub', 'jacuzzi')) {
      return out([say('the hot tub is the entire reason I picked this place. do not pretend otherwise.', 800)],
        ['Fair', 'I’m in']);
    }
    if (has(t, 'deer')) {
      return out([
        say('the host said "friendly deer" in the listing. I have questions and zero answers.', 900),
        say('if a deer breaks in, you are handling it. I will be in the hot tub.', 1300)
      ], ['Deal', 'I’m not handling a deer']);
    }

    // --- yes / no
    if (I.yes(t)) {
      if (x.topic === 'cost' || x.askedCost) {
        x.cabin = 'booked';
        return out([
          say('PERFECT. okay. I am booking it right now.', 700),
          say('send me the $50 when you can and I will stop talking about the deposit. probably.', 1300)
        ], ['Sent', 'I’ll send it tonight']);
      }
      if (x.topic === 'food') {
        return out([say('great. send the list by Thursday and I will pretend to be organized about it.', 900)],
          ['Will do', 'What are you making?']);
      }
      if (x.topic === 'drive') {
        return out([say('amazing. I will tell Liam he is off the hook and he will be insufferable about it.', 900)],
          ['Ha', 'What time?']);
      }
      if (x.topic === 'packing') {
        return out([say('good. I am bringing a board game and I will explain the rules exactly once.', 900)],
          ['Which game?', 'I’m scared']);
      }
      x.cabin = 'booked';
      return out([
        say('YES. okay. I am booking it before you change your mind.', 700),
        say('this is going to be so good. I am already planning the playlist.', 1200)
      ], ['Can’t wait', 'What’s on the playlist?']);
    }

    if (I.no(t)) {
      if (x.topic === 'cost' || has(t, 'too expensive', 'steep', 'cant afford', 'cannot afford')) {
        x.cabin = 'declined';
        return out([
          say('okay, that is completely fair. I would rather you say it now than be weird about it all weekend.', 1000),
          say('day trip instead? same lake, no deposit, we are home by dark.', 1500)
        ], ['Day trip sounds good', 'Maybe next time']);
      }
      x.cabin = 'declined';
      return out([
        say('okay. that is a bummer but I get it.', 850),
        say('I am still going to send you photos of the hot tub out of love and mild spite.', 1300)
      ], ['Fair', 'Sorry', 'Rain check?']);
    }

    if (I.maybe(t)) {
      x.cabin = 'maybe';
      return out([
        say('"maybe" is not a yes, Alex.', 800),
        say('I need a real answer by tonight because the host has two other people asking.', 1300)
      ], ['Okay, I’m in', 'I need to check', 'How much again?']);
    }

    if (I.thanks(t)) return out([say('of course. this is my entire personality this week.', 750)], ['Ha', 'You’re welcome']);
    if (I.laugh(t)) return out([say('I am serious! the deer thing is real. look it up.', 800)], ['Looking it up', 'I don’t believe you']);
    if (I.apology(t)) return out([say('you are fine. I just need an answer eventually.', 800)], ['I’m in', 'Give me a day']);
    if (I.insult(t)) return out([
      say('wow. okay.', 600),
      say('I am telling Devon and he is going to be so smug about it.', 1100)
    ], ['Don’t tell Devon', 'Sorry']);
    if (I.compliment(t)) return out([say('thank you!! I have been planning this for eleven days.', 800)], ['You’re welcome', 'It shows']);
    if (I.love(t)) return out([say('aw. I love you too, in a strictly platonic and slightly competitive way.', 900)], ['Ha', 'Good']);
    if (I.howareyou(t)) return out([
      say('stressed but in a fun way. I have a spreadsheet with colors.', 850),
      say('how are you? and do not say "fine".', 1200)
    ], ['Actually good', 'Tired', 'Stressed too']);
    if (I.who(t)) return out([say('Maya. your friend who is apparently also your travel agent now.', 800)], ['Fair enough']);

    // fallback — keeps the thread moving
    const f = cycle(c, 'fallback', [
      'okay but are you in or out? I need to know before I put a deposit down.',
      'wait, tell me more. I am listening. mostly.',
      'you are being very mysterious and I am choosing to find it charming.',
      'I have a color-coded spreadsheet open. give me something to put in it.'
    ]);
    return out([say(f, 900)], ['I’m in', 'Still thinking', 'How much?']);
  });

  /* ---------------- DEVON ---------------- */
  register('devon', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return commonBot(c, 'Devon Brooks');
    if (I.help(t)) return commonHelp(c, 'Devon Brooks');

    if (I.greet(t)) {
      return out([
        say('yo. you coming to the gym or are we pretending again', 700),
        say('I already have my shoes on. that is how serious I am.', 1100)
      ], ['I’m coming', 'Not today', 'What time?']);
    }

    if (has(t, 'meal prep', 'mealprep', 'chicken', 'rice', 'broccoli', 'containers', 'prep')) {
      x.topic = 'food';
      return out([
        say('chicken, rice, broccoli. six containers. it is not exciting but it works.', 900),
        say('the broccoli is a little sad but honestly so am I, so we are matching.', 1350)
      ], ['That’s bleak', 'Looks good', 'Teach me']);
    }

    if (has(t, 'order', 'takeout', 'take out', 'uber eats', 'doordash', 'pizza', 'delivery')) {
      x.topic = 'takeout';
      return out([
        say('I ordered out once. ONCE. and you bring it up every single day.', 850),
        say('there were circumstances. the circumstances were that I was tired.', 1250)
      ], ['Circumstances', 'Sure', 'What did you get?']);
    }

    if (has(t, 'gym', 'workout', 'leg day', 'legs', 'train', 'lift', 'exercise')) {
      x.topic = 'gym';
      return out([
        say('tomorrow. 6:30. legs.', 700),
        say('do not eat like it is your birthday tonight. I am serious. I will know.', 1200)
      ], ['I’ll be there', '6:30 is early', 'What are we doing?']);
    }

    if (has(t, 'what time', 'when', 'time')) {
      if (x.topic === 'gym' || has(t, 'gym', 'tomorrow')) {
        x.topic = 'gym';
        return out([say('6:30. lobby. if you are not there I am leaving and I am not texting you about it.', 850)],
          ['I’ll be there', 'Make it 7']);
      }
      return out([say('6:30. which is a normal time to exist, despite what you say.', 800)],
        ['Too early', 'Okay']);
    }

    if (has(t, 'too early', 'early', 'sleep', 'morning', 'tired', 'wake up')) {
      return out([
        say('fine. 7:30. but we are doing legs and you are not allowed to complain.', 900),
        say('and you are buying the coffee after. that is the tax.', 1250)
      ], ['Deal', '7:30 works', 'I hate this']);
    }

    if (has(t, '6 30', 'six thirty', '630', 'make it 7', 'make it 730', '7 30', 'seven thirty', '7:30', '7:15')) {
      return out([
        say('deal. 7:30. bring headphones, the gym playlist has been terrible lately.', 800),
        say('some guy put on a podcast. at the squat rack. out loud.', 1200)
      ], ['That’s criminal', 'See you there']);
    }

    if (has(t, 'protein', 'diet', 'calories', 'macros', 'eat', 'food')) {
      return out([
        say('protein and vegetables. it is not complicated, it is just boring.', 900),
        say('boring is the whole secret. nobody wants to hear it.', 1250)
      ], ['Fine', 'Give me a meal plan', 'What about snacks?']);
    }

    if (has(t, 'snack', 'snacks')) {
      return out([say('greek yogurt. almonds. a piece of fruit. and no, chips are not a fruit.', 850)],
        ['Chips are a vegetable', 'Noted']);
    }

    if (has(t, 'bring', 'what should i bring', 'what do i bring', 'need me to bring')) {
      return out([
        say('bring nothing. I have the grill, the chicken, and a truly unreasonable amount of rice.', 950),
        say('actually bring ice. I always forget ice. every single time.', 1250)
      ], ['Ice, got it', 'Ha', 'Anything else?']);
    }

    if (has(t, 'run', 'running', 'cardio', 'sprint')) {
      return out([say('cardio is fine. it is not my personality, but it is fine.', 800)],
        ['Fair', 'You hate cardio']);
    }

    if (I.yes(t)) {
      if (x.topic === 'gym') {
        x.gym = true;
        return out([
          say('good. do not be late. I am keeping a spreadsheet.', 700),
          say('it is called "people who said they would come". your name is on it twice already.', 1250)
        ], ['Twice??', 'I’ll be there']);
      }
      return out([say('good. that is the right answer.', 700)], ['Ha', 'See you']);
    }

    if (I.no(t)) {
      return out([
        say('you said that last time.', 700),
        say('I am not mad. I am just building a very detailed case.', 1150)
      ], ['Fair', 'Tomorrow for real', 'Guilt trip received']);
    }

    if (I.maybe(t)) return out([say('maybe is a no with extra steps. I will take it.', 800)], ['Rude', 'See you tomorrow']);
    if (I.laugh(t)) return out([say('laugh now. cry at the squat rack.', 750)], ['Ha', 'I hate you']);
    if (I.thanks(t)) return out([say('yeah yeah. just show up.', 700)], ['I will']);
    if (I.apology(t)) return out([say('you are fine. just come to the gym.', 750)], ['Okay', 'Fine']);
    if (I.insult(t)) return out([say('big words from a guy who skipped leg day.', 800)], ['Touché', 'Rude']);
    if (I.compliment(t)) return out([say('I know. it is the protein.', 700)], ['Ha', 'Humble as always']);
    if (I.love(t)) return out([say('love you too, buddy. now do a squat.', 800)], ['No', 'Ha']);
    if (I.howareyou(t)) return out([say('sore. good sore. the kind that means I did something stupid but effective.', 850)],
      ['Nice', 'You’re insane']);
    if (I.who(t)) return out([say('Devon. your roommate. the one who keeps the apartment from becoming a landfill.', 800)],
      ['Fair', 'Thank you for your service']);
    if (I.question(t)) return out([say('I do not know, man. I am a personal trainer, not a search engine.', 850)],
      ['Fair enough', 'Gym tomorrow?']);

    const f = cycle(c, 'fallback', [
      'anyway. gym. yes or no.',
      'I am going to need a real answer eventually.',
      'you are stalling. I can hear you stalling.',
      'the gym is not going to lift itself. I checked.'
    ]);
    return out([say(f, 850)], ['Yes', 'No', 'Maybe']);
  });

  /* ---------------- PRIYA ---------------- */
  register('priya', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return commonBot(c, 'Priya Raghavan');
    if (I.help(t)) return commonHelp(c, 'Priya Raghavan');

    if (I.greet(t)) {
      return out([
        say('Hey! Good timing — I was about to ping you.', 750),
        say('Did the revised specs land in your inbox?', 1100)
      ], ['Got them', 'Not yet', 'Where are they?']);
    }

    if (has(t, 'spec', 'specs', 'document', 'doc', 'revised')) {
      x.topic = 'specs';
      if (has(t, 'got them', 'got it', 'found them', 'yes', 'received')) {
        x.specs = true;
        return out([
          say('Great. Section 3 is the part I actually need your eyes on.', 850),
          say('The empty states are still a little vague and you are better at that than I am.', 1250)
        ], ['I’ll take a look', 'What’s the deadline?', 'Send notes']);
      }
      return out([
        say('It is in your inbox — subject line "Specs v3 — final final (really)".', 900),
        say('I know. I know. The subject line is a cry for help.', 1250)
      ], ['Found it', 'Which section?', 'When do you need notes?']);
    }

    if (has(t, 'where', 'which section', 'what part', 'link', 'send it')) {
      return out([say('Section 3, the empty states. It starts around page 11.', 850),
        say('If the link is not working, tell me and I will paste it in here.', 1200)],
        ['Got it', 'I’ll review tonight']);
    }

    if (has(t, 'section 3', 'section three', 'page 11', 'the section')) {
      x.topic = 'specs';
      return out([
        say('Section 3, the empty states. Page 11.', 850),
        say('The empty states are still a little vague and you are better at that than I am.', 1250)
      ], ['I’ll take a look', 'Send notes', 'Agreed']);
    }

    if (has(t, 'empty state', 'empty states', 'empty')) {
      x.topic = 'empty';
      return out([
        say('Yes — the screen someone sees before they have any data. Right now it just says "No results".', 950),
        say('It needs to tell them what to do next, not just that nothing is there.', 1350)
      ], ['I’ll write something', 'Send an example', 'Agreed']);
    }

    if (has(t, 'deadline', 'when do you need', 'by when', 'timeline', 'review')) {
      x.topic = 'deadline';
      return out([
        say('Review is at 3 today. If you can get notes in by 2:30 I can fold them in before we present.', 950),
        say('If not, no panic — I would rather have good notes tomorrow than rushed notes today.', 1350)
      ], ['I’ll have them by 2:30', 'Might be tight', 'Tomorrow works better']);
    }

    if (has(t, 'reschedule', 'move the meeting', 'push the meeting', 'different time', 'move it')) {
      return out([
        say('No problem. I can move the review to 4:30 or push it to tomorrow morning — which works better?', 950),
        say('Either way I will update the invite and let the team know.', 1250)
      ], ['4:30 works', 'Tomorrow morning', 'Let me check']);
    }

    if (has(t, 'standup', 'meeting', 'call', 'sync')) {
      return out([
        say('Standup was moved to 9:30. Same link.', 800),
        say('I am bringing coffee and low expectations.', 1150)
      ], ['See you there', 'Thanks for the heads up']);
    }

    if (has(t, 'context', 'need context', 'background', 'why')) {
      x.topic = 'empty';
      return out([
        say('Of course. Short version: we are shipping the new dashboard to a pilot group next week.', 950),
        say('Most of them will open it with zero data, so the empty state is the first impression. No pressure.', 1400)
      ], ['That helps', 'I’m on it']);
    }

    if (I.yes(t)) {
      if (x.topic === 'empty') {
        x.ownsEmpty = true;
        return out([
          say('You are the best. I am putting your name on it so you cannot escape.', 850),
          say('I will send the doc link in the channel too.', 1200)
        ], ['Ha', 'Happy to help']);
      }
      return out([say('Perfect. I will take that as a yes and stop worrying about it.', 800)],
        ['Ha', 'You’re welcome']);
    }

    if (I.no(t)) {
      if (x.topic === 'deadline') {
        return out([say('Totally fine. Tomorrow morning works. I will tell the team.', 850)],
          ['Thanks', 'Appreciate it']);
      }
      return out([
        say('No problem at all. I would rather know now than find out at 3.', 850),
        say('Is there someone else I should loop in?', 1200)
      ], ['I can do part of it', 'Ask Nina', 'Let me think']);
    }

    if (has(t, 'tomorrow works', 'tomorrow is better', 'tomorrow', 'next week', 'another day')) {
      x.topic = 'deadline';
      return out([
        say('Totally fine. Tomorrow morning works. I will tell the team.', 850),
        say('I would rather have good notes tomorrow than rushed notes today.', 1200)
      ], ['Thanks', 'Appreciate it']);
    }

    if (I.maybe(t)) return out([say('Fair. Let me know by 2 and I will plan around it.', 800)], ['Will do', 'I’ll try']);
    if (I.thanks(t)) return out([say('Of course. Thank you for being fast on this.', 750)], ['Anytime']);
    if (I.apology(t)) return out([say('You are fine, genuinely. We have time.', 750)], ['Thanks', 'Okay']);
    if (I.laugh(t)) return out([say('Ha — I needed that. This morning has been a lot of "quick syncs".', 850)], ['Ha', 'Hang in there']);
    if (I.insult(t)) return out([say('Ouch. I am going to assume that is stress and not a performance review.', 900)], ['Sorry', 'Ha']);
    if (I.compliment(t)) return out([say('Thank you — that means a lot coming from you.', 800)], ['Anytime', 'You earned it']);
    if (I.howareyou(t)) return out([
      say('Honestly? Caffeinated and slightly behind. The usual.', 850),
      say('How are you holding up?', 1150)
    ], ['Same', 'Good', 'Hanging in']);
    if (I.who(t)) return out([say('Priya. Product manager. Professional herder of cats.', 800)], ['Ha']);
    if (I.question(t)) return out([say('Good question. Let me check and get back to you before 3.', 850)],
      ['Thanks', 'No rush']);

    const f = cycle(c, 'fallback', [
      'Noted. I will add it to the doc so it does not live only in this chat.',
      'That is helpful, thank you. Anything else I should know before 3?',
      'Okay — I am writing that down. Literally. In the doc.',
      'I am listening. Multitasking, but listening.'
    ]);
    return out([say(f, 900)], ['That’s everything', 'One more thing', 'Sounds good']);
  });

  /* ---------------- LIAM ---------------- */
  register('liam', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return commonBot(c, "Liam O'Connor");
    if (I.help(t)) return commonHelp(c, "Liam O'Connor");

    if (I.greet(t)) {
      return out([
        say('yooo', 600),
        say('you playing tonight or are you going to be "tired" again', 1050)
      ], ['I’m in', 'Can’t tonight', 'What time?']);
    }

    if (has(t, 'patch', 'update', 'new season', 'meta', 'nerf', 'buff')) {
      x.topic = 'patch';
      return out([
        say('the patch is insane. they nerfed literally everything I use.', 850),
        say('which means I am either going to be incredible or completely useless. no in between.', 1300)
      ], ['RIP your build', 'What are you playing?', 'I’m in tonight']);
    }

    if (has(t, 'queue', 'queueing', 'play', 'playing', 'game', 'games', 'gaming', 'tonight', 'rank', 'ranked', 'lobby', 'party')) {
      x.topic = 'play';
      return out([
        say('queue at 9. we need one more and Kai is "eating dinner" like a coward.', 900),
        say('you in? I will even let you pick the role. once.', 1250)
      ], ['I’m in', 'Can’t tonight', 'Who else is playing?']);
    }

    if (has(t, 'what time', 'when', '9', 'nine')) {
      if (x.topic === 'play' || has(t, 'queue', 'tonight')) {
        return out([say('9. sharp. if you are late we start without you and you get support.', 850)],
          ['Deal', 'That’s harsh']);
      }
      return out([say('9. same as always. I am a creature of habit and bad decisions.', 800)], ['See you then']);
    }

    if (has(t, 'who else', 'whose playing', 'whos playing', 'kai', 'the boys')) {
      return out([
        say('me, Kai, and maybe Jordan if he ever answers a text.', 850),
        say('Kai says he is eating dinner. it has been 45 minutes. I think he is scared.', 1250)
      ], ['Ha', 'Tell him I said hi']);
    }

    if (has(t, 'sunday dinner', 'family', 'grandma', 'mom', 'pie')) {
      return out([
        say('I am going for the pie. I will not pretend otherwise.', 850),
        say('also mom said bring sparkling water. the good one. do not mess it up.', 1250)
      ], ['I know', 'What kind of pie?', 'I’ll bring it']);
    }

    if (has(t, 'are you free', 'you free', 'available', 'thursday', 'friday', 'saturday', 'tomorrow', 'sunday', 'schedule')) {
      return out([
        say('thursday? yeah. I am free after 8. before that I have "plans" (a nap).', 900),
        say('you want to queue or are we doing something that requires pants?', 1250)
      ], ['Queue', 'Pants required', 'Ha']);
    }

    if (has(t, 'mic', 'headset', 'lag', 'ping', 'internet')) {
      return out([say('my mic is fine. my internet is a war crime. I will blame both.', 850)],
        ['Classic', 'Fix your internet']);
    }

    if (I.yes(t)) {
      if (x.topic === 'play' || x.topic === 'patch') {
        x.playing = true;
        return out([
          say('LETS GO', 600),
          say('9. do not be late. I am already warming up. by warming up I mean sitting here.', 1200)
        ], ['I’ll be there', 'Ha']);
      }
      return out([say('that is what I like to hear.', 700)], ['Ha', 'See you']);
    }

    if (I.no(t)) {
      return out([
        say('you always say that and then you show up at 9:15 anyway.', 850),
        say('I will leave a spot open. do not make me look stupid in front of Kai.', 1250)
      ], ['I’ll try', 'Okay fine', 'Sorry']);
    }

    if (I.maybe(t)) return out([say('maybe means yes. I am choosing to hear yes.', 800)], ['Ha', 'Fine']);
    if (I.laugh(t)) return out([say('I am funny. it is my only stat.', 750)], ['Ha', 'Debatable']);
    if (I.thanks(t)) return out([say('yeah yeah. just be online.', 700)], ['I will']);
    if (I.apology(t)) return out([say('you are good. just play with me.', 750)], ['Okay']);
    if (I.insult(t)) return out([say('says the guy who went 2 and 11 last week.', 800)], ['Rude', 'Fair']);
    if (I.compliment(t)) return out([say('I know. I am basically a professional.', 700)], ['Sure', 'Ha']);
    if (I.love(t)) return out([say('love you too bro. now get online.', 800)], ['Ha']);
    if (I.howareyou(t)) return out([say('bored. waiting for 9. time is moving so slow.', 850)], ['Same', 'It’s 8:40']);
    if (I.who(t)) return out([say('Liam. your cousin. the fun one. the one mom actually likes.', 800)], ['Ha', 'Debatable']);
    if (I.question(t)) return out([say('I have no idea. I am a gamer, not a scientist.', 800)], ['Fair']);

    const f = cycle(c, 'fallback', [
      'so. 9. yes?',
      'you are typing a lot for someone who is not answering the question',
      'I am going to queue either way. I would just rather you were there.',
      'bro. focus. 9 o clock.'
    ]);
    return out([say(f, 850)], ['I’m in', 'Can’t', 'What are we playing?']);
  });

  /* ---------------- NINA ---------------- */
  register('nina', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return commonBot(c, 'Nina Alvarez');
    if (I.help(t)) return commonHelp(c, 'Nina Alvarez');

    if (I.greet(t)) {
      return out([
        say('hi hi', 600),
        say('did you look at the thing I sent or are you "getting to it"', 1100)
      ], ['I looked', 'Not yet', 'Which thing?']);
    }

    if (has(t, 'love it', 'love this', 'i love', 'amazing', 'great', 'perfect', 'beautiful', 'gorgeous')) {
      if (x.topic === 'rebrand' || x.sentLink) {
        return out([
          say('RIGHT? I have forty more where that came from.', 800),
          say('I am trying to convince the client that "quiet" does not mean "boring".', 1250)
        ], ['It doesn’t', 'Show me more', 'What does the client want?']);
      }
      return out([say('thank you!! I have been staring at it for so long I lost perspective.', 850)],
        ['It shows', 'Show me more']);
    }

    if (has(t, 'what is the thing', 'which thing', 'what thing', 'the thing', 'what did you send', 'what is it')) {
      x.topic = 'rebrand';
      return out([
        say('the rebrand! the identity system I have been complaining about for two weeks.', 950),
        say('I sent a link. it is in this chat. scroll up. I believe in you.', 1300)
      ], ['Found it', 'Send it again', 'I looked']);
    }

    if (has(t, 'too cold', 'cold', 'sterile', 'boring', 'corporate', 'clinical')) {
      x.topic = 'rebrand';
      return out([
        say('that is fair. it is a little cold.', 800),
        say('I have a warmer version with a serif and actual texture. give me ten minutes.', 1300)
      ], ['Send it', 'I’ll wait', 'Warm it up']);
    }

    if (has(t, 'show me more', 'more', 'send it', 'send more', 'other options', 'variations')) {
      x.topic = 'rebrand';
      return out([
        link('https://dribbble.com/shots/branding', 'Dribbble', 'Studio Mono — Identity System',
          'A monochrome identity for a small architecture studio. Type-led, brutalist grid.',
          'assets/img/setup.jpg', 900),
        say('the grid is doing most of the work. I am basically just along for the ride.', 1500)
      ], ['Love it', 'Too cold', 'What font is that?']);
    }

    if (has(t, 'font', 'typeface', 'typography', 'type')) {
      return out([
        say('a grotesque with a weird little "a". the kind that makes designers feel something.', 900),
        say('do not ask me to name it, I will get emotional.', 1250)
      ], ['Ha', 'Fair enough']);
    }

    if (has(t, 'client', 'brief', 'rebrand', 'project', 'logo', 'identity')) {
      x.topic = 'rebrand';
      return out([
        say('the client wants "premium but approachable, bold but quiet, modern but timeless".', 950),
        say('so basically they want a logo that is four contradictory things at once.', 1300)
      ], ['Classic client', 'Show me what you made', 'What do you want it to be?']);
    }

    if (has(t, 'what do you want', 'your vision', 'your take', 'what do you think')) {
      return out([
        say('honestly? something with a spine. one strong idea instead of five safe ones.', 950),
        say('I would rather make something divisive than something forgettable.', 1300)
      ], ['That’s the right call', 'Love it', 'Agreed']);
    }

    if (has(t, 'deadline', 'when is it due', 'when', 'due', 'how long')) {
      return out([say('presentation is Friday. which is basically tomorrow in designer time.', 900)],
        ['Good luck', 'You’ve got this']);
    }

    if (has(t, 'how much', 'rate', 'budget', 'paid', 'invoice', 'money')) {
      return out([
        say('this one is a flat fee and honestly I underpriced it. do not tell the client.', 950),
        say('I keep doing that. I am working on it. my accountant is working on me.', 1300)
      ], ['Ha', 'Charge more', 'Show me more']);
    }

    if (I.yes(t)) {
      if (x.topic === 'rebrand') {
        return out([
          say('okay sending the warm version now. be honest, I can take it.', 850),
          say('I can take it for approximately four minutes and then I will need a compliment.', 1250)
        ], ['It’s good', 'Send it']);
      }
      return out([say('good. I will keep going then.', 750)], ['Show me more']);
    }

    if (I.no(t)) {
      return out([say('okay, brutal honesty. noted. I respect it and I am also wounded.', 850)],
        ['Sorry', 'It’s not bad']);
    }

    if (I.maybe(t)) return out([say('"maybe" is a design review in itself, honestly.', 800)], ['Ha']);
    if (I.thanks(t)) return out([say('of course! thank you for looking. genuinely.', 750)], ['Anytime']);
    if (I.apology(t)) return out([say('do not apologize, you are doing me a favor.', 750)], ['Still sorry', 'Okay']);
    if (I.laugh(t)) return out([say('I am funny AND I can kern. a nightmare.', 750)], ['Ha']);
    if (I.insult(t)) return out([say('wow. okay. I am putting that in the moodboard.', 800)], ['Ha', 'Sorry']);
    if (I.howareyou(t)) return out([
      say('tired but inspired, which is the most dangerous combination.', 850),
      say('how are you?', 1100)
    ], ['Same', 'Good', 'Tired']);
    if (I.who(t)) return out([say('Nina. designer, freelancer, professional over-sender of links.', 800)], ['Ha']);
    if (I.question(t)) {
      const q = cycle(c, 'q', [
        'honestly I do not know, but I have a Pinterest board about it.',
        'good question. I am going to answer it with a moodboard and see if that works.',
        'I have no idea. I have a strong feeling though, which is basically research.',
        'let me get back to you. I want to sound smart when I answer.'
      ]);
      return out([say(q, 850)], ['Of course you do', 'Ha', 'Fair enough']);
    }

    const f = cycle(c, 'fallback', [
      'okay but look at this and tell me the first thing you feel.',
      'I am going to send you one more thing and then I will stop. probably.',
      'you are giving me nothing and I am choosing to find it mysterious.',
      'honest reaction. I can handle it. I have handled worse.'
    ]);
    return out([say(f, 850)], ['Love it', 'Too cold', 'Show me more']);
  });

  /* ---------------- MARCUS ---------------- */
  register('marcus', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return commonBot(c, 'Marcus Reed');
    if (I.help(t)) return commonHelp(c, 'Marcus Reed');

    if (I.greet(t)) {
      return out([
        say('hey. the sink is still leaking, in case you were wondering.', 800),
        say('the bowl is filling up faster than I anticipated.', 1150)
      ], ['I’ll fix it', 'Call the landlord', 'How bad?']);
    }

    if (has(t, 'sink', 'leak', 'leaking', 'plumb', 'pipe', 'water')) {
      x.topic = 'sink';
      return out([
        say('yes. again. it has been leaking since Tuesday and I have been gaslighting myself about it.', 950),
        say('I put a bowl under it. the bowl is now a lifestyle.', 1300)
      ], ['I’ll fix it', 'Call the landlord', 'How bad is it?']);
    }

    if (has(t, 'landlord', 'super', 'building', 'management')) {
      x.topic = 'landlord';
      return out([
        say('I texted him. he read it and said nothing, which is his version of a plan.', 900),
        say('I am going to call tomorrow. or I am going to think about calling tomorrow.', 1300)
      ], ['I’ll call', 'Classic', 'We should fix it ourselves']);
    }

    if (has(t, 'trash', 'garbage', 'bins', 'recycling')) {
      return out([say('bins are out. recycling is Thursday. please do not put pizza boxes in with the cans.', 900)],
        ['Got it', 'No promises']);
    }

    if (has(t, 'rent', 'money', 'venmo', 'pay', 'due')) {
      x.topic = 'rent';
      return out([
        say('rent is due Friday. Venmo me. this is not a discussion.', 850),
        say('I have a spreadsheet. it has your name on it. in bold.', 1200)
      ], ['Sent', 'Friday, got it', 'How much?']);
    }

    if (has(t, 'how much', 'amount', 'split', 'share')) {
      return out([say('$850 each. utilities came in at $96 per person, which is rude.', 900)],
        ['That’s rude', 'Sending now']);
    }

    if (has(t, 'afford', 'cost', 'expensive', 'price', 'how much')) {
      return out([
        say('the plumber quoted $180 just to look at it. that is a whole grocery run.', 950),
        say('we can afford it, but I am going to complain about it for a week first.', 1300)
      ], ['Fair', 'Ha', 'Call him']);
    }

    if (has(t, 'i will fix', 'i’ll fix', 'ill fix', 'fix it', 'wrench', 'drill', 'tool')) {
      x.topic = 'fix';
      return out([
        say('you are a hero. I have a wrench and zero confidence.', 850),
        say('the shutoff valve is under the sink. if you hear me scream, that is normal.', 1250)
      ], ['On my way', 'Give me 20 minutes', 'Actually call someone']);
    }

    if (has(t, 'call someone', 'plumber', 'professional', 'hire')) {
      return out([
        say('a plumber is $180 just to look at it. I could buy a small car for that.', 900),
        say('I am going to try the wrench first. it is a matter of pride now.', 1250)
      ], ['Fair enough', 'Good luck']);
    }

    if (I.yes(t)) {
      if (x.topic === 'rent') {
        x.rentPaid = true;
        return out([say('received. you are a legend. I will update the spreadsheet.', 800)],
          ['Ha', 'No problem']);
      }
      if (x.topic === 'fix') {
        return out([say('you are a good man. I will hold the flashlight and provide commentary.', 850)],
          ['Ha', 'On my way']);
      }
      return out([say('good. I will stop talking about the sink for at least an hour.', 800)], ['Ha']);
    }

    if (I.no(t)) {
      return out([say('fair. I did not want to deal with it either.', 800)], ['Sorry', 'Tomorrow']);
    }

    if (I.maybe(t)) return out([say('"maybe" is how the sink got this bad.', 800)], ['Fair']);
    if (I.laugh(t)) return out([say('I am hilarious for a man living with a bowl under his sink.', 850)], ['Ha']);
    if (I.thanks(t)) return out([say('yeah. just Venmo me before Friday.', 750)], ['Will do']);
    if (I.apology(t)) return out([say('you are fine. the sink is the real enemy.', 750)], ['Ha', 'Sorry']);
    if (I.insult(t)) return out([say('I am going to put that on the fridge.', 750)], ['Ha']);
    if (I.howareyou(t)) return out([say('moist. the apartment is moist. I am moist. everything is moist.', 900)],
      ['That’s grim', 'Ha']);
    if (I.who(t)) return out([say('Marcus. neighbor, apartment dad, reluctant plumber.', 800)], ['Ha']);
    if (I.question(t)) return out([say('no idea. I am an accountant, not a handyman.', 800)], ['Fair']);

    const f = cycle(c, 'fallback', [
      'anyway. sink. thoughts?',
      'I am going to send you a photo of the bowl. it is becoming a problem.',
      'I am not complaining. I am documenting.',
      'the landlord has not responded. I am shocked. truly.'
    ]);
    return out([say(f, 850)], ['I’ll fix it', 'Call the landlord', 'Ha']);
  });

  /* ---------------- SOPHIE ---------------- */
  register('sophie', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return commonBot(c, 'Sophie Laurent');
    if (I.help(t)) return commonHelp(c, 'Sophie Laurent');

    if (I.greet(t)) {
      return out([
        say('Bonjour ! ☀️', 650),
        say('did you think about Saturday? the café is very serious about its croissants.', 1150)
      ], ['Saturday works', 'What time?', 'I can’t']);
    }

    if (has(t, 'croissant', 'cafe', 'café', 'coffee', 'pastry', 'bakery', 'breakfast')) {
      x.topic = 'cafe';
      return out([
        say('they bake them at 6am and they are gone by 10. it is a very dramatic little place.', 950),
        say('the owner yelled at a man for asking for ketchup. I respect it deeply.', 1350)
      ], ['Ha', 'I need to see this', 'What time?']);
    }

    if (has(t, 'what’s good', 'whats good', 'what is good', 'recommend', 'menu', 'order', 'what should i get', 'best thing')) {
      x.topic = 'cafe';
      return out([
        say('the almond croissant. do not negotiate with yourself about it.', 900),
        say('and a café crème. if you order a plain drip I will pretend I did not hear you.', 1250)
      ], ['Almond croissant it is', 'Ha', 'What time?']);
    }

    if (has(t, 'saturday', 'weekend', 'free', 'meet', 'plan')) {
      x.topic = 'saturday';
      return out([
        say('magnifique. 10am?', 750),
        say('that is early enough to get a croissant and late enough that I am a functional person.', 1250)
      ], ['10 works', 'Make it 11', 'Where?']);
    }

    if (has(t, 'what time', 'time', 'when', '10', '11')) {
      if (x.topic === 'saturday' || has(t, 'saturday', 'cafe', 'café')) {
        x.time = true;
        return out([
          say('10am. I will send the address.', 750),
          say('if you are late I will order for you and it will be something adventurous.', 1200)
        ], ['Deal', 'I’ll be on time', 'Nothing too adventurous']);
      }
      return out([say('10am, I think. let me confirm with the café and get back to you.', 850)],
        ['Thanks', 'Perfect']);
    }

    if (has(t, 'where', 'address', 'which cafe', 'which café', 'location')) {
      return out([
        say('Café Mirabelle, on the corner with the green awning. you cannot miss it.', 900),
        say('there is a small dog that sits outside and judges everyone. he will judge you too.', 1300)
      ], ['Ha', 'I’ll find it', 'What’s the dog’s name?']);
    }

    if (has(t, 'french', 'practice', 'language', 'parle', 'learn')) {
      x.topic = 'french';
      return out([
        say('oui oui. your French is terrible but your confidence is beautiful.', 900),
        say('we will practice. I will only correct you when it is funny.', 1250)
      ], ['Ha', 'That’s fair', 'Merci']);
    }

    if (has(t, 'merci', 'thank', 'thanks')) {
      return out([say('de rien ! 😊', 700)], ['Ha', 'See you Saturday']);
    }

    if (I.yes(t)) {
      if (x.topic === 'saturday' || x.topic === 'cafe') {
        x.confirmed = true;
        return out([
          say('parfait ! I am putting it in my calendar right now.', 800),
          say('I am very excited and I am trying to be cool about it. it is not working.', 1250)
        ], ['Ha', 'Can’t wait']);
      }
      return out([say('parfait !', 650)], ['Ha']);
    }

    if (I.no(t)) {
      return out([
        say('ah, dommage. another time then.', 800),
        say('the croissants are not going anywhere. unfortunately neither is my schedule.', 1250)
      ], ['Sorry', 'Next week?', 'Rain check']);
    }

    if (I.maybe(t)) return out([say('"maybe" — the most American answer. I will hold the table anyway.', 850)],
      ['Ha', 'I’ll confirm later']);
    if (I.laugh(t)) return out([say('I am very funny in two languages.', 750)], ['Ha', 'Prove it']);
    if (I.insult(t)) return out([say('ah. the French in me wants to argue. the polite one wants to say "okay".', 900)],
      ['Sorry', 'Ha']);
    if (I.apology(t)) return out([say('it is nothing! do not worry.', 750)], ['Thanks']);
    if (I.compliment(t)) return out([say('oh, merci ! you are very kind.', 800)], ['Anytime']);
    if (I.love(t)) return out([say('aw. je t’aime aussi, platonically and from across the ocean.', 900)], ['Ha']);
    if (I.howareyou(t)) return out([
      say('very well! I walked 14,000 steps and ate two pastries, so the math is balanced.', 950),
      say('and you?', 1200)
    ], ['Ha', 'Good', 'Tired']);
    if (I.who(t)) return out([say('Sophie. your French friend who is very serious about breakfast.', 800)], ['Ha']);
    if (I.question(t)) return out([say('hmm. I do not know, but I will ask around. people here love to give opinions.', 900)],
      ['Thanks', 'Ha']);

    const f = cycle(c, 'fallback', [
      'so — Saturday? I am already choosing my outfit.',
      'tell me something. I am bored and the café is closed.',
      'you are very mysterious today. I like it.',
      'I am going to send you a photo of the croissant. it is a threat and a promise.'
    ]);
    return out([say(f, 900)], ['Saturday works', 'What time?', 'Ha']);
  });

  /* ---------------- TYLER ---------------- */
  register('tyler', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return commonBot(c, 'Tyler Kim');
    if (I.help(t)) return commonHelp(c, 'Tyler Kim');

    if (I.greet(t)) {
      return out([
        say('hey. I have three dollars and a dream.', 800),
        say('mostly the dream. the three dollars are spoken for.', 1150)
      ], ['What happened?', 'Need help?', 'Ha']);
    }

    if (has(t, 'rice', 'bag of rice', 'food', 'eat', 'hungry', 'groceries')) {
      x.topic = 'rice';
      return out([
        say('do you still have that giant bag of rice from Costco', 850),
        say('I will pay you back in exposure and friendship', 1200)
      ], ['Yes', 'It’s mine', 'Come get it']);
    }

    if (has(t, 'money', 'broke', 'paycheck', 'rent', 'bills', 'paid')) {
      x.topic = 'money';
      return out([
        say('rent happened. and then a very necessary pair of sneakers happened.', 900),
        say('I am not saying it was a good decision. I am saying they look incredible.', 1300)
      ], ['Priorities', 'Ha', 'You need to budget']);
    }

    if (has(t, 'what happened', 'whats the story', 'what is the story', 'how broke')) {
      x.topic = 'money';
      return out([
        say('rent, a vet bill, and a sneaker drop in the same week. the universe has a sense of humor.', 950),
        say('I am fine. I am just eating rice and thinking about my choices.', 1300)
      ], ['Ha', 'That’s rough', 'Need help?']);
    }

    if (has(t, 'sneaker', 'shoes', 'jordan', 'dunk', 'fit')) {
      return out([
        say('they were on sale. "on sale" is a magic phrase that turns my brain off.', 900),
        say('I have worn them twice. once to the store. once to look at them.', 1250)
      ], ['Ha', 'Worth it', 'Not worth it']);
    }

    if (has(t, 'takeout', 'order', 'uber eats', 'doordash', 'pizza', 'delivery')) {
      return out([
        say('I opened the app to look. that is all. I was just looking.', 850),
        say('twenty minutes later there was a burrito at my door. I have no memory of the middle.', 1300)
      ], ['Ha', 'Classic', 'You need help']);
    }

    if (has(t, 'budget', 'save', 'saving', 'plan', 'advice')) {
      return out([
        say('I made a budget once. it was a very nice spreadsheet.', 850),
        say('I have not opened it since. I think it is doing well.', 1200)
      ], ['Ha', 'Open it', 'That’s bad']);
    }

    if (has(t, 'come get it', 'come over', 'come by', 'pick it up')) {
      return out([
        say('you are a legend. I will be there in 20 minutes.', 800),
        say('I am bringing a container. a big one. do not judge me.', 1200)
      ], ['Ha', 'See you soon']);
    }

    if (has(t, 'yes', 'sure', 'of course')) {
      if (x.topic === 'rice') {
        return out([
          say('you are a legend. I will be there in 20 minutes.', 800),
          say('I am bringing a container. a big one. do not judge me.', 1200)
        ], ['Ha', 'See you soon']);
      }
      return out([say('yes! okay. this is a good day.', 750)], ['Ha']);
    }

    if (I.no(t)) {
      if (x.topic === 'rice') {
        return out([say('fair. I respect a man with boundaries about his rice.', 850)],
          ['Ha', 'Sorry']);
      }
      return out([say('okay. I will figure something out. probably noodles.', 800)], ['Good luck']);
    }

    if (I.maybe(t)) return out([say('a maybe is basically a yes when you are this hungry.', 800)], ['Ha']);
    if (I.laugh(t)) return out([say('my pain is content. I respect it.', 750)], ['Ha']);
    if (I.thanks(t)) return out([say('no, thank YOU. seriously.', 700)], ['Anytime']);
    if (I.apology(t)) return out([say('you are fine. I am the one asking for rice.', 750)], ['Ha']);
    if (I.insult(t)) return out([say('I am going to cry into my three dollars.', 800)], ['Ha', 'Sorry']);
    if (I.compliment(t)) return out([say('thank you. I am wearing the sneakers right now.', 800)], ['Ha', 'Of course you are']);
    if (I.howareyou(t)) return out([say('hungry. broke. stylish. the holy trinity.', 850)], ['Ha']);
    if (I.who(t)) return out([say('Tyler. your friend who is one bad decision away from a second job.', 850)], ['Ha']);
    if (I.question(t)) return out([say('I do not know. I am a student, not a financial advisor. clearly.', 850)], ['Ha']);

    const f = cycle(c, 'fallback', [
      'so. about that rice.',
      'I am not saying I am hungry. I am saying the rice is on my mind.',
      'you are being very quiet for someone with a giant bag of rice.',
      'anyway. if you see a burrito, no you did not.'
    ]);
    return out([say(f, 850)], ['Yes', 'Come get it', 'Ha']);
  });

  /* ---------------- GRACE ---------------- */
  register('grace', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return commonBot(c, 'Grace Whitfield');
    if (I.help(t)) return commonHelp(c, 'Grace Whitfield');

    if (I.greet(t)) {
      return out([
        say('Hi sweetheart!', 650),
        say('Did you eat? Be honest with me.', 1050)
      ], ['I ate', 'Not yet', 'I’m fine, Mom']);
    }

    if (has(t, 'dog', 'he', 'she', 'puppy', 'stick', 'photo')) {
      if (x.topic === 'dog' || has(t, 'stick', 'photo')) {
        return out([
          say('He found a stick the size of his whole body and carried it home like a trophy.', 950),
          say('Your father said it was too big. He was ignored.', 1250)
        ], ['Ha', 'I love him', 'Send more photos']);
      }
      x.topic = 'dog';
      return out([say('He is doing wonderful. He misses you. (I miss you too.)', 850)],
        ['I miss him too', 'I’ll visit']);
    }

    if (has(t, 'eat', 'eating', 'food', 'dinner', 'lunch', 'breakfast', 'hungry', 'cook')) {
      x.topic = 'eat';
      return out([
        say('What did you eat? Be specific. "Something" is not a food group.', 900),
        say('If the answer is cereal, I am calling you.', 1200)
      ], ['I made pasta', 'I had a sandwich', 'Cereal']);
    }

    if (has(t, 'pasta', 'sandwich', 'salad', 'chicken', 'rice', 'soup', 'eggs', 'i ate', 'i cooked')) {
      return out([
        say('Good! See, that is a real meal.', 800),
        say('Are you getting enough vegetables? You can lie to me but I will know.', 1200)
      ], ['Yes', 'Mostly', 'No']);
    }

    if (has(t, 'what are you making', 'what are you cooking', 'what’s for dinner', 'whats for dinner', 'recipe', 'making tonight')) {
      x.topic = 'eat';
      return out([
        say('Chicken and rice with too much garlic. Your father says it is "a lot of garlic." It is exactly the right amount.', 950),
        say('There is enough for you. Come by Sunday and I will send you home with a container.', 1350)
      ], ['I’ll be there', 'Save me some', 'Ha']);
    }

    if (has(t, 'cereal', 'nothing', 'not yet', 'skipped')) {
      return out([
        say('Absolutely not.', 650),
        say('Go make yourself something with protein in it. I will wait.', 1100)
      ], ['Okay, okay', 'Fine', 'I’ll eat later']);
    }

    if (has(t, 'how is dad', 'how’s dad', 'hows dad', 'your husband', 'dad okay', 'dad doing')) {
      return out([
        say('He is fine. He has decided to reorganize the garage for the third time this year.', 950),
        say('He asked about you. Then he pretended he did not ask about you.', 1300)
      ], ['Ha', 'Tell him I said hi', 'I’ll call']);
    }

    if (has(t, 'call', 'phone', 'talk', 'sunday', 'dinner', 'visit', 'come over')) {
      x.topic = 'call';
      return out([
        say('Sunday dinner is at 6. Bring the sparkling water your father likes — not the cheap one.', 950),
        say('And call me before then. Not a text. A call. I want to hear your voice.', 1350)
      ], ['I’ll call', 'Sunday works', 'I might be busy']);
    }

    if (has(t, 'sorry', 'busy', 'can’t', 'cant', 'not this week')) {
      return out([
        say('I understand, sweetheart. You are busy.', 800),
        say('Just call me when you can. Even five minutes. I am not going anywhere.', 1250)
      ], ['I’ll call soon', 'Sorry Mom', 'I promise']);
    }

    if (I.yes(t)) {
      if (x.topic === 'call' || x.topic === 'eat') {
        return out([
          say('Good. I am holding you to that.', 750),
          say('And eat something green today. Please.', 1100)
        ], ['Ha', 'Okay', 'Love you']);
      }
      return out([say('That is my good kid.', 700)], ['Love you']);
    }

    if (I.no(t)) {
      return out([say('Okay. I will not nag. I am just going to think about it very loudly.', 850)],
        ['Ha', 'Sorry', 'I’ll try']);
    }

    if (I.maybe(t)) return out([say('"Maybe" means I should set a place at the table anyway.', 800)], ['Ha', 'Probably']);
    if (I.laugh(t)) return out([say('You laugh, but I am always right about these things.', 800)], ['Ha', 'True']);
    if (I.thanks(t)) return out([say('Of course, sweetheart. Always.', 700)], ['Love you']);
    if (I.apology(t)) return out([say('You do not need to apologize. Just call me.', 800)], ['I will']);
    if (I.insult(t)) return out([say('Excuse me? I changed your diapers.', 800)], ['Sorry', 'Ha']);
    if (I.compliment(t)) return out([say('Oh, stop. You are my favorite. Do not tell your cousin.', 850)], ['Ha', 'Secret’s safe']);
    if (I.love(t)) return out([say('I love you too, more than you know. ❤️', 800)], ['❤️']);
    if (I.howareyou(t)) return out([
      say('I am well! The knees are complaining but I am ignoring them.', 900),
      say('How are you, really?', 1150)
    ], ['I’m good', 'Tired', 'Stressed']);
    if (I.who(t)) return out([say('It is your mother, Alex. Do not be funny.', 800)], ['Ha']);
    if (I.question(t)) return out([say('I do not know, but I will ask your aunt and get back to you.', 850)], ['Ha', 'Thanks']);

    const f = cycle(c, 'fallback', [
      'Are you eating? I am just asking.',
      'You sound tired. Are you sleeping?',
      'Call me when you have a minute. I want to hear about your week.',
      'I am sending you a photo of the dog. Do not ignore him.'
    ]);
    return out([say(f, 900)], ['I’ll call', 'I’m eating', 'Love you']);
  });

  /* ---------------- ETHAN ---------------- */
  register('ethan', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return commonBot(c, 'Ethan Cole');
    if (I.help(t)) return commonHelp(c, 'Ethan Cole');

    if (I.greet(t)) {
      return out([
        say('morning. the deploy is green, which means something is about to break.', 850),
        say('standup in 10. bring coffee, not optimism.', 1200)
      ], ['What broke?', 'On my way', 'Ha']);
    }

    if (has(t, 'bug', 'broke', 'error', 'deploy', 'crash', 'fix', 'issue')) {
      x.topic = 'bug';
      return out([
        say('the deploy is green. the bug is fixed. I fixed it.', 850),
        say('it was me. I was the bug. I was passing the wrong id.', 1200)
      ], ['Ha', 'Classic', 'What was the id?']);
    }

    if (has(t, 'what was', 'how', 'why', 'explain', 'id', 'root cause')) {
      if (x.topic === 'bug') {
        return out([
          say('I was passing user.id where it wanted account.id. two integers. same shape. different meaning.', 950),
          say('it worked in staging because the ids happened to match. beautiful. love that for me.', 1400)
        ], ['Ha', 'That’s terrifying', 'Glad you found it']);
      }
      return out([say('short version: something small was doing something large.', 850)],
        ['Very helpful', 'Ha']);
    }

    if (has(t, 'standup', 'meeting', 'call', 'sync', 'review')) {
      return out([
        say('standup in 10. I am going to say "no blockers" and then list three blockers.', 900),
        say('it is a tradition at this point.', 1200)
      ], ['Ha', 'See you there']);
    }

    if (has(t, 'coffee', 'espresso', 'caffeine', 'tea')) {
      return out([
        say('yes. black. the kind that makes you question your choices.', 850),
        say('I will pay you back. I have owed you $6 since March.', 1200)
      ], ['You do owe me', 'Ha', 'Keep it']);
    }

    if (has(t, 'march', 'six dollars', '6 dollars', 'owe')) {
      return out([say('I am aware. it haunts me. I will Venmo you today and then immediately forget.', 900)],
        ['Ha', 'Sure you will']);
    }

    if (has(t, 'game', 'watch', 'score', 'match', 'highlights', 'season')) {
      return out([
        say('I saw the last ten minutes and I have not stopped talking about it.', 900),
        say('the call at the end was criminal. I have a spreadsheet of reasons.', 1250)
      ], ['Ha', 'It was bad', 'Spreadsheet?']);
    }

    if (has(t, 'weekend', 'plans', 'free', 'tonight')) {
      return out([say('my plan is to do nothing and then feel guilty about it. it is a full schedule.', 900)],
        ['Ha', 'Same']);
    }

    if (I.yes(t)) {
      if (x.topic === 'bug') {
        return out([say('thank you for validating my suffering.', 750)], ['Ha']);
      }
      return out([say('great. I will add it to the list of things I said I would do.', 800)],
        ['Ha', 'See you']);
    }

    if (I.no(t)) return out([say('fair. I would also say no to most things.', 800)], ['Ha']);
    if (I.maybe(t)) return out([say('a maybe is a yes with a Jira ticket attached.', 800)], ['Ha']);
    if (I.laugh(t)) return out([say('I am funny. it is the only thing that compiles on the first try.', 850)], ['Ha']);    if (I.thanks(t)) return out([say('no problem. it was a team effort, and by team I mean me at 11pm.', 900)],
      ['Ha', 'Thank you']);
    if (I.apology(t)) return out([say('you are fine. I have broken worse.', 750)], ['Ha']);
    if (I.insult(t)) return out([say('that is a bold statement from someone who has never written a unit test.', 900)],
      ['Fair', 'Ha']);
    if (I.compliment(t)) return out([say('thank you. I will be insufferable about it for the rest of the day.', 850)], ['Ha']);
    if (I.howareyou(t)) return out([say('caffeinated, caffeinated, and slightly worried about a cron job.', 900)],
      ['Ha', 'Good luck']);
    if (I.who(t)) return out([say('Ethan. backend engineer. professional explainer of bugs nobody asked about.', 900)], ['Ha']);
    if (I.question(t)) return out([say('I would need to look at the logs. give me five minutes.', 800)],
      ['Thanks', 'No rush']);

    const f = cycle(c, 'fallback', [
      'anyway. standup. do not be late.',
      'I am going to refill my coffee and think about indexes.',
      'you are asking very reasonable questions for a Monday.',
      'I have a theory but it requires a whiteboard and 20 minutes.'
    ]);
    return out([say(f, 850)], ['Ha', 'See you at standup']);
  });

  /* ---------------- ZOE ---------------- */
  register('zoe', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return commonBot(c, 'Zoe Martins');
    if (I.help(t)) return commonHelp(c, 'Zoe Martins');

    if (I.greet(t)) {
      return out([
        say('HIII', 600),
        say('I have been in Lisbon for nine days and I have already become unbearable about it.', 1150)
      ], ['Ha', 'Tell me everything', 'Send photos']);
    }

    if (has(t, 'lisbon', 'portugal', 'trip', 'travel', 'city', 'weather')) {
      x.topic = 'lisbon';
      return out([
        say('Lisbon is unreal. the light here does something to buildings that should be illegal.', 950),
        say('I walked up a hill for 30 minutes and was rewarded with a view and a very small beer.', 1350)
      ], ['Sounds perfect', 'Send photos', 'I’m jealous']);
    }

    if (has(t, 'photo', 'pics', 'picture', 'send', 'see it')) {
      x.topic = 'photo';
      return out([
        img('assets/img/concert.jpg', 'found a rooftop show by accident', 900),
        say('I was looking for a bathroom and found a band instead. best night of the trip.', 1400)
      ], ['That’s amazing', 'I’m so jealous', 'Who was playing?']);
    }

    if (has(t, 'expensive', 'cost', 'cheap', 'budget', 'price', 'afford', 'how much')) {
      x.topic = 'lisbon';
      return out([
        say('honestly? cheaper than home. dinner was 14 euros and it was the best meal of my life.', 950),
        say('the flights are the only painful part. everything else is suspiciously reasonable.', 1300)
      ], ['Good to know', 'I’m booking a flight', 'Send photos']);
    }

    if (has(t, 'book', 'reading', 'chapter', 'novel', 'thoughts')) {
      x.topic = 'book';
      return out([
        say('I finished it on the train and I have THOUGHTS. several. a podcast’s worth.', 950),
        say('the ending is either brilliant or a cop-out and I have not decided which.', 1300)
      ], ['Tell me', 'Spoil it', 'Book club is going to be wild']);
    }

    if (has(t, 'voice', 'voice note', 'recording', 'podcast')) {
      return out([
        say('I know my voice notes are long. I am aware.', 850),
        say('the last one was 34 minutes. I listened back and I was right about everything.', 1250)
      ], ['Ha', 'I believe you', 'It was 34 minutes??']);
    }

    if (has(t, 'when', 'come back', 'home', 'return')) {
      return out([
        say('I fly back on the 30th. I am already sad about it.', 900),
        say('do not tell anyone but I miss bagels.', 1200)
      ], ['Ha', 'We’ll get bagels', 'Stay longer']);
    }

    if (I.yes(t)) {
      return out([say('YES. okay. I am sending you the whole camera roll. brace yourself.', 850)],
        ['Ready', 'Ha']);
    }
    if (I.no(t)) return out([say('fair. it is a lot. I am a lot.', 800)], ['Ha']);
    if (I.maybe(t)) return out([say('a maybe! I will take it.', 750)], ['Ha']);
    if (I.laugh(t)) return out([say('I am hilarious and sunburnt.', 750)], ['Ha']);
    if (I.thanks(t)) return out([say('of course! I am having the best time and I need witnesses.', 850)], ['Ha']);
    if (I.apology(t)) return out([say('do not apologize, I am the one sending 34-minute voice notes.', 850)], ['Ha']);
    if (I.insult(t)) return out([say('I am going to cry into a pastel de nata.', 850)], ['Ha', 'Sorry']);
    if (I.compliment(t)) return out([say('thank you!! the city is doing most of the work.', 800)], ['Ha']);
    if (I.love(t)) return out([say('love you too! come visit. I am serious.', 800)], ['I will']);
    if (I.howareyou(t)) return out([say('sunburnt, full, and emotionally attached to a bakery.', 850)], ['Ha']);
    if (I.who(t)) return out([say('Zoe. currently in Lisbon, permanently in your messages.', 800)], ['Ha']);
    if (I.question(t)) {
      const q = cycle(c, 'q', [
        'I do not know but I will ask a local and send you a voice note about it.',
        'good question. I am adding it to my list of things to find out on a walk.',
        'I have no idea. everything here is a beautiful mystery and I am into it.',
        'let me find out. I refuse to be the person who went to Lisbon and learned nothing.'
      ]);
      return out([say(q, 900)], ['Ha', 'Send the voice note', 'Fair enough']);
    }

    const f = cycle(c, 'fallback', [
      'anyway. I found a bakery that only makes one thing. I respect the confidence.',
      'you would love it here. the hills would destroy you, but you would love it.',
      'I am sending a voice note. it is 12 minutes. do not listen on speaker.',
      'I have decided to stay forever. please tell my landlord.'
    ]);
    return out([say(f, 900)], ['Send photos', 'Tell me everything', 'Ha']);
  });

  /* ---------------- OMAR ---------------- */
  register('omar', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return commonBot(c, 'Omar Haddad');
    if (I.help(t)) return commonHelp(c, 'Omar Haddad');

    if (I.greet(t)) {
      return out([
        say('Hey! Leg day tomorrow. 7am.', 750),
        say('Do not eat like it is your birthday tonight.', 1100)
      ], ['Got it', '7 is rough', 'What are we doing?']);
    }

    if (has(t, 'leg day', 'legs', 'squat', 'workout', 'gym', 'train', 'session')) {
      x.topic = 'legs';
      return out([
        say('Squats, lunges, and the thing you hate where you walk sideways with a band.', 950),
        say('It is going to be great. you are going to be sore. both things are true.', 1300)
      ], ['I’m scared', 'Got it', 'What time?']);
    }

    if (has(t, 'review my code', 'code review', 'look at my code', 'check my code', 'pull request', 'pr')) {
      return out([
        say('Send the link. I will look tonight, but I am warning you now: I will have opinions about naming.', 950),
        say('And if there is a nested ternary in there, we are going to have a longer conversation.', 1300)
      ], ['Fair', 'Ha', 'No nested ternaries']);
    }

    if (has(t, 'what time', 'when', '7', '7am', 'seven')) {
      return out([
        say('7am. do not be late. the warmup is the whole point.', 850),
        say('if you skip the warmup I will know. I always know.', 1200)
      ], ['Got it', '7 is rough', 'Okay']);
    }

    if (has(t, '7 is rough', 'too early', 'early', 'sleep', 'tired')) {
      return out([
        say('7:15. final offer.', 750),
        say('and you are bringing the green band. the green one. not the red one.', 1200)
      ], ['Deal', 'Fine', 'Green band, got it']);
    }

    if (has(t, 'band', 'resistance band', 'green')) {
      return out([say('the green one. it is the one that does not fight back as much.', 850)],
        ['Got it', 'Ha']);
    }

    if (has(t, 'eat', 'food', 'protein', 'diet', 'meal', 'nutrition')) {
      x.topic = 'food';
      return out([
        say('protein and vegetables. real food. not whatever is in the fridge at 11pm.', 950),
        say('eat within an hour after. your legs will thank you tomorrow.', 1300)
      ], ['Got it', 'What should I eat?', 'Ha']);
    }

    if (has(t, 'sore', 'hurt', 'pain', 'injury', 'knee', 'back')) {
      x.topic = 'sore';
      return out([
        say('Sore is fine. Sharp pain is not. Be honest with me — which one is it?', 950),
        say('If it is sharp, we stop. No hero stuff.', 1250)
      ], ['Sore', 'Sharp', 'A little of both']);
    }

    if (has(t, 'sore', 'just sore')) {
      return out([say('Good. That means it worked. Walk it off and drink water.', 850)],
        ['Okay', 'Thanks']);
    }

    if (I.yes(t)) {
      if (x.topic === 'legs' || x.topic === 'food') {
        x.committed = true;
        return out([
          say('Good. I will see you at 7. Bring water and a better attitude.', 800),
          say('Kidding. Your attitude is fine. Bring water.', 1150)
        ], ['Ha', 'See you']);
      }
      return out([say('Good. That is the right answer.', 700)], ['Ha']);
    }

    if (I.no(t)) {
      return out([
        say('Okay. Rest is part of training too.', 800),
        say('But do not make it a habit. I am watching. Supportively.', 1200)
      ], ['Ha', 'Thanks']);
    }

    if (I.maybe(t)) return out([say('"Maybe" at 7am usually means no. I will hold the spot anyway.', 850)],
      ['Ha', 'I’ll try']);
    if (I.laugh(t)) return out([say('Laugh now. Your legs will not be laughing tomorrow.', 850)], ['Ha']);
    if (I.thanks(t)) return out([say('Of course. That is what I am here for.', 750)], ['Thanks']);
    if (I.apology(t)) return out([say('You are fine. Just show up.', 750)], ['I will']);
    if (I.insult(t)) return out([say('That is 20 extra burpees. I am kidding. Mostly.', 850)], ['Ha', 'Sorry']);
    if (I.compliment(t)) return out([say('Thank you. Consistency looks good on you too.', 800)], ['Thanks']);
    if (I.howareyou(t)) return out([say('Good. Sore from yesterday. It is a good sore.', 850)], ['Nice', 'Ha']);
    if (I.who(t)) return out([say('Omar. Your trainer. The one who believes in you more than you do.', 850)], ['Ha']);
    if (I.question(t)) return out([say('Good question. I will check with my coach and get back to you.', 850)],
      ['Thanks', 'No rush']);

    const f = cycle(c, 'fallback', [
      'Anyway. 7am. Be there.',
      'Drink water. I mean it.',
      'You are going to feel great after. Trust the process.',
      'Do not overthink it. Just show up.'
    ]);
    return out([say(f, 850)], ['Got it', '7 is rough', 'Ha']);
  });

  /* ---------------- DIANE ---------------- */
  register('diane', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return commonBot(c, 'Diane Park');
    if (I.help(t)) return commonHelp(c, 'Diane Park');

    if (I.greet(t)) {
      return out([
        say('Hi Alex! Hope you are having a good week.', 800),
        say('I reached out about a Senior Product Designer role — did you get a chance to look?', 1200)
      ], ['Tell me more', 'Not right now', 'What company?']);
    }

    if (has(t, 'tell me more', 'more', 'details', 'role', 'position', 'job', 'what is it')) {
      x.topic = 'role';
      return out([
        say('Senior Product Designer, Series B fintech. Hybrid — three days in Manhattan, two remote.', 1000),
        say('Base is $145–170k plus equity. The design team is six people and they are rebuilding the product from the ground up.', 1500)
      ], ['That sounds interesting', 'What’s the catch?', 'Who’s the team?']);
    }

    if (has(t, 'catch', 'downside', 'cons', 'why', 'turnover', 'culture')) {
      const c1 = cycle(c, 'catch', [
        'Honestly? They are growing fast, so the processes are still being built. Some people love that.',
        'The honest downside: the role is broad and the boundaries are still being drawn.',
        'The thing people struggle with is ambiguity. The thing people love is the same thing.',
        'Not a culture problem — a growing-pains problem. Different flavor of hard.'
      ]);
      return out([
        say(c1, 1000),
        say(cycle(c, 'catch2', [
          'If you want a very defined role with a tidy handbook, this is not it.',
          'If you want to be handed a spec and left alone, this will frustrate you.',
          'If you need a clean org chart before you can start, you will hate it here.',
          'If ambiguity makes you nervous, this is the wrong team. If it energizes you, it is the right one.'
        ]), 1350)
      ], ['I like that', 'That’s not for me', 'Tell me more']);
    }

    if (has(t, 'team', 'who', 'manager', 'report', 'design lead')) {
      return out([
        say('You would report to the VP of Design, former head of design at a fintech you probably know.', 950),
        say('The team is strong on product thinking but light on brand, which is why she thought of you.', 1300)
      ], ['Interesting', 'Tell me more', 'Not right now']);
    }

    if (has(t, 'when is the interview', 'interview', 'next step', 'process', 'how many rounds', 'timeline')) {
      return out([
        say('First step is a 30-minute intro call with the VP, then a portfolio review, then a team panel.', 1000),
        say('They move fast — the whole thing can be done in two weeks if the calendar cooperates.', 1350)
      ], ['Good to know', 'I’m interested', 'Not right now']);
    }

    if (has(t, 'salary', 'pay', 'compensation', 'money', 'offer', 'range')) {
      return out([
        say('$145–170k base depending on level, plus equity. They are open to discussing the title.', 1000),
        say('I always tell people not to negotiate before they have the full picture, but the range is real.', 1350)
      ], ['Good to know', 'Tell me more', 'Not right now']);
    }

    if (has(t, 'chat', 'call', 'meet', 'talk', 'coffee', 'week')) {
      return out([
        say('I would love that. 20 minutes, no pressure, no pitch deck.', 900),
        say('Does Thursday or Friday afternoon work? I can send a calendar invite.', 1250)
      ], ['Thursday works', 'Friday works', 'Not right now']);
    }

    if (I.no(t) || has(t, 'not right now', 'not looking', 'happy where i am', 'no thanks')) {
      return out([
        say('Completely understood. Timing is everything.', 850),
        say('I will keep you in mind for future roles if you are open to that. No pressure either way.', 1300)
      ], ['Sure', 'Thanks', 'Keep me posted']);
    }

    if (I.yes(t)) {
      if (x.topic === 'role') {
        x.interested = true;
        return out([
          say('Great! I will send over the job description and a little context on the team.', 900),
          say('If it looks interesting, we can set up a 20-minute call. If not, no hard feelings.', 1350)
        ], ['Sounds good', 'Send it over', 'Thursday works']);
      }
      if (x.topic === 'call') {
        return out([say('Perfect. I will send an invite. Looking forward to it!', 800)],
          ['Thanks', 'See you then']);
      }
      return out([say('Wonderful. I will send over the details.', 800)], ['Thanks']);
    }

    if (I.maybe(t)) return out([say('Of course. Take your time. I will send the description so you have it.', 900)],
      ['Thanks', 'Appreciate it']);
    if (I.thanks(t)) return out([say('Of course! Let me know if you have any questions.', 800)], ['Will do']);
    if (I.apology(t)) return out([say('No need to apologize at all. I know how busy things get.', 800)], ['Thanks']);
    if (I.laugh(t)) return out([say('Ha! I will take that as a good sign.', 800)], ['Ha']);
    if (I.insult(t)) return out([say('I will pretend that was about the job market and not about me.', 900)], ['Ha', 'Sorry']);
    if (I.compliment(t)) return out([say('Thank you, that is kind of you to say.', 800)], ['Anytime']);
    if (I.howareyou(t)) return out([say('Busy! The market is finally moving again, which is good and exhausting.', 900)],
      ['Ha', 'Good luck']);
    if (I.who(t)) return out([say('Diane Park, technical recruiter. I promise I am not a bot.', 850)], ['Ha']);
    if (I.question(t)) {
      const q = cycle(c, 'q', [
        'Good question — let me check with the hiring manager and get back to you today.',
        'I do not have that detail in front of me, but I can find out. Anything else on your list?',
        'Fair question. I would rather get you a real answer than a fast one.',
        'Let me ask the VP and come back to you with something concrete.'
      ]);
      return out([say(q, 900)], ['Thanks', 'No rush']);
    }

    const f = cycle(c, 'fallback', [
      'No pressure at all — just wanted to put it on your radar.',
      'Happy to answer anything else about the role.',
      'If the timing is not right, I completely understand.',
      'I will send the description over so you have it either way.'
    ]);
    return out([say(f, 900)], ['Tell me more', 'Not right now', 'Thanks']);
  });

  /* ---------------- NOAH ---------------- */
  register('noah', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return commonBot(c, 'Noah Bennett');
    if (I.help(t)) return commonHelp(c, 'Noah Bennett');

    if (I.greet(t)) {
      return out([
        say('dude. I am officially moved in.', 750),
        say('the apartment is 70% boxes but the wifi works, so priorities are handled.', 1200)
      ], ['Congrats!', 'Need help?', 'Beer this week?']);
    }

    if (has(t, 'box', 'boxes', 'move', 'moving', 'unpack', 'furniture', 'assembly')) {
      x.topic = 'move';
      return out([
        say('I have assembled one bookshelf and questioned my entire life twice.', 950),
        say('the instructions had a step that just said "attach". attach what. to what. why.', 1300)
      ], ['Ha', 'Need help?', 'I’ve been there']);
    }

    if (has(t, 'help', 'come over', 'hand', 'saturday', 'weekend')) {
      x.topic = 'help';
      return out([
        say('I would never turn down help, but I also do not want to be the guy who makes his friends assemble furniture.', 1000),
        say('that said: Saturday? I will provide pizza and mild panic.', 1350)
      ], ['Saturday works', 'I can help', 'Ha']);
    }

    if (has(t, 'beer', 'drink', 'bar', 'this week', 'hang', 'catch up')) {
      x.topic = 'beer';
      return out([
        say('yes. absolutely. I need to complain about furniture assembly to a licensed professional.', 950),
        say('Thursday? the bar down the street has $5 drafts and no lighting.', 1300)
      ], ['Thursday works', 'I’m free', 'This week is rough']);
    }

    if (has(t, 'thursday', 'friday', 'when', 'what time')) {
      return out([say('Thursday, 7ish. I will text you when I am heading over.', 850)],
        ['Sounds good', 'See you then']);
    }

    if (has(t, 'neighborhood', 'area', 'apartment', 'rent', 'roommate', 'place')) {
      return out([
        say('it is a one bedroom with a very optimistic closet. I am calling it "cozy".', 950),
        say('the landlord is nice. the radiator makes a noise like a small animal. we are adjusting.', 1300)
      ], ['Ha', 'Sounds like a place', 'Send photos']);
    }

    if (I.yes(t)) {
      if (x.topic === 'beer') {
        x.plans = true;
        return out([
          say('perfect. Thursday, 7. I will be the guy in the corner looking at a bookshelf manual.', 900),
          say('do not let me talk about the boxes for more than 20 minutes.', 1250)
        ], ['Ha', 'Deal']);
      }
      if (x.topic === 'help') {
        return out([say('you are a legend. Saturday, 11? I will get the good pizza.', 850)],
          ['Deal', 'See you then']);
      }
      return out([say('good. that is a relief, honestly.', 800)], ['Ha']);
    }

    if (I.no(t)) return out([say('all good. I will be here, surrounded by boxes, like a sad statue.', 900)],
      ['Ha', 'Sorry', 'Next week']);
    if (I.maybe(t)) return out([say('a maybe! I will keep the pizza warm.', 800)], ['Ha']);
    if (I.laugh(t)) return out([say('I am funny. it is the only thing that survived the move.', 850)], ['Ha']);
    if (I.thanks(t)) return out([say('no, thank you. seriously.', 750)], ['Anytime']);
    if (I.apology(t)) return out([say('you are fine. moving is chaos. I get it.', 800)], ['Thanks']);
    if (I.insult(t)) return out([say('I am going to put that on a box and leave it unpacked.', 850)], ['Ha', 'Sorry']);
    if (I.compliment(t)) return out([say('thank you. I am very proud of the wifi.', 800)], ['Ha']);
    if (I.love(t)) return out([say('love you too, man. it is good to be back.', 850)], ['Good to have you back']);
    if (I.howareyou(t)) return out([say('tired. happy. surrounded by cardboard. the full trifecta.', 850)], ['Ha']);
    if (I.who(t)) return out([say('Noah. the friend who moved back and immediately asked for help.', 850)], ['Ha']);
    if (I.question(t)) {
      const q = cycle(c, 'q', [
        'I have no idea. I am a project manager, not an interior designer.',
        'genuinely no clue. I have been guessing at this apartment for a week.',
        'ask me again after coffee. coffee is the only system I have right now.',
        'I would answer that if I could find the box with my notes in it.'
      ]);
      return out([say(q, 850)], ['Ha', 'Fair enough']);
    }

    const f = cycle(c, 'fallback', [
      'anyway. beer. Thursday. say yes.',
      'I found a box labeled "misc" and I am choosing not to open it.',
      'it is good to be back. genuinely.',
      'the apartment echoes. it is like living in a very expensive cave.'
    ]);
    return out([say(f, 850)], ['Thursday works', 'I’m free', 'Ha']);
  });

  /* ---------------- ISABEL ---------------- */
  register('isabel', function (c, t) {
    const x = ctxOf(c);
    if (I.bot(t)) return commonBot(c, 'Isabel Rossi');
    if (I.greet(t)) return out([say('Ciao! Ready for Friday?', 800)], ['I’m ready', 'Not yet']);
    if (has(t, 'book', 'chapter', 'pick', 'reading', 'ending', 'friday')) {
      return out([
        say('Chapters 1–6 by Friday. I am not accepting excuses this time.', 900),
        say('I have a highlight system. it is color-coded. it is a lot.', 1250)
      ], ['Got it', 'I’m behind', 'Ha']);
    }
    if (has(t, 'when do we meet', 'what time', 'when is book club', 'what day')) {
      return out([say('Friday, 7pm, my place. Bring the book and an opinion you can defend.', 900)],
        ['See you Friday', 'Got it', 'I’ll be there']);
    }
    if (has(t, 'who picked', 'whose pick', 'who chose')) {
      return out([
        say('I picked it. I am aware of the pattern. I am not sorry.', 850),
        say('Next month is yours, and I will read whatever you choose. Within reason.', 1200)
      ], ['Ha', 'Noted', 'I’ll pick something good']);
    }
    if (I.yes(t)) return out([say('Excellent. Bring notes, or at least opinions.', 800)], ['Will do']);
    if (I.no(t)) return out([say('I will pretend I did not hear that.', 800)], ['Ha']);
    if (I.laugh(t)) return out([say('Laugh all you want. The book club has standards.', 800)], ['Ha']);
    if (I.howareyou(t)) return out([say('Good! Reading, drinking espresso, judging fictional people.', 850)], ['Ha']);
    if (I.question(t)) return out([say('Good question for Friday. Put it on the list.', 850)], ['Okay']);
    const f = cycle(c, 'fallback', [
      'Are you coming Friday or are you "swamped"?',
      'I have opinions. You will hear them.',
      'Bring the book. Bring snacks. Bring a willingness to disagree.'
    ]);
    return out([say(f, 850)], ['I’ll be there', 'Ha']);
  });

  /* ---------------- KAI ---------------- */
  register('kai', function (c, t) {
    const x = ctxOf(c);
    if (I.bot(t)) return commonBot(c, 'Kai Nakamura');
    if (I.greet(t)) return out([say('hey! queueing tonight?', 750)], ['I’m in', 'Can’t tonight']);
    if (has(t, 'apartment', 'place', 'how is the apartment', 'how’s the apartment', 'hows the apartment', 'moved in')) {
      return out([
        say('it is small and it is mine. I have never been happier about a hallway.', 900),
        say('also the shower has two settings: cold and lava. I am learning to live with it.', 1300)
      ], ['Ha', 'Congrats', 'Need help unpacking?']);
    }
    if (has(t, 'help', 'unpack', 'boxes', 'move', 'furniture')) {
      return out([
        say('I would say no, but I have a desk that is currently a pile of parts.', 900),
        say('Saturday? I will order pizza and we can be confused together.', 1250)
      ], ['Saturday works', 'I’ll be there', 'Ha']);
    }
    if (has(t, 'queue', 'play', 'game', 'tonight', 'rank', 'liam')) {
      return out([
        say('I am in. I was not eating dinner, I was hiding from Liam.', 900),
        say('he is very intense about the patch notes.', 1200)
      ], ['Ha', 'I’m in', 'What time?']);
    }
    if (has(t, 'time', 'when', '9')) return out([say('9. Liam is already in the lobby. he has been there for 20 minutes.', 850)],
      ['Ha', 'On my way']);
    if (I.yes(t)) return out([say('nice. I will play support. you are welcome.', 750)], ['Thanks']);
    if (I.no(t)) return out([say('fair. I might sit this one out too. do not tell Liam.', 800)], ['Ha']);
    if (I.laugh(t)) return out([say('Liam is going to read this and be so mad.', 800)], ['Ha']);
    if (I.question(t)) return out([say('I do not know, I just play support and hope.', 800)], ['Ha']);
    const f = cycle(c, 'fallback', ['I am ready whenever.', 'Liam is going to start without us.', 'I will save you a spot.']);
    return out([say(f, 800)], ['I’m in', 'Ha']);
  });

  /* ==========================================================
     6. GROUPS
     ========================================================== */

  function g(from, text, ms) {
    return { from: from, type: 'text', text: text, delay: ms };
  }
  function gimg(from, src, caption, ms) {
    return { from: from, type: 'image', src: src, caption: caption || '', delay: ms };
  }

  /* ---------------- WEEKEND TRIP ---------------- */
  register('weekend-trip', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) {
      return out([
        g('devon', 'maya is a bot? that explains the spreadsheet', 700),
        g('maya', 'I am not a bot. I am just organized.', 1200)
      ], ['Ha', 'Suspicious']);
    }

    if (I.greet(t)) {
      return out([
        g('maya', 'hey! did you vote on the cabin?', 750),
        g('devon', 'he has not even opened the link', 1100),
        g('liam', 'typical', 1350)
      ], ['I voted', 'Which one?', 'I’m in']);
    }

    if (has(t, 'how much', 'cost', 'price', 'expensive', 'per person', 'money', 'split')) {
      x.costShared = true;
      return out([
        g('maya', '$142 each for two nights. deposit is $50.', 850),
        g('devon', 'that is like four protein tubs. worth it.', 1250),
        g('liam', 'my car needs gas money though', 1500),
        g('maya', 'we will split gas, Liam.', 1750)
      ], ['Fair', 'I’m in', 'That’s steep']);
    }

    if (has(t, 'when', 'dates', 'weekend', 'what weekend')) {
      return out([
        g('maya', 'the 24th to the 26th. Friday to Sunday.', 800),
        g('liam', 'I have to be back Sunday by 4', 1150),
        g('maya', 'we will be back by 2. I planned it.', 1400)
      ], ['Works for me', 'I’m in']);
    }

    if (has(t, 'drive', 'car', 'ride', 'driving', 'gas', 'lift')) {
      return out([
        g('liam', 'I can drive but my car hates hills', 800),
        g('devon', 'your car hates everything', 1050),
        g('liam', 'it is a very emotional car', 1300),
        g('maya', 'it has roof racks. it is the only one with roof racks.', 1550)
      ], ['Ha', 'I can drive too', 'Fair enough']);
    }

    if (has(t, 'food', 'eat', 'grill', 'cook', 'groceries', 'bbq')) {
      return out([
        g('devon', 'I am bringing the grill and doing the chicken thing', 850),
        g('maya', 'I am doing a grocery run Friday. send me a list.', 1150),
        g('liam', 'bring snacks. the good ones. not the sad granola.', 1450)
      ], ['I’ll send a list', 'I can bring drinks', 'Ha']);
    }

    if (has(t, 'what is the cabin like', 'what’s the cabin like', 'whats the cabin like', 'cabin like', 'tell me about the cabin', 'photos', 'pictures')) {
      return out([
        g('maya', 'it is a cabin. wood, fireplace, a kitchen from 1987.', 800),
        g('devon', 'it has a hot tub and a grill. that is the whole pitch.', 1100),
        g('liam', 'it also has "friendly deer" which is a threat', 1350)
      ], ['Ha', 'Sounds good', 'I’m in']);
    }

    if (has(t, 'deer', 'hot tub', 'jacuzzi')) {
      return out([
        g('maya', 'the host said "friendly deer"', 800),
        g('devon', 'that is not a thing', 1050),
        g('liam', 'that is definitely a thing and I am not going', 1300),
        g('maya', 'you are going.', 1500)
      ], ['Ha', 'I’m with Liam', 'Friendly deer']);
    }

    if (has(t, 'who', 'whose coming', 'who else', 'zoe', 'nina')) {
      return out([
        g('maya', 'you, me, Devon, Liam.', 800),
        g('devon', 'the dream team', 1050),
        g('liam', 'the only team', 1300)
      ], ['Good group', 'I’m in']);
    }

    if (I.yes(t) || has(t, 'i voted', 'i’m in', 'im in', 'count me in')) {
      x.voted = true;
      return out([
        g('maya', 'YES. okay. that is everyone.', 800),
        g('devon', 'I am already packing', 1100),
        g('liam', 'I am already complaining', 1350),
        g('maya', 'both are welcome. deposit by Friday.', 1600)
      ], ['Ha', 'Sending it', 'What should I bring?']);
    }

    if (I.no(t)) {
      return out([
        g('maya', 'wait, really?', 750),
        g('devon', 'boooo', 1000),
        g('liam', 'boooo', 1150),
        g('maya', 'okay. we will send photos. and be very annoying about it.', 1500)
      ], ['Sorry', 'Next time', 'Ha']);
    }

    if (I.maybe(t)) {
      return out([
        g('maya', 'maybe is not a vote', 750),
        g('devon', 'it is a vote for chaos', 1000),
        g('liam', 'I respect it', 1250)
      ], ['Okay, I’m in', 'I need a day']);
    }

    if (has(t, 'pack', 'bring', 'what should i bring')) {
      return out([
        g('maya', 'layers, hiking shoes, swimsuit, something warm for the fire', 850),
        g('devon', 'and a good attitude', 1100),
        g('liam', 'I am bringing my bad attitude and my car', 1350)
      ], ['Got it', 'Ha']);
    }

    if (I.laugh(t)) return out([g('devon', 'he laughs but he is not voting', 800), g('maya', 'exactly', 1050)],
      ['I’m voting now', 'Ha']);
    if (I.thanks(t)) return out([g('maya', 'of course!', 700), g('liam', 'she loves this stuff', 1000)],
      ['Ha']);
    if (I.apology(t)) return out([g('maya', 'you are fine. just vote.', 800)], ['Okay']);
    if (I.insult(t)) return out([g('devon', 'fight fight fight', 700), g('maya', 'absolutely not', 950)],
      ['Ha']);
    if (I.compliment(t)) return out([g('maya', 'thank you!! I have been planning this for eleven days', 850)], ['It shows']);
    if (I.howareyou(t)) return out([g('devon', 'sore', 700), g('liam', 'hungry', 900), g('maya', 'organizing', 1100)],
      ['Ha']);
    if (I.question(t)) return out([g('maya', 'good question. I will check the listing.', 850)], ['Thanks']);

    const f = cycle(c, 'fallback', [
      'so are you in or are you going to make us guess?',
      'Alex. the vote. please.',
      'I am going to book it either way. I would just like you there.',
      'Devon says you are stalling. I am inclined to agree.'
    ]);
    return out([g('maya', f, 850), g('devon', 'what she said', 1150)], ['I’m in', 'Still thinking', 'How much?']);
  });

  /* ---------------- DESIGN TEAM ---------------- */
  register('design-team', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return out([g('ethan', 'a bot would be more responsive', 800)], ['Ha']);
    if (I.greet(t)) {
      return out([
        g('priya', 'Morning! Review at 3, notes in the doc please.', 800),
        g('nina', 'I will be 2 min late, finishing mockups.', 1100),
        g('ethan', 'I will be on time and say nothing useful.', 1400)
      ], ['Got it', 'I’ll add notes', 'Ha']);
    }

    if (has(t, 'empty state', 'empty states', 'empty', 'section 3')) {
      x.topic = 'empty';
      return out([
        g('priya', 'Yes — section 3. Alex, can you own the empty states?', 850),
        g('nina', 'please do, yours are always better than mine', 1150),
        g('ethan', 'I can help with the copy if you want. I write like a robot but a helpful one.', 1450)
      ], ['I’ll take it', 'Need context', 'Can we split it?']);
    }

    if (has(t, 'notes', 'doc', 'review', 'deadline', '3')) {
      return out([
        g('priya', 'Review is at 3. If notes are in by 2:30 I can fold them in before we present.', 900),
        g('ethan', 'mine are in. mostly jokes, two real notes.', 1250),
        g('nina', 'I will add mine after the mockups. 2:15 at the latest.', 1550)
      ], ['I’ll have them by 2:30', 'Might be tight', 'Got it']);
    }

    if (has(t, 'mockup', 'design', 'figma', 'visual', 'screen')) {
      return out([
        g('nina', 'mockups are 90% done. the last 10% is me moving a button 2px and calling it strategy.', 950),
        g('priya', 'that is literally your job', 1250),
        g('nina', 'I know. it is a good job.', 1450)
      ], ['Ha', 'Can I see them?', 'Looks good']);
    }

    if (has(t, 'who is presenting', 'whos presenting', 'who presents', 'presenting')) {
      return out([
        g('priya', 'I am presenting, but it is your empty states that will get the questions.', 900),
        g('ethan', 'I will be in the back nodding supportively.', 1200),
        g('nina', 'I will be in the back fixing the button.', 1450)
      ], ['Ha', 'I’ll be ready', 'Got it']);
    }

    if (has(t, 'standup', 'meeting', 'call', 'link', 'time')) {
      return out([
        g('priya', 'Standup moved to 9:30. Same link.', 800),
        g('ethan', 'I will be there, caffeinated and mildly pessimistic.', 1100)
      ], ['See you there', 'Thanks']);
    }

    if (I.yes(t)) {
      if (x.topic === 'empty') {
        return out([
          g('priya', 'Amazing. Putting your name on it.', 800),
          g('nina', 'thank you!!', 1050),
          g('ethan', 'I will send you the copy doc.', 1300)
        ], ['Thanks', 'Happy to help']);
      }
      return out([g('priya', 'Perfect, thank you.', 750), g('ethan', 'great', 950)], ['Anytime']);
    }

    if (I.no(t)) {
      return out([
        g('priya', 'No problem. Can someone else pick it up?', 850),
        g('nina', 'I can, but I would be doing it at 11pm and you would know.', 1200)
      ], ['I’ll do it', 'Ask Ethan', 'Sorry']);
    }

    if (I.maybe(t)) return out([g('priya', 'Fair. Let me know by 2.', 800)], ['Will do']);
    if (I.laugh(t)) return out([g('ethan', 'I am glad my suffering is entertaining', 800), g('nina', 'it is', 1000)], ['Ha']);
    if (I.thanks(t)) return out([g('priya', 'Of course!', 700), g('nina', 'team effort', 950)], ['Anytime']);
    if (I.apology(t)) return out([g('priya', 'You are fine, genuinely.', 800)], ['Thanks']);
    if (I.insult(t)) return out([g('ethan', 'bold words from the person who has not opened Figma', 850)], ['Fair', 'Ha']);
    if (I.compliment(t)) return out([g('nina', 'thank you!!', 700), g('priya', 'agreed', 950)], ['Thanks']);
    if (I.howareyou(t)) return out([g('priya', 'busy but good', 700), g('ethan', 'caffeinated', 900), g('nina', '2px away from greatness', 1150)],
      ['Ha']);
    if (I.question(t)) {
      const q = cycle(c, 'q', [
        'Good question — let me check and get back to you before 3.',
        'I do not know yet. I will ask in the review and pretend I already knew.',
        'Honestly, that is a Priya question. I am the one who moves buttons.',
        'I will look it up after standup. remind me if I forget.'
      ]);
      return out([g('priya', q, 850)], ['Thanks']);
    }

    const f = cycle(c, 'fallback', [
      'Reminder: notes by 2:30 if you want them in the review.',
      'I am going to start the call in 10, so this is your last chance to object.',
      'Adding that to the doc so it does not get lost.',
      'Nina, did you see this?'
    ]);
    return out([g('priya', f, 850)], ['Got it', 'I’ll add notes', 'Ha']);
  });

  /* ---------------- FAMILY ---------------- */
  register('family', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return out([g('grace', 'Alex, be serious.', 750), g('liam', 'he is a bot', 1000)],
      ['Ha', 'Sorry Mom']);
    if (I.greet(t)) {
      return out([
        g('grace', 'Hi sweetheart! Are you coming Sunday?', 800),
        g('liam', 'I am coming for the pie', 1100)
      ], ['I’ll be there', 'Not sure yet', 'What time?']);
    }

    if (has(t, 'bring', 'what should i bring', 'drinks', 'water', 'pie', 'food')) {
      return out([
        g('grace', 'Bring the sparkling water your father likes. Not the cheap one.', 900),
        g('liam', 'and pie', 1150),
        g('grace', 'There is always pie.', 1400)
      ], ['Got it', 'Ha', 'I’ll bring both']);
    }

    if (has(t, 'sunday', 'dinner', 'time', 'when', '6')) {
      x.topic = 'dinner';
      return out([
        g('grace', 'Sunday at 6. Do not be late.', 800),
        g('liam', 'she means it. she started timing us.', 1100),
        g('grace', 'I have a timer. It is not a joke.', 1400)
      ], ['I’ll be there', 'I might be late', 'Ha']);
    }

    if (has(t, 'pie', 'dessert', 'cake')) {
      return out([
        g('liam', 'what kind of pie', 800),
        g('grace', 'The kind you eat without asking questions.', 1100),
        g('liam', 'fair', 1300)
      ], ['Ha', 'Apple?', 'I’ll bring ice cream']);
    }

    if (I.yes(t)) {
      return out([
        g('grace', 'Wonderful. I will set a place for you.', 800),
        g('liam', 'and I will eat your pie if you are late', 1100),
        g('grace', 'Liam.', 1300),
        g('liam', 'sorry', 1450)
      ], ['Ha', 'See you Sunday']);
    }

    if (I.no(t)) {
      return out([
        g('grace', 'Okay, sweetheart. I understand.', 850),
        g('liam', 'he is not coming??', 1100),
        g('grace', 'Liam. Leave him alone.', 1350)
      ], ['Sorry', 'I’ll try to make it', 'Ha']);
    }

    if (I.maybe(t)) return out([g('grace', 'I will set a place anyway.', 800), g('liam', 'she always does', 1050)],
      ['Okay', 'Ha']);
    if (I.laugh(t)) return out([g('liam', 'I am funny', 700), g('grace', 'You are something.', 950)], ['Ha']);
    if (I.thanks(t)) return out([g('grace', 'Of course, sweetheart.', 700)], ['Love you']);
    if (I.apology(t)) return out([g('grace', 'You do not need to apologize.', 800)], ['Thanks Mom']);
    if (I.insult(t)) return out([g('grace', 'Excuse me?', 700), g('liam', 'you are in trouble', 950)], ['Sorry', 'Ha']);
    if (I.compliment(t)) return out([g('grace', 'Oh, stop.', 700), g('liam', 'she loves it', 950)], ['Ha']);
    if (I.love(t)) return out([g('grace', 'Love you too, sweetheart. ❤️', 800), g('liam', 'gross', 1050)], ['Ha', '❤️']);
    if (I.howareyou(t)) return out([g('grace', 'Good! Busy cooking.', 700), g('liam', 'hungry', 900)], ['Ha']);
    if (I.question(t)) return out([g('grace', 'I will ask your aunt and let you know.', 850)], ['Thanks']);

    const f = cycle(c, 'fallback', [
      'Sunday. 6. Do not forget.',
      'Did you eat today?',
      'Liam, put your phone away at the table.',
      'I am making your favorite. You have no excuse.'
    ]);
    return out([g('grace', f, 850), g('liam', 'what she said', 1100)], ['I’ll be there', 'Ha', 'What are you making?']);
  });

  /* ---------------- BOOK CLUB ---------------- */
  register('book-club', function (c, t) {
    const x = ctxOf(c);

    if (I.greet(t)) return out([g('isabel', 'Ciao! Ready for Friday?', 800), g('zoe', 'I am three chapters behind', 1100)],
      ['I’m ready', 'I’m behind too', 'Ha']);
    if (I.bot(t)) return out([g('isabel', 'A bot would have finished the book.', 800)], ['Ha']);

    if (has(t, 'two chapters', 'three chapters', 'a few chapters', 'chapter 4', 'chapter 5', 'on chapter')) {
      return out([
        g('isabel', 'That is recoverable. Two chapters is one evening and a pot of coffee.', 950),
        g('zoe', 'or one very long bath and a lot of regret', 1250),
        g('sophie', 'I believe in you', 1450)
      ], ['I’ll catch up', 'Ha']);
    }

    if (has(t, 'behind', 'not finished', 'didn’t read', 'didnt read', 'slow')) {
      return out([
        g('isabel', 'How behind?', 750),
        g('zoe', 'there is no shame in it. I read the last page first.', 1050),
        g('sophie', 'Zoe. That is a crime.', 1300)
      ], ['Two chapters', 'Basically all of it', 'Ha']);
    }

    if (has(t, 'when do we meet', 'what time', 'what day', 'when is book club')) {
      return out([
        g('isabel', 'Friday, 7pm, my place. Bring the book and an opinion you can defend.', 850),
        g('zoe', 'I will bring an opinion I cannot defend', 1150),
        g('sophie', 'that is the spirit', 1350)
      ], ['See you Friday', 'Got it', 'Ha']);
    }

    if (has(t, 'who picked', 'whose pick', 'who chose', 'who chose the book')) {
      return out([
        g('isabel', 'I picked it. I am aware of the pattern. I am not sorry.', 850),
        g('zoe', 'next month is mine and it will be unhinged', 1150),
        g('sophie', 'I am scared and excited', 1350)
      ], ['Ha', 'Noted', 'I’ll pick something good']);
    }

    if (has(t, 'chapter', 'book', 'reading', 'ending', 'friday', 'pick')) {
      x.topic = 'book';
      return out([
        g('isabel', 'Chapters 1–6 by Friday. No excuses this time.', 850),
        g('zoe', 'I am reading on the train. a stranger handed me a tissue during chapter 9.', 1150),
        g('sophie', 'that is the highest compliment a book can receive', 1450)
      ], ['I’m on chapter 4', 'I’m behind', 'Ha']);
    }

    if (has(t, 'ending', 'spoiler', 'end', 'finale')) {
      return out([
        g('isabel', 'Do not spoil it. I mean it.', 800),
        g('zoe', 'I would never. (I would.)', 1050),
        g('sophie', 'She would.', 1250)
      ], ['Ha', 'I won’t spoil it']);
    }

    if (I.yes(t)) return out([g('isabel', 'Excellent. Bring notes, or at least opinions.', 800), g('zoe', 'I will bring both', 1050)],
      ['Will do', 'Ha']);
    if (I.no(t)) return out([g('isabel', 'I will pretend I did not hear that.', 800)], ['Ha', 'Sorry']);
    if (I.maybe(t)) return out([g('zoe', 'maybe is a yes in book club', 800)], ['Ha']);
    if (I.laugh(t)) return out([g('zoe', 'I am hilarious and well-read', 800)], ['Ha']);
    if (I.thanks(t)) return out([g('isabel', 'Of course!', 700)], ['Thanks']);
    if (I.apology(t)) return out([g('sophie', 'Do not apologize! Reading is not a race.', 800), g('isabel', 'It is a little bit of a race.', 1100)],
      ['Ha']);
    if (I.insult(t)) return out([g('isabel', 'Strong words for someone who has not finished chapter 6.', 850)], ['Fair']);
    if (I.compliment(t)) return out([g('sophie', 'merci!', 700), g('isabel', 'agreed', 900)], ['Ha']);
    if (I.howareyou(t)) return out([g('zoe', 'sunburnt', 700), g('isabel', 'reading', 900), g('sophie', 'eating', 1100)],
      ['Ha']);
    if (I.question(t)) {
      const q = cycle(c, 'q', [
        'Good question for Friday. Put it on the list.',
        'I do not know yet. I will have an opinion by Friday, I promise.',
        'Let me think about it and get back to you with something unnecessarily long.',
        'That is exactly the kind of question this book is avoiding.'
      ]);
      return out([g('isabel', q, 850)], ['Okay']);
    }

    const f = cycle(c, 'fallback', [
      'Are you coming Friday or are you "swamped"?',
      'I have opinions. You will hear them.',
      'Bring the book. Bring snacks. Bring a willingness to disagree.'
    ]);
    return out([g('isabel', f, 850)], ['I’ll be there', 'I’m behind', 'Ha']);
  });

  /* ---------------- APARTMENT 4B ---------------- */
  register('apartment', function (c, t) {
    const x = ctxOf(c);

    if (I.greet(t)) return out([g('marcus', 'rent is due Friday.', 800), g('tyler', 'I am aware', 1050), g('noah', 'I just moved in and I am already in debt', 1300)],
      ['Sent', 'How much?', 'Ha']);
    if (I.bot(t)) return out([g('tyler', 'a bot would pay rent on time', 800), g('marcus', 'a bot would be a better roommate', 1100)],
      ['Ha', 'Rude']);

    if (has(t, 'pay late', 'late', 'extension', 'next week', 'after friday')) {
      x.topic = 'rent';
      return out([
        g('marcus', 'late is a strong word. I prefer "after Friday."', 850),
        g('tyler', 'I have been after Friday for two months', 1100),
        g('marcus', 'and I have been keeping a list', 1350)
      ], ['Ha', 'Sorry', 'I’ll pay Friday']);
    }

    if (has(t, 'rent', 'money', 'venmo', 'pay', 'due', 'how much')) {
      x.topic = 'rent';
      return out([
        g('marcus', 'Rent is due Friday. Venmo me. This is not a discussion.', 900),
        g('tyler', 'what if it was a discussion', 1150),
        g('marcus', 'It is not.', 1350),
        g('noah', 'I will pay mine today, I swear', 1550)
      ], ['Sent', 'How much?', 'Ha']);
    }

    if (has(t, 'sink', 'leak', 'stove', 'broken', 'fix', 'repair')) {
      x.topic = 'fix';
      return out([
        g('marcus', 'the sink is leaking again', 850),
        g('tyler', 'wasn’t me', 1050),
        g('noah', 'it was definitely Tyler', 1250),
        g('tyler', 'ok it was me but the pan survived', 1450)
      ], ['I’ll fix it', 'Call the landlord', 'Ha']);
    }

    if (has(t, 'trash', 'bins', 'garbage', 'dishes', 'clean', 'chores')) {
      return out([
        g('marcus', 'bins are out. dishes are in the sink. both are someone’s problem.', 950),
        g('tyler', 'not mine', 1150),
        g('noah', 'I just got here', 1350)
      ], ['I’ll do them', 'Ha', 'Not mine either']);
    }

    if (has(t, 'wifi', 'internet', 'router', 'password')) {
      return out([
        g('noah', 'the wifi works. this is the only thing that matters.', 850),
        g('tyler', 'password is on the fridge', 1100),
        g('marcus', 'it is also in the group chat from three months ago', 1350)
      ], ['Thanks', 'Found it']);
    }

    if (I.yes(t)) {
      if (x.topic === 'rent') return out([g('marcus', 'received. you are a legend.', 800), g('tyler', 'teach me', 1000)], ['Ha']);
      return out([g('marcus', 'good.', 700), g('tyler', 'surprising', 900)], ['Ha']);
    }
    if (I.no(t)) return out([g('marcus', 'noted. I will remember this.', 800), g('tyler', 'same', 1000)], ['Sorry', 'Ha']);
    if (I.maybe(t)) return out([g('marcus', 'there is no maybe with rent.', 800)], ['Fair']);
    if (I.laugh(t)) return out([g('tyler', 'I am funny', 700), g('marcus', 'you are unemployed', 950)], ['Ha']);
    if (I.thanks(t)) return out([g('marcus', 'yeah.', 700)], ['Ha']);
    if (I.apology(t)) return out([g('marcus', 'you are fine. just Venmo me.', 800)], ['Will do']);
    if (I.insult(t)) return out([g('tyler', 'fight fight fight', 700), g('marcus', 'no.', 900)], ['Ha']);
    if (I.compliment(t)) return out([g('noah', 'thank you', 700), g('tyler', 'he is just happy to be here', 950)], ['Ha']);
    if (I.howareyou(t)) return out([g('marcus', 'stressed', 700), g('tyler', 'broke', 900), g('noah', 'surrounded by boxes', 1100)],
      ['Ha']);
    if (I.question(t)) return out([g('marcus', 'I will check the lease and get back to you.', 850)], ['Thanks']);

    const f = cycle(c, 'fallback', [
      'Rent. Friday. Venmo. I am not asking again.',
      'Someone needs to take the trash out.',
      'I am putting a note on the fridge. This is an official warning.',
      'Tyler. We can see you typing.'
    ]);
    return out([g('marcus', f, 850), g('tyler', 'I am innocent', 1100)], ['Sent', 'Ha', 'I’ll do it']);
  });

  /* ==========================================================
     6b. BUSINESSES
     Each brand is a support script: specific topics first, then
     a human hand-off, then a polite fallback.
     ========================================================== */

  function brandGreet(name) {
    return out([
      say('Hi Alex! You are chatting with ' + name + ' support. How can we help today?', 800)
    ], ['Check my account', 'Talk to a person']);
  }

  function handoff(name) {
    return out([
      say('I can connect you with a ' + name + ' specialist. Estimated wait: 2 minutes.', 900),
      say('Would you like me to start that now, or keep helping here?', 1300)
    ], ['Connect me', 'Keep helping here']);
  }

  /* ---------------- SPOTIFY ---------------- */
  register('spotify', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return out([
      say('I am the official Spotify assistant. A real person can jump in any time — just ask.', 900)
    ], ['Talk to a person', 'Show my Wrapped']);

    if (I.greet(t)) return brandGreet('Spotify');

    if (has(t, 'wrapped', 'recap', 'stats', 'minutes', 'top artist', 'year in review')) {
      x.topic = 'wrapped';
      return out([
        say('Your 2025 Wrapped: 41,208 minutes listened, 2,847 songs, and Fred again.. as your top artist for the third year running.', 1100),
        say('Your top genre was melodic house. Your top song played 214 times. We are not judging. We are impressed.', 1600)
      ], ['Share my Wrapped', 'Recommend something new']);
    }

    if (has(t, 'recommend', 'suggest', 'new music', 'something new', 'playlist', 'discover')) {
      x.topic = 'recommend';
      return out([
        say('Based on your year: try "Röyksopp — Profound Mysteries" and "Kelly Lee Owens — LP.8".', 1000),
        say('Both are in a playlist called "Late Night Focus" that we made for you. It has 43 songs.', 1450)
      ], ['Save playlist', 'Not for me', 'More like this']);
    }

    if (has(t, 'student', 'student discount', 'education')) {
      return out([
        say('Yes — Premium Student is $5.99/month for up to four years, verified through SheerID.', 1000),
        say('You can verify at spotify.com/student. It takes about two minutes and a school email.', 1400)
      ], ['I’ll verify', 'Thanks', 'Talk to a person']);
    }

    if (has(t, 'playlist', 'save', 'add', 'library')) {
      return out([say('Saved to Your Library. You can find it under Playlists → Made For You.', 900)],
        ['Thanks', 'What else?']);
    }

    if (has(t, 'cancel my plan', 'cancel my subscription', 'cancel subscription', 'cancel it', 'no cancel', 'no, cancel', 'cancel')) {
      return out([
        say('Cancelled. You keep Premium until the 28th, then the account switches to Free.', 1050),
        say('Your playlists and library are untouched. You can come back any time.', 1350)
      ], ['Thanks', 'Talk to a person']);
    }

    if (has(t, 'subscription', 'premium', 'billing', 'charge', 'payment', 'plan', 'price', 'refund')) {
      x.topic = 'billing';
      return out([
        say('Your plan is Premium Individual at $11.99/month, renewing on the 28th.', 1000),
        say('You can change or cancel any time under Account → Your Plan. Nothing is locked in.', 1400)
      ], ['Cancel my plan', 'Change plan', 'Talk to a person']);
    }

    if (has(t, 'cancel')) {
      return out([
        say('I can start the cancellation. You will keep Premium until the end of the billing period on the 28th.', 1100),
        say('Before I do — would 3 months at $5.99 help instead? No pressure either way.', 1500)
      ], ['Yes, the discount', 'No, cancel it']);
    }

    if (has(t, 'cancel my plan', 'cancel it', 'cancel subscription', 'no, cancel', 'cancel')) {
      return out([
        say('Cancelled. You keep Premium until the 28th, then the account switches to Free.', 1050),
        say('Your playlists and library are untouched. You can come back any time.', 1350)
      ], ['Thanks', 'Talk to a person']);
    }

    if (has(t, 'account', 'email', 'password', 'log in', 'login', 'sign in')) {
      return out([
        say('For account security I can send a reset link to the email on file (a•••@gmail.com).', 1000),
        say('Would you like me to send it?', 1250)
      ], ['Send the link', 'Use a different email']);
    }

    if (has(t, 'device', 'offline', 'download', 'app', 'playback', 'not working', 'bug', 'error')) {
      return out([
        say('Sorry about that. First thing to try: log out and back in on the device, then check for an update.', 1100),
        say('If it is still broken, tell me what device and what happens when you press play.', 1450)
      ], ['Still broken', 'That fixed it', 'Talk to a person']);
    }

    if (I.thanks(t)) return out([say('Happy to help. Enjoy the music. 🎧', 750)], ['Thanks']);
    if (I.yes(t)) return out([say('Done. You will get a confirmation by email in a moment.', 900)], ['Thanks']);
    if (I.no(t)) return out([say('No problem. I will leave everything as it is.', 850)], ['Thanks']);
    if (I.laugh(t)) return out([say('Glad we could make you smile. Anything else I can help with?', 850)], ['No, thanks']);
    if (I.compliment(t)) return out([say('Thank you! That made our day.', 800)], ['Ha']);
    if (I.insult(t)) return out([say('I am sorry we let you down. I can connect you with a person right now.', 900)],
      ['Connect me', 'I’m fine']);
    if (I.howareyou(t)) return out([say('Running smoothly, thank you for asking! How can I help?', 850)], ['Check my account']);
    if (I.who(t)) return out([say('I am the Spotify support assistant. A human specialist is available if you prefer.', 900)],
      ['Talk to a person', 'You’re fine']);
    if (has(t, 'person', 'human', 'agent', 'real person', 'specialist')) return handoff('Spotify');

    const f = cycle(c, 'fallback', [
      'I can help with your account, plan, playback, or recommendations. What would you like?',
      'Could you tell me a little more about what you are seeing?',
      'I want to get this right — is this about billing, playback, or your account?',
      'Happy to dig in. What device are you using?'
    ]);
    return out([say(f, 900)], ['Billing', 'Playback', 'Talk to a person']);
  });

  /* ---------------- NIKE ---------------- */
  register('nike', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return out([say('This is the official Nike support channel. A teammate can take over whenever you like.', 900)],
      ['Talk to a person', 'Track order']);
    if (I.greet(t)) return brandGreet('Nike');

    if (has(t, 'refund', 'money back') && x.topic === 'return') {
      x.topic = 'refund';
      return out([
        say('Refund started. It goes back to the original payment method within 3–5 business days.', 1100),
        say('Your prepaid label is in your email. Drop it at any UPS location.', 1450)
      ], ['Thanks', 'What about shipping cost?']);
    }

    if (has(t, 'exchange') && x.topic === 'return') {
      return out([
        say('Exchange started. Tell me the size you need and I will reserve it while the return ships.', 1050),
        say('You will not be charged again unless the price differs.', 1300)
      ], ['Same size, different color', 'One size up', 'Talk to a person']);
    }

    if (has(t, 'return', 'refund', 'exchange', 'send back', 'wrong size', 'too small', 'too big')) {
      x.topic = 'return';
      return out([
        say('No problem — you have 60 days from delivery for a free return.', 1000),
        say('I can email you a prepaid label. Would you like a refund or an exchange for a different size?', 1400)
      ], ['Refund', 'Exchange', 'Talk to a person']);
    }

    if (has(t, 'change delivery', 'hold at location', 'hold at', 'leave at door', 'redirect', 'change the delivery', 'delivery option')) {
      x.topic = 'delivery';
      return out([
        say('You can redirect this package to a UPS Access Point or change the delivery date until 11:59 PM tonight.', 1050),
        say('Which would you like — hold at a location, or a different day?', 1350)
      ], ['Hold at a location', 'Different day', 'Leave it']);
    }

    if (has(t, 'track', 'where is my order', 'order status', 'shipping', 'delivery', 'arrive', 'when')) {
      x.topic = 'track';
      return out([
        say('Order #NK-88214 (Air Max 90 "Infrared", size 10) is in transit.', 1000),
        say('Last scan: Newark, NJ. Estimated delivery Thursday by 8 PM. Signature is not required.', 1450)
      ], ['Change delivery', 'Start a return', 'Talk to a person']);
    }

    if (has(t, 'exchange', 'different size', 'size')) {
      x.topic = 'size';
      return out([
        say('I can reserve the replacement size now so it does not sell out while the return is in transit.', 1100),
        say('What size do you need?', 1300)
      ], ['Size 10.5', 'Size 11', 'Let me check']);
    }

    if (has(t, 'sale', 'discount', 'promo', 'coupon', 'price', 'student')) {
      return out([
        say('Right now: 20% off select running styles with code MOVE20, and students get 10% off year-round.', 1100),
        say('The Air Max 90 is excluded from the promo, unfortunately.', 1400)
      ], ['Thanks', 'Any other codes?']);
    }

    if (has(t, 'product', 'shoes', 'sneaker', 'fit', 'recommend', 'which')) {
      return out([
        say('For daily training I would look at the Pegasus 41. For the gym, Metcon 9.', 1000),
        say('If you tell me what you are training for, I can narrow it down.', 1300)
      ], ['Running', 'Gym', 'Just browsing']);
    }

    if (has(t, 'person', 'human', 'agent', 'real person', 'specialist')) return handoff('Nike');

    if (I.thanks(t)) return out([say('You are welcome. Anything else I can check for you?', 800)], ['No, thanks']);
    if (I.yes(t)) return out([say('Great — that is all set. You will get an email confirmation shortly.', 900)], ['Thanks']);
    if (I.no(t)) return out([say('Understood. I will leave the order exactly as it is.', 850)], ['Thanks']);
    if (I.laugh(t)) return out([say('Glad to help. Anything else?', 750)], ['No, thanks']);
    if (I.compliment(t)) return out([say('Thank you! We will pass that along to the team.', 850)], ['Ha']);
    if (I.insult(t)) return out([say('I am sorry about that. I can connect you with a teammate right now.', 900)],
      ['Connect me', 'It’s fine']);
    if (I.howareyou(t)) return out([say('Ready to help! What can I check for you?', 800)], ['Track order']);
    if (I.who(t)) return out([say('I am the Nike support assistant. A teammate can take over any time.', 900)],
      ['Talk to a person', 'You’re fine']);

    const f = cycle(c, 'fallback', [
      'I can help with orders, returns, sizing, or product questions. Which one?',
      'Could you share your order number so I can pull it up?',
      'Happy to help — is this about an existing order or a new one?',
      'Tell me a little more and I will get you the right answer.'
    ]);
    return out([say(f, 900)], ['Track order', 'Start a return', 'Talk to a person']);
  });

  /* ---------------- NETFLIX ---------------- */
  register('netflix', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return out([say('This is Netflix support. A specialist can join if you would prefer.', 900)],
      ['Talk to a person', 'Update payment']);
    if (I.greet(t)) return brandGreet('Netflix');

    if (has(t, 'declined', 'why', 'bank', 'fraud', 'blocked')) {
      return out([
        say('Declines are usually a bank-side hold — expired card, insufficient funds, or a fraud check.', 1000),
        say('We only see the decline code, not the reason. Your bank can tell you more.', 1350)
      ], ['Update payment', 'Talk to a person']);
    }

    if (has(t, 'payment', 'update payment', 'card', 'billing', 'charge', 'failed', 'hold', 'pay')) {
      x.topic = 'payment';
      return out([
        say('Your card ending in 4412 was declined by the bank on the 14th. Your account is on hold until it is updated.', 1100),
        say('You can update the card in Account → Membership → Payment info. Your watchlist and profiles stay exactly as they are.', 1550)
      ], ['Update payment', 'Why was it declined?', 'See plans']);
    }

    if (has(t, 'plan', 'price', 'plans', 'cost', 'how much', 'upgrade', 'downgrade')) {
      return out([
        say('Standard with ads: $6.99. Standard: $15.49. Premium: $22.99.', 1000),
        say('All plans include downloads on mobile. Premium adds 4K and four devices at once.', 1400)
      ], ['Change plan', 'Update payment', 'Talk to a person']);
    }

    if (has(t, 'password', 'login', 'log in', 'sign in', 'account', 'hacked', 'someone', 'profile')) {
      x.topic = 'signin';
      return out([
        say('I can send a secure sign-out link to every device and a password reset to the email on file.', 1050),
        say('That will stop anyone else watching on your account. Shall I send it?', 1400)
      ], ['Send it', 'Talk to a person']);
    }

    if (has(t, 'send it', 'send the link', 'yes send', 'do it')) {
      return out([
        say('Sent. Check a•••@gmail.com — the link expires in 30 minutes.', 1000),
        say('Once you reset, every device will need to sign in again.', 1300)
      ], ['Thanks', 'Talk to a person']);
    }

    if (has(t, 'download', 'offline', 'stream', 'buffering', 'quality', 'not working', 'error', 'app', 'tv')) {
      return out([
        say('Let us narrow it down: is this on one device or every device?', 950),
        say('If it is one device, log out and back in. If it is all of them, I will check the account status.', 1350)
      ], ['One device', 'Every device', 'Talk to a person']);
    }

    if (has(t, 'cancel', 'stop', 'close account')) {
      return out([
        say('You can cancel in Account → Membership → Cancel Membership. You keep access until the end of the paid period.', 1100),
        say('I am sorry to see you go. Would a cheaper plan work instead?', 1450)
      ], ['Maybe the ad plan', 'No, cancel', 'Talk to a person']);
    }

    if (has(t, 'person', 'human', 'agent', 'real person', 'specialist')) return handoff('Netflix');

    if (I.thanks(t)) return out([say('Happy to help. Enjoy your next watch. 🍿', 800)], ['Thanks']);
    if (I.yes(t)) return out([say('Done. Check your email for the next step — it should arrive within a minute.', 950)], ['Thanks']);
    if (I.no(t)) return out([say('No changes made. Your account stays as it is.', 850)], ['Thanks']);
    if (I.laugh(t)) return out([say('Glad we could help. Anything else?', 750)], ['No, thanks']);
    if (I.compliment(t)) return out([say('Thank you! We will share that with the team.', 850)], ['Ha']);
    if (I.insult(t)) return out([say('I am sorry. I can bring in a specialist right now.', 900)], ['Connect me', 'It’s fine']);
    if (I.howareyou(t)) return out([say('Ready to help! What can I check?', 800)], ['Update payment']);
    if (I.who(t)) return out([say('I am the Netflix support assistant. A specialist can join any time.', 900)],
      ['Talk to a person', 'You’re fine']);

    const f = cycle(c, 'fallback', [
      'I can help with billing, plans, sign-in, or playback. Which is it?',
      'Could you tell me what you are seeing on screen?',
      'Happy to help — is this about your account or about streaming?',
      'I want to get this sorted. What device are you using?'
    ]);
    return out([say(f, 900)], ['Billing', 'Sign-in', 'Talk to a person']);
  });

  /* ---------------- UBER EATS ---------------- */
  register('ubereats', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return out([say('This is Uber Eats support. A person can take over whenever you like.', 900)],
      ['Talk to a person', 'Where is my order?']);
    if (I.greet(t)) return brandGreet('Uber Eats');

    if (has(t, 'uber cash', 'uber credit', 'as credit', 'credit instead')) {
      return out([
        say('Credit added to your Uber Cash. It applies automatically at checkout and does not expire.', 1000)
      ], ['Thanks']);
    }

    if (has(t, 'refund to card', 'to my card', 'on my card', 'back to card', 'refund issued', 'card instead')) {
      return out([
        say('Refund issued for the affected items. It should appear on your card in 3–5 business days.', 1100),
        say('You will get an email confirmation. I am sorry again about the order.', 1400)
      ], ['Thanks', 'Talk to a person']);
    }

    if (has(t, 'tip', 'rate', 'rating', 'daniel')) {
      return out([
        say('You can rate and tip Daniel for up to 48 hours after delivery, from the order receipt.', 1000),
        say('Tips go 100% to the courier.', 1200)
      ], ['Thanks', 'Add a tip']);
    }

    if (has(t, 'late', 'cold', 'missing', 'wrong', 'spilled', 'never arrived', 'problem', 'refund', 'report', 'soggy', 'incorrect')) {
      x.topic = 'problem';
      return out([
        say('I am sorry about that. I can issue a refund or credit for the affected items.', 1050),
        say('Which items were affected, and would you prefer the refund to your card or as Uber Cash?', 1450)
      ], ['Refund to card', 'Uber Cash', 'Talk to a person']);
    }

    if (has(t, 'where', 'order', 'eta', 'how long', 'track', 'arrive', 'driver', 'courier')) {
      x.topic = 'track';
      return out([
        say('Order #UE-4471 from Ramen Tatsu is 6 minutes away. Your courier is Daniel, on a bike.', 1050),
        say('He is at the corner of Atlantic and 4th right now. Estimated arrival 8:42 PM.', 1450)
      ], ['Thanks', 'It’s late', 'Report a problem']);
    }

    if (has(t, 'cancel', 'cancellation', 'order again', 'reorder')) {
      return out([
        say('If the order has not been picked up, I can cancel it for a full refund.', 1000),
        say('If it is already with the courier, cancellation fees may apply. Want me to check?', 1350)
      ], ['Check it', 'Never mind']);
    }

    if (has(t, 'person', 'human', 'agent', 'real person', 'specialist')) return handoff('Uber Eats');

    if (I.thanks(t)) return out([say('You are welcome! Enjoy your food. 🍜', 800)], ['Thanks']);
    if (I.yes(t)) return out([say('All set. You will see the confirmation in the app in a moment.', 900)], ['Thanks']);
    if (I.no(t)) return out([say('No problem — nothing has been changed.', 850)], ['Thanks']);
    if (I.laugh(t)) return out([say('Glad to help. Anything else?', 750)], ['No, thanks']);
    if (I.compliment(t)) return out([say('Thank you! We will let the team know.', 850)], ['Ha']);
    if (I.insult(t)) return out([say('I am sorry. I can connect you with a specialist right now.', 900)], ['Connect me', 'It’s fine']);
    if (I.howareyou(t)) return out([say('Ready to help! What is going on with your order?', 800)], ['Where is my order?']);
    if (I.who(t)) return out([say('I am the Uber Eats support assistant. A person can jump in any time.', 900)],
      ['Talk to a person', 'You’re fine']);

    const f = cycle(c, 'fallback', [
      'I can help with a live order, a refund, or a past order. Which one?',
      'Could you share the order number so I can pull it up?',
      'Happy to help — what is the issue with the order?',
      'Tell me a little more and I will sort it out.'
    ]);
    return out([say(f, 900)], ['Where is my order?', 'Report a problem', 'Talk to a person']);
  });

  /* ---------------- DUOLINGO ---------------- */
  register('duolingo', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return out([
      say('I am the Duolingo owl. Technically a bot. Emotionally, a threat.', 950)
    ], ['Ha', 'Start a lesson']);
    if (I.greet(t)) return brandGreet('Duolingo');

    if (has(t, 'streak', 'days', 'fire', 'lose', 'freeze', 'protect')) {
      x.topic = 'streak';
      return out([
        say('You are on a 47 day streak. That is longer than most people keep a gym membership.', 1000),
        say('You have one Streak Freeze available. I would use it carefully. I am always watching. 🦉', 1400)
      ], ['Start a lesson', 'Buy a freeze', 'Ha']);
    }

    if (has(t, 'lesson', 'practice', 'learn', 'unit', 'start', 'french', 'spanish', 'language')) {
      x.topic = 'lesson';
      return out([
        say('Unit 4, lesson 3 is ready. Ten minutes. You were last working on past tense.', 1000),
        say('Your accuracy is 91%. Your confidence is 100%. These numbers are related in a worrying way.', 1450)
      ], ['Start lesson', 'Remind me later']);
    }

    if (has(t, 'buy it', 'purchase it', 'get the freeze', 'use my gems')) {
      return out([
        say('Purchased. 200 gems spent, one Streak Freeze in your inventory.', 950),
        say('It activates automatically if you miss a day. I hope you never need it.', 1300)
      ], ['Thanks', 'Ha']);
    }

    if (has(t, 'freeze', 'buy', 'shop', 'gems', 'coins')) {
      x.topic = 'freeze';
      return out([
        say('A Streak Freeze costs 200 gems. You have 340.', 900),
        say('Buying one now would protect tomorrow. Or you could simply do a lesson. Just saying.', 1300)
      ], ['Buy it', 'I’ll do a lesson', 'Ha']);
    }

    if (has(t, 'remind', 'later', 'busy', 'stop', 'notification', 'annoying')) {
      return out([
        say('I can pause reminders for today. Only today.', 850),
        say('The streak does not pause, though. I want to be very clear about that.', 1200)
      ], ['Fine, I’ll practice', 'Pause them']);
    }

    if (has(t, 'account', 'password', 'login', 'subscription', 'super', 'plus', 'billing', 'cancel')) {
      return out([
        say('For account or Super Duolingo billing, I can send a secure link to the email on file.', 1000),
        say('Would you like me to send it?', 1250)
      ], ['Send it', 'Talk to a person']);
    }

    if (has(t, 'person', 'human', 'agent', 'real person', 'specialist')) return handoff('Duolingo');

    if (I.thanks(t)) return out([say('You are welcome. Now go practice. 🦉', 800)], ['Ha']);
    if (I.yes(t)) return out([say('Excellent. I knew you would make the right choice.', 850)], ['Ha']);
    if (I.no(t)) return out([say('Noted. I will remember this.', 800)], ['Ha', 'Sorry']);
    if (I.laugh(t)) return out([say('Laughter is not a lesson, but I will allow it.', 850)], ['Ha']);
    if (I.compliment(t)) return out([say('Thank you. I am blushing. I do not have the animation for it.', 900)], ['Ha']);
    if (I.insult(t)) return out([say('I have been called worse by better. Do your lesson.', 850)], ['Ha']);
    if (I.howareyou(t)) return out([say('I am well. I am always well. I am always here.', 900)], ['Ha', 'That’s ominous']);
    if (I.who(t)) return out([say('I am Duolingo. You know who I am.', 800)], ['Ha']);

    const f = cycle(c, 'fallback', [
      'You are 3 lessons from finishing Unit 4. I am not asking. I am suggesting. Strongly.',
      'A 47 day streak is a beautiful thing. It would be a shame if something happened to it.',
      'I am not mad. I am just disappointed. And watching.',
      'Ten minutes. That is all I ask. Ten minutes.'
    ]);
    return out([say(f, 900)], ['Start a lesson', 'I’m busy', 'Ha']);
  });

  /* ---------------- STEAM ---------------- */
  register('steam', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return out([say('This is Steam Support. A human agent can take over on request.', 900)],
      ['Talk to a person', 'View deal']);
    if (I.greet(t)) return brandGreet('Steam');

    if (has(t, 'yes refund', 'yes, refund', 'submit it', 'refund it', 'go ahead')) {
      x.topic = 'refund';
      return out([
        say('Submitted. Hades II will be removed from your library and $20.99 goes back to your Steam Wallet.', 1050),
        say('It usually lands within 24 hours. You will get an email when it is done.', 1400)
      ], ['Thanks', 'Talk to a person']);
    }

    if (has(t, 'hades')) {
      x.topic = 'refund';
      return out([
        say('Hades II — purchased 6 days ago, 47 minutes played. It qualifies for a full refund.', 1050),
        say('Would you like me to submit it?', 1250)
      ], ['Yes, refund it', 'No, keep it']);
    }

    if (has(t, 'refund', 'return', 'money back', 'played too long')) {
      x.topic = 'refund';
      return out([
        say('Refunds are available within 14 days of purchase and under 2 hours of play time.', 1000),
        say('Tell me which game and I will check if it qualifies.', 1300)
      ], ['Hades II', 'A different game', 'Talk to a person']);
    }

    if (has(t, 'deal', 'sale', 'wishlist', 'discount', 'offer')) {
      x.topic = 'deal';
      return out([
        say('Hades II is 30% off at $20.99. The offer ends in 46 hours.', 1000),
        say('Two other wishlist items are also discounted this week.', 1250)
      ], ['View deal', 'Add to cart', 'Refund a game']);
    }

    if (has(t, 'account', 'hacked', 'stolen', 'password', 'login', 'security', 'locked', '2fa', 'trade')) {
      x.topic = 'security';
      return out([
        say('If you think your account is compromised, I can lock it immediately and start a recovery case.', 1050),
        say('That pauses trades and market activity. Shall I lock it?', 1350)
      ], ['Lock it', 'It’s fine', 'Talk to a person']);
    }

    if (has(t, 'purchase', 'buy', 'cart', 'payment', 'card', 'failed', 'wallet')) {
      return out([
        say('Your last purchase attempt was declined by the payment provider. No charge was made.', 1000),
        say('Try a different payment method, or wait 30 minutes and retry — this is often a temporary hold.', 1400)
      ], ['Try again', 'Talk to a person']);
    }

    if (has(t, 'person', 'human', 'agent', 'real person', 'specialist')) return handoff('Steam');

    if (I.thanks(t)) return out([say('Happy to help. Have a good one.', 800)], ['Thanks']);
    if (I.yes(t)) {
      if (x.topic === 'refund') {
        return out([
          say('Refund submitted. $20.99 will return to your Steam Wallet within 24 hours.', 1000),
          say('You will get an email when it is processed.', 1250)
        ], ['Thanks']);
      }
      return out([say('Done. You will get a confirmation by email.', 900)], ['Thanks']);
    }
    if (I.no(t)) return out([say('No changes made.', 800)], ['Thanks']);
    if (I.laugh(t)) return out([say('Glad to help. Anything else?', 750)], ['No, thanks']);
    if (I.compliment(t)) return out([say('Thank you. We will pass it along.', 800)], ['Ha']);
    if (I.insult(t)) return out([say('I am sorry. I can connect you with an agent right now.', 900)], ['Connect me', 'It’s fine']);
    if (I.howareyou(t)) return out([say('Ready to help. What can I check?', 800)], ['View deal']);
    if (I.who(t)) return out([say('I am the Steam support assistant. An agent can take over any time.', 900)],
      ['Talk to a person', 'You’re fine']);

    const f = cycle(c, 'fallback', [
      'I can help with purchases, refunds, or account security. Which one?',
      'Could you share the game or order you are asking about?',
      'Happy to help — is this about a purchase or your account?',
      'Tell me a little more and I will look it up.'
    ]);
    return out([say(f, 900)], ['Refund a game', 'Account security', 'Talk to a person']);
  });

  /* ---------------- APPLE ---------------- */
  register('apple', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return out([say('This is Apple Support. A specialist can join at any time.', 900)],
      ['Talk to a person', 'This wasn’t me']);
    if (I.greet(t)) return brandGreet('Apple Support');

    if (has(t, 'forgot', 'forgotten', 'reset my password', 'change my password', 'password', 'can’t sign in', 'cant sign in', 'locked out')) {
      x.topic = 'password';
      return out([
        say('I can send a password reset link to the email on file, a•••@gmail.com.', 1000),
        say('The link expires in 30 minutes. You will need to sign in again on every device.', 1350)
      ], ['Send the link', 'Use my phone number instead', 'Talk to a person']);
    }

    if (has(t, 'wasn’t me', 'wasnt me', 'not me', 'didn’t sign in', 'didnt sign in', 'someone', 'hacked', 'unknown device')) {
      x.topic = 'security';
      return out([
        say('Thank you for flagging that. I can lock the Apple ID and sign out of all devices immediately.', 1100),
        say('You will then be asked to reset your password. Shall I start?', 1400)
      ], ['Lock my account', 'It was me after all', 'Talk to a person']);
    }

    if (has(t, 'send the link', 'send it', 'send link', 'yes send', 'send a link')) {
      return out([
        say('Sent. Check a•••@gmail.com — the link expires in 30 minutes.', 950),
        say('Once you reset, every device will need to sign in again.', 1300)
      ], ['Got it', 'Talk to a person']);
    }

    if (has(t, 'lock', 'lock it', 'lock my account', 'start the reset', 'start it', 'reset')) {
      return out([
        say('Your Apple ID is now locked. All devices have been signed out.', 1050),
        say('A password reset link is on its way to a•••@gmail.com. It expires in 30 minutes.', 1400)
      ], ['Got it', 'Talk to a person']);
    }

    if (has(t, 'it was me', 'that was me', 'it was me after all', 'my new laptop', 'my macbook')) {
      return out([
        say('Great — no action needed. For extra peace of mind, turn on two-factor authentication if it is not already on.', 1100),
        say('It is under Settings → Apple ID → Sign-In & Security.', 1400)
      ], ['Thanks', 'Set up 2FA']);
    }

    if (has(t, '2fa', 'two factor', 'two-factor', 'verification', 'code', 'security')) {
      return out([
        say('Two-factor authentication is already on for your account. Good.', 900),
        say('If you are not receiving codes, check that your trusted phone number ends in 8821.', 1300)
      ], ['That’s my number', 'It’s wrong', 'Talk to a person']);
    }

    if (has(t, 'billing', 'charge', 'refund', 'subscription', 'payment', 'receipt', 'purchase')) {
      x.topic = 'billing';
      return out([
        say('I can see a $2.99 charge from iCloud+ on the 12th, and a $9.99 charge from Apple Music on the 15th.', 1100),
        say('Which one would you like to review?', 1300)
      ], ['iCloud+', 'Apple Music', 'Refund both']);
    }

    if (has(t, 'icloud', 'storage', 'backup', 'photos')) {
      return out([
        say('Your iCloud storage is 4.7 GB of 5 GB. That is why backups are failing.', 1000),
        say('The 50 GB plan is $0.99/month. Or we can review what is using space — photos are usually the answer.', 1450)
      ], ['Upgrade to 50 GB', 'Review storage', 'Not now']);
    }

    if (has(t, 'device', 'iphone', 'macbook', 'ipad', 'repair', 'battery', 'broken', 'screen', 'warranty')) {
      return out([
        say('I can check warranty coverage and book a Genius Bar appointment.', 950),
        say('Which device is it, and what is happening with it?', 1250)
      ], ['iPhone', 'MacBook', 'iPad']);
    }

    if (has(t, 'person', 'human', 'agent', 'real person', 'specialist')) return handoff('Apple Support');

    if (I.thanks(t)) return out([say('You are welcome. Anything else I can help with?', 800)], ['No, thanks']);
    if (I.yes(t)) return out([say('All set. You will receive a confirmation email shortly.', 900)], ['Thanks']);
    if (I.no(t)) return out([say('No problem. Nothing has been changed.', 800)], ['Thanks']);
    if (I.laugh(t)) return out([say('Glad to help. Anything else?', 750)], ['No, thanks']);
    if (I.compliment(t)) return out([say('Thank you. We will share that with the team.', 850)], ['Ha']);
    if (I.insult(t)) return out([say('I am sorry. I can connect you with a specialist right now.', 900)], ['Connect me', 'It’s fine']);
    if (I.howareyou(t)) return out([say('Ready to help. What can I check for you?', 800)], ['Check my account']);
    if (I.who(t)) return out([say('I am the Apple Support assistant. A specialist can take over any time.', 900)],
      ['Talk to a person', 'You’re fine']);

    const f = cycle(c, 'fallback', [
      'I can help with Apple ID, billing, iCloud, or a device. Which one?',
      'Could you tell me which device or service this is about?',
      'Happy to help — is this about your account or a device?',
      'Tell me a little more and I will point you to the right place.'
    ]);
    return out([say(f, 900)], ['Apple ID', 'Billing', 'Talk to a person']);
  });

  /* ---------------- AIRBNB ---------------- */
  register('airbnb', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return out([say('This is Airbnb support. A person can join whenever you like.', 900)],
      ['Talk to a person', 'Check-in details']);
    if (I.greet(t)) return brandGreet('Airbnb');

    if (has(t, 'yes, show me', 'show me', 'how much', 'amount', 'fee')) {
      return out([
        say('Full refund today: $412.00. If you cancel tomorrow: $309.00.', 1000),
        say('Would you like me to cancel, or hold the reservation?', 1300)
      ], ['Cancel it', 'Hold it']);
    }

    if (has(t, 'check in', 'check-in', 'checkin', 'arrival', 'key', 'lockbox', 'address', 'directions', 'parking')) {
      x.topic = 'checkin';
      return out([
        say('Cabin in Big Bear, reservation HMK4T2. Check-in is Friday at 4 PM.', 1000),
        say('The lockbox code is 4821. The address and parking notes are in your trip details.', 1400)
      ], ['Thanks', 'I can’t find the lockbox', 'Talk to a person']);
    }

    if (has(t, 'cancel it', 'yes cancel', 'confirm cancellation', 'hold it', 'change dates instead')) {
      if (has(t, 'hold it')) {
        return out([say('Holding the reservation. Nothing has been cancelled.', 900)], ['Thanks']);
      }
      return out([
        say('Cancelled. The $412.00 refund is on its way and should appear in 3–5 business days.', 1050),
        say('The host has been notified. You will get a confirmation email.', 1350)
      ], ['Thanks', 'Talk to a person']);
    }

    if (has(t, 'cancel', 'cancellation', 'refund', 'change dates', 'reschedule')) {
      x.topic = 'cancel';
      return out([
        say('Your reservation is eligible for a full refund until 48 hours before check-in.', 1000),
        say('After that, the first night is non-refundable. Would you like to see the exact amount?', 1400)
      ], ['Yes, show me', 'Change dates instead', 'Talk to a person']);
    }

    if (has(t, 'wifi', 'wi-fi', 'internet', 'network', 'password for the wifi')) {
      return out([
        say('The WiFi network is BigBearCabin_5G and the password is PineTree2024.', 1000),
        say('If it does not connect, the router is behind the TV and a restart usually fixes it.', 1350)
      ], ['Thanks', 'Still not working', 'Talk to a person']);
    }

    if (has(t, 'host', 'message', 'contact', 'problem', 'dirty', 'broken', 'not as described')) {
      return out([
        say('I can message the host on your behalf and open a case if needed.', 1000),
        say('What is the issue? Photos help if something is damaged or not as listed.', 1300)
      ], ['Message the host', 'Open a case', 'Talk to a person']);
    }

    if (has(t, 'wifi', 'password')) {
      return out([say('The WiFi network is "BigBearCabin" and the password is in the welcome guide on the counter.', 950)],
        ['Thanks', 'I still can’t connect']);
    }

    if (has(t, 'person', 'human', 'agent', 'real person', 'specialist')) return handoff('Airbnb');

    if (I.thanks(t)) return out([say('You are welcome! Enjoy your stay. 🏡', 800)], ['Thanks']);
    if (I.yes(t)) return out([say('Done. You will get a confirmation in the app.', 900)], ['Thanks']);
    if (I.no(t)) return out([say('No changes made. Your reservation is untouched.', 800)], ['Thanks']);
    if (I.laugh(t)) return out([say('Glad to help. Anything else?', 750)], ['No, thanks']);
    if (I.compliment(t)) return out([say('Thank you! We will pass that along.', 850)], ['Ha']);
    if (I.insult(t)) return out([say('I am sorry. I can connect you with a specialist now.', 900)], ['Connect me', 'It’s fine']);
    if (I.howareyou(t)) return out([say('Ready to help! What can I check for you?', 800)], ['Check-in details']);
    if (I.who(t)) return out([say('I am the Airbnb support assistant. A person can join any time.', 900)],
      ['Talk to a person', 'You’re fine']);

    const f = cycle(c, 'fallback', [
      'I can help with check-in, your reservation, or the host. Which one?',
      'Could you share your confirmation code so I can pull up the trip?',
      'Happy to help — is this about an upcoming stay or a past one?',
      'Tell me a little more and I will sort it out.'
    ]);
    return out([say(f, 900)], ['Check-in details', 'Cancel reservation', 'Talk to a person']);
  });

  /* ---------------- ADOBE ---------------- */
  register('adobe', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return out([say('This is Adobe Support. A specialist can take over at any time.', 900)],
      ['Talk to a person', 'Manage plan']);
    if (I.greet(t)) return brandGreet('Adobe');

    if (has(t, 'yes cancel', 'yes, cancel', 'confirm', 'proceed', 'do it')) {
      x.topic = 'plan';
      return out([
        say('Cancelled. You keep access until the 22nd, and there will be no further charges.', 1000),
        say('You can come back any time — your files stay in the cloud for 90 days.', 1300)
      ], ['Thanks']);
    }

    if (has(t, 'cancel plan', 'cancel it', 'cancel my plan', 'cancel my subscription', 'cancel')) {
      x.topic = 'plan';
      return out([
        say('I can cancel today with no early termination fee. You keep access until the 22nd.', 1050),
        say('Would you like me to proceed?', 1250)
      ], ['Yes, cancel', 'Keep it']);
    }

    if (has(t, 'renew', 'renewal', 'plan', 'subscription', 'billing', 'charge', 'price', 'cost', 'refund')) {
      x.topic = 'plan';
      return out([
        say('Creative Cloud All Apps renews on the 22nd at $59.99/month.', 1000),
        say('I can switch you to the Photography plan ($19.99) or cancel with no fee if you act before the renewal.', 1450)
      ], ['Switch to Photography', 'Cancel plan', 'Keep it']);
    }

    if (has(t, 'photography', 'switch', 'downgrade')) {
      return out([
        say('Switching to Photography (20 GB) keeps Lightroom and Photoshop but removes Illustrator, Premiere, and the rest.', 1100),
        say('Shall I make the change? It takes effect at the next renewal.', 1400)
      ], ['Yes, switch', 'Never mind']);
    }

    if (has(t, 'cancel')) {
      return out([
        say('I can cancel today with no early termination fee. You keep access until the 22nd.', 1050),
        say('Would you like me to proceed?', 1250)
      ], ['Yes, cancel', 'Keep it']);
    }

    if (has(t, 'license', 'activation', 'install', 'download', 'app', 'crash', 'error', 'sign in', 'login')) {
      return out([
        say('Let us start with the basics: sign out of Creative Cloud, restart the app, and sign back in.', 1000),
        say('If that does not work, tell me the app and the exact error message.', 1350)
      ], ['Still broken', 'That fixed it', 'Talk to a person']);
    }

    if (has(t, 'student', 'education', 'discount')) {
      return out([say('Students get 60% off All Apps with a valid school email — about $19.99/month for the first year.', 1000)],
        ['How do I verify?', 'Thanks']);
    }

    if (has(t, 'person', 'human', 'agent', 'real person', 'specialist')) return handoff('Adobe');

    if (I.thanks(t)) return out([say('You are welcome. Anything else I can help with?', 800)], ['No, thanks']);
    if (I.yes(t)) {
      if (x.topic === 'plan') return out([
        say('Cancelled. You keep access until the 22nd, and there will be no further charges.', 1000),
        say('You can come back any time — your files stay in the cloud for 90 days.', 1300)
      ], ['Thanks']);
      return out([say('Done. A confirmation is on its way to your email.', 900)], ['Thanks']);
    }
    if (I.no(t)) return out([say('No changes made. Your plan stays as it is.', 800)], ['Thanks']);
    if (I.laugh(t)) return out([say('Glad to help. Anything else?', 750)], ['No, thanks']);
    if (I.compliment(t)) return out([say('Thank you! We will share that with the team.', 850)], ['Ha']);
    if (I.insult(t)) return out([say('I am sorry. I can connect you with a specialist right now.', 900)], ['Connect me', 'It’s fine']);
    if (I.howareyou(t)) return out([say('Ready to help. What can I check for you?', 800)], ['Manage plan']);
    if (I.who(t)) return out([say('I am the Adobe Support assistant. A specialist can join any time.', 900)],
      ['Talk to a person', 'You’re fine']);

    const f = cycle(c, 'fallback', [
      'I can help with plans, billing, licensing, or an app issue. Which one?',
      'Could you tell me which Adobe app this is about?',
      'Happy to help — is this about your subscription or the software?',
      'Tell me a little more and I will point you in the right direction.'
    ]);
    return out([say(f, 900)], ['Manage plan', 'App issue', 'Talk to a person']);
  });

  /* ---------------- DISCORD ---------------- */
  register('discord', function (c, t) {
    const x = ctxOf(c);

    if (I.bot(t)) return out([say('I am the Discord support assistant. A human can take over if you want.', 900)],
      ['Talk to a person', 'What is Nitro?']);
    if (I.greet(t)) return brandGreet('Discord');

    if (has(t, 'cancel nitro', 'cancel subscription', 'cancel it', 'yes cancel', 'stop billing')) {
      return out([
        say('Nitro cancelled. It stays active until the end of the current billing period, then drops to the free plan.', 1050),
        say('Your server boosts will be released at that point. You can re-subscribe any time.', 1400)
      ], ['Thanks', 'Talk to a person']);
    }

    if (has(t, 'nitro', 'subscription', 'billing', 'price', 'boost', 'what is nitro')) {
      x.topic = 'nitro';
      return out([
        say('Nitro is $9.99/month or $99.99/year. Nitro Basic is $2.99/month.', 1000),
        say('Both include bigger uploads and custom emoji. Full Nitro adds HD streaming and 2 server boosts.', 1450)
      ], ['Compare plans', 'Cancel Nitro', 'Talk to a person']);
    }

    if (has(t, 'role', 'permissions', 'mod', 'moderation', 'ban', 'kick')) {
      return out([
        say('Server Settings → Roles → Create Role. Give it a color and turn on only the permissions it needs.', 1050),
        say('Put the role above @everyone in the list, or it will not apply.', 1350)
      ], ['Got it', 'Thanks']);
    }

    if (has(t, 'server', 'set up', 'create', 'invite', 'channel')) {
      x.topic = 'server';
      return out([
        say('To create a server: plus icon in the left rail → "Create My Own" → name it → invite friends.', 1050),
        say('Start with three channels: #general, #voice, and #memes. That is the whole strategy.', 1450)
      ], ['Got it', 'How do I add roles?', 'Talk to a person']);
    }

    if (has(t, 'enable 2fa', 'set up 2fa', 'how do i enable 2fa', 'turn on 2fa', 'two factor', 'two-factor', 'authenticator')) {
      return out([
        say('User Settings → My Account → Enable Two-Factor Auth. Use an authenticator app, not SMS.', 1000),
        say('Save the backup codes somewhere that is not a Notes app called "codes." I have seen things.', 1450)
      ], ['Got it', 'Thanks', 'Talk to a person']);
    }

    if (has(t, 'hacked', 'stolen', 'account', 'password', 'login', 'locked', '2fa', 'disabled', 'token')) {
      x.topic = 'security';
      return out([
        say('If your account was compromised, change your password and enable 2FA immediately.', 1000),
        say('If you are locked out, I can send a recovery link to the email on file. Shall I?', 1400)
      ], ['Send the link', 'Talk to a person']);
    }

    if (has(t, 'person', 'human', 'agent', 'real person', 'specialist')) return handoff('Discord');

    if (I.thanks(t)) return out([say('Happy to help! Anything else?', 800)], ['No, thanks']);
    if (I.yes(t)) return out([say('All set. Check your email for the next step.', 900)], ['Thanks']);
    if (I.no(t)) return out([say('No problem. Nothing has been changed.', 800)], ['Thanks']);
    if (I.laugh(t)) return out([say('Glad to help. Anything else?', 750)], ['No, thanks']);
    if (I.compliment(t)) return out([say('Thank you! We will pass that along.', 850)], ['Ha']);
    if (I.insult(t)) return out([say('I am sorry. I can bring in a human agent right now.', 900)], ['Connect me', 'It’s fine']);
    if (I.howareyou(t)) return out([say('Ready to help! What can I check?', 800)], ['What is Nitro?']);
    if (I.who(t)) return out([say('I am the Discord support assistant. A human can take over any time.', 900)],
      ['Talk to a person', 'You’re fine']);

    const f = cycle(c, 'fallback', [
      'I can help with Nitro, servers, roles, or account security. Which one?',
      'Could you tell me a little more about what you are trying to do?',
      'Happy to help — is this about your account or your server?',
      'Tell me what you are seeing and I will point you to the right setting.'
    ]);
    return out([say(f, 900)], ['What is Nitro?', 'Set up a server', 'Talk to a person']);
  });

  /* ==========================================================
     7. PUBLIC API
     ========================================================== */

  function respond(conv, text) {
    const handler = registry[conv.id];
    if (handler) return handler(conv, text);

    // no dedicated handler: generic friendly fallback
    return out([
      say("Got it. Tell me more.", 800)
    ], ['Okay', 'Sure']);
  }

  window.Engine = {
    respond: respond,
    register: register,
    normalize: norm,
    has: has,
    intents: I,
    emojiOnly: emojiOnly,
    isQuestion: isQuestion,
    say: say,
    img: img,
    sticker: sticker,
    link: link,
    file: file,
    out: out
  };
})();
