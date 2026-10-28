# GetServices.ai Site Assistant (Cloudflare Worker)

The AI brain behind the chat bubble on massmedicalcoding.com. One Worker serves many sites ("tenants"); each tenant has its own allowed domains, knowledge and settings in `src/tenants.js`.

- **Model:** Claude Haiku (`MODEL` in `wrangler.toml`)
- **Knowledge:** every page of the site, pulled in by `build-knowledge.mjs`
- **Safety:** messages that look like patient data are refused and never sent to the model; only listed domains can call it; per-visitor rate limit

## One-time setup (Cloudflare)

1. Install and log in: `npm i -g wrangler` then `wrangler login`
2. From this folder: `npm run deploy`
   - This rebuilds the knowledge from the site pages and deploys to
     `https://gs-site-assistant.python-tester.workers.dev`
3. Add your Anthropic API key as a secret (you type it; it is never stored in code):
   `wrangler secret put ANTHROPIC_API_KEY`
4. Check it's alive: open `https://gs-site-assistant.python-tester.workers.dev/health`

Until the key is set, the chat still works but answers with a friendly "request an assessment" message.

## When site pages change

Run `npm run deploy` again so the assistant learns the new content.

## Add another site

Add a new entry to `TENANTS` in `src/tenants.js` (domains, knowledge, replies), deploy, then add the widget script to that site with `data-tenant="<new key>"`.

## Tests

`npm test`
