import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-nexus-panel w-full max-w-3xl rounded-xl border border-nexus-accent shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="fas fa-project-diagram text-nexus-accent"></i>
            Architecture Mapping
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto text-slate-300 space-y-6">
          <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
            <p className="text-sm">
              <strong className="text-blue-400">NOTE:</strong> You requested a Flutter + Python + ESP32 stack for Migraine/Health Monitoring.
              As a React environment, this application <strong>simulates</strong> that exact architecture in the browser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-nexus-accent font-bold">1. Virtual ESP32 (Wearable Node)</h3>
              <p className="text-sm text-slate-400">
                <strong>Your Request:</strong> ESP32 reading sensors &rarr; RTDB.<br/>
                <strong>This Simulation:</strong> A background loop in <code>App.tsx</code> generates randomized <strong>Heart Rate</strong>, Temperature, and Humidity data and pushes it to a local state array (Simulated RTDB).
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-nexus-accent font-bold">2. Virtual Python Worker (AI)</h3>
              <p className="text-sm text-slate-400">
                <strong>Your Request:</strong> Python script reading RTDB &rarr; Gemini &rarr; Firestore.<br/>
                <strong>This Simulation:</strong> The <code>useInterval</code> hook periodically triggers <code>geminiService.ts</code>. It sends the recent biometric data to OpenRouter (running Gemini models) and writes the result to the "Predictions" list (Simulated Firestore).
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-nexus-accent font-bold">3. Frontend (Flutter Replacement)</h3>
              <p className="text-sm text-slate-400">
                <strong>Your Request:</strong> Flutter app using Riverpod.<br/>
                <strong>This Simulation:</strong> A React app using Hooks for state management. It subscribes to the "live" health data streams and displays the AI insights.
              </p>
            </div>

             <div className="space-y-2">
              <h3 className="text-nexus-accent font-bold">4. Control Loop</h3>
              <p className="text-sm text-slate-400">
                <strong>Your Request:</strong> App writes triggers to RTDB &rarr; ESP32 reads triggers.<br/>
                <strong>This Simulation:</strong> Clicking "FAN ON" adds a command to the event log. The Virtual ESP32 "reacts" by stabilizing the simulated environmental values.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-nexus-accent text-nexus-dark font-bold rounded hover:bg-sky-400 transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};