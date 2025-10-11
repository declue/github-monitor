import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Refresh, FolderOpen } from '@mui/icons-material';
import {
  fetchGitStatus,
  fetchGitLog,
  gitAdd,
  gitReset,
  gitCommit,
  type GitStatus,
  type GitCommit as GitCommitType,
  type GitStatusFile,
} from '../api';
import { FileChanges } from './FileChanges';
import { CommitHistory } from './CommitHistory';

interface CommitsTabProps {
  // For now, we'll use a hardcoded repo path
  // Later this can be enhanced to select from enabled repos
}

export const CommitsTab: React.FC<CommitsTabProps> = () => {
  const [repoPath, setRepoPath] = useState('');
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<GitCommitType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [commitDescription, setCommitDescription] = useState('');
  const [committing, setCommitting] = useState(false);

  // Load git status and commit history
  const loadGitData = useCallback(async () => {
    if (!repoPath) return;

    try {
      setLoading(true);
      setError(null);

      const [statusData, commitsData] = await Promise.all([
        fetchGitStatus(repoPath),
        fetchGitLog(repoPath, 50),
      ]);

      setStatus(statusData);
      setCommits(commitsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load git data');
      console.error('Error loading git data:', err);
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    loadGitData();
  }, [loadGitData]);

  const handleStageFile = async (file: GitStatusFile) => {
    try {
      await gitAdd(repoPath, [file.path]);
      await loadGitData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stage file');
    }
  };

  const handleUnstageFile = async (file: GitStatusFile) => {
    try {
      await gitReset(repoPath, [file.path]);
      await loadGitData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unstage file');
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      setError('Commit message is required');
      return;
    }

    if (!status || status.files.filter(f => f.staged).length === 0) {
      setError('No staged files to commit');
      return;
    }

    try {
      setCommitting(true);
      setError(null);

      await gitCommit({
        repo_path: repoPath,
        message: commitMessage,
        description: commitDescription || undefined,
      });

      // Clear form and reload
      setCommitMessage('');
      setCommitDescription('');
      await loadGitData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create commit');
    } finally {
      setCommitting(false);
    }
  };

  const handleBrowseRepo = () => {
    // In a real desktop app, this would open a directory picker
    // For now, we'll use a prompt
    const path = prompt('Enter repository path:', repoPath || 'C:\\Users\\qmoix\\git\\jhl-github-desktop');
    if (path) {
      setRepoPath(path);
    }
  };

  const stagedFiles = status?.files.filter(f => f.staged) || [];
  const unstagedFiles = status?.files.filter(f => !f.staged) || [];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1 }}>
      {/* Repository Path - Compact */}
      <Paper sx={{ p: 1, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TextField
            fullWidth
            size="small"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="Repository Path"
            sx={{
              '& .MuiInputBase-root': { height: 32, fontSize: '0.875rem' },
              '& .MuiInputBase-input': { py: 0.5 },
            }}
          />
          <Tooltip title="Browse">
            <IconButton onClick={handleBrowseRepo} size="small" color="primary" sx={{ p: 0.5 }}>
              <FolderOpen fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={loadGitData} disabled={loading || !repoPath} size="small" color="primary" sx={{ p: 0.5 }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          {status && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1, fontSize: '0.75rem' }}>
                {status.branch}
              </Typography>
              {status.ahead > 0 && (
                <Chip label={`↑${status.ahead}`} size="small" color="success" sx={{ height: 18, fontSize: '0.7rem' }} />
              )}
              {status.behind > 0 && (
                <Chip label={`↓${status.behind}`} size="small" color="warning" sx={{ height: 18, fontSize: '0.7rem' }} />
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Main Content - GitHub Desktop Layout */}
      {!loading && repoPath && status && (
        <Box sx={{ display: 'flex', gap: 1, flexGrow: 1, minHeight: 0 }}>
          {/* Left Side: Changes + Commit Form */}
          <Box sx={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0 }}>
            {/* Changes */}
            <Paper sx={{ flex: '1 1 60%', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Changes
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {stagedFiles.length} staged · {unstagedFiles.length} unstaged
                </Typography>
              </Box>
              <Box
                sx={{
                  flexGrow: 1,
                  overflow: 'auto',
                  minHeight: 0,
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'rgba(255, 255, 255, 0.05)',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '3px',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.3)',
                    },
                  },
                }}
              >
                <FileChanges
                  stagedFiles={stagedFiles}
                  unstagedFiles={unstagedFiles}
                  onStageFile={handleStageFile}
                  onUnstageFile={handleUnstageFile}
                  repoPath={repoPath}
                />
              </Box>
            </Paper>

            {/* Commit Form - Compact */}
            <Paper sx={{ flex: '0 0 auto', p: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Summary (required)"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                disabled={committing}
                sx={{
                  mb: 0.5,
                  '& .MuiInputBase-root': { fontSize: '0.875rem' },
                }}
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                placeholder="Description (optional)"
                value={commitDescription}
                onChange={(e) => setCommitDescription(e.target.value)}
                disabled={committing}
                sx={{
                  mb: 1,
                  '& .MuiInputBase-root': { fontSize: '0.875rem' },
                }}
              />
              <Button
                fullWidth
                variant="contained"
                size="small"
                onClick={handleCommit}
                disabled={committing || !commitMessage.trim() || stagedFiles.length === 0}
                sx={{ textTransform: 'none', fontSize: '0.875rem' }}
              >
                {committing ? <CircularProgress size={20} /> : `Commit to ${status.branch}`}
              </Button>
            </Paper>
          </Box>

          {/* Right Side: History */}
          <Paper sx={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
              <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                History
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {commits.length} recent commits
              </Typography>
            </Box>
            <Box
              sx={{
                flexGrow: 1,
                overflow: 'auto',
                minHeight: 0,
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
              <CommitHistory commits={commits} />
            </Box>
          </Paper>
        </Box>
      )}

      {/* Empty State */}
      {!loading && !repoPath && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1,
            p: 3,
          }}
        >
          <FolderOpen sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Repository Selected
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter a repository path or click Browse to select one
          </Typography>
          <Button variant="contained" startIcon={<FolderOpen />} onClick={handleBrowseRepo}>
            Select Repository
          </Button>
        </Box>
      )}
    </Box>
  );
};
