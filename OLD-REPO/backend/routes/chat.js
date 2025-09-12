const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const openaiService = require('../services/openaiService');
const axios = require('axios');
const router = express.Router();

// Chat endpoint with OpenAI integration
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { messageHistory, data, prompt } = req.body;

    // Validate required parameters
    if (!messageHistory) {
      return res.status(400).json({
        error: 'messageHistory parameter is required (array of message objects)'
      });
    }

    if (!data) {
      return res.status(400).json({
        error: 'data parameter is required (object containing context data)'
      });
    }

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'prompt parameter is required (string containing instructions)'
      });
    }

    // Parse messageHistory if it's a string
    let parsedMessageHistory;
    try {
      parsedMessageHistory = typeof messageHistory === 'string' 
        ? JSON.parse(messageHistory) 
        : messageHistory;
    } catch (parseError) {
      return res.status(400).json({
        error: 'Invalid messageHistory format. Must be a valid JSON array.'
      });
    }

    // Parse data if it's a string
    let parsedData;
    try {
      parsedData = typeof data === 'string' 
        ? JSON.parse(data) 
        : data;
    } catch (parseError) {
      return res.status(400).json({
        error: 'Invalid data format. Must be a valid JSON object.'
      });
    }

    // Validate messageHistory is an array
    if (!Array.isArray(parsedMessageHistory)) {
      return res.status(400).json({
        error: 'messageHistory must be an array of message objects'
      });
    }

    // Log the chat request details
    console.log('\n=== Chat API Request ===');
    console.log('Message History Length:', parsedMessageHistory.length);
    console.log('Data Keys:', Object.keys(parsedData));
    console.log('Prompt Preview:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
    console.log('User:', req.user?.username || 'Unknown');
    console.log('======================\n');

    // Check if OpenAI is configured
    if (!openaiService.isConfigured()) {
      return res.status(503).json({
        error: 'OpenAI service is not configured. Please set the OPENAI_API_KEY environment variable.',
        configured: false
      });
    }

    // Process the chat completion
    const result = await openaiService.processChatCompletion(
      parsedMessageHistory,
      parsedData,
      prompt
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to process chat completion',
        details: result.error
      });
    }

    // Prepare the response
    const response = {
      message: 'Chat completion successful',
      response: {
        role: result.response.role,
        content: result.response.content
      },
      metadata: {
        model: result.model,
        usage: result.usage,
        processed_at: new Date().toISOString(),
        user: req.user?.username
      },
      request_info: {
        message_history_length: parsedMessageHistory.length,
        data_provided: !!parsedData,
        prompt_length: prompt.length
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Handle specific OpenAI errors
    if (error.message.includes('quota')) {
      return res.status(429).json({
        error: 'OpenAI API quota exceeded',
        details: 'Please check your OpenAI billing and usage limits.'
      });
    } else if (error.message.includes('API key')) {
      return res.status(401).json({
        error: 'Invalid OpenAI API configuration',
        details: 'Please check your OpenAI API key.'
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

router.post('/test', authenticateToken, async (req, res) => {
  const { message } = req.body;
  // const result = await openaiService.generateCompletion(message);
  try {
  let result = await axios.post('http://localhost:8000/test', {message: message});
  res.json(result.data);
  } catch (error) {
    console.error('Test API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});


module.exports = router;
