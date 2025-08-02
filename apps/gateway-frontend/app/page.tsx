'use client';

import { useState } from 'react';
import { UiInput, Spec } from '@interactive-edu/shared-schema';
import { Sandbox } from './components/Sandbox';

export default function HomePage() {
  const [prompt, setPrompt] = useState('');
  const [topic, setTopic] = useState<'math' | 'physics' | 'chemistry' | 'history'>('physics');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Spec | null>(null);
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Interactive-Edu
        </h1>
        <p className="text-lg text-gray-600">
          AI-Driven Visual Simulator for Math, Physics, Chemistry & History
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
              Topic
            </label>
            <select
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value as any)}
              className="input-field w-full"
            >
              <option value="physics">Physics</option>
              <option value="math">Mathematics</option>
              <option value="chemistry">Chemistry</option>
              <option value="history">History</option>
            </select>
          </div>

          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
              Describe what you want to simulate
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Simulate projectile motion with 20 m/s initial velocity' or 'Show quadratic function with adjustable coefficients'"
              rows={4}
              className="input-field w-full resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating...' : 'Generate Simulation'}
          </button>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Error</div>
          <div className="text-red-700 text-sm mt-1">{error}</div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Controls</h3>
            
            {result.uiInputs.map((input: UiInput) => (
              <div key={input.name} className="slider-container">
                <label htmlFor={input.name} className="block text-sm font-medium text-gray-700">
                  {input.label}
                </label>
                <input
                  type="range"
                  id={input.name}
                  min={input.min}
                  max={input.max}
                  step={input.step}
                  value={sliderValues[input.name] || input.value}
                  onChange={(e) => handleSliderChange(input.name, parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{input.min}</span>
                  <span className="font-medium">{sliderValues[input.name] || input.value}</span>
                  <span>{input.max}</span>
                </div>
              </div>
            ))}

            {result.image && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-2">Reference</h4>
                <img
                  src={result.image}
                  alt="Educational reference"
                  className="w-full rounded-lg border"
                />
              </div>
            )}
          </div>

          {/* Simulation */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Simulation</h3>
            <div className="bg-white rounded-lg border p-4">
              <Sandbox
                code={result.code}
                uiInputs={result.uiInputs}
                params={sliderValues}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 