# 🚀 WealthAI — Deploy Guide (Marathi + English)

## एकूण 4 Steps आहेत. Total वेळ: ~30-45 मिनिटे

---

## STEP 1 — Supabase Setup (Database)
**वेळ: ~10 मिनिटे**

1. supabase.com वर जा → "Start your project" → GitHub ने login करा
2. "New Project" क्लिक करा
   - Name: `wealthai`
   - Password: एक strong password
   - Region: `Southeast Asia (Singapore)` — India साठी closest
3. Project create झाल्यावर:
   - Left sidebar → "SQL Editor"
   - `supabase-schema.sql` फाईल open करा (project folder मध्ये आहे)
   - सगळा SQL copy करा आणि paste करून "Run" दाबा
4. Settings → API मध्ये जा:
   - `Project URL` copy करा → `.env.local` मध्ये `NEXT_PUBLIC_SUPABASE_URL` म्हणून paste करा
   - `anon public` key copy करा → `NEXT_PUBLIC_SUPABASE_ANON_KEY` म्हणून paste करा

---

## STEP 2 — Anthropic API Key
**वेळ: ~5 मिनिटे**

1. console.anthropic.com वर जा → Sign up
2. "API Keys" → "Create Key"
3. Key copy करा → `.env.local` मध्ये `ANTHROPIC_API_KEY` म्हणून paste करा
⚠️ Free tier: $5 credit मिळतो (~500 AI conversations)

---

## STEP 3 — GitHub वर Code Upload
**वेळ: ~5 मिनिटे**

```bash
# Terminal मध्ये run करा:
cd wealthai
git init
git add .
git commit -m "Initial WealthAI app"
```

1. github.com → New Repository → Name: `wealthai` → Create
2. Terminal मध्ये:
```bash
git remote add origin https://github.com/YOUR_USERNAME/wealthai.git
git push -u origin main
```

⚠️ `.env.local` file GitHub वर upload करू नका! `.gitignore` मध्ये आधीच add केली आहे.

---

## STEP 4 — Vercel वर Deploy
**वेळ: ~10 मिनिटे**

1. vercel.com → "Continue with GitHub"
2. "Add New Project" → तुमचा `wealthai` repo select करा
3. "Environment Variables" section मध्ये तीन variables add करा:
   ```
   NEXT_PUBLIC_SUPABASE_URL = (तुमचा supabase URL)
   NEXT_PUBLIC_SUPABASE_ANON_KEY = (तुमची anon key)
   ANTHROPIC_API_KEY = (तुमची anthropic key)
   ```
4. "Deploy" दाबा → 2-3 मिनिटांत live होईल!

तुम्हाला मिळेल: `https://wealthai-xyz.vercel.app`

---

## Mobile वर Install कसे करायचे? (PWA)

### Android (Chrome):
1. Chrome मध्ये app URL open करा
2. Top-right menu (⋮) → "Add to Home screen"
3. "Add" दाबा → Home screen वर app येईल

### iPhone (Safari):
1. Safari मध्ये app URL open करा (Chrome नाही!)
2. Share button (□↑) → "Add to Home Screen"
3. "Add" दाबा

Done! Native app सारखा icon येईल.

---

## मित्रांना कसे share करायचे?

Vercel URL share करा: `https://wealthai-xyz.vercel.app`

प्रत्येक मित्र:
- Sign up करेल (email + password)
- त्यांचा स्वतःचा data असेल (secure, दुसऱ्याला दिसत नाही)
- Phone वर install करू शकेल

---

## खर्च किती?

| Service | Free Tier |
|---------|-----------|
| Vercel | Free (hobby) |
| Supabase | Free (500MB, 50K rows) |
| Anthropic | $5 credit (~500 chats) |
| **Total** | **₹0 ते ~₹420/month** |

10-15 मित्र वापरतील तर पूर्णपणे free tier मध्ये येईल.

---

## Common Errors आणि Solutions

**"Invalid API Key"**
→ Vercel environment variables check करा, spaces नाहीत ना?

**"relation does not exist"**
→ Supabase SQL Editor मध्ये schema परत run करा

**App mobile वर install होत नाही**
→ iOS: Safari मध्येच करा, Chrome मध्ये होत नाही
→ Android: Chrome किंवा Edge वापरा

---

## पुढचे Steps (Optional)

- Custom domain: `wealthai.in` — ₹500/year (~Namecheap/GoDaddy)
- Push notifications: Web Push API add करा (bills साठी)
- Google Login: Supabase → Authentication → Providers → Google enable करा
