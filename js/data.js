/* ============================================================
   data.js — people, groups, businesses, seeded conversations
   ============================================================ */
(function () {
  'use strict';

  const NOW = Date.now();
  let seedId = 0;

  function m(from, text, mins, extra) {
    return Object.assign({
      id: 'seed_' + (++seedId),
      from: from,
      text: text,
      ts: NOW - Math.round(mins * 60000)
    }, extra || {});
  }

  /* ----------------------------------------------------------
     ME
     ---------------------------------------------------------- */
  const ME = {
    id: 'me',
    name: 'Alex Rivera',
    handle: '@alexrivera',
    avatar: 'assets/avatars/me.jpg',
    status: 'Available',
    bio: 'Designer, amateur chef, professional overthinker.'
  };

  /* ----------------------------------------------------------
     PEOPLE
     ---------------------------------------------------------- */
  const PEOPLE = {
    maya: {
      id: 'maya', kind: 'person', name: 'Maya Chen', handle: '@mayachen',
      avatar: 'assets/avatars/maya.jpg', online: 'online',
      status: 'online', subtitle: 'Active now',
      bio: 'Designer. Will text you 14 times in a row. Loves a plan.',
      location: 'Brooklyn, NY', joined: 'Friends since 2019'
    },
    devon: {
      id: 'devon', kind: 'person', name: 'Devon Brooks', handle: '@dbrooks',
      avatar: 'assets/avatars/devon.jpg', online: 'online',
      status: 'online', subtitle: 'Active now',
      bio: 'Roommate. Meal prep evangelist. Will not shut up about leg day.',
      location: 'Brooklyn, NY', joined: 'Roommates since 2022'
    },
    priya: {
      id: 'priya', kind: 'person', name: 'Priya Raghavan', handle: '@priyar',
      avatar: 'assets/avatars/priya.jpg', online: 'away',
      status: 'away', subtitle: 'Away · 12m',
      bio: 'Product manager. Turns chaos into Jira tickets.',
      location: 'Manhattan, NY', joined: 'Work · Product'
    },
    liam: {
      id: 'liam', kind: 'person', name: "Liam O'Connor", handle: '@liamoc',
      avatar: 'assets/avatars/liam.jpg', online: 'online',
      status: 'online', subtitle: 'Active now',
      bio: 'Cousin. Gamer. Will absolutely ruin your sleep schedule.',
      location: 'Queens, NY', joined: 'Family'
    },
    nina: {
      id: 'nina', kind: 'person', name: 'Nina Alvarez', handle: '@ninaalvz',
      avatar: 'assets/avatars/nina.jpg', online: 'online',
      status: 'online', subtitle: 'Active 4m ago',
      bio: 'Brand designer, freelance. Sends links at 2am.',
      location: 'Chicago, IL', joined: 'Design friends'
    },
    marcus: {
      id: 'marcus', kind: 'person', name: 'Marcus Reed', handle: '@mreed',
      avatar: 'assets/avatars/marcus.jpg', online: 'offline',
      status: 'offline', subtitle: 'Last active 2h ago',
      bio: 'Neighbor and apartment dad. Owns exactly one power drill.',
      location: 'Brooklyn, NY', joined: 'Neighbors'
    },
    sophie: {
      id: 'sophie', kind: 'person', name: 'Sophie Laurent', handle: '@sophielaurent',
      avatar: 'assets/avatars/sophie.jpg', online: 'online',
      status: 'online', subtitle: 'Active now',
      bio: 'Paris → New York. Café hunter. Here for the croissants.',
      location: 'Paris, FR', joined: 'Language exchange'
    },
    tyler: {
      id: 'tyler', kind: 'person', name: 'Tyler Kim', handle: '@tylerk',
      avatar: 'assets/avatars/tyler.jpg', online: 'online',
      status: 'online', subtitle: 'Active 1m ago',
      bio: 'Student. Broke. Somehow always ordering takeout.',
      location: 'Brooklyn, NY', joined: 'College friend'
    },
    grace: {
      id: 'grace', kind: 'person', name: 'Grace Whitfield', handle: '@gracew',
      avatar: 'assets/avatars/grace.jpg', online: 'online',
      status: 'online', subtitle: 'Active now',
      bio: 'Mom. Sends dog photos. Expects a call every Sunday.',
      location: 'New Jersey', joined: 'Family'
    },
    ethan: {
      id: 'ethan', kind: 'person', name: 'Ethan Cole', handle: '@ecole',
      avatar: 'assets/avatars/ethan.jpg', online: 'busy',
      status: 'busy', subtitle: 'In a meeting',
      bio: 'Backend engineer. Will explain the bug whether you asked or not.',
      location: 'Manhattan, NY', joined: 'Work · Engineering'
    },
    zoe: {
      id: 'zoe', kind: 'person', name: 'Zoe Martins', handle: '@zoemrtns',
      avatar: 'assets/avatars/zoe.jpg', online: 'offline',
      status: 'offline', subtitle: 'Last active 40m ago',
      bio: 'Currently in Lisbon. Sends voice notes longer than most podcasts.',
      location: 'Lisbon, PT', joined: 'College friend'
    },
    omar: {
      id: 'omar', kind: 'person', name: 'Omar Haddad', handle: '@omarhaddad',
      avatar: 'assets/avatars/omar.jpg', online: 'online',
      status: 'online', subtitle: 'Active now',
      bio: 'Personal trainer. Believes in you. Also believes in burpees.',
      location: 'Brooklyn, NY', joined: 'Gym'
    },
    diane: {
      id: 'diane', kind: 'person', name: 'Diane Park', handle: '@dianepark',
      avatar: 'assets/avatars/diane.jpg', online: 'away',
      status: 'away', subtitle: 'Away · 1h',
      bio: 'Technical recruiter. Sends opportunities with suspicious timing.',
      location: 'Remote', joined: 'Recruiter'
    },
    noah: {
      id: 'noah', kind: 'person', name: 'Noah Bennett', handle: '@noahb',
      avatar: 'assets/avatars/noah.jpg', online: 'offline',
      status: 'offline', subtitle: 'Last active 3h ago',
      bio: 'Old friend. Just moved back. Owns 70% boxes, 30% optimism.',
      location: 'Brooklyn, NY', joined: 'High school'
    }
  };

  /* ----------------------------------------------------------
     GROUPS
     ---------------------------------------------------------- */
  const GROUPS = {
    'weekend-trip': {
      id: 'weekend-trip', kind: 'group', name: 'Weekend Trip 🏔️',
      members: ['maya', 'devon', 'liam'],
      subtitle: '4 members · 3 online',
      pinnedText: 'Maya: Cabin shortlist + cost split in the doc',
      color: '#7c5cff'
    },
    'design-team': {
      id: 'design-team', kind: 'group', name: 'Design Team',
      members: ['priya', 'nina', 'ethan'],
      subtitle: '4 members · 2 online',
      pinnedText: 'Review Thursday 3:00 PM — add notes to the doc',
      color: '#006aff'
    },
    'family': {
      id: 'family', kind: 'group', name: 'Family ❤️',
      members: ['grace', 'liam'],
      subtitle: '3 members · 2 online',
      pinnedText: 'Sunday dinner 6pm. Bring an appetite.',
      color: '#e41e3f'
    },
    'book-club': {
      id: 'book-club', kind: 'group', name: 'Book Club 📚',
      members: ['sophie', 'isabel', 'zoe'],
      subtitle: '4 members · 2 online',
      pinnedText: 'Next pick: "The Left Hand of Darkness" — Ch. 1–6 by Friday',
      color: '#b06a2c'
    },
    'apartment': {
      id: 'apartment', kind: 'group', name: 'Apartment 4B',
      members: ['marcus', 'tyler', 'noah'],
      subtitle: '4 members · 2 online',
      pinnedText: 'Rent due Friday. Venmo Marcus.',
      color: '#31a24c'
    }
  };

  /* Extra people used only inside groups / pickers */
  const EXTRA_PEOPLE = {
    isabel: {
      id: 'isabel', kind: 'person', name: 'Isabel Rossi', handle: '@isabelrossi',
      avatar: 'assets/avatars/isabel.jpg', online: 'online',
      status: 'online', subtitle: 'Active now',
      bio: 'Book club founder. Has opinions about endings.',
      location: 'Rome, IT', joined: 'Book club'
    },
    kai: {
      id: 'kai', kind: 'person', name: 'Kai Nakamura', handle: '@kainak',
      avatar: 'assets/avatars/kai.jpg', online: 'online',
      status: 'online', subtitle: 'Active now',
      bio: 'Gaming buddy. Plays support. Blames lag.',
      location: 'Seattle, WA', joined: 'Online friends'
    }
  };

  /* ----------------------------------------------------------
     BUSINESSES
     ---------------------------------------------------------- */
  const BRANDS = {
    spotify: {
      id: 'spotify', kind: 'brand', name: 'Spotify', verified: true,
      avatar: 'assets/logos/spotify-badge.svg', category: 'Music & Audio',
      subtitle: 'Typically replies in a few minutes',
      bio: 'Music for every moment. Support for every playlist.',
      website: 'spotify.com'
    },
    nike: {
      id: 'nike', kind: 'brand', name: 'Nike', verified: true,
      avatar: 'assets/logos/nike-badge.svg', category: 'Shopping & Retail',
      subtitle: 'Order updates · Returns · Product help',
      bio: 'Official Nike support. Just do it — we will help.',
      website: 'nike.com'
    },
    netflix: {
      id: 'netflix', kind: 'brand', name: 'Netflix', verified: true,
      avatar: 'assets/logos/netflix-badge.svg', category: 'Entertainment',
      subtitle: 'Billing · Account · Streaming help',
      bio: 'Official Netflix support.',
      website: 'netflix.com'
    },
    ubereats: {
      id: 'ubereats', kind: 'brand', name: 'Uber Eats', verified: true,
      avatar: 'assets/logos/ubereats-badge.svg', category: 'Food & Drink',
      subtitle: 'Order help · Refunds · Delivery',
      bio: 'Official Uber Eats support. We will get your food sorted.',
      website: 'ubereats.com'
    },
    duolingo: {
      id: 'duolingo', kind: 'brand', name: 'Duolingo', verified: true,
      avatar: 'assets/logos/duolingo-badge.svg', category: 'Education',
      subtitle: 'Streaks · Lessons · Account',
      bio: 'The owl is always watching. 🦉',
      website: 'duolingo.com'
    },
    steam: {
      id: 'steam', kind: 'brand', name: 'Steam', verified: true,
      avatar: 'assets/logos/steam-badge.svg', category: 'Gaming',
      subtitle: 'Purchases · Refunds · Account security',
      bio: 'Official Steam support.',
      website: 'store.steampowered.com'
    },
    apple: {
      id: 'apple', kind: 'brand', name: 'Apple Support', verified: true,
      avatar: 'assets/logos/apple-badge.svg', category: 'Technology',
      subtitle: 'Devices · Apple ID · Billing',
      bio: 'Official Apple Support.',
      website: 'support.apple.com'
    },
    airbnb: {
      id: 'airbnb', kind: 'brand', name: 'Airbnb', verified: true,
      avatar: 'assets/logos/airbnb-badge.svg', category: 'Travel',
      subtitle: 'Reservations · Check-in · Cancellations',
      bio: 'Official Airbnb support.',
      website: 'airbnb.com'
    },
    adobe: {
      id: 'adobe', kind: 'brand', name: 'Adobe', verified: true,
      avatar: 'assets/logos/adobe-badge.svg', category: 'Software',
      subtitle: 'Plans · Billing · Licensing',
      bio: 'Official Adobe support.',
      website: 'adobe.com'
    },
    discord: {
      id: 'discord', kind: 'brand', name: 'Discord', verified: true,
      avatar: 'assets/logos/discord-badge.svg', category: 'Social',
      subtitle: 'Nitro · Servers · Account',
      bio: 'Official Discord support.',
      website: 'discord.com'
    }
  };

  /* ----------------------------------------------------------
     SEEDED CONVERSATIONS
     ---------------------------------------------------------- */
  const SEEDS = {

    maya: {
      unread: 1,
      messages: [
        m('maya', 'okay I found THE cabin 😍', 64),
        m('maya', '', 63, { type: 'image', src: 'assets/img/trip.jpg', caption: '' }),
        m('maya', "20 min from the trailhead, hot tub, and the host says there are 'friendly deer'", 62),
        m('maya', 'please tell me you are still in', 12, { chips: ['I’m in', 'Need to check', 'How much?'] })
      ]
    },

    devon: {
      unread: 0,
      messages: [
        m('me', 'did you actually do meal prep or did you order out again', 70),
        m('devon', 'I did meal prep. 6 containers. chicken, rice, broccoli.', 62),
        m('devon', 'the broccoli is a little sad but so am I', 61),
        m('devon', 'gym at 6? do not ghost me again', 48, { chips: ['I’ll be there', 'Too early', '6:30?'] })
      ]
    },

    priya: {
      unread: 1,
      messages: [
        m('priya', 'Hey! Quick one before standup — did you get the revised specs?', 40),
        m('me', 'not yet, checking now', 38),
        m('priya', 'No rush. I pushed the review to 3 so you have time.', 34, { chips: ['Got them', 'Where are they?'] }),
        m('priya', 'Also: your feedback on the empty states was genuinely great.', 33)
      ]
    },

    liam: {
      unread: 2,
      messages: [
        m('liam', 'bro. the new patch is insane', 30),
        m('liam', '', 29, { type: 'sticker', sticker: '🎮' }),
        m('liam', "we're queuing at 9. you in or are you 'busy' again", 25, { chips: ['I’m in', 'Can’t tonight'] })
      ]
    },

    nina: {
      unread: 0,
      messages: [
        m('nina', 'ok hear me out', 130),
        m('nina', '', 129, {
          type: 'link', url: 'https://dribbble.com/shots/branding',
          site: 'Dribbble', title: 'Studio Mono — Identity System',
          desc: 'A monochrome identity for a small architecture studio. Type-led, brutalist grid.',
          img: 'assets/img/setup.jpg'
        }),
        m('nina', 'this is the energy I want for the rebrand. thoughts? be honest', 128, { chips: ['Love it', 'Too cold', 'Show me more'] })
      ]
    },

    marcus: {
      unread: 0,
      messages: [
        m('marcus', 'trash bins are out', 320),
        m('marcus', 'also the sink is leaking again 😐', 318),
        m('me', 'again??', 316),
        m('marcus', 'I put a bowl under it. we are fine. probably.', 314),
        m('marcus', 'I texted the landlord. he read it and said nothing, which is his version of a plan', 313)
      ]
    },

    sophie: {
      unread: 0,
      messages: [
        m('sophie', 'Bonjour ! ☀️', 370),
        m('sophie', 'I found a café that does actual croissants. Not the sad American ones. Real ones.', 369),
        m('sophie', 'Saturday? You can practice your terrible French 😄', 368, { chips: ['Saturday works', 'What time?'] })
      ]
    },

    tyler: {
      unread: 0,
      messages: [
        m('tyler', 'I have 3 dollars and a dream', 250),
        m('me', 'what happened to your paycheck', 248),
        m('tyler', 'rent happened. and then a very necessary pair of sneakers happened', 246),
        m('tyler', 'anyway do you still have that giant bag of rice', 245, { chips: ['Yes', 'It’s mine', 'Come get it'] })
      ]
    },

    grace: {
      unread: 3,
      messages: [
        m('grace', '', 200, { type: 'image', src: 'assets/img/dog.jpg', caption: 'He found a stick. Life is good.' }),
        m('grace', 'He misses you. (I miss you too.)', 198),
        m('grace', 'Did you eat? Be honest.', 197),
        m('grace', 'Call me when you can ❤️', 196)
      ]
    },

    ethan: {
      unread: 0,
      messages: [
        m('ethan', 'the deploy is green', 430),
        m('ethan', 'also I found the bug', 428),
        m('me', 'what was it', 427),
        m('ethan', 'it was me. I was the bug. I was passing the wrong id.', 425),
        m('ethan', 'anyway. standup in 10. bring coffee, not optimism', 420)
      ]
    },

    zoe: {
      unread: 0,
      messages: [
        m('zoe', '', 540, { type: 'voice', duration: 34 }),
        m('zoe', 'Lisbon is unreal. I am never coming back.', 538),
        m('zoe', '', 536, { type: 'image', src: 'assets/img/concert.jpg', caption: 'found a rooftop show by accident' }),
        m('zoe', 'also I finished the book on the train and I have THOUGHTS', 534)
      ]
    },

    omar: {
      unread: 0,
      messages: [
        m('omar', 'Leg day tomorrow. 7am.', 660),
        m('omar', 'Do not eat like it is your birthday tonight.', 658),
        m('omar', 'Bring the resistance band. The green one.', 656, { chips: ['Got it', '7 is rough'] })
      ]
    },

    diane: {
      unread: 0,
      messages: [
        m('diane', 'Hi Alex — hope you are well!', 1500),
        m('diane', 'I have a Senior Product Designer role that made me think of you. Hybrid, 3 days in Manhattan.', 1498),
        m('diane', 'Open to a quick chat this week? No pressure at all.', 1496, { chips: ['Tell me more', 'Not right now'] })
      ]
    },

    noah: {
      unread: 0,
      messages: [
        m('noah', 'dude I am officially moved in', 1700),
        m('noah', 'the apartment is 70% boxes but the wifi works so priorities are handled', 1698),
        m('noah', 'beer this week? I need to complain about furniture assembly', 1696, { chips: ['I’m free', 'This week is rough'] })
      ]
    },

    'weekend-trip': {
      unread: 3,
      pinned: true,
      messages: [
        m('maya', 'OK team. Cabin shortlist is in the link. Vote by tonight or I pick.', 80),
        m('devon', 'as long as there is a grill I am in', 76),
        m('liam', 'I can drive but my car hates hills', 72),
        m('devon', 'your car hates everything', 71),
        m('maya', "so that's a yes from everyone? 🏔️", 18, { chips: ['Yes', 'How much per person?'] })
      ]
    },

    'design-team': {
      unread: 0,
      pinned: true,
      messages: [
        m('priya', 'Reminder: review at 3. Please add your notes to the doc before then.', 500),
        m('ethan', 'added mine. mostly jokes but there are two real notes in there.', 470),
        m('nina', 'I will be 2 min late, finishing the mockups. Start without me.', 460),
        m('priya', 'Starting without you means staring at your empty chair, so no.', 455),
        m('priya', 'Alex, can you own the empty-state section?', 300, { chips: ['Yes', 'I need context'] })
      ]
    },

    'family': {
      unread: 0,
      pinned: true,
      messages: [
        m('grace', 'Sunday dinner at 6. Everyone please come.', 200),
        m('liam', 'I will be there if there is pie', 190),
        m('grace', 'There is always pie.', 185),
        m('me', 'I will bring drinks', 180),
        m('grace', 'Bring the sparkling water your father likes. Not the cheap one.', 175)
      ]
    },

    'book-club': {
      unread: 0,
      messages: [
        m('sophie', 'Chapter 9 destroyed me 😭', 1400),
        m('isabel', 'I knew it was coming and I still cried on the bus', 1390),
        m('zoe', 'reading it on the train was a mistake. a stranger handed me a tissue.', 1380),
        m('isabel', 'Next pick is up. Chapter 1–6 by Friday, no excuses.', 1370)
      ]
    },

    'apartment': {
      unread: 0,
      pinned: true,
      messages: [
        m('marcus', 'someone left the stove on', 400),
        m('tyler', 'wasn’t me', 395),
        m('noah', 'it was definitely you tyler', 390),
        m('tyler', 'ok it was me but the pan survived', 388),
        m('marcus', 'rent is due Friday. Venmo me. This is not a discussion.', 360)
      ]
    },

    spotify: {
      unread: 1,
      messages: [
        m('spotify', 'Your 2025 Wrapped is ready 🎧', 1440),
        m('spotify', 'You listened for 41,208 minutes. Your top artist was Fred again.. for the third year in a row.', 1438),
        m('spotify', 'Tap below to see your full recap.', 1436, { chips: ['Show my Wrapped', 'Recommend something new'] })
      ]
    },

    nike: {
      unread: 0,
      messages: [
        m('nike', 'Your order has shipped! 📦', 2900),
        m('nike', 'Order #NK-88214 · Air Max 90 "Infrared" · Size 10', 2898),
        m('nike', 'Estimated delivery: Thursday by 8 PM.', 2896, { chips: ['Track order', 'Start a return'] })
      ]
    },

    netflix: {
      unread: 1,
      messages: [
        m('netflix', 'We could not process your payment.', 2880),
        m('netflix', 'Your account is on hold until the balance is updated. Update your payment method to keep watching.', 2878, { chips: ['Update payment', 'See plans'] })
      ]
    },

    ubereats: {
      unread: 0,
      messages: [
        m('ubereats', 'Your order is on the way 🛵', 180),
        m('ubereats', 'Order #UE-4471 · Ramen Tatsu · 1× Spicy Miso, 1× Gyoza', 179),
        m('ubereats', 'Estimated arrival: 8:42 PM', 178, { chips: ['Where is my order?', 'Report a problem'] })
      ]
    },

    duolingo: {
      unread: 1,
      messages: [
        m('duolingo', '🔥 47 day streak. Do not lose it now.', 1200),
        m('duolingo', 'You are 3 lessons away from finishing Unit 4. I believe in you. I always believe in you.', 1198, { chips: ['Start a lesson', 'I’m busy'] })
      ]
    },

    steam: {
      unread: 0,
      messages: [
        m('steam', 'A game on your wishlist is on sale', 4300),
        m('steam', 'Hades II — 30% off. Offer ends in 46 hours.', 4298, { chips: ['View deal', 'Refund a game'] })
      ]
    },

    apple: {
      unread: 0,
      messages: [
        m('apple', 'Your Apple ID was used to sign in on a new device.', 5000),
        m('apple', 'Device: MacBook Pro 14" · Location: Brooklyn, NY · Time: 9:14 AM', 4998),
        m('apple', 'If this was you, no action is needed.', 4996, { chips: ['This wasn’t me', 'It was me'] })
      ]
    },

    airbnb: {
      unread: 0,
      messages: [
        m('airbnb', 'Your reservation is confirmed 🏡', 6000),
        m('airbnb', 'Cabin in Big Bear · Oct 24–26 · 2 guests · Confirmation HMK4T2', 5998, { chips: ['Check-in details', 'Cancel reservation'] })
      ]
    },

    adobe: {
      unread: 0,
      messages: [
        m('adobe', 'Your Creative Cloud plan renews in 3 days.', 7000),
        m('adobe', 'Creative Cloud All Apps · $59.99/month · Renews Oct 22', 6998, { chips: ['Manage plan', 'Cancel plan'] })
      ]
    },

    discord: {
      unread: 0,
      messages: [
        m('discord', 'Welcome to Discord! 👋', 8000),
        m('discord', 'Here is how to get started: create a server, invite your friends, and pick a voice channel.', 7998, { chips: ['What is Nitro?', 'Set up a server'] })
      ]
    }
  };

  /* ----------------------------------------------------------
     MEDIA / PICKERS
     ---------------------------------------------------------- */
  const STICKERS = ['😂', '🥹', '😎', '🙃', '🤝', '🔥', '💀', '👀', '🫠', '🎉', '❤️', '🍜', '☕', '🏔️', '🎮', '🦉'];
  const GIFS = [
    { emoji: '🐱', label: 'cat typing' },
    { emoji: '💃', label: 'celebration' },
    { emoji: '😭', label: 'laughing crying' },
    { emoji: '🤯', label: 'mind blown' },
    { emoji: '🍕', label: 'pizza' },
    { emoji: '👏', label: 'applause' },
    { emoji: '🫠', label: 'melting' },
    { emoji: '🎉', label: 'confetti' }
  ];

  const EMOJI_CATEGORIES = [
    {
      icon: '🕘', name: 'Frequently used', emojis: [
        '😂', '❤️', '🥹', '😭', '🔥', '👍', '🙏', '😅', '😍', '🤔', '💀', '👀',
        '✨', '🎉', '😎', '🙃', '🫠', '🤝', '💯', '☕', '🍜', '🏔️', '🎮', '📦'
      ]
    },
    {
      icon: '😀', name: 'Smileys & people', emojis: [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '😊', '😇', '🙂',
        '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝',
        '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞',
        '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭',
        '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥',
        '😓', '🤗', '🤔', '🫣', '🤭', '🫢', '🫡', '🤫', '🤥', '😶', '😐', '😑',
        '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵',
        '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿'
      ]
    },
    {
      icon: '🙌', name: 'Gestures & body', emojis: [
        '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟',
        '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊',
        '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '💪', '🦾', '🫵'
      ]
    },
    {
      icon: '🐶', name: 'Animals & nature', emojis: [
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
        '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅',
        '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞',
        '🌵', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🍁', '🍄', '🌾',
        '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌚', '🌙', '⭐'
      ]
    },
    {
      icon: '🍔', name: 'Food & drink', emojis: [
        '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒',
        '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥕', '🌽', '🌶️', '🥒',
        '🍞', '🥐', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🍔',
        '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🍜', '🍝', '🍣', '🍱',
        '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦',
        '🍰', '🎂', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '☕', '🍵', '🧋'
      ]
    },
    {
      icon: '⚽', name: 'Activities & travel', emojis: [
        '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓',
        '🏸', '🏒', '🏑', '🥍', '🏏', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋',
        '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🏋️', '🤼', '🤸',
        '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚',
        '✈️', '🛫', '🛬', '🚀', '🛸', '🚁', '⛵', '🚤', '🛥️', '🚢', '🏔️', '⛰️'
      ]
    },
    {
      icon: '💡', name: 'Objects & symbols', emojis: [
        '⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾',
        '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟',
        '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛',
        '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙',
        '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚',
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
        '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️',
        '✅', '❌', '❗', '❓', '💯', '🔥', '✨', '🎉', '🎊', '💫', '⭐', '🌟'
      ]
    }
  ];

  const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

  window.DATA = {
    ME: ME,
    PEOPLE: PEOPLE,
    EXTRA_PEOPLE: EXTRA_PEOPLE,
    GROUPS: GROUPS,
    BRANDS: BRANDS,
    SEEDS: SEEDS,
    STICKERS: STICKERS,
    GIFS: GIFS,
    EMOJI_CATEGORIES: EMOJI_CATEGORIES,
    QUICK_REACTIONS: QUICK_REACTIONS
  };
})();
