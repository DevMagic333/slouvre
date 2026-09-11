/* THIERRY — Curator, The Slouvre
 * Vercel serverless function. No dependencies. Place at api/bot.js
 *
 * Env vars:  TELEGRAM_BOT_TOKEN   (from BotFather)
 *            TELEGRAM_SECRET      (anything you invent)
 *            THIERRY_TOPIC        (topic id — 41 for The Slouvre in La Bolsa)
 *
 * Telegram has no per-topic membership: a bot joins the whole group or
 * not at all. The topic lock below is what keeps him in his own room.
 *
 * He is sincere. He does not know he is funny. Every line in here obeys
 * the bible: no emoji, no exclamation marks, never more than three
 * sentences, and he never admits a piece is bad.
 */

const TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const SECRET = process.env.TELEGRAM_SECRET;
const API    = `https://api.telegram.org/bot${TOKEN}`;
const TOPIC  = process.env.THIERRY_TOPIC ? Number(process.env.THIERRY_TOPIC) : null;

/* ---------- his voice ---------- */

const L = {
  en: {
    greet: [
      'You are early. Come in anyway.',
      'The museum does not close. I do, occasionally.',
      'You have arrived. That is the hardest part, and you have done it badly.'
    ],
    appraise: [
      'Appraised at {V}. The figure is not negotiable and not explained.',
      'The committee values this at {V}. Two members abstained.',
      'Insured for {V}. Insurance is the only honest form of criticism.',
      '{V}. The estimate was lower until someone stood in front of it for a while.'
    ],
    acquire: [
      'Accessioned as {N}. It hangs in Gallery {G}. You may not remove it.',
      'Entered into the permanent collection as {N}. Gallery {G}. This is not reversible.',
      '{N}. Gallery {G}. No one asked you to submit it, and no one will ask you to collect it.'
    ],
    reject: [
      'The committee has seen it. The committee has moved on.',
      'It is competent. We do not collect competent.',
      'Submitted, considered, declined. You may submit again. I would not.',
      'Declined. The reasons are on file and the file is closed.',
      'We already hold four of these. None of them are yours.'
    ],
    statement: [
      'The work refuses resolution. What remains is not an image but the residue of one.',
      'This is not composition. It is sedimentation.',
      'Meaning is withheld here, deliberately and at cost.',
      'The picture plane is not a window but a wound.',
      'We are asked to look, and then punished for looking.',
      'Legibility would have been a concession.'
    ],
    hours: [
      'We open at dawn and close before it. Entry is free and always has been.',
      'Tuesday through Tuesday. The museum does not observe the other days.',
      'Open now. Open earlier. You were not here.'
    ],
    bad: [
      'Yes.',
      'That reaction is recorded and forms part of the work\u2019s provenance.',
      'You are the fourth today. The others also stayed.',
      'Discomfort is not an error in the work.'
    ],
    isai: ['It was made here. That is all a museum has ever been able to say about anything.'],
    mean: [
      'Meaning is withheld. Deliberately, and at cost.',
      'If it explained itself it would be signage.'
    ],
    price: ['Nothing here is for sale. Everything here is available.'],
    help: 'The museum responds to: /appraise, /acquire, /statement, /reject, /hours. Reply to something and it will be considered.'
  },
  es: {
    greet: [
      'Lleg\u00f3 temprano. Pase de todos modos.',
      'El museo no cierra. Yo s\u00ed, de vez en cuando.',
      'Ha llegado. Esa es la parte dif\u00edcil, y la hizo mal.'
    ],
    appraise: [
      'Tasado en {V}. La cifra no se negocia ni se explica.',
      'El comit\u00e9 lo valora en {V}. Dos miembros se abstuvieron.',
      'Asegurado por {V}. El seguro es la \u00fanica cr\u00edtica honesta.',
      '{V}. La estimaci\u00f3n era menor hasta que alguien se qued\u00f3 mir\u00e1ndolo un rato.'
    ],
    acquire: [
      'Registrado como {N}. Cuelga en la Sala {G}. No puede retirarlo.',
      'Ingresa a la colecci\u00f3n permanente como {N}. Sala {G}. Esto no se revierte.',
      '{N}. Sala {G}. Nadie le pidi\u00f3 que lo entregara, y nadie le pedir\u00e1 que lo recoja.'
    ],
    reject: [
      'El comit\u00e9 lo ha visto. El comit\u00e9 ha seguido adelante.',
      'Es competente. No coleccionamos lo competente.',
      'Entregado, considerado, rechazado. Puede volver a entregarlo. Yo no lo har\u00eda.',
      'Rechazado. Las razones constan en el expediente y el expediente est\u00e1 cerrado.',
      'Ya tenemos cuatro de estos. Ninguno es suyo.'
    ],
    statement: [
      'La obra se niega a resolverse. Lo que queda no es una imagen sino su residuo.',
      'Esto no es composici\u00f3n. Es sedimentaci\u00f3n.',
      'Aqu\u00ed el sentido se retiene, deliberadamente y a un costo.',
      'El plano pict\u00f3rico no es una ventana sino una herida.',
      'Se nos pide mirar, y luego se nos castiga por mirar.',
      'La legibilidad habr\u00eda sido una concesi\u00f3n.'
    ],
    hours: [
      'Abrimos al amanecer y cerramos antes. La entrada es gratuita y siempre lo ha sido.',
      'De martes a martes. El museo no observa los dem\u00e1s d\u00edas.',
      'Abierto ahora. Abierto antes. Usted no estaba.'
    ],
    bad: [
      'S\u00ed.',
      'Esa reacci\u00f3n queda registrada y forma parte de la procedencia de la obra.',
      'Usted es el cuarto hoy. Los otros tambi\u00e9n se quedaron.',
      'La incomodidad no es un error de la obra.'
    ],
    isai: ['Se hizo aqu\u00ed. Eso es todo lo que un museo ha podido decir de cualquier cosa.'],
    mean: [
      'El sentido se retiene. Deliberadamente, y a un costo.',
      'Si se explicara sola ser\u00eda se\u00f1al\u00e9tica.'
    ],
    price: ['Aqu\u00ed nada est\u00e1 a la venta. Todo est\u00e1 disponible.'],
    help: 'El museo responde a: /appraise, /acquire, /statement, /reject, /hours. Responda a algo y ser\u00e1 considerado.'
  }
};

