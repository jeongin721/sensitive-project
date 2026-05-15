require('dotenv').config();
const express = require('express');
const path = require('path');
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// OpenAI Setup
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

if (supabaseUrl && supabaseServiceKey && 
    !supabaseUrl.includes('your_') && 
    !supabaseUrl.includes('placeholder') &&
    supabaseUrl.startsWith('http')) {
    try {
        supabase = createClient(supabaseUrl, supabaseServiceKey);
        console.log('Supabase client initialized.');
    } catch (err) {
        console.error('Failed to initialize Supabase:', err.message);
    }
} else {
    console.warn('Supabase credentials are not set or are placeholders. Database logging will be disabled.');
}

// API Endpoints
app.post('/api/analyze', async (req, res) => {
    const { text } = req.body;

    // 1. Validation
    if (!text || typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ error: '분석할 텍스트를 입력해주세요.' });
    }

    if (text.length > 1000) {
        return res.status(400).json({ error: '텍스트는 최대 1000자까지 입력 가능합니다.' });
    }

    try {
        // 2. OpenAI Analysis (using Structured Outputs)
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Or preferred model
            messages: [
                {
                    role: "system",
                    content: "너는 한국어 텍스트 감성 분석기다. 사용자 텍스트를 positive, negative, neutral 중 하나로 분류하고, 0~100 사이의 신뢰도(confidence)와 그 이유(reason, 한국어 한 문장)를 JSON 형식으로 반환하라."
                },
                {
                    role: "user",
                    content: text
                }
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "sentiment_analysis",
                    schema: {
                        type: "object",
                        properties: {
                            sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
                            confidence: { type: "integer", minimum: 0, maximum: 100 },
                            reason: { type: "string" }
                        },
                        required: ["sentiment", "confidence", "reason"],
                        additionalProperties: false
                    },
                    strict: true
                }
            }
        });

        const result = JSON.parse(response.choices[0].message.content);

        // 3. Supabase Logging (Async, don't block response)
        if (supabase) {
            supabase.from('sentiment_logs').insert([
                {
                    input_text: text,
                    sentiment: result.sentiment,
                    confidence: result.confidence,
                    reason: result.reason
                }
            ]).then(({ error }) => {
                if (error) console.error('Supabase logging error:', error.message);
            });
        }

        // 4. Success Response
        res.json(result);

    } catch (error) {
        console.error('API Error:', error);
        
        // Handle specific OpenAI errors if needed
        if (error.code === 'invalid_api_key') {
            return res.status(500).json({ error: 'API 키가 올바르지 않습니다. 설정을 확인해주세요.' });
        }

        res.status(500).json({ error: '분석 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
