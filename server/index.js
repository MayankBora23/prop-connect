import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase credentials are missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
}

// Auth middleware: verifies Supabase JWT and loads profile/role
async function requireAuth(req, res, next) {
  try {
    ensureSupabase();
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing bearer token' });
    }
    const token = auth.replace('Bearer ', '');
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const userId = userData.user.id;
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (profErr) {
      return res.status(403).json({ error: 'Profile not found' });
    }
    req.user = { id: userId, role: profile?.role || 'agent', profile };
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

async function selectAll(table) {
  ensureSupabase();
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw error;
  return data;
}

async function selectSingle(table, id) {
  ensureSupabase();
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

async function insertInto(table, body) {
  ensureSupabase();
  const { data, error } = await supabase.from(table).insert(body).select('*').single();
  if (error) throw error;
  return data;
}

async function updateTable(table, id, body) {
  ensureSupabase();
  const { data, error } = await supabase.from(table).update(body).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

async function deleteFrom(table, id) {
  ensureSupabase();
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, supabase: Boolean(supabase) });
});

// Public read endpoints (could be tightened with RLS later)
app.get('/leads', async (_req, res, next) => {
  try {
    res.json(await selectAll('leads'));
  } catch (err) {
    next(err);
  }
});

app.get('/properties', async (_req, res, next) => {
  try {
    res.json(await selectAll('properties'));
  } catch (err) {
    next(err);
  }
});

app.get('/site-visits', async (_req, res, next) => {
  try {
    res.json(await selectAll('site_visits'));
  } catch (err) {
    next(err);
  }
});

app.get('/follow-ups', async (_req, res, next) => {
  try {
    res.json(await selectAll('follow_ups'));
  } catch (err) {
    next(err);
  }
});

app.get('/messages', async (_req, res, next) => {
  try {
    res.json(await selectAll('messages'));
  } catch (err) {
    next(err);
  }
});

app.get('/users', async (_req, res, next) => {
  try {
    res.json(await selectAll('users'));
  } catch (err) {
    next(err);
  }
});

app.get('/workflows', async (_req, res, next) => {
  try {
    res.json(await selectAll('workflows'));
  } catch (err) {
    next(err);
  }
});

app.get('/analytics', async (_req, res, next) => {
  try {
    ensureSupabase();
    const { data, error } = await supabase.from('analytics').select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Auth-protected CRUD (example roles: admin, manager full; agent limited)
app.post('/leads', requireAuth, requireRole(['admin', 'manager', 'agent']), async (req, res, next) => {
  try {
    const lead = await insertInto('leads', req.body);
    res.json(lead);
  } catch (err) {
    next(err);
  }
});

app.put('/leads/:id', requireAuth, requireRole(['admin', 'manager', 'agent']), async (req, res, next) => {
  try {
    const lead = await updateTable('leads', req.params.id, req.body);
    res.json(lead);
  } catch (err) {
    next(err);
  }
});

app.delete('/leads/:id', requireAuth, requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    await deleteFrom('leads', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.post('/messages/send', requireAuth, requireRole(['admin', 'manager', 'agent', 'telecaller']), async (req, res, next) => {
  try {
    const { lead_id, lead_name, phone, content, type = 'text' } = req.body;
    const payload = {
      lead_id,
      lead_name,
      phone,
      content,
      direction: 'outgoing',
      status: 'pending',
      type,
    };
    const message = await insertInto('messages', payload);

    // Meta WhatsApp send (if configured)
    const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
    const token = process.env.META_WA_PERMANENT_TOKEN;
    if (phoneNumberId && token) {
      try {
        const resp = await fetch(
          `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone,
              type: 'text',
              text: { body: content },
            }),
          }
        );
        const json = await resp.json();
        if (!resp.ok) {
          throw new Error(json.error?.message || 'Meta send failed');
        }
        await updateTable('messages', message.id, {
          meta_message_id: json.messages?.[0]?.id,
          meta_status: 'sent',
          status: 'sent',
        });
      } catch (sendErr) {
        await updateTable('messages', message.id, { meta_status: 'error', meta_error: String(sendErr) });
      }
    }

    res.json(await selectSingle('messages', message.id));
  } catch (err) {
    next(err);
  }
});

// Meta webhook verification
app.get('/webhook/meta', (req, res) => {
  const verifyToken = process.env.META_WA_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Meta webhook receiver
app.post('/webhook/meta', async (req, res) => {
  try {
    ensureSupabase();
    const entries = req.body?.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const msgs = change.value?.messages || [];
        for (const msg of msgs) {
          if (msg.type === 'text') {
            await insertInto('messages', {
              lead_id: null,
              lead_name: msg.from,
              phone: msg.from,
              content: msg.text?.body,
              direction: 'incoming',
              status: msg.status || 'received',
              type: 'text',
              meta_message_id: msg.id,
            });
          }
        }
        const statuses = change.value?.statuses || [];
        for (const status of statuses) {
          if (status.id) {
            await supabase
              .from('messages')
              .update({ meta_status: status.status, status: status.status })
              .eq('meta_message_id', status.id);
          }
        }
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error', err);
    res.sendStatus(500);
  }
});

// Notifications fetch
app.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Mark notification read
app.post('/notifications/:id/read', requireAuth, async (req, res, next) => {
  try {
    const notif = await updateTable('notifications', req.params.id, { is_read: true });
    res.json(notif);
  } catch (err) {
    next(err);
  }
});

// Generic error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});

