import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, LinearProgress, Typography } from '@mui/material';

interface ProgressiveLoadingProps {
  stages: Array<{
    message: string;
    duration: number;
    component?: React.ReactNode;
  }>;
  onComplete?: () => void;
  children: React.ReactNode;
}

const ProgressiveLoading: React.FC<ProgressiveLoadingProps> = ({ stages, onComplete, children }) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (currentStage >= stages.length) {
      if (onComplete) onComplete();
      return;
    }

    const stage = stages[currentStage];
    let progressInterval: ReturnType<typeof setInterval> | undefined;

    const stageTimeout = setTimeout(() => {
      setCurrentStage(prev => prev + 1);
      setProgress(0);
    }, stage.duration);

    progressInterval = setInterval(() => {
      setProgress(prev => {
        const increment = 100 / (stage.duration / 100);
        return Math.min(prev + increment, 100);
      });
    }, 100);

    return () => {
      clearTimeout(stageTimeout);
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [currentStage, stages, onComplete]);

  if (currentStage >= stages.length) {
    return <>{children}</>;
  }

  const currentStageData = stages[currentStage];

  return (
    <Box sx={{ textAlign: 'center', p: 4 }}>
      <CircularProgress size={60} sx={{ mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        {currentStageData.message}
      </Typography>
      <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto', mb: 2 }}>
        <LinearProgress variant="determinate" value={progress} />
      </Box>
      <Typography variant="body2" color="text.secondary">
        Étape {currentStage + 1} sur {stages.length}
      </Typography>
      {currentStageData.component && <Box sx={{ mt: 2 }}>{currentStageData.component}</Box>}
    </Box>
  );
};

export default ProgressiveLoading;


