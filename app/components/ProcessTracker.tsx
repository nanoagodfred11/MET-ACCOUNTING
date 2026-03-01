import { CheckCircle, Circle, Loader } from 'lucide-react';

export interface StageStatus {
  name: string;
  status: 'complete' | 'in-progress' | 'pending';
  detail?: string;
}

interface ProcessTrackerProps {
  stages: StageStatus[];
}

export function ProcessTracker({ stages }: ProcessTrackerProps) {
  return (
    <div className="bg-navy-700 rounded-lg border-t-2 border-t-teal-400 p-4">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
        Process Pipeline
      </h2>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0">
        {stages.map((stage, i) => (
          <div key={stage.name} className="flex items-center gap-0 w-full sm:w-auto">
            {/* Stage */}
            <div className="flex items-center gap-2 min-w-0">
              <StageIcon status={stage.status} />
              <div className="min-w-0">
                <p className={`text-xs font-medium whitespace-nowrap ${
                  stage.status === 'complete' ? 'text-green-400' :
                  stage.status === 'in-progress' ? 'text-teal-400' :
                  'text-gray-500'
                }`}>
                  {stage.name}
                </p>
                {stage.detail && (
                  <p className="text-[10px] text-gray-600 truncate max-w-[120px]">{stage.detail}</p>
                )}
              </div>
            </div>
            {/* Connector */}
            {i < stages.length - 1 && (
              <div className="hidden sm:block w-6 lg:w-10 h-px bg-navy-500/50 mx-1 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StageIcon({ status }: { status: StageStatus['status'] }) {
  if (status === 'complete') {
    return <CheckCircle size={16} className="text-green-400 flex-shrink-0" />;
  }
  if (status === 'in-progress') {
    return <Loader size={16} className="text-teal-400 animate-spin flex-shrink-0" />;
  }
  return <Circle size={16} className="text-gray-600 flex-shrink-0" />;
}
