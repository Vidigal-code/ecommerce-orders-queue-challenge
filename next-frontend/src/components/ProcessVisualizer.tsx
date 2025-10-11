'use client';

import { useMemo } from 'react';
import { Phase } from '@/lib/types';

interface PhaseStepProps {
  phase: Phase;
  currentPhase: Phase;
  label: string;
  description: string;
}

interface ProcessVisualizerProps {
  phase: Phase;
}

const PHASE_ORDER: Phase[] = [
  'IDLE',
  'GENERATING',
  'ENQUEUE_VIP',
  'WAITING_VIP_DRAIN',
  'ENQUEUE_NORMAL',
  'WAITING_NORMAL_DRAIN',
  'DONE'
];

const PHASE_DETAILS: Record<Phase, { label: string; description: string }> = {
  'IDLE': {
    label: 'Idle',
    description: 'System is ready to start processing'
  },
  'GENERATING': {
    label: 'Generating Orders',
    description: 'Creating random orders and storing in database'
  },
  'ENQUEUE_VIP': {
    label: 'Enqueuing VIP',
    description: 'Adding VIP (DIAMOND) orders to processing queue'
  },
  'WAITING_VIP_DRAIN': {
    label: 'Processing VIP',
    description: 'Processing VIP orders with priority'
  },
  'ENQUEUE_NORMAL': {
    label: 'Enqueuing Normal',
    description: 'Adding regular orders to processing queue'
  },
  'WAITING_NORMAL_DRAIN': {
    label: 'Processing Normal',
    description: 'Processing regular orders'
  },
  'DONE': {
    label: 'Complete',
    description: 'Processing completed successfully'
  },
  'ERROR': {
    label: 'Error',
    description: 'An error occurred during processing'
  }
};

function PhaseStep({ phase, currentPhase, label, description }: PhaseStepProps) {
  // Determine status of this phase based on current phase
  const currentPhaseIndex = PHASE_ORDER.indexOf(currentPhase);
  const thisPhaseIndex = PHASE_ORDER.indexOf(phase);
  
  let status: 'completed' | 'active' | 'upcoming' = 'upcoming';
  if (currentPhase === 'ERROR') {
    status = thisPhaseIndex <= currentPhaseIndex ? 'completed' : 'upcoming';
  } else if (thisPhaseIndex < currentPhaseIndex) {
    status = 'completed';
  } else if (thisPhaseIndex === currentPhaseIndex) {
    status = 'active';
  }

  // Special case for ERROR state
  if (currentPhase === 'ERROR' && phase === currentPhase) {
    status = 'active';
  }

  return (
    <div className="flex items-start">
      <div className="flex flex-col items-center mr-4">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
          status === 'completed' ? 'bg-green-700' : 
          status === 'active' ? 'bg-blue-600 animate-pulse' : 
          'bg-neutral-700'
        }`}>
          {status === 'completed' && (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path>
            </svg>
          )}
          {status === 'active' && (
            <div className="w-2 h-2 bg-white rounded-full"></div>
          )}
        </div>
        {phase !== 'DONE' && phase !== 'ERROR' && (
          <div className={`w-px h-12 ${
            status === 'completed' ? 'bg-green-700' : 
            status === 'active' ? 'bg-blue-600' : 
            'bg-neutral-700'
          }`}></div>
        )}
      </div>
      <div className="pt-1">
        <h4 className={`font-medium ${
          status === 'completed' ? 'text-green-400' : 
          status === 'active' ? 'text-blue-400' : 
          'text-neutral-400'
        }`}>{label}</h4>
        <p className="text-xs text-neutral-500 mt-1">{description}</p>
      </div>
    </div>
  );
}

export function ProcessVisualizer({ phase }: ProcessVisualizerProps) {
  const phasesToDisplay: Phase[] = useMemo(() => {
    if (phase === 'ERROR') {
      return [...PHASE_ORDER, 'ERROR'];
    }
    return PHASE_ORDER;
  }, [phase]);

  return (
    <div className="p-4 rounded-lg bg-neutral-800 border border-neutral-700 space-y-2">
      <h3 className="text-sm font-semibold tracking-wide text-neutral-300 mb-4">Process Workflow</h3>
      <div className="space-y-2">
        {phasesToDisplay.map((p) => (
          <PhaseStep 
            key={p} 
            phase={p} 
            currentPhase={phase} 
            label={PHASE_DETAILS[p].label}
            description={PHASE_DETAILS[p].description}
          />
        ))}
        
        {phase === 'ERROR' && (
          <PhaseStep 
            phase="ERROR" 
            currentPhase={phase}
            label={PHASE_DETAILS['ERROR'].label} 
            description={PHASE_DETAILS['ERROR'].description} 
          />
        )}
      </div>
    </div>
  );
}