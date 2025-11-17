# Multi-LLM Provider Support

LLM-DOM-Browser now supports multiple LLM providers, allowing you to choose from various AI models to analyze your web content and documents.

## Supported Providers

### 1. **OpenAI**
- Provider ID: `openai`
- Models:
  - `gpt-4o` - GPT-4 Omni (default)
  - `gpt-4o-mini` - GPT-4 Omni Mini
  - `gpt-4-turbo` - GPT-4 Turbo
  - `gpt-3.5-turbo` - GPT-3.5 Turbo
  - `o1` - O1 reasoning model
  - `o1-mini` - O1 Mini
- API Key: Get from [OpenAI Platform](https://platform.openai.com/)

### 2. **Anthropic (Claude)**
- Provider ID: `anthropic`
- Models:
  - `claude-3-5-sonnet-20241022` - Claude 3.5 Sonnet (default)
  - `claude-3-5-haiku-20241022` - Claude 3.5 Haiku
  - `claude-3-opus-20240229` - Claude 3 Opus
  - `claude-3-sonnet-20240229` - Claude 3 Sonnet
  - `claude-3-haiku-20240307` - Claude 3 Haiku
- API Key: Get from [Anthropic Console](https://console.anthropic.com/)

### 3. **Google Gemini**
- Provider ID: `google`
- Models:
  - `gemini-2.0-flash-exp` - Gemini 2.0 Flash (default)
  - `gemini-1.5-pro` - Gemini 1.5 Pro
  - `gemini-1.5-flash` - Gemini 1.5 Flash
- API Key: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

### 4. **xAI (Grok)**
- Provider ID: `xai`
- Models:
  - `grok-2-1212` - Grok 2 (default)
  - `grok-2-vision-1212` - Grok 2 Vision
  - `grok-beta` - Grok Beta
- API Key: Get from [xAI Console](https://console.x.ai/)

### 5. **OpenRouter**
- Provider ID: `openrouter`
- Models (aggregates multiple providers):
  - `anthropic/claude-3.5-sonnet` - Claude 3.5 Sonnet (default)
  - `openai/gpt-4o` - GPT-4o
  - `google/gemini-2.0-flash-exp` - Gemini 2.0 Flash
  - `x-ai/grok-2-1212` - Grok 2
- API Key: Get from [OpenRouter](https://openrouter.ai/)
- Note: OpenRouter provides access to multiple models through a single API key

### 6. **Fireworks AI**
- Provider ID: `fireworks`
- Models:
  - `accounts/fireworks/models/llama-v3p3-70b-instruct` - Llama 3.3 70B (default)
  - `accounts/fireworks/models/llama-v3p1-405b-instruct` - Llama 3.1 405B
  - `accounts/fireworks/models/qwen2p5-72b-instruct` - Qwen 2.5 72B
- API Key: Get from [Fireworks AI](https://fireworks.ai/)

## How to Use

### In the UI

1. **Select Provider**: Use the "Provider" dropdown to choose your LLM provider
2. **Select Model**: Use the "Model" dropdown to choose a specific model (or leave as "Default")
3. **Enter API Key**: Input your API key for the selected provider
4. **Ask Questions**: Type your question and click "Send"

### Programmatically

```javascript
// In your code
const result = await llmOrchestrator.analyzeContent(
  query,        // Your question
  tabIds,       // Array of tab IDs to analyze
  apiKey,       // Your API key
  'openai',     // Provider name
  'gpt-4o'      // Model name (optional, uses default if null)
);
```

## Architecture

### Provider System

The multi-provider system is built with a clean architecture:

```
src/providers/
├── base-provider.js         # Base class with common functionality
├── openai-provider.js        # OpenAI implementation
├── anthropic-provider.js     # Anthropic implementation
├── gemini-provider.js        # Google Gemini implementation
├── xai-provider.js           # xAI implementation
├── openrouter-provider.js    # OpenRouter implementation
├── fireworks-provider.js     # Fireworks implementation
├── provider-factory.js       # Factory for creating providers
└── models.js                 # Model definitions and metadata
```

### Key Features

- **Lightweight**: Uses native fetch API instead of heavy SDKs
- **Retry Logic**: Automatic retry with exponential backoff
- **Error Handling**: Comprehensive error handling and validation
- **Extensible**: Easy to add new providers
- **Type-Safe**: Clear interfaces and validation

### Base Provider Features

All providers inherit from `BaseProvider` which provides:

- HTTP request handling with retry logic
- Timeout management
- Rate limit handling (429 errors)
- Server error retries (5xx errors)
- Streaming response support
- Error message formatting

## Adding a New Provider

To add a new LLM provider:

1. **Create Provider Class** in `src/providers/your-provider.js`:

```javascript
const BaseProvider = require('./base-provider');

class YourProvider extends BaseProvider {
  constructor(config = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://api.yourprovider.com/v1'
    });
    this.validateConfig(['apiKey', 'model']);
  }

  async generateCompletion(prompt, options = {}) {
    // Implement your API call logic
  }
}

module.exports = YourProvider;
```

2. **Add Models** in `src/providers/models.js`:

```javascript
const MODELS = {
  yourprovider: {
    'model-id': {
      name: 'Model Name',
      maxTokens: 4096,
      contextWindow: 128000
    }
  }
};
```

3. **Register in Factory** in `src/providers/provider-factory.js`:

```javascript
case 'yourprovider':
  return new YourProvider(config);
```

4. **Add to UI** in `src/ui/chat.html`:

```html
<option value="yourprovider">Your Provider</option>
```

## Environment Variables

You can also configure providers via environment variables:

```bash
# Provider-specific API keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
XAI_API_KEY=...
OPENROUTER_API_KEY=...
FIREWORKS_API_KEY=...

# Custom endpoints (optional)
OPENAI_BASE_URL=https://custom.openai.endpoint
ANTHROPIC_BASE_URL=https://custom.anthropic.endpoint
```

## Configuration Options

Each provider supports these configuration options:

- `apiKey` (required): Your API key
- `model` (optional): Specific model ID (defaults to provider's default model)
- `baseUrl` (optional): Custom API endpoint
- `maxRetries` (optional): Number of retry attempts (default: 3)
- `timeout` (optional): Request timeout in milliseconds (default: 60000)

Example:

```javascript
const provider = ProviderFactory.createProvider('openai', {
  apiKey: 'sk-...',
  model: 'gpt-4o',
  maxRetries: 5,
  timeout: 120000
});
```

## Request Options

When making a completion request, you can specify:

- `temperature` (default: 0.7): Controls randomness (0-1)
- `maxTokens` (default: 2000): Maximum tokens in the response

Example:

```javascript
const response = await provider.generateCompletion(prompt, {
  temperature: 0.3,
  maxTokens: 4000
});
```

## Error Handling

The provider system handles various error scenarios:

- **Invalid API Key**: Clear error message
- **Rate Limiting**: Automatic retry with exponential backoff
- **Server Errors**: Automatic retry with backoff
- **Timeouts**: Configurable timeout with clear error
- **Network Errors**: Retry logic for transient failures

## API Compatibility

Providers are grouped by API compatibility:

- **OpenAI-compatible**: OpenAI, xAI, Fireworks, OpenRouter
- **Anthropic API**: Anthropic
- **Google API**: Google Gemini

This allows code reuse for providers with similar APIs.

## Performance Considerations

- Providers use native fetch API for minimal overhead
- Streaming support for real-time responses (where available)
- Automatic connection pooling
- Request/response caching (configurable)

## Security

- API keys are never logged or exposed in error messages
- All requests use HTTPS
- Environment variables supported for sensitive data
- API keys stored only in memory during session

## Testing

To test a provider:

1. Get an API key from the provider
2. Open LLM-DOM-Browser
3. Select the provider in the dropdown
4. Enter your API key
5. Load a web page or PDF
6. Ask a question about the content

The response will indicate which provider was used.

## Troubleshooting

### "API key is required"
- Ensure you've entered an API key in the input field
- Check that the API key is valid for the selected provider

### "Provider not supported"
- Verify the provider name is correct
- Check that the provider is listed in the dropdown

### "Request timeout"
- Increase the timeout setting
- Check your internet connection
- Verify the API endpoint is accessible

### "Rate limit exceeded"
- Wait for the rate limit window to reset
- Consider using a different provider
- Upgrade your API plan if needed

## Future Enhancements

Planned improvements:

- [ ] Streaming responses in UI
- [ ] Cost tracking per provider
- [ ] Model comparison view
- [ ] Custom model parameters
- [ ] Provider-specific features (e.g., vision, function calling)
- [ ] Local model support (Ollama, LM Studio)
- [ ] API key management with encryption
- [ ] Provider health status indicators

## Contributing

To contribute a new provider integration:

1. Fork the repository
2. Create a new provider class
3. Add tests
4. Update documentation
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

Multi-LLM provider support is part of LLM-DOM-Browser and follows the same license.
