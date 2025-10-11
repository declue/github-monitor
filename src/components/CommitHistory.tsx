import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  Avatar,
  Chip,
  Tooltip,
} from '@mui/material';
import { CommitOutlined } from '@mui/icons-material';
import type { GitCommit } from '../api';

interface CommitHistoryProps {
  commits: GitCommit[];
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const getAvatarColor = (email: string): string => {
  // Generate a consistent color based on email
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 50%)`;
};

export const CommitHistory: React.FC<CommitHistoryProps> = ({ commits }) => {
  if (commits.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No commits yet
        </Typography>
      </Box>
    );
  }

  return (
    <List
      sx={{
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.3)',
          },
        },
      }}
    >
      {commits.map((commit, index) => (
        <ListItem
          key={commit.hash}
          sx={{
            borderLeft: index < commits.length - 1 ? '2px solid' : 'none',
            borderColor: 'divider',
            ml: 3,
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: -9,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 14,
              height: 14,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              border: '2px solid',
              borderColor: 'background.paper',
            },
          }}
        >
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Tooltip title={commit.email}>
                <Avatar
                  sx={{
                    width: 24,
                    height: 24,
                    fontSize: '0.75rem',
                    bgcolor: getAvatarColor(commit.email),
                  }}
                >
                  {commit.author[0].toUpperCase()}
                </Avatar>
              </Tooltip>
              <Typography variant="body2" sx={{ fontWeight: 'medium', flexGrow: 1 }}>
                {commit.message}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 4 }}>
              <Typography variant="caption" color="text.secondary">
                {commit.author}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                •
              </Typography>
              <Tooltip title={commit.date}>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(commit.date)}
                </Typography>
              </Tooltip>
              <Tooltip title={commit.hash}>
                <Chip
                  label={commit.short_hash}
                  size="small"
                  icon={<CommitOutlined sx={{ fontSize: 12 }} />}
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    '& .MuiChip-icon': {
                      fontSize: 12,
                    },
                  }}
                />
              </Tooltip>
            </Box>

            {commit.body && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  mt: 0.5,
                  ml: 4,
                  whiteSpace: 'pre-wrap',
                  maxHeight: 60,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {commit.body}
              </Typography>
            )}
          </Box>
        </ListItem>
      ))}
    </List>
  );
};
