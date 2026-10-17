# AI runtime

SKILLSETRA uses **Puter AI exclusively** for AI-assisted features. AI requests are handed to the browser through Puter.js (`https://js.puter.com/v2/`), so no provider key is bundled into the frontend or archive. The backend provides role-aware prompts, persistence, scoring rules, and the browser handoff; the browser executes model inference through the selected Puter model.

Supported model choices are returned by `/api/v1/ai/models` and include GPT-OSS 20B, DeepSeek Chat, Qwen Coder, and Llama 3.3 70B through Puter. Model availability depends on Puter's current catalogue and the user's browser connection. There is no  or secondary provider selector/fallback. Legacy provider settings are migrated to Puter.

AI-generated practice and interview feedback are explicitly treated as unverified client-side signals; they can inform learning recommendations but are not independent proof of mastery or artifact ownership.
