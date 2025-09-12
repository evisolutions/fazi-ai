const OpenAI = require('openai');
const config = require('../config/config');

class OpenAIService {
  constructor() {
    this.model = "gpt-5-mini-2025-08-07"
    if (!config.openaiApiKey) {
      console.warn('Warning: OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }
    
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    });
  }

  // Check if OpenAI is properly configured
  isConfigured() {
    return !!config.openaiApiKey;
  }

  // Process chat completion with message history, data, and prompt
  async processChatCompletion(messageHistory, data, prompt) {
    try {
      if (!this.isConfigured()) {
        throw new Error('OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable.');
      }

      // Validate inputs
      if (!Array.isArray(messageHistory)) {
        throw new Error('messageHistory must be an array');
      }

      if (!prompt || typeof prompt !== 'string') {
        throw new Error('prompt must be a non-empty string');
      }

      // Prepare the system message with context data
      let systemMessage = {
        role: 'system',
        content: `You are an AI assistant helping with data analysis and calculations. 
        
Context data provided: ${JSON.stringify(data, null, 2)}

Instructions: ${prompt}

Please provide helpful and accurate responses based on the provided data and conversation history.`
      };

      // Prepare messages array
      let messages = [systemMessage];

      // Add message history (ensure proper format)
      const formattedHistory = messageHistory.map(msg => {
        if (typeof msg === 'object' && msg.role && msg.content) {
          return {
            role: msg.role,
            content: msg.content
          };
        } else if (typeof msg === 'string') {
          return {
            role: 'user',
            content: msg
          };
        } else {
          throw new Error('Invalid message format in history');
        }
      });

      messages = messages.concat(formattedHistory);

      // Ensure we don't exceed token limits (basic check)
      if (messages.length > 50) {
        console.warn('Message history is quite long, consider truncating for better performance');
      }

      console.log('\n=== OpenAI Chat Request ===');
      console.log('Number of messages:', messages.length);
      console.log('Data context provided:', !!data);
      console.log('Custom prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
      console.log('========================\n');

      // Make the API call
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages,
      });

      const response = completion.choices[0].message;

      console.log('\n=== OpenAI Response ===');
      console.log('Response length:', response.content.length);
      console.log('Tokens used:', completion.usage?.total_tokens || 'unknown');
      console.log('====================\n');

      return {
        success: true,
        response: response,
        usage: completion.usage,
        model: completion.model
      };

    } catch (error) {
      console.error('OpenAI Service error:', error);
      
      if (error.error?.type === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. Please check your billing.');
      } else if (error.error?.type === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      } else {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
    }
  }

  // Generate a simple text completion (alternative method)
  async generateCompletion(prompt, maxTokens = 500) {
    try {
      if (!this.isConfigured()) {
        throw new Error('OpenAI API key not configured');
      }

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }]
      });

      return {
        success: true,
        completion: completion,
        usage: completion.usage
      };

    } catch (error) {
      console.error('OpenAI completion error:', error);
      throw error;
    }
  }
}

module.exports = new OpenAIService();
