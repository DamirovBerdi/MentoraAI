const express = require('express');
const router = express.Router();
const { reliableSearch } = require('../lib/searchService');

router.post('/', async (req, res) => {
  try{
    const q = req.body && req.body.query ? String(req.body.query).trim() : '';
    if(!q) return res.status(400).json({ error: 'missing_query' });
    const result = await reliableSearch(q);
    return res.json({ ok: true, simple_explanation: result.simple_explanation, detailed_explanation: result.detailed_explanation, api_source: result.api_source || 'unknown', raw_search_results: result.raw_search_results || [] });
  }catch(e){
    console.error('search_api error', e && e.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
