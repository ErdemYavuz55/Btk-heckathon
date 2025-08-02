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
    iframeRef.current.contentWindow?.postMessage({
      type: 'params',
      params
    }, '*');
  }, [params]);

  return (
    <div className="w-full h-96 border rounded-lg overflow-hidden">
      <iframe
        ref={iframeRef}
        src="/sandbox/sandbox.html"
        className="w-full h-full border-none"
        sandbox="allow-scripts"
        title="Simulation Sandbox"
      />
    </div>
  );
} 