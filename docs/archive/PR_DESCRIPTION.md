# Pull Request: Update to Latest LLM Models (Nov 2025) + Dynamic Discovery

## Summary

This PR adds comprehensive updates to the multi-LLM provider system with the absolute latest models as of November 2025 and implements intelligent dynamic model discovery for OpenRouter and Fireworks.

## 🎯 Key Changes

### 1. Latest Model Updates (40+ Models Added)
Updated all providers with November 2025's cutting-edge models:

**OpenAI:**
- ✨ GPT-5.1 Instant (Nov 12, 2025) - Latest with adaptive reasoning
- ✨ GPT-5.1 Thinking - Advanced reasoning, faster and more persistent
- GPT-5, GPT-4o, O1 models

**Anthropic:**
- ✨ Claude Sonnet 4.5 (Sep 29, 2025) - "Best coding model in the world"
- ✨ Claude Haiku 4.5 (Oct 15, 2025) - Fast, cost-efficient
- ✨ Claude Opus 4.1 (Aug 5, 2025) - Upgraded for agentic tasks

**Google:**
- ✨ Gemini 2.5 Pro - Most advanced with 1M context window
- ✨ Gemini 2.5 Flash - Optimized for speed
- ✨ Gemini 2.5 Flash-Lite - Most cost-efficient

**xAI:**
- ✨ Grok 4 (July 9, 2025) - Most intelligent with native tool use
- ✨ Grok 4 Heavy - Multi-agent collaboration
- ✨ Grok 4 Fast - 2M context window, 40% fewer thinking tokens
- ✨ Grok Code Fast 1 - Speedy reasoning for agentic coding

### 2. Four New Providers Added 🆕

**DeepSeek** - V3.2 Exp with sparse attention
- 50%+ cheaper API ($0.028 per 1M tokens)
- 128K context, open source (MIT license)

**Kimi (Moonshot AI)** - K2 Thinking
- 1 trillion parameters (32B active)
- Outperforms GPT-5 on benchmarks (60.2% vs 54.9% on BrowseComp)
- 200-300 simultaneous tool calls
- 256K context window

**MiniMax** - M2
- 8% of Claude Sonnet price
- 2x faster than competitors
- 230B params (10B active)

**GLM (Zhipu AI)** - 4.6
- 355B parameter MoE model
- Strong coding performance
- 200K context, MIT license

### 3. Dynamic Model Discovery 🔄

Intelligent model fetching for OpenRouter and Fireworks:

**Features:**
- Queries provider APIs for latest available models
- Smart filtering (excludes deprecated, beta, small models)
- Intelligent prioritization based on:
  - Version numbers (GPT-5 > GPT-4)
  - Model size (405B > 70B)
  - Specialization (reasoning, coding)
  - Release date (2025 > 2024)
- Categorized UI groups:
  - ⭐ Flagship Models (top 3)
  - 🧠 Reasoning Models
  - 💻 Coding Models
  - 📋 All Available Models (top 20)
- Context windows displayed for each model

**User Experience:**
1. Select OpenRouter or Fireworks
2. Enter API key
3. Click "🔄 Fetch Latest Models..."
4. Get live, prioritized model list!

## 📊 Impact

**Total Providers: 10** (up from 6)
- OpenAI, Anthropic, Google, xAI (updated)
- DeepSeek, Kimi, MiniMax, GLM (new)
- OpenRouter, Fireworks (with dynamic discovery)

**Total Models: 40+** (up from ~20)
- Latest flagship models from each provider
- Competitive Chinese models included
- Context windows up to 2M tokens (Grok 4 Fast)

## 🔧 Technical Implementation

**Files Modified:**
- `src/providers/models.js` - 40+ models with metadata
- `src/providers/provider-factory.js` - Added 4 new providers
- `src/ui/chat.html` - Updated UI with 10 providers + dynamic fetch
- `src/main.js` - IPC handler for model fetching
- `src/preload/chat-preload.js` - Exposed fetchProviderModels

**Files Added:**
- `src/providers/deepseek-provider.js` - DeepSeek integration
- `src/providers/kimi-provider.js` - Kimi/Moonshot integration
- `src/providers/minimax-provider.js` - MiniMax integration
- `src/providers/glm-provider.js` - GLM/Zhipu integration
- `src/providers/model-discovery.js` - Dynamic model discovery service

## 🧪 Testing

**Providers to Test:**
- [ ] OpenAI with GPT-5.1
- [ ] Anthropic with Claude Sonnet 4.5
- [ ] Google with Gemini 2.5 Pro
- [ ] xAI with Grok 4
- [ ] DeepSeek with V3.2 Exp
- [ ] Kimi with K2 Thinking
- [ ] MiniMax with M2
- [ ] GLM with 4.6
- [ ] OpenRouter dynamic fetch
- [ ] Fireworks dynamic fetch

## 📝 Commits

1. `ef0dcdb` - Update to latest LLM models (Nov 2025) and add 4 new providers
2. `81b308d` - Add dynamic model discovery for OpenRouter and Fireworks

## 🎯 Related Issues

Closes: (if applicable)

---

**Note:** This PR builds on the initial multi-provider support that was already merged. These changes add the latest models and dynamic discovery capabilities.
