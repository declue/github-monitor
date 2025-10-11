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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Repository Path */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Repository Path"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="C:\Users\username\git\repository"
          />
          <Tooltip title="Browse">
            <IconButton onClick={handleBrowseRepo} color="primary">
              <FolderOpen />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={loadGitData} disabled={loading || !repoPath} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>

        {status && (
          <Box sx={{ mt: 1, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Branch: <strong>{status.branch}</strong>
            </Typography>
            {status.ahead > 0 && (
              <Typography variant="caption" color="success.main">
                ↑ {status.ahead} ahead
              </Typography>
            )}
            {status.behind > 0 && (
              <Typography variant="caption" color="warning.main">
                ↓ {status.behind} behind
              </Typography>
            )}
          </Box>
        )}
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

      {/* Main Content */}
      {!loading && repoPath && status && (
        <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, minHeight: 0 }}>
          {/* Left Side: Changes */}
          <Box sx={{ flex: '1 1 40%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">Changes</Typography>
                <Typography variant="caption" color="text.secondary">
                  {stagedFiles.length} staged, {unstagedFiles.length} unstaged
                </Typography>
              </Box>
              <Box sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
                <FileChanges
                  stagedFiles={stagedFiles}
                  unstagedFiles={unstagedFiles}
                  onStageFile={handleStageFile}
                  onUnstageFile={handleUnstageFile}
                  repoPath={repoPath}
                />
              </Box>
            </Paper>
          </Box>

          {/* Right Side: Commit Form + History */}
          <Box sx={{ flex: '1 1 60%', display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>
            {/* Commit Form */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Commit Message
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Summary"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Brief description of changes"
                sx={{ mb: 2 }}
                disabled={committing}
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                label="Description (optional)"
                value={commitDescription}
                onChange={(e) => setCommitDescription(e.target.value)}
                placeholder="Detailed description of changes"
                sx={{ mb: 2 }}
                disabled={committing}
              />
              <Button
                fullWidth
                variant="contained"
                onClick={handleCommit}
                disabled={committing || !commitMessage.trim() || stagedFiles.length === 0}
              >
                {committing ? <CircularProgress size={24} /> : `Commit to ${status.branch}`}
              </Button>
            </Paper>

            {/* Commit History */}
            <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">History</Typography>
                <Typography variant="caption" color="text.secondary">
                  {commits.length} recent commits
                </Typography>
              </Box>
              <Box sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
                <CommitHistory commits={commits} />
              </Box>
            </Paper>
          </Box>
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
