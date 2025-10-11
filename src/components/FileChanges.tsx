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
          <ListItemButton onClick={() => setStagedExpanded(!stagedExpanded)} sx={{ py: 1 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {stagedExpanded ? <ExpandMore /> : <ChevronRight />}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2">Staged Changes</Typography>
                  <Chip label={stagedFiles.length} size="small" color="primary" />
                </Box>
              }
            />
          </ListItemButton>
          <Collapse in={stagedExpanded} timeout="auto" unmountOnExit>
            <List dense>
              {stagedFiles.map((file) => (
                <ListItem
                  key={file.path}
                  disablePadding
                  secondaryAction={
                    <Checkbox
                      edge="end"
                      checked={true}
                      onChange={() => onUnstageFile(file)}
                      size="small"
                    />
                  }
                >
                  <ListItemButton sx={{ pl: 4 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {getStatusIcon(file.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={file.path.split('/').pop() || file.path}
                      secondary={file.path}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                    />
                    <Chip
                      label={file.status}
                      size="small"
                      color={getStatusColor(file.status) as any}
                      sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
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
          <ListItemButton onClick={() => setUnstagedExpanded(!unstagedExpanded)} sx={{ py: 1 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {unstagedExpanded ? <ExpandMore /> : <ChevronRight />}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2">Unstaged Changes</Typography>
                  <Chip label={unstagedFiles.length} size="small" />
                </Box>
              }
            />
          </ListItemButton>
          <Collapse in={unstagedExpanded} timeout="auto" unmountOnExit>
            <List dense>
              {unstagedFiles.map((file) => (
                <ListItem
                  key={file.path}
                  disablePadding
                  secondaryAction={
                    <Checkbox
                      edge="end"
                      checked={false}
                      onChange={() => onStageFile(file)}
                      size="small"
                    />
                  }
                >
                  <ListItemButton sx={{ pl: 4 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {getStatusIcon(file.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={file.path.split('/').pop() || file.path}
                      secondary={file.path}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                    />
                    <Chip
                      label={file.status}
                      size="small"
                      color={getStatusColor(file.status) as any}
                      sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
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
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No changes detected
          </Typography>
        </Box>
      )}
    </Box>
  );
};
