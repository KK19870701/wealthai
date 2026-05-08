# 🚀 Vercel वर Update कसे Push करायचे
## (Step-by-step — Marathi)

---

## Method 1 — Git Push (Recommended — Automatic deploy)

### एकदाच Setup करायचे (5 मिनिटे):

```bash
# Terminal उघडा → project folder मध्ये जा
cd wealthai

# Git initialize (आधी केले नसेल तर)
git init
git add .
git commit -m "first commit"

# GitHub वर new repo बनवा: github.com → New Repository → "wealthai"
git remote add origin https://github.com/YOUR_USERNAME/wealthai.git
git branch -M main
git push -u origin main
```

**Vercel ला GitHub connect करा:**
1. vercel.com → Import Project → GitHub repo select करा
2. Environment Variables add करा (एकदाच):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   - `ANTHROPIC_API_KEY`
3. Deploy दाबा ✅

### पुढे जेव्हाही update करायचे असेल:

```bash
# Files बदलल्यानंतर हे 3 commands:
git add .
git commit -m "upgraded AI advisor with real data"
git push
```

**Vercel automatically detect करतो आणि 2 मिनिटांत live होतो!**
Zero extra steps. Push केले की deploy झाले. 🚀

---

## Method 2 — Vercel CLI (Direct, GitHub शिवाय)

```bash
# एकदाच install करा:
npm i -g vercel

# Project folder मध्ये:
cd wealthai
vercel login

# पहिल्यांदा:
vercel --prod

# पुढे update करायला:
vercel --prod
```

---

## या Update मध्ये नवीन काय आहे?

| Feature | आधी | आता |
|---------|-----|-----|
| AI Advisor | Generic tips | Real Supabase data वरून specific advice |
| Dashboard | Basic numbers | Health Score, Goal Tracker, Trend Chart |
| Annual Goal | नव्हते | Progress bar + prediction |
| Category Spend | Simple list | Budget vs Actual bars |
| AI Fallback | Error crash | Friendly Marathi message |
| Overspend Alert | नव्हते | Real-time category alerts |
| Profile Page | नव्हते | Name, Income, Annual Goal set करता येतो |

---

## ⚠️ Vercel Free Tier Limits — काय लक्षात ठेवायचे?

| Resource | Free Limit | तुमचा Usage |
|----------|-----------|-------------|
| Bandwidth | 100 GB/month | 10 users = ~1 GB → Safe ✅ |
| Function Invocations | 100,000/month | AI calls = ~500/month → Safe ✅ |
| Build minutes | 6,000/month | प्रत्येक deploy = 2-3 min → Safe ✅ |
| Serverless functions | 12 regions | India region available ✅ |

**10-20 मित्र वापरतील → Vercel free tier मध्ये कधीच limit येणार नाही.**

Anthropic API: $5 free credit = ~500 AI chats → संपली तर $10 top-up करा.

---

## नवीन Environment Variable (Optional — better security)

Supabase service role key add केली तर AI advisor अधिक reliable होतो:

```
SUPABASE_SERVICE_ROLE_KEY = (Supabase → Settings → API → service_role key)
```

Vercel → Project → Settings → Environment Variables मध्ये add करा.

---

## Deploy झाल्यावर Test करा:

1. App उघडा → Login करा
2. 2-3 transactions add करा
3. Dashboard → Health Score दिसतो का?
4. AI Advisor → "कुठे जास्त खर्च?" विचारा
5. Profile → Annual Goal set करा → Dashboard वर Goal Tracker दिसतो
