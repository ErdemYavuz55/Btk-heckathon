import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateRequestSchema, specSchema } from '@interactive-edu/shared-schema';
import { imageService } from '../services/imageService';

function isCodeValid(code: string): boolean {
  try {
    // A simple check to see if the code can be parsed as a function body.
    // We replace 'export function render' to avoid module-level syntax errors.
    const functionBody = code.replace(/export\s+function\s+render\s*\([^)]*\)\s*\{/, 'function render() {');
    new Function(functionBody);
    
    // Check for balanced braces
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    return openBraces === closeBraces && openBraces > 0;
  } catch (e) {
    return false;
  }
}


export async function generateRoutes(fastify: FastifyInstance) {
  fastify.post('/generate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1) Parse and validate request body
      const body = generateRequestSchema.parse(request.body);
      
      if (!process.env.GEMINI_API_KEY) {
        return reply.status(500).send({ error: 'GEMINI_API_KEY not configured' });
      }

      // 2) Check if we have a placeholder key, return mock response for testing
      if (process.env.GEMINI_API_KEY === 'placeholder-key-for-testing') {  // Disabled mock for real API testing
        const mockResponse = {
          uiInputs: [
            { name: 'gravity', label: 'Gravity', description: 'Acceleration due to gravity', unit: 'm/s²', precision: 2, min: 1, max: 20, step: 0.5, value: 9.81 },
            { name: 'restitution', label: 'Coefficient of Restitution', min: 0.1, max: 1, step: 0.05, value: 0.8 },
            { name: 'mass', label: 'Ball Mass (kg)', min: 0.1, max: 5, step: 0.1, value: 1.0 },
            { name: 'airResistance', label: 'Air Resistance', min: 0, max: 0.1, step: 0.01, value: 0.02 }
          ],
          code: `export function render(el, params) {
            // Safe params handling
            params = params || {};
            
            const sketch = function(p) {
              let ball;
              let trail = [];
              
              p.setup = function() {
                p.createCanvas(800, 500);
                // Safe parameter access with defaults
                const mass = params.mass || 1.0;
                const gravity = params.gravity || 9.81;
                ball = {
                  x: 100, y: 100,
                  vx: 4, vy: 0,
                  mass: mass,
                  radius: Math.sqrt(mass) * 15
                };
                trail = [];
              };
              
              p.draw = function() {
                p.background(240, 248, 255);
                
                // Safe parameter access with defaults
                const gravity = params.gravity || 9.81;
                const airResistance = params.airResistance || 0.02;
                const restitution = params.restitution || 0.8;
                
                // Physics calculations
                const dt = 0.016; // 60 FPS
                
                // Apply gravity
                ball.vy += gravity * dt;
                
                // Apply air resistance
                const speed = Math.sqrt((ball.vx || 0) * (ball.vx || 0) + (ball.vy || 0) * (ball.vy || 0));
                if (speed > 0) {
                  const dragForce = airResistance * speed * speed;
                  const dragX = -dragForce * (ball.vx || 0) / speed;
                  const dragY = -dragForce * (ball.vy || 0) / speed;
                  ball.vx += dragX / (ball.mass || 1) * dt;
                  ball.vy += dragY / (ball.mass || 1) * dt;
                }
                
                // Update position
                ball.x = (ball.x || 0) + (ball.vx || 0);
                ball.y = (ball.y || 0) + (ball.vy || 0);
                
                // Add to trail
                trail.push({x: ball.x || 0, y: ball.y || 0});
                if (trail.length > 150) trail.shift();
                
                // Collision with walls
                if ((ball.x || 0) - (ball.radius || 0) < 0 || (ball.x || 0) + (ball.radius || 0) > p.width) {
                  ball.vx = (ball.vx || 0) * -restitution;
                  ball.x = (ball.x || 0) < (ball.radius || 0) ? (ball.radius || 0) : p.width - (ball.radius || 0);
                }
                
                // Collision with ground
                if ((ball.y || 0) + (ball.radius || 0) > p.height) {
                  ball.vy = (ball.vy || 0) * -restitution;
                  ball.y = p.height - (ball.radius || 0);
                }
                
                // Draw trajectory trail
                p.stroke(100, 150, 255);
                p.strokeWeight(2);
                for (let i = 1; i < trail.length; i++) {
                  p.line(trail[i-1].x, trail[i-1].y, trail[i].x, trail[i].y);
                }
                
                // Draw velocity vector
                const vectorScale = 20;
                p.drawVector(ball.x, ball.y, ball.vx, ball.vy, vectorScale, '#ff4444');
                
                // Draw ball
                p.fill(100, 200, 100);
                p.noStroke();
                p.ellipse(ball.x, ball.y, ball.radius * 2, ball.radius * 2);
                
                // Calculate physics values safely
                const mass = ball.mass || 1;
                const vx = ball.vx || 0;
                const vy = ball.vy || 0;
                const x = ball.x || 0;
                const y = ball.y || 0;
                
                const kineticEnergy = 0.5 * mass * (vx * vx + vy * vy);
                const potentialEnergy = mass * gravity * (p.height - y) / 100;
                const totalEnergy = kineticEnergy + potentialEnergy;
                const velocity = Math.sqrt(vx * vx + vy * vy);
                
                // Display educational information with safe formatting
                const info = [
                  \`Position: (\${(x || 0).toFixed(1)}, \${(y || 0).toFixed(1)}) px\`,
                  \`Velocity: \${(velocity || 0).toFixed(2)} px/frame\`,
                  \`Vx: \${(vx || 0).toFixed(2)}, Vy: \${(vy || 0).toFixed(2)}\`,
                  \`Mass: \${(mass || 0).toFixed(1)} kg\`,
                  \`KE: \${(kineticEnergy || 0).toFixed(2)} J\`,
                  \`PE: \${(potentialEnergy || 0).toFixed(2)} J\`,
                  \`Total E: \${(totalEnergy || 0).toFixed(2)} J\`,
                  \`Restitution: \${(restitution || 0).toFixed(2)}\`,
                  \`Air Resistance: \${(airResistance || 0).toFixed(3)}\`
                ];
                
                p.drawInfo(info, 10, 10);
                
                // Physics formulas
                p.fill(0, 0, 100);
                p.text('📚 Physics: F = ma, KE = ½mv², PE = mgh', 10, p.height - 30);
                p.text('🎯 Red Arrow = Velocity Vector', 10, p.height - 15);
              };
            };
            
            new p5(sketch).mount(el);
          }`,
          image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Ideal_projectile_motion_for_different_angles.svg/400px-Ideal_projectile_motion_for_different_angles.svg.png'
        };
        
        const validatedSpec = specSchema.parse(mockResponse);
        return reply.send(validatedSpec);
      }

      // 3) Initialize Gemini with official Google SDK
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      // 4) Create OPTIMIZED prompt - SHORT and FAST
      const fullPrompt = `You are **Interactive-Edu CodeGen**, a senior p5.js engineer and educator.
Your ONLY task: output exactly ONE valid JSON object (no markdown) that adheres to the schema below and whose "code" field is a COMPLETE JavaScript module following the TEMPLATE afterwards.

===== HARD RULES =========================================================
1. JSON must parse on first try; no comments or extra keys.
2. "code" must compile via new Function after replacing \`export function render\` ➜ \`function render\`.
3. No import/require/fetch/WebSocket/localStorage.
4. All braces/parentheses/brackets balanced.
5. Use defensive param access (e.g., const g = params.gravity ?? 9.81).
6. Mount sketch ONLY with **new p5(sketch, el);**.
7. Keep TEMPLATE sections ❶–❸ exactly once and in order.

===== TOPIC-SPECIFIC CHECKLIST ===========================================
physics:   use p5.Vector ops (fromAngle, add, mult, normalize); show forces & energy with units.
math:      draw axes + grid; label formula (LaTeX style); params alter function live.
chemistry: visualise molecule/reaction; label atoms/bonds; show equation text.

===== UI INPUT ITEM =======================================================
{ "name": "string", "label": "string", "description": "string", "unit": "string", "precision": number, "min": number, "max": number, "step": number, "value": number }
At least two (2) such items required.

===== JSON FORMAT =========================================================
{
  "uiInputs": [ <>=2 items as above ],
  "code": "<COMPLETE JS MODULE>",
  "image": "https://... (optional) or empty string"
}

===== CODE TEMPLATE (fill the gaps, keep markers) =========================
const Plotly = window.Plotly;          // ❶ globals
const p5     = window.p5;

export function render(el, params) {   // ❸ render
  params = window.currentParams || params || {};
  const sketch = (p) => {
    /* p.setup */
    /* p.draw  */
    /* p.windowResized */
  };
  new p5(sketch, el);
}
===========================================================================

---
USER REQUEST
Topic: ${body.topic}
Prompt: ${body.prompt}
---
RETURN ONLY THE JSON OBJECT:`



              // 5) Call Gemini with FAST model and timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
              
              let geminiResult;
              try {
                const generativeModel = genAI.getGenerativeModel({
                  model: "gemini-2.5-pro",
                  generationConfig: {
                    temperature: 0.2,
                  },
                });

                const result = await generativeModel.generateContent(fullPrompt);
                clearTimeout(timeoutId);

                const response = result.response;
                const rawText = response.text();
                // Clean markdown fences if present
                const cleanedText = rawText
                  .replace(/```json\s*/gi, '')
                  .replace(/```/g, '')
                  .trim();
                try {
                  geminiResult = JSON.parse(cleanedText);
                } catch (jsonErr) {
                  console.error('❌ JSON parse failed even after cleaning:', jsonErr);
                  throw new Error('LLM_INVALID_JSON');
                }

                // **API-Side Code Validation**
                if (!geminiResult.code || !isCodeValid(geminiResult.code)) {
                  console.error('❌ Invalid code received from LLM, forcing fallback.');
                  throw new Error('LLM_INVALID_CODE');
                }
                
              } catch (error: any) {
                clearTimeout(timeoutId);
                console.error('❌ Gemini API call failed:', error);
                
                if (error.name === 'AbortError') {
                    console.log('⚠️ LLM timeout, using fallback');
                    throw new Error('LLM_TIMEOUT');
                }
                
                throw new Error('LLM_GENERATION_FAILED');
              }

                    // Fix image field for schema compatibility
              if (geminiResult.image === null || geminiResult.image === '') {
                geminiResult.image = undefined;
              } else if (geminiResult.image && typeof geminiResult.image === 'string') {
                // Validate if it's a proper URL, if not set to undefined
                try {
                  new URL(geminiResult.image);
                } catch (urlError) {
                  fastify.log.warn('Invalid image URL from Gemini, removing:', geminiResult.image);
                  geminiResult.image = undefined;
                }
              }

              // 6) Validate with Zod schema
              const validatedSpec = specSchema.parse(geminiResult);

      // 7) Optional image fetch if needed
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

      // 8) Return validated JSON
      return reply.send(validatedSpec);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      fastify.log.error('Generate route error:', error);
      
      // Handle specific errors
      if (['LLM_TIMEOUT','LLM_GENERATION_FAILED','LLM_INVALID_CODE','LLM_INVALID_JSON'].includes(errorMessage)) {
        fastify.log.warn(`⚠️ ${errorMessage} - using fast fallback`);
        const fallbackSpec = {
          uiInputs: [
            { name: 'gravity', label: 'Gravity', min: 1, max: 20, step: 0.5, value: 9.81 },
            { name: 'bounce', label: 'Bounce', min: 0.1, max: 1, step: 0.1, value: 0.8 }
          ],
          code: `export function render(el, params) {
  params = params || {};
  const sketch = (p) => {
    let ball = { x: 100, y: 100, vx: 3, vy: 0 };
    p.setup = () => {
      p.createCanvas(800, 400);
    };
    p.draw = () => {
      const gravity = params.gravity || 9.81;
      const bounce = params.bounce || 0.8;
      p.background(240, 248, 255);
      ball.vy += gravity * 0.02;
      ball.x += ball.vx;
      ball.y += ball.vy;
      if (ball.x < 20 || ball.x > 780) {
        ball.vx *= -bounce;
        ball.x = ball.x < 20 ? 20 : 780;
      }
      if (ball.y > 380) {
        ball.vy *= -bounce;
        ball.y = 380;
      }
      p.fill(100, 200, 100);
      p.ellipse(ball.x, ball.y, 40, 40);
    };
  };
  new p5(sketch, el);
}`,
          image: undefined
        };
        return reply.send(fallbackSpec);
      }
      
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
        return reply.status(400).send({ 
          error: 'Validation failed', 
          details: (error as any).errors 
        });
      }
      
      return reply.status(500).send({ 
        error: 'Internal server error',
        message: errorMessage 
      });
    }
  });
} 