'use client';

import { useState, useEffect, useRef } from 'react';
import { UiInput, Spec } from '@interactive-edu/shared-schema';
import { Sandbox } from './components/Sandbox';

export default function HomePage() {
  const [prompt, setPrompt] = useState('');
  const [topic, setTopic] = useState<'math' | 'physics' | 'chemistry'>('physics');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Spec | null>(null);
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  // Three.js background effects
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let scene: any, camera: any, renderer: any, particles: any[], animationId: number;

    const initThreeJS = () => {
      const container = document.getElementById('three-background');
      if (!container) return;

      // Scene setup
      scene = new (window as any).THREE.Scene();
      camera = new (window as any).THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      renderer = new (window as any).THREE.WebGLRenderer({ alpha: true, antialias: true });
      
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);
      
      // Store scene reference for number animation
      (renderer.domElement as any).__threeScene = scene;

      // Create floating particles/numbers
      particles = [];
      const particleGeometry = new (window as any).THREE.SphereGeometry(0.5, 8, 6);
      
      for (let i = 0; i < 50; i++) {
        const material = new (window as any).THREE.MeshBasicMaterial({
          color: topic === 'physics' ? 0x3b82f6 : topic === 'math' ? 0x22c55e : 0xa855f7,
          transparent: true,
          opacity: 0.1
        });
        
        const particle = new (window as any).THREE.Mesh(particleGeometry, material);
        particle.position.set(
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100
        );
        
        particle.velocity = new (window as any).THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        );
        
        scene.add(particle);
        particles.push(particle);
      }

      camera.position.z = 30;

      // Animation loop
      const animate = () => {
        animationId = requestAnimationFrame(animate);

        // Update particles
        particles.forEach(particle => {
          particle.position.add(particle.velocity);
          particle.rotation.x += 0.01;
          particle.rotation.y += 0.01;

          // Boundary check
          if (Math.abs(particle.position.x) > 50) particle.velocity.x *= -1;
          if (Math.abs(particle.position.y) > 50) particle.velocity.y *= -1;
          if (Math.abs(particle.position.z) > 50) particle.velocity.z *= -1;
        });

        renderer.render(scene, camera);
      };

      animate();
    };

    // Initialize when THREE.js is available
    const checkTHREE = () => {
      if ((window as any).THREE) {
        initThreeJS();
      } else {
        setTimeout(checkTHREE, 100);
      }
    };
    checkTHREE();

    // Cleanup
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (renderer) {
        const container = document.getElementById('three-background');
        if (container && renderer.domElement) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
    };
  }, [topic]);

  // Generate button effect
  const triggerNumberAnimation = () => {
    if (typeof window === 'undefined' || !(window as any).THREE) return;

    const container = document.getElementById('three-background');
    if (!container) return;

    // Create flying numbers effect
    for (let i = 0; i < 20; i++) {
      const numberGeometry = new (window as any).THREE.PlaneGeometry(2, 2);
      const numberCanvas = document.createElement('canvas');
      numberCanvas.width = 128;
      numberCanvas.height = 128;
      const ctx = numberCanvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = topic === 'physics' ? '#3b82f6' : topic === 'math' ? '#22c55e' : '#a855f7';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.floor(Math.random() * 10).toString(), 64, 64);
      }

      const texture = new (window as any).THREE.CanvasTexture(numberCanvas);
      const material = new (window as any).THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.8
      });

      const numberMesh = new (window as any).THREE.Mesh(numberGeometry, material);
      numberMesh.position.set(
        (Math.random() - 0.5) * 20,
        -10,
        (Math.random() - 0.5) * 10
      );

      // Get the scene from the renderer
      const threeCanvas = container.querySelector('canvas');
      if (threeCanvas && (threeCanvas as any).__threeScene) {
        const scene = (threeCanvas as any).__threeScene;
        scene.add(numberMesh);

        // Animate upward
        const animateNumber = () => {
          numberMesh.position.y += 0.5;
          numberMesh.rotation.z += 0.1;
          material.opacity -= 0.02;

          if (material.opacity > 0) {
            requestAnimationFrame(animateNumber);
          } else {
            scene.remove(numberMesh);
            material.dispose();
            texture.dispose();
          }
        };
        animateNumber();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/visualize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          topic,
          lang: 'en'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: Spec = await response.json();
      setResult(data);

      // Initialize slider values
      const initialValues: Record<string, number> = {};
      data.uiInputs.forEach((input) => {
        initialValues[input.name] = input.value;
      });
      setSliderValues(initialValues);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSliderChange = (name: string, value: number) => {
    setSliderValues(prev => ({ ...prev, [name]: value }));
  };

  // Theme colors based on topic
  const getThemeClasses = () => {
    switch (topic) {
      case 'physics':
        return {
          bg: 'bg-gradient-to-br from-blue-50 to-indigo-100',
          card: 'bg-white/80 backdrop-blur border-blue-200',
          accent: 'from-blue-500 to-indigo-600',
          text: 'text-blue-900',
          button: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700',
          slider: 'accent-blue-500'
        };
      case 'math':
        return {
          bg: 'bg-gradient-to-br from-green-50 to-emerald-100',
          card: 'bg-white/80 backdrop-blur border-green-200',
          accent: 'from-green-500 to-emerald-600',
          text: 'text-green-900',
          button: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700',
          slider: 'accent-green-500'
        };
      case 'chemistry':
        return {
          bg: 'bg-gradient-to-br from-purple-50 to-violet-100',
          card: 'bg-white/80 backdrop-blur border-purple-200',
          accent: 'from-purple-500 to-violet-600',
          text: 'text-purple-900',
          button: 'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700',
          slider: 'accent-purple-500'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-blue-50 to-indigo-100',
          card: 'bg-white/80 backdrop-blur border-blue-200',
          accent: 'from-blue-500 to-indigo-600',
          text: 'text-blue-900',
          button: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700',
          slider: 'accent-blue-500'
        };
    }
  };
  
  const theme = getThemeClasses();

  return (
    <div className={`min-h-screen ${theme.bg} transition-all duration-500 relative overflow-hidden`}>
      {/* Three.js Background Effects */}
      <div id="three-background" className="fixed inset-0 z-0 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 lg:space-y-10 p-4 sm:p-6 lg:p-8 relative z-10">
        {/* Header */}
        <div className="text-center pt-4 sm:pt-6 lg:pt-8">
          <h1 className={`text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold ${theme.text} mb-2 sm:mb-4 bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent leading-tight`}>
            İnteraktif-Edu ✨
          </h1>
          <p className={`text-base sm:text-lg lg:text-xl ${theme.text}/70 font-medium px-4 sm:px-0`}>
            AI Destekli Animasyonlu Simülatörler - Dinamik Fizik, Matematik ve Kimya
          </p>
        </div>

        {/* Input Form */}
        <div className={`${theme.card} rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 transition-all duration-500 hover:shadow-3xl transform hover:-translate-y-1`}>
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          <div>
            <label htmlFor="topic" className={`block text-sm sm:text-base font-semibold ${theme.text} mb-3`}>
              Konunuzu Seçin
            </label>
            <div className="relative group">
              <select
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value as any)}
                className={`w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-0 bg-gradient-to-r from-white/90 to-gray-50/80 backdrop-blur-sm ${theme.text} font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-${topic}-300 transition-all duration-300 cursor-pointer appearance-none`}
              >
                <option value="physics">🔬 Fizik</option>
                <option value="math">📐 Matematik</option>
                <option value="chemistry">🧪 Kimya</option>
              </select>
              {/* Custom dropdown arrow */}
              <div className={`absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 pointer-events-none transition-transform duration-300 group-hover:scale-110`}>
                <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${theme.text}/60`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="prompt" className={`block text-sm sm:text-base font-semibold ${theme.text} mb-3`}>
              Simülasyonunuzu Tarif Edin
            </label>
            <div className="relative group">
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Örn: 'Yerçekimi kontrolü ile zıplayan toplar' veya 'Canlı sarkaç hareketi' veya 'Dinamik dalga girişimi desenleri'"
                rows={4}
                className={`w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-0 bg-gradient-to-r from-white/90 to-gray-50/80 backdrop-blur-sm ${theme.text} text-base sm:text-lg resize-none focus:outline-none focus:ring-4 focus:ring-${topic}-300 shadow-lg hover:shadow-xl transition-all duration-300 placeholder-gray-500/70`}
              />
              {/* Floating label effect */}
              <div className={`absolute top-2 right-3 sm:right-4 ${theme.text}/40 text-xs font-medium pointer-events-none transition-opacity duration-300 ${prompt ? 'opacity-100' : 'opacity-0'}`}>
                {prompt.length}/500
              </div>
            </div>
          </div>

          <div className="relative group">
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              onClick={() => {
                if (!loading && prompt.trim()) {
                  triggerNumberAnimation();
                }
              }}
              className={`w-full py-4 sm:py-5 px-6 sm:px-8 ${theme.button} text-white font-bold text-lg sm:text-xl rounded-xl sm:rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden relative`}
            >
              {/* Animated background effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Button content */}
              <span className="relative z-10 flex items-center justify-center space-x-2 sm:space-x-3">
                <span className="text-xl sm:text-2xl">{loading ? '⚡' : '🎬'}</span>
                <span className="text-center">{loading ? 'Animasyon Oluşturuluyor...' : 'Canlı Animasyon Oluştur'}</span>
              </span>
              
              {/* Loading spinner overlay */}
              {loading && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
            </button>
          </div>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50/90 backdrop-blur-sm border-0 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl transform transition-all duration-500 hover:scale-105 animate-pulse">
            <div className="flex flex-col sm:flex-row items-center sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-full flex items-center justify-center text-white text-lg sm:text-xl">
                ⚠️
              </div>
              <div className="text-red-800 font-bold text-lg sm:text-xl text-center sm:text-left">Bir Hata Oluştu</div>
            </div>
            <div className="text-red-700 text-base sm:text-lg bg-white/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center sm:text-left">{error}</div>
          </div>
        )}

      {/* Results */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {/* Controls */}
          <div className="lg:col-span-1 xl:col-span-1 space-y-6 sm:space-y-8">
            <div className={`${theme.card} rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-500 hover:shadow-3xl transform hover:-translate-y-1`}>
              <div className="text-center mb-6 sm:mb-8">
                <h3 className={`text-xl sm:text-2xl font-bold ${theme.text} mb-2 bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent`}>
                  🎛️ Kontrol Paneli
                </h3>
                <div className={`w-12 sm:w-16 h-1 bg-gradient-to-r ${theme.accent} rounded-full mx-auto`}></div>
              </div>
            
            {result.uiInputs.map((input: UiInput) => {
              const currentVal = sliderValues[input.name] ?? input.value;
              const precision = input.precision ?? (String(input.step).split('.')[1]?.length || 0);
              const format = (val: number) => {
                const fixed = precision ? val.toFixed(precision) : val.toString();
                return input.unit ? `${fixed} ${input.unit}` : fixed;
              };
              return (
                <div key={input.name} className="bg-gradient-to-br from-white/80 via-white/60 to-gray-50/40 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 border-0 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:scale-105 group">
                  {/* Header with floating value */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 mb-3">
                    <div className="space-y-1 flex-1">
                      <label htmlFor={input.name} className={`text-sm sm:text-base font-bold ${theme.text} group-hover:scale-105 transition-transform duration-300`}>
                        {input.label}
                      </label>
                      {input.description && (
                        <p className={`text-xs ${theme.text}/60 italic leading-relaxed`}>{input.description}</p>
                      )}
                    </div>
                    <div className={`bg-gradient-to-r ${theme.accent} text-white px-3 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl shadow-lg transform group-hover:scale-110 transition-all duration-300 self-end sm:self-auto`}>
                      <span className="text-sm sm:text-lg font-mono font-bold">{format(currentVal)}</span>
                    </div>
                  </div>
                  
                  {/* Modern slider with glow effect */}
                  <div className="relative px-1 sm:px-2">
                    <input
                      type="range"
                      id={input.name}
                      min={input.min}
                      max={input.max}
                      step={input.step}
                      value={currentVal}
                      onChange={(e) => handleSliderChange(input.name, parseFloat(e.target.value))}
                      className={`w-full h-3 sm:h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-${topic}-300 transition-all duration-300 hover:shadow-lg slider-glow`}
                      style={{
                        background: `linear-gradient(to right, 
                          ${topic === 'physics' ? 'rgb(59, 130, 246)' : topic === 'math' ? 'rgb(34, 197, 94)' : 'rgb(168, 85, 247)'} 0%, 
                          ${topic === 'physics' ? 'rgb(79, 70, 229)' : topic === 'math' ? 'rgb(5, 150, 105)' : 'rgb(124, 58, 237)'} ${((currentVal - input.min) / (input.max - input.min)) * 100}%, 
                          rgb(229, 231, 235) ${((currentVal - input.min) / (input.max - input.min)) * 100}%, 
                          rgb(209, 213, 219) 100%)`,
                        boxShadow: `0 0 15px ${topic === 'physics' ? 'rgba(59, 130, 246, 0.3)' : topic === 'math' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`
                      }}
                    />
                  </div>
                  
                  {/* Min/Max labels with better spacing */}
                  <div className={`flex justify-between text-xs ${theme.text}/60 font-semibold px-1 sm:px-2`}>
                    <span className="bg-white/80 px-2 py-1 rounded-md sm:rounded-lg shadow-sm text-xs">{format(input.min)}</span>
                    <span className="bg-white/80 px-2 py-1 rounded-md sm:rounded-lg shadow-sm text-xs">{format(input.max)}</span>
                  </div>
                </div>
              );
            })}

              {result.image && (
                <div className="mt-6 sm:mt-8 hidden lg:block">
                  <div className="text-center mb-4 sm:mb-6">
                    <h4 className={`text-lg sm:text-xl font-bold ${theme.text} mb-2 bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent`}>
                      📚 Referans
                    </h4>
                    <div className={`w-10 sm:w-12 h-1 bg-gradient-to-r ${theme.accent} rounded-full mx-auto`}></div>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl group">
                    <img
                      src={result.image}
                      alt="Eğitsel referans"
                      className="w-full object-cover transition-all duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Simulation */}
          <div className="lg:col-span-2 xl:col-span-3">
            <div className={`${theme.card} rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 hover:shadow-3xl transform hover:-translate-y-1`}>
              {/* Header with modern design */}
              <div className="p-4 sm:p-6 lg:p-8 border-b border-gray-200/30 bg-gradient-to-r from-white/80 to-gray-50/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                  <div>
                    <h3 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${theme.text} bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent mb-2`}>
                      🚀 Canlı Simülasyon
                    </h3>
                    <div className={`w-16 sm:w-20 h-1 bg-gradient-to-r ${theme.accent} rounded-full`}></div>
                  </div>
                  {/* Status indicator */}
                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    <div className={`w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r ${theme.accent} rounded-full animate-pulse`}></div>
                    <span className={`text-xs sm:text-sm font-medium ${theme.text}/70`}>Aktif</span>
                  </div>
                </div>
              </div>
              
              {/* Simulation content with padding */}
              <div className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-white/90 to-gray-50/30">
                <div className="rounded-xl sm:rounded-2xl overflow-hidden shadow-lg border border-gray-200/50">
                  <Sandbox
                    code={result.code}
                    uiInputs={result.uiInputs}
                    params={sliderValues}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
} 