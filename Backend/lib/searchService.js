const KeyManager = require('./keyManager');
const { generateAiExplanations } = require('./aiExplainer');

const keyManager = new KeyManager();

async function reliableSearch(query){
  if(!query) throw new Error('missing_query');
  // For now, raw_search_results is empty (no external web search). We focus on AI explanations.
  const raw_search_results = [];

  // If there are no keys configured, try direct aiExplainer without key (it may fallback to OpenAI or local fallback)
  if(!keyManager.hasKeys()){
    const out = await generateAiExplanations(query, raw_search_results, null);
    return { simple_explanation: out.simple_explanation, detailed_explanation: out.detailed_explanation, api_source: out.api_source||'fallback', raw_search_results };
  }

  // Try keys with failover
  const tries = Math.max(1, keyManager.keys.length);
  let lastErr = null;
  for(let attempt=0; attempt<tries; attempt++){
    const ent = keyManager.getNextKey();
    if(!ent || !ent.key){ lastErr = new Error('no_key_available'); break; }
    const key = ent.key;
    try{
      const out = await generateAiExplanations(query, raw_search_results, key);
      // success
      return { simple_explanation: out.simple_explanation, detailed_explanation: out.detailed_explanation, api_source: out.api_source||'gemini', raw_search_results };
    }catch(e){
      lastErr = e;
      // If rate limited, mark cooldown and continue
      if(e && (e.code === 429 || /rate_limit|rate_limited|quota/i.test(String(e.message || '')))){
        try{ keyManager.markCooldown(key, Number(process.env.GEMINI_KEY_COOLDOWN_MS || (10 * 60 * 1000))); }catch(e2){}
        continue;
      }
      // If invalid key, mark invalid and try next
      if(/invalid|not valid|401|403/i.test(String(e.message || ''))){
        try{ keyManager.markInvalid(key); }catch(e2){}
        continue;
      }
      // otherwise, mark short cooldown and continue
      try{ keyManager.markCooldown(key, Number(process.env.GEMINI_KEY_COOLDOWN_MS || (10 * 60 * 1000))); }catch(e2){}
    }
  }
  // All attempts failed
  const fallback = await generateAiExplanations(query, raw_search_results, null);
  return { simple_explanation: fallback.simple_explanation, detailed_explanation: fallback.detailed_explanation, api_source: fallback.api_source||'fallback', raw_search_results };
}

module.exports = { reliableSearch };
