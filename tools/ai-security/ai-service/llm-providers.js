const axios = require('axios');

class OllamaProvider {
    constructor(host = '192.168.1.100:11434') {
        this.host = host;
        // Handle URLs that already include http:// or https://
        if (host.startsWith('http://') || host.startsWith('https://')) {
            this.baseURL = host;
        } else {
            this.baseURL = `http://${host}`;
        }
    }

    async testConnection() {
        try {
            console.log('Testing Ollama connection to:', this.baseURL);
            const response = await axios.get(`${this.baseURL}/api/tags`, {
                timeout: 10000
            });
            console.log('Ollama connection successful');
            return {
                success: true,
                models: response.data.models || []
            };
        } catch (error) {
            console.error('Ollama test connection error:', error.message);
            console.error('Full error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async generateResponse(prompt, model = 'llama3.1:8b', context = '') {
        try {
            const currentDateTime = new Date().toISOString();
            const systemPrompt = `You are a helpful health assistant. Current date and time: ${currentDateTime}. ${context}`;
            
            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: model,
                prompt: systemPrompt + '\n\nUser: ' + prompt + '\n\nAssistant:',
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                    max_tokens: 1000
                }
            }, {
                timeout: 30000
            });

            return {
                success: true,
                response: response.data.response,
                model: model
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async analyzeImage(imageBase64, prompt, model = 'llama3.1:8b') {
        try {
            const currentDateTime = new Date().toISOString();
            const systemPrompt = `You are a helpful health assistant. Current date and time: ${currentDateTime}. Analyze the image and provide detailed information about the food or workout shown.`;
            
            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: model,
                prompt: systemPrompt + '\n\nUser: ' + prompt,
                images: [imageBase64],
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                    max_tokens: 1000
                }
            }, {
                timeout: 30000
            });

            return {
                success: true,
                response: response.data.response,
                model: model
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

class GeminiProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models';
    }

    async testConnection() {
        try {
            const response = await axios.get(`${this.baseURL}?key=${this.apiKey}`, {
                timeout: 5000
            });
            return {
                success: true,
                models: response.data.models || []
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async generateResponse(prompt, model = 'gemini-pro', context = '') {
        try {
            const currentDateTime = new Date().toISOString();
            const systemPrompt = `You are a helpful health assistant. Current date and time: ${currentDateTime}. ${context}`;
            
            const response = await axios.post(`${this.baseURL}/${model}:generateContent?key=${this.apiKey}`, {
                contents: [{
                    parts: [{
                        text: systemPrompt + '\n\nUser: ' + prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    maxOutputTokens: 1000
                }
            }, {
                timeout: 30000
            });

            return {
                success: true,
                response: response.data.candidates[0].content.parts[0].text,
                model: model
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async analyzeImage(imageBase64, prompt, model = 'gemini-pro-vision') {
        try {
            const currentDateTime = new Date().toISOString();
            const systemPrompt = `You are a helpful health assistant. Current date and time: ${currentDateTime}. Analyze the image and provide detailed information about the food or workout shown.`;
            
            const response = await axios.post(`${this.baseURL}/${model}:generateContent?key=${this.apiKey}`, {
                contents: [{
                    parts: [
                        {
                            text: systemPrompt + '\n\nUser: ' + prompt
                        },
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: imageBase64
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    maxOutputTokens: 1000
                }
            }, {
                timeout: 30000
            });

            return {
                success: true,
                response: response.data.candidates[0].content.parts[0].text,
                model: model
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

class LLMManager {
    constructor() {
        this.ollama = new OllamaProvider(process.env.OLLAMA_HOST);
        this.gemini = null;
        if (process.env.GEMINI_API_KEY) {
            this.gemini = new GeminiProvider(process.env.GEMINI_API_KEY);
        }
        this.config = {
            host_url: process.env.OLLAMA_HOST || '192.168.1.100:11434',
            model_name: 'llama3.1:8b'
        };
    }

    async getActiveProvider(userId, db) {
        // Simplified - always return Ollama for now
        return { provider: 'ollama', instance: this.ollama, model: 'llama3.1:8b' };
    }

    async testConnection(provider, config = {}) {
        if (provider === 'ollama') {
            const ollama = new OllamaProvider(config.host_url || process.env.OLLAMA_HOST);
            return await ollama.testConnection();
        } else if (provider === 'gemini' && this.gemini) {
            return await this.gemini.testConnection();
        }
        
        return { success: false, error: 'Provider not available' };
    }

    async generateResponse(userId, prompt, context = '', db) {
        const { provider, instance, model } = await this.getActiveProvider(userId, db);
        
        if (provider === 'ollama') {
            return await instance.generateResponse(prompt, model || 'llama3.1:8b', context);
        } else if (provider === 'gemini') {
            return await instance.generateResponse(prompt, model || 'gemini-pro', context);
        }
        
        return { success: false, error: 'No provider available' };
    }

    async analyzeImage(userId, imageBase64, prompt, db) {
        const { provider, instance, model } = await this.getActiveProvider(userId, db);
        
        if (provider === 'ollama') {
            return await instance.analyzeImage(imageBase64, prompt, model || 'llama3.1:8b');
        } else if (provider === 'gemini') {
            return await instance.analyzeImage(imageBase64, prompt, model || 'gemini-pro-vision');
        }
        
        return { success: false, error: 'No provider available' };
    }

    async getOllamaConfig() {
        return {
            success: true,
            config: this.config
        };
    }

    async saveOllamaConfig(host_url, model_name) {
        try {
            console.log('saveOllamaConfig called with host_url:', host_url, 'model_name:', model_name);
            // Validate the configuration by testing the connection
            const testProvider = new OllamaProvider(host_url);
            const testResult = await testProvider.testConnection();
            
            if (!testResult.success) {
                return {
                    success: false,
                    error: `Connection test failed: ${testResult.error}`
                };
            }

            // Check if the selected model exists
            const modelExists = testResult.models.some(model => model.name === model_name);
            if (!modelExists) {
                return {
                    success: false,
                    error: `Model '${model_name}' not found. Available models: ${testResult.models.map(m => m.name).join(', ')}`
                };
            }

            // Save the configuration
            this.config = { host_url, model_name };
            this.ollama = new OllamaProvider(host_url);

            return {
                success: true,
                message: 'Configuration saved successfully',
                config: this.config
            };
        } catch (error) {
            console.error('Save Ollama config error:', error);
            return {
                success: false,
                error: error.message || 'Unknown error occurred'
            };
        }
    }
}

module.exports = { OllamaProvider, GeminiProvider, LLMManager };
