import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  Checkbox,
  Divider,
  Collapse,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  DriveFileRenameOutline,
  Help,
  ExpandMore,
  ChevronRight,
} from '@mui/icons-material';
import { useState } from 'react';
import type { GitStatusFile } from '../api';

interface FileChangesProps {
  stagedFiles: GitStatusFile[];
  unstagedFiles: GitStatusFile[];
  onStageFile: (file: GitStatusFile) => void;
  onUnstageFile: (file: GitStatusFile) => void;
  repoPath: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'added':
      return <Add fontSize="small" color="success" />;
    case 'modified':
      return <Edit fontSize="small" color="warning" />;
    case 'deleted':
      return <Delete fontSize="small" color="error" />;
    case 'renamed':
      return <DriveFileRenameOutline fontSize="small" color="info" />;
    case 'untracked':
      return <Help fontSize="small" color="disabled" />;
    default:
      return <Help fontSize="small" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'added':
      return 'success';
    case 'modified':
      return 'warning';
    case 'deleted':
      return 'error';
    case 'renamed':
      return 'info';
    case 'untracked':
      return 'default';
    default:
      return 'default';
  }
};

export const FileChanges: React.FC<FileChangesProps> = ({
  stagedFiles,
  unstagedFiles,
  onStageFile,
  onUnstageFile,
  repoPath,
}) => {
  const [stagedExpanded, setStagedExpanded] = useState(true);
  const [unstagedExpanded, setUnstagedExpanded] = useState(true);

  return (
    <Box>
      {/* Staged Files Section */}
      {stagedFiles.length > 0 && (
        <>
          <ListItemButton onClick={() => setStagedExpanded(!stagedExpanded)} sx={{ py: 0.5, minHeight: 32 }}>
            <ListItemIcon sx={{ minWidth: 24 }}>
              {stagedExpanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    Staged Changes
                  </Typography>
                  <Chip label={stagedFiles.length} size="small" color="primary" sx={{ height: 16, fontSize: '0.65rem' }} />
                </Box>
              }
            />
          </ListItemButton>
          <Collapse in={stagedExpanded} timeout="auto" unmountOnExit>
            <List dense disablePadding>
              {stagedFiles.map((file) => (
                <ListItem
                  key={file.path}
                  disablePadding
                  sx={{ py: 0 }}
                  secondaryAction={
                    <Checkbox
                      edge="end"
                      checked={true}
                      onChange={() => onUnstageFile(file)}
                      size="small"
                      sx={{ p: 0.25 }}
                    />
                  }
                >
                  <ListItemButton sx={{ pl: 3, py: 0.25, minHeight: 28 }}>
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      {getStatusIcon(file.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={file.path.split('/').pop() || file.path}
                      primaryTypographyProps={{
                        variant: 'caption',
                        sx: { fontSize: '0.75rem', lineHeight: 1.2 }
                      }}
                    />
                    <Chip
                      label={file.status}
                      size="small"
                      color={getStatusColor(file.status) as any}
                      sx={{ ml: 0.5, height: 16, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.5 } }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
          <Divider />
        </>
      )}

      {/* Unstaged Files Section */}
      {unstagedFiles.length > 0 && (
        <>
          <ListItemButton onClick={() => setUnstagedExpanded(!unstagedExpanded)} sx={{ py: 0.5, minHeight: 32 }}>
            <ListItemIcon sx={{ minWidth: 24 }}>
              {unstagedExpanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    Unstaged Changes
                  </Typography>
                  <Chip label={unstagedFiles.length} size="small" sx={{ height: 16, fontSize: '0.65rem' }} />
                </Box>
              }
            />
          </ListItemButton>
          <Collapse in={unstagedExpanded} timeout="auto" unmountOnExit>
            <List dense disablePadding>
              {unstagedFiles.map((file) => (
                <ListItem
                  key={file.path}
                  disablePadding
                  sx={{ py: 0 }}
                  secondaryAction={
                    <Checkbox
                      edge="end"
                      checked={false}
                      onChange={() => onStageFile(file)}
                      size="small"
                      sx={{ p: 0.25 }}
                    />
                  }
                >
                  <ListItemButton sx={{ pl: 3, py: 0.25, minHeight: 28 }}>
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      {getStatusIcon(file.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={file.path.split('/').pop() || file.path}
                      primaryTypographyProps={{
                        variant: 'caption',
                        sx: { fontSize: '0.75rem', lineHeight: 1.2 }
                      }}
                    />
                    <Chip
                      label={file.status}
                      size="small"
                      color={getStatusColor(file.status) as any}
                      sx={{ ml: 0.5, height: 16, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.5 } }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        </>
      )}

      {/* Empty State */}
      {stagedFiles.length === 0 && unstagedFiles.length === 0 && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            No changes detected
          </Typography>
        </Box>
      )}
    </Box>
  );
};