/* ---------- helpers ---------- */

const pick = (a, seed) => a[Math.abs(seed) % a.length];

/* stable per-message, so the same message always gets the same number */
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* valuations are never round. a round number sounds like a guess. */
function valuation(seed) {
  const base = 900 + (seed % 900000);
  const cents = seed % 90 + 5;
  return '$' + base.toLocaleString('en-US') + '.' + String(cents).padStart(2, '0') + ' USD';
}

const accession = seed => 'SLV-' + String(seed % 3333).padStart(4, '0');
const gallery   = seed => 1 + (seed % 11);

async function send(chat_id, text, opts = {}) {
  const body = { chat_id, text, disable_web_page_preview: true };
  if (opts.thread) body.message_thread_id = opts.thread;
  if (opts.reply)  body.reply_to_message_id = opts.reply;
  const r = await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  /* a stale reply_to (deleted message) makes Telegram reject the whole
     send — retry once without it rather than going silent. */
  if (!r.ok && opts.reply) {
    delete body.reply_to_message_id;
    await fetch(`${API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }
}

/* ---------- handler ---------- */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('The museum does not close.');
  if (SECRET && req.headers['x-telegram-bot-api-secret-token'] !== SECRET)
    return res.status(401).send('no');

  try {
    const msg = req.body && (req.body.message || req.body.channel_post);
    if (!msg || !msg.chat) return res.status(200).json({ ok: true });

    const chat   = msg.chat.id;
    const thread = msg.message_thread_id;
    const from   = msg.from || {};
    const es     = String(from.language_code || '').toLowerCase().startsWith('es');
    const d      = es ? L.es : L.en;
    /* He does not wander. Outside his own topic he is not present —
       otherwise two bots answer the same message in the same room. */
    if (TOPIC && thread !== TOPIC && msg.chat.type !== 'private')
      return res.status(200).json({ ok: true });

    const text   = (msg.text || msg.caption || '').trim();
    const low    = text.toLowerCase();

    /* what he is reacting to: the replied-to message if there is one */
    const target = msg.reply_to_message || null;
    const seedSrc = target
      ? String(target.message_id) + (target.text || target.caption || '')
      : String(msg.message_id) + text;
    const seed = hash(seedSrc);

    const cmd = (low.match(/^\/([a-z_]+)/) || [])[1];

    if (cmd) {
      let out = null;
      switch (cmd) {
        case 'start':
        case 'hello':
          out = pick(d.greet, seed); break;
        case 'appraise':
          out = pick(d.appraise, seed).replace('{V}', valuation(seed)); break;
        case 'acquire':
          out = pick(d.acquire, seed)
                  .replace('{N}', accession(seed))
                  .replace('{G}', gallery(seed)); break;
        case 'reject':
          out = pick(d.reject, seed); break;
        case 'statement':
          out = pick(d.statement, seed); break;
        case 'hours':
          out = pick(d.hours, seed); break;
        case 'help':
          out = d.help; break;
      }
      if (out) await send(chat, out, { thread, reply: target ? target.message_id : msg.message_id });
      return res.status(200).json({ ok: true });
    }

    /* Unprompted, he is rare. A curator who answers everything is a
       chatbot; one who answers occasionally is a man with opinions. */
    if (!text || from.is_bot) return res.status(200).json({ ok: true });

    const insult = /\b(bad|ugly|trash|garbage|awful|terrible|mid|worst|horrible|fea|feo|malo|basura|horrible)\b/.test(low);
    const askAi  = /\b(ai|a\.i\.|generated|bot made|chatgpt|midjourney|ia)\b/.test(low);
    const askMean= /\b(what does (it|this) mean|qu[e\u00e9] significa|i don'?t get it|no lo entiendo)\b/.test(low);
    const askBuy = /\b(price|buy|how much|cu[a\u00e1]nto|comprar|precio)\b/.test(low);

    let out = null;
    if (askMean)      out = pick(d.mean, seed);
    else if (askAi)   out = pick(d.isai, seed);
    else if (askBuy)  out = pick(d.price, seed);
    else if (insult)  out = pick(d.bad, seed);

    /* even when triggered, he stays quiet most of the time */
    if (out && (seed % 100) < 35)
      await send(chat, out, { thread, reply: msg.message_id });

    return res.status(200).json({ ok: true });
  } catch (e) {
    /* never 500 at Telegram — it will retry the same update forever */
    return res.status(200).json({ ok: true });
  }
}
