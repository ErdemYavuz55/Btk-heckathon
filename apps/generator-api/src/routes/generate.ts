import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { generateRequestSchema, specSchema } from '@interactive-edu/shared-schema';
import { imageService } from '../services/imageService';

export async function generateRoutes(fastify: FastifyInstance) {
  fastify.post('/generate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1) Parse and validate request body
      const body = generateRequestSchema.parse(request.body);
      
      if (!process.env.GEMINI_API_KEY) {
        return reply.status(500).send({ error: 'GEMINI_API_KEY not configured' });
      }

      // 2) Initialize Gemini via LangChain
      const model = new ChatGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
        modelName: 'gemini-pro',
        temperature: 0.7,
        maxOutputTokens: 2048,
      });

      // 3) Create prompt template
      const systemPrompt = `You are an assistant that converts educational prompts (Math, Physics, Chemistry, History) into
**JSON objects** matching a provided schema.  
Return ONLY valid JSON – no markdown, no commentary.  
\`code\` must be a pure ES2020 module, single export named \`render(el, params)\`,
and may import Plotly (https://cdn.plot.ly/plotly-2.32.1.min.js) or p5.js from a CDN.
Do NOT call fetch, WebSocket, document.cookie, or localStorage.

The JSON schema requires:
- uiInputs: array of {name, label, min, max, step, value} for interactive controls
- code: ES module string with render(el, params) export
- image: optional URL string

Example for physics projectile motion:
{
  "uiInputs": [
    {"name":"v0","label":"Initial Velocity (m/s)","min":1,"max":50,"step":1,"value":20},
    {"name":"angle","label":"Launch Angle (degrees)","min":0,"max":90,"step":5,"value":45},
    {"name":"g","label":"Gravity (m/s²)","min":5,"max":15,"step":0.1,"value":9.81}
  ],
  "code": "export function render(el, params) { /* Plotly trajectory chart */ }",
  "image": "https://example.com/projectile.jpg"
}`;

      const userPrompt = `Topic: ${body.topic}
Language: ${body.lang}
Prompt: ${body.prompt}`;

      // 4) Call Gemini
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ];

      const response = await model.invoke(messages);
      let responseText = response.content as string;

      // Clean response (remove markdown formatting if present)
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Parse JSON response
      let geminiResult;
      try {
        geminiResult = JSON.parse(responseText);
      } catch (parseError) {
        fastify.log.error('Failed to parse Gemini response as JSON:', responseText);
        return reply.status(500).send({ error: 'Invalid JSON response from AI model' });
      }

      // 5) Validate with Zod schema
      const validatedSpec = specSchema.parse(geminiResult);

      // 6) Optional image fetch if needed
      if (!validatedSpec.image && body.topic) {
        try {
          const imageUrl = await imageService.fetchImage(body.topic, body.prompt);
          if (imageUrl) {
            validatedSpec.image = imageUrl;
          }
        } catch (imageError) {
          fastify.log.warn('Image fetch failed:', imageError);
          // Continue without image
        }
      }

      // 7) Return validated JSON
      return reply.send(validatedSpec);

    } catch (error) {
      fastify.log.error('Generate route error:', error);
      
      if (error.name === 'ZodError') {
        return reply.status(400).send({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      
      return reply.status(500).send({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  });
} 