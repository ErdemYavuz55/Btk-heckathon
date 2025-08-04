import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GoogleGenAI } from '@google/genai';
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

      // 2) Check if we have a placeholder key, return mock response for testing
      if (process.env.GEMINI_API_KEY === 'placeholder-key-for-testing') {  // Disabled mock for real API testing
        const mockResponse = {
          uiInputs: [
            { name: 'gravity', label: 'Gravity (m/s²)', min: 1, max: 20, step: 0.5, value: 9.81 },
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
      const genAI = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });

      // 4) Create EDUCATIONAL ANIMATION prompt - STRICT JSON ONLY
      const fullPrompt = `CRITICAL: Return ONLY a valid JSON object, no explanations, no markdown, no extra text.

You are creating EDUCATIONAL PHYSICS SIMULATIONS for BROWSER environment. Create scientifically accurate animations that teach physics concepts.

BROWSER CODE REQUIREMENTS:
- DO NOT use require() or import statements - libraries are already available
- Use window.p5 and window.Plotly directly (already loaded globally)
- Show real physics: formulas, calculations, vectors, energy
- Use p5.js with real-time calculations and educational displays
- Include velocity vectors, force arrows, trajectories
- Display live physics data: position, velocity, acceleration, energy
- Make it educational with accurate physics equations

CRITICAL SAFETY REQUIREMENTS:
- ALWAYS use defensive programming - check if variables exist before using them
- Use (value || 0).toFixed(2) instead of value.toFixed(2)
- Initialize ALL variables with default values
- Handle undefined params gracefully: const gravity = params.gravity || 9.81
- Wrap all calculations in try-catch blocks
- Always validate numbers before using toFixed(), toString(), etc.
- Example safe code: const speed = Math.sqrt((vx || 0) * (vx || 0) + (vy || 0) * (vy || 0))

CODE STRUCTURE REQUIREMENTS:
- export function render(el, params) { /* ALWAYS validate params first */ }
- Always start with: params = params || {}; 
- Initialize sketch variables with fallbacks: let ball = { x: 100, y: 100, vx: params.initialVx || 3, vy: 0 };
- Use safe math: const result = isNaN(calculation) ? 0 : calculation;

JSON Schema (RETURN ONLY THIS FORMAT):
{
  "uiInputs": [{"name":"str","label":"str","min":num,"max":num,"step":num,"value":num}],
  "code": "export function render(el, params) { params = params || {}; /* SAFE p5.js educational physics with error handling */ }",
  "image": "optional_url_string_or_undefined"
}

Topic: ${body.topic}
Language: ${body.lang}
Request: ${body.prompt}

RETURN ONLY VALID JSON:`;

                           // 5) Call Gemini with new API (using latest model for education)
              const response = await genAI.models.generateContent({
                model: 'gemini-2.5-pro',  // Latest and most powerful model
                contents: fullPrompt,
              });

                           let responseText = response.text || '';

              // Advanced JSON cleaning for Gemini 2.5 Pro
              responseText = responseText
                .replace(/```json\n?/g, '')  // Remove markdown json blocks
                .replace(/```\n?/g, '')      // Remove markdown code blocks
                .replace(/^[^{]*{/g, '{')    // Remove text before first {
                .replace(/}[^}]*$/g, '}')    // Remove text after last }
                .trim();

              // Try to extract JSON if wrapped in text
              const jsonMatch = responseText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                responseText = jsonMatch[0];
              }

              // Parse JSON response
              let geminiResult;
              try {
                geminiResult = JSON.parse(responseText);
              } catch (parseError) {
                fastify.log.error('Failed to parse Gemini response as JSON:', responseText);
                fastify.log.error('Original response:', response.text);
                
                // Try to extract and fix common JSON issues
                try {
                  // Remove trailing commas and fix common issues
                  const fixedJson = responseText
                    .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
                    .replace(/(\w+):/g, '"$1":')    // Quote unquoted keys
                    .replace(/'/g, '"');            // Replace single quotes with double
                  
                  geminiResult = JSON.parse(fixedJson);
                  fastify.log.info('JSON fixed and parsed successfully');
                } catch (secondError) {
                  // Return mock response as fallback
                  fastify.log.warn('Using fallback mock response due to JSON parsing failure');
                  geminiResult = {
                              uiInputs: [
            { name: 'gravity', label: 'Gravity', min: 0.5, max: 15, step: 0.5, value: 9.81 },
            { name: 'restitution', label: 'Bounce', min: 0.1, max: 1, step: 0.1, value: 0.8 }
          ],
                                      code: "export function render(el, params) { params = params || {}; const sketch = function(p) { let ball = { x: 100, y: 100, vx: 3, vy: 0 }; p.setup = function() { p.createCanvas(800, 400); }; p.draw = function() { const gravity = params.gravity || 9.81; const restitution = params.restitution || 0.8; p.background(240, 248, 255); ball.vy += gravity * 0.02; ball.x = (ball.x || 0) + (ball.vx || 0); ball.y = (ball.y || 0) + (ball.vy || 0); if ((ball.x || 0) < 20 || (ball.x || 0) > 780) { ball.vx = (ball.vx || 0) * -0.8; ball.x = (ball.x || 0) < 20 ? 20 : 780; } if ((ball.y || 0) > 380) { ball.vy = (ball.vy || 0) * -restitution; ball.y = 380; } p.fill(100, 200, 100); p.ellipse(ball.x || 0, ball.y || 0, 40, 40); p.fill(0); p.text('Gravity: ' + ((gravity || 0).toFixed(2)), 10, 20); p.text('Restitution: ' + ((restitution || 0).toFixed(2)), 10, 40); }; }; const instance = new p5(sketch); instance.mount(el); return instance; }",
                    image: undefined
                  };
                }
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