const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const openaiService = require("../services/openaiService");
const axios = require("axios");
const router = express.Router();

// Chat endpoint with OpenAI integration (OLD VERSION)
router.post("/chat-old", authenticateToken, async (req, res) => {
  try {
    const { messageHistory, data, prompt } = req.body;

    // Validate required parameters
    if (!messageHistory) {
      return res.status(400).json({
        error:
          "messageHistory parameter is required (array of message objects)",
      });
    }

    if (!data) {
      return res.status(400).json({
        error: "data parameter is required (object containing context data)",
      });
    }

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "prompt parameter is required (string containing instructions)",
      });
    }

    // Parse messageHistory if it's a string
    let parsedMessageHistory;
    try {
      parsedMessageHistory =
        typeof messageHistory === "string"
          ? JSON.parse(messageHistory)
          : messageHistory;
    } catch (parseError) {
      return res.status(400).json({
        error: "Invalid messageHistory format. Must be a valid JSON array.",
      });
    }

    // Parse data if it's a string
    let parsedData;
    try {
      parsedData = typeof data === "string" ? JSON.parse(data) : data;
    } catch (parseError) {
      return res.status(400).json({
        error: "Invalid data format. Must be a valid JSON object.",
      });
    }

    // Validate messageHistory is an array
    if (!Array.isArray(parsedMessageHistory)) {
      return res.status(400).json({
        error: "messageHistory must be an array of message objects",
      });
    }

    // Log the chat request details
    console.log("\n=== Chat API Request ===");
    console.log("Message History Length:", parsedMessageHistory.length);
    console.log("Data Keys:", Object.keys(parsedData));
    console.log(
      "Prompt Preview:",
      prompt.substring(0, 100) + (prompt.length > 100 ? "..." : "")
    );
    console.log("User:", req.user?.username || "Unknown");
    console.log("======================\n");

    // Check if OpenAI is configured
    if (!openaiService.isConfigured()) {
      return res.status(503).json({
        error:
          "OpenAI service is not configured. Please set the OPENAI_API_KEY environment variable.",
        configured: false,
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
        error: "Failed to process chat completion",
        details: result.error,
      });
    }

    // Prepare the response
    const response = {
      message: "Chat completion successful",
      response: {
        role: result.response.role,
        content: result.response.content,
      },
      metadata: {
        model: result.model,
        usage: result.usage,
        processed_at: new Date().toISOString(),
        user: req.user?.username,
      },
      request_info: {
        message_history_length: parsedMessageHistory.length,
        data_provided: !!parsedData,
        prompt_length: prompt.length,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Chat API error:", error);

    // Handle specific OpenAI errors
    if (error.message.includes("quota")) {
      return res.status(429).json({
        error: "OpenAI API quota exceeded",
        details: "Please check your OpenAI billing and usage limits.",
      });
    } else if (error.message.includes("API key")) {
      return res.status(401).json({
        error: "Invalid OpenAI API configuration",
        details: "Please check your OpenAI API key.",
      });
    }

    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// NEW: Chat endpoint for AI assistant with calculate data context
router.post("/chat", authenticateToken, async (req, res) => {
  try {
    const { message, calculateData } = req.body;

    // Validate required parameters
    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "message parameter is required (string)",
      });
    }

    if (!calculateData) {
      return res.status(400).json({
        error:
          "calculateData parameter is required (object containing analysis data)",
      });
    }

    // Log the chat request details
    console.log("\n=== New Chat API Request ===");
    console.log(
      "Message:",
      message.substring(0, 100) + (message.length > 100 ? "..." : "")
    );
    console.log("Calculate Data Keys:", Object.keys(calculateData));
    console.log("User:", req.user?.username || "Unknown");
    console.log("===========================\n");

    // Check if OpenAI is configured
    if (!openaiService.isConfigured()) {
      return res.status(503).json({
        error:
          "OpenAI service is not configured. Please set the OPENAI_API_KEY environment variable.",
        configured: false,
      });
    }

    // Create system prompt with calculate data context (optimized for token usage)
    const systemPrompt = `You are an AI assistant specialized in analyzing gambling/gaming data and providing insights. 

You have access to analyzed data from a calculate operation. Key data includes:
- Game data: ${calculateData.game_data_filtered?.length || 0} games
- Training data: ${calculateData.training_data_filtered?.length || 0} records  
- Calculated groups: ${
      calculateData.calculated_data_by_group?.length || 0
    } groups
- Best performing analysis: ${
      calculateData.best_performing_analysis?.length || 0
    } analyses

Your role is to:
1. Help users understand the analyzed data and predictions
2. Provide recommendations based on the data
3. Answer questions about operators, markets, games, and performance
4. Explain statistical insights in simple terms

Always respond in Serbian language unless specifically asked otherwise.
Format your responses using markdown for better readability (use headers, lists, bold text, etc.).
Be helpful, accurate, and professional.`;

    // Optimize data based on user question to reduce token usage
    const optimizedData = optimizeDataForQuestion(calculateData, message);

    // Process the chat completion
    const result = await openaiService.processChatCompletion(
      [{ role: "user", content: message }], // Simple message history for now
      optimizedData,
      systemPrompt
    );

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to process chat completion",
        details: result.error,
      });
    }

    // Prepare the response
    const response = {
      message: "Chat completion successful",
      response: {
        role: result.response.role,
        content: result.response.content,
      },
      metadata: {
        model: result.model,
        usage: result.usage,
        processed_at: new Date().toISOString(),
        user: req.user?.username,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("New Chat API error:", error);

    // Handle specific OpenAI errors
    if (error.message.includes("quota")) {
      return res.status(429).json({
        error: "OpenAI API quota exceeded",
        details: "Please check your OpenAI billing and usage limits.",
      });
    } else if (error.message.includes("API key")) {
      return res.status(401).json({
        error: "Invalid OpenAI API configuration",
        details: "Please check your OpenAI API key.",
      });
    }

    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

router.post("/test", authenticateToken, async (req, res) => {
  const { message } = req.body;
  // const result = await openaiService.generateCompletion(message);
  try {
    let result = await axios.post("http://localhost:8000/test", {
      message: message,
    });
    res.json(result.data);
  } catch (error) {
    console.error("Test API error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Function to optimize data based on user question to reduce token usage
function optimizeDataForQuestion(calculateData, message) {
  const lowerMessage = message.toLowerCase();

  // If question is about specific topics, include only relevant data
  if (
    lowerMessage.includes("operater") ||
    lowerMessage.includes("tržište") ||
    lowerMessage.includes("partner")
  ) {
    return {
      best_performing_analysis: calculateData.best_performing_analysis,
      calculated_data_by_group: calculateData.calculated_data_by_group?.map(
        (group) => ({
          np_id: group.np_id,
          roi_ids: group.roi_ids,
          "Promotion Recommendation": group["Promotion Recommendation"],
          "GGR Prediction": group["GGR Prediction"],
          "NP Prediction": group["NP Prediction"],
          "Promo Amount": group["Promo Amount"],
          "GGR Amount": group["GGR Amount"],
          "NP Amount": group["NP Amount"],
          "ROI %": group["ROI %"],
        })
      ),
    };
  }

  if (
    lowerMessage.includes("igra") ||
    lowerMessage.includes("game") ||
    lowerMessage.includes("roi")
  ) {
    return {
      calculated_data_by_group: calculateData.calculated_data_by_group,
      game_data_filtered: calculateData.game_data_filtered?.slice(0, 50), // Limit to first 50 games
    };
  }

  if (
    lowerMessage.includes("predikcij") ||
    lowerMessage.includes("prediction")
  ) {
    return {
      calculated_data_by_group: calculateData.calculated_data_by_group?.map(
        (group) => ({
          np_id: group.np_id,
          roi_ids: group.roi_ids,
          "Promotion Recommendation": group["Promotion Recommendation"],
          "GGR Prediction": group["GGR Prediction"],
          "NP Prediction": group["NP Prediction"],
          "Promo Amount": group["Promo Amount"],
          "GGR Amount": group["GGR Amount"],
          "NP Amount": group["NP Amount"],
          "ROI %": group["ROI %"],
          "Total Players Amount": group["Total Players Amount"],
          "Rounds Played": group["Rounds Played"],
        })
      ),
    };
  }

  // For general questions, return more comprehensive data
  return {
    summary: {
      total_games: calculateData.game_data_filtered?.length || 0,
      total_training_records: calculateData.training_data_filtered?.length || 0,
      analysis_groups: calculateData.calculated_data_by_group?.length || 0,
      best_performing_count:
        calculateData.best_performing_analysis?.length || 0,
    },
    calculated_data_by_group: calculateData.calculated_data_by_group
      ?.slice(0, 5)
      .map((group) => ({
        np_id: group.np_id,
        roi_ids: group.roi_ids,
        "Promotion Recommendation": group["Promotion Recommendation"],
        "GGR Prediction": group["GGR Prediction"],
        "NP Prediction": group["NP Prediction"],
        "Promo Amount": group["Promo Amount"],
        "GGR Amount": group["GGR Amount"],
        "NP Amount": group["NP Amount"],
        "ROI %": group["ROI %"],
      })),
    best_performing_analysis: calculateData.best_performing_analysis?.slice(
      0,
      3
    ),
  };
}

module.exports = router;
