import { Box, Typography, LinearProgress, Tooltip, Chip } from '@mui/material';
import { Api, Timer } from '@mui/icons-material';
import { RateLimitInfo } from '../types';

interface RateLimitDisplayProps {
  rateLimit: RateLimitInfo | null;
}

export const RateLimitDisplay: React.FC<RateLimitDisplayProps> = ({ rateLimit }) => {
  if (!rateLimit) {
    return null;
  }

  const usagePercentage = (rateLimit.used / rateLimit.limit) * 100;
  const resetDate = new Date(rateLimit.reset * 1000);
  const now = new Date();
  const minutesUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / 60000);

  const getProgressColor = () => {
    if (usagePercentage < 50) return 'success';
    if (usagePercentage < 80) return 'warning';
    return 'error';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2,
        py: 1,
        bgcolor: 'background.paper',
        borderRadius: 1,
      }}
    >
      <Api fontSize="small" color="action" />

      <Tooltip title="GitHub API rate limit usage">
        <Box sx={{ minWidth: 200 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              API Usage
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {rateLimit.remaining} / {rateLimit.limit}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={100 - usagePercentage}
            color={getProgressColor()}
            sx={{ height: 6, borderRadius: 1 }}
          />
        </Box>
      </Tooltip>

      <Tooltip title={`Resets at ${resetDate.toLocaleTimeString()}`}>
        <Chip
          icon={<Timer fontSize="small" />}
          label={`Resets in ${minutesUntilReset}m`}
          size="small"
          variant="outlined"
          sx={{ height: 24, fontSize: '0.75rem' }}
        />
      </Tooltip>
    </Box>
  );
};
