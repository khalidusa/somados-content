// Buffer — القراءة والجدولة. كل قاعدة هنا من القسم ٥.٥.
// تنبيه صريح: أشكال الاستعلامات أدناه مبنية على التوثيق لا على تجربة حية بعد.
// verifyShapes() هي الخطوة ٧ بترتيب البناء: تتحقق منها بمعرّف قناة وهمي
// قبل إنشاء أي منشور حقيقي. لا تنشر قبل أن تمر.
const API = 'https://api.buffer.com/2/graphql';
const DUMMY_CHANNEL = '0'.repeat(24);      // «Channel not found» = الشكل صحيح وبلا أي منشور

const FREE_QUEUE_LIMIT = 10;               // الخطة المجانية: 10 بالطابور لكل قناة
const QUEUE_TARGET = 9;                    // نستهدف 9 ونتحقق من العدد الحقيقي قبل الإضافة

function token() {
  const t = process.env.BUFFER_ACCESS_TOKEN;
  if (!t) throw new Error('BUFFER_ACCESS_TOKEN غير موجود — ضعه بـ.env أو GitHub Secrets');
  return t;
}

async function gql(query, variables = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || j?.errors) {
    const msg = j?.errors?.map(e => e.message).join(' · ') || `HTTP ${res.status}`;
    const e = new Error(msg); e.graphQLErrors = j?.errors; e.status = res.status; throw e;
  }
  return j.data;
}

const Q_CHANNELS = `query { account { currentOrganization { id name
  channels { id service serviceId name isLocked isDisconnected } } } }`;

async function listChannels() {
  const d = await gql(Q_CHANNELS);
  const org = d?.account?.currentOrganization;
  return { orgId: org?.id, orgName: org?.name, channels: org?.channels || [] };
}

/**
 * الترقيم الافتراضي فخ: posts يرجع صفحة أولى بحجم 10 بدون تمرير first،
 * فالطابور يُقرأ 10 بينما فيه 21 — ثم نتجاوز السقف ونفقد منشورات بصمت.
 */
const Q_POSTS = `query($channelId: ChannelId!, $first: Int!, $after: String) {
  posts(input: { channelIds: [$channelId], status: [scheduled], first: $first, after: $after }) {
    edges { node { id status dueAt text } }
    pageInfo { hasNextPage endCursor }
  } }`;

async function listQueue(channelId, { pageSize = 50 } = {}) {
  const all = [];
  let after = null;
  for (let guard = 0; guard < 40; guard++) {
    const d = await gql(Q_POSTS, { channelId, first: pageSize, after });
    const c = d?.posts;
    all.push(...(c?.edges || []).map(e => e.node));
    if (!c?.pageInfo?.hasNextPage) break;
    after = c.pageInfo.endCursor;
  }
  return all;
}

async function queueDepth(channelId) {
  return (await listQueue(channelId)).length;
}

/**
 * بناء مُدخل المنشور.
 * - shouldShareToFeed إجباري لانستغرام (Boolean! مخفي بالتوثيق).
 * - firstComment يُحذف بالخطة المجانية — الميزة مدفوعة وترفض الطلب كله.
 * - isAiGenerated: إن أراد المالك عدم التصريح، نحذف الحقل ولا نرسل false.
 *   إرسال false تصريح كاذب لميتا؛ عدم التصريح ليس كذباً.
 */
function buildPostInput({ channelId, service, text, mediaUrl, isVideo, dueAt, thumbnailUrl }) {
  const input = {
    channelId,
    text,
    dueAt,
    media: isVideo
      ? [{ video: { url: mediaUrl, thumbnail: thumbnailUrl || undefined } }]
      : [{ image: { url: mediaUrl } }],
  };
  if (service === 'instagram') input.instagram = { shouldShareToFeed: true };
  if (process.env.BUFFER_FIRST_COMMENT) input.firstComment = process.env.BUFFER_FIRST_COMMENT;
  if (process.env.DECLARE_AI_GENERATED === 'true') input.isAiGenerated = true;
  return input;
}

const M_CREATE = `mutation($input: PostCreateInput!) {
  postCreate(input: $input) { ... on Post { id status dueAt }
    ... on MutationError { message } } }`;

async function createPost(args) {
  return gql(M_CREATE, { input: buildPostInput(args) });
}

/**
 * الخطوة ٧: تحقق من الأشكال بمعرّف وهمي من 24 صفراً — بدون إنشاء أي منشور.
 * «Channel not found» تعني الشكل صحيح. أي خطأ آخر يعني الشكل غلط ولازم يُصحَّح.
 */
async function verifyShapes() {
  const results = [];
  const probe = async (name, fn) => {
    try { await fn(); results.push({ name, ok: true, note: 'مرّ بلا خطأ' }); }
    catch (e) {
      const msg = e.message || '';
      const shapeOk = /channel not found|not found|no such channel|invalid channel/i.test(msg);
      results.push({ name, ok: shapeOk, note: msg.slice(0, 200) });
    }
  };
  await probe('listQueue(dummy)', () => listQueue(DUMMY_CHANNEL, { pageSize: 50 }));
  await probe('createPost(dummy, image)', () => createPost({
    channelId: DUMMY_CHANNEL, service: 'facebook', text: 'shape probe',
    mediaUrl: 'https://example.invalid/probe.png', isVideo: false,
    dueAt: new Date(Date.now() + 864e5).toISOString(),
  }));
  await probe('createPost(dummy, instagram video)', () => createPost({
    channelId: DUMMY_CHANNEL, service: 'instagram', text: 'shape probe',
    mediaUrl: 'https://example.invalid/probe.mp4', isVideo: true,
    dueAt: new Date(Date.now() + 864e5).toISOString(),
  }));
  return results;
}

module.exports = {
  gql, listChannels, listQueue, queueDepth, createPost, buildPostInput, verifyShapes,
  DUMMY_CHANNEL, FREE_QUEUE_LIMIT, QUEUE_TARGET,
};
