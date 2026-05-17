import React from 'react';

const STEPS = [
  { key: 'placed', label: 'Order Placed', icon: '📋' },
  { key: 'verified', label: 'Verified', icon: '✅' },
  { key: 'processing', label: 'Processing', icon: '⚙️' },
  { key: 'delivering', label: 'Delivering', icon: '🚀' },
  { key: 'completed', label: 'Completed', icon: '🎉' },
];

function statusToActiveStep(status) {
  if (!status) return 0;
  const s = String(status).toLowerCase();
  if (['cancelled', 'failed', 'error'].includes(s)) return -1;
  if (['pending', 'pending_manual'].includes(s)) return 1;
  if (['in_progress', 'processing'].includes(s)) return 3;
  if (['completed', 'partial'].includes(s)) return 5;
  return 2;
}

export default function OrderProgressTimeline({ status, timeline = [], className = '' }) {
  const activeStep = statusToActiveStep(status);
  const isFailed = ['cancelled', 'failed', 'error'].includes(String(status || '').toLowerCase());

  return (
    <div className={className}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-2">
        {STEPS.map((step, index) => {
          const stepIndex = index + 1;
          const isCompleted = activeStep > stepIndex || (activeStep === 5 && stepIndex <= 5);
          const isCurrent = activeStep === stepIndex;
          const isFailedAtThis = isFailed && activeStep === -1 && stepIndex === 2;

          return (
            <React.Fragment key={step.key}>
              <div className="flex items-center gap-3">
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 flex-shrink-0
                    ${isCompleted ? 'border-neon-green bg-neon-green/20 text-neon-green' : ''}
                    ${isCurrent ? 'border-neon-green bg-neon-green/20 text-neon-green animate-pulse-green' : ''}
                    ${!isCompleted && !isCurrent ? 'border-white/20 text-gray-500 bg-white/5' : ''}
                    ${isFailedAtThis ? 'border-red-500 bg-red-500/20 text-red-400' : ''}
                  `}
                  title={step.label}
                >
                  {isFailedAtThis ? '✕' : step.icon}
                </div>
                <div>
                  <p className={`text-sm font-medium ${isCompleted || isCurrent ? 'text-white' : 'text-gray-500'}`}>
                    {step.label}
                  </p>
                  {timeline[index]?.timestamp && (
                    <p className="text-xs text-gray-500">
                      {new Date(timeline[index].timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`hidden md:block flex-1 h-0.5 mx-2 min-w-[24px] ${
                    isCompleted ? 'bg-neon-green' : 'bg-white/10'
                  }`}
                />
              )}
              {index < STEPS.length - 1 && (
                <div className={`md:hidden w-0.5 h-4 ml-5 flex-shrink-0 ${isCompleted ? 'bg-neon-green' : 'bg-white/10'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
        }
        .animate-pulse-green {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
