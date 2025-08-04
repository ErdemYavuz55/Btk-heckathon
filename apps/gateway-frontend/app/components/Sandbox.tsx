'use client';

import { useEffect, useRef } from 'react';
import { UiInput } from '@interactive-edu/shared-schema';

interface SandboxProps {
  code: string;
  uiInputs: UiInput[];
  params: Record<string, number>;
}

export function Sandbox({ code, uiInputs, params }: SandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    
    const handleLoad = () => {
      // Send initial code and inputs to sandbox
      iframe.contentWindow?.postMessage({
        type: 'init',
        code,
        uiInputs,
        params
      }, '*');
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [code, uiInputs]);

  useEffect(() => {
    if (!iframeRef.current) return;

    // Send updated parameters to sandbox
    const iframe = iframeRef.current;
    
    // Small delay to ensure iframe is ready
    const sendParams = () => {
      iframe.contentWindow?.postMessage({
        type: 'params',
        params
      }, '*');
    };
    
    const timeoutId = setTimeout(sendParams, 50);
    return () => clearTimeout(timeoutId);
  }, [params]);

  return (
    <div className="w-full h-[500px] border rounded-lg overflow-hidden bg-white shadow-sm">
      <iframe
        ref={iframeRef}
        src="/sandbox/sandbox.html"
        className="w-full h-full border-none block"
        sandbox="allow-scripts allow-same-origin"
        title="Simulation Sandbox"
        style={{ minHeight: '500px' }}
      />
    </div>
  );
} 