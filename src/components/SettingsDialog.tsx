import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  IconButton,
  Chip,
  Stack,
  InputAdornment,
} from '@mui/material';
import { Close, Add, Delete, Visibility, VisibilityOff, Folder } from '@mui/icons-material';
import { getConfigPath } from '../api/config';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (token: string, orgs: string[], githubApiUrl: string) => void;
  currentToken: string;
  currentOrgs: string[];
  currentGithubApiUrl: string;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onClose,
  onSave,
  currentToken,
  currentOrgs,
  currentGithubApiUrl,
}) => {
  const [token, setToken] = useState(currentToken);
  const [orgs, setOrgs] = useState<string[]>(currentOrgs);
  const [githubApiUrl, setGithubApiUrl] = useState(currentGithubApiUrl);
  const [newOrg, setNewOrg] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [configPath, setConfigPath] = useState<string>('');

  useEffect(() => {
    setToken(currentToken);
    setOrgs(currentOrgs);
    setGithubApiUrl(currentGithubApiUrl);

    // Load config path when dialog opens
    if (open) {
      getConfigPath()
        .then((paths) => {
          setConfigPath(paths.config_file);
        })
        .catch((error) => {
          console.error('Failed to get config path:', error);
        });
    }
  }, [currentToken, currentOrgs, currentGithubApiUrl, open]);

  const handleAddOrg = () => {
    if (newOrg.trim() && !orgs.includes(newOrg.trim())) {
      setOrgs([...orgs, newOrg.trim()]);
      setNewOrg('');
    }
  };

  const handleRemoveOrg = (org: string) => {
    setOrgs(orgs.filter((o) => o !== org));
  };

  const handleSave = () => {
    onSave(token, orgs, githubApiUrl);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddOrg();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Settings</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Settings are stored in your home directory configuration file.
              Your token is never sent to any server except GitHub API.
            </Typography>
            {configPath && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Folder fontSize="small" />
                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                  {configPath}
                </Typography>
              </Box>
            )}
          </Alert>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              GitHub API Base URL
            </Typography>
            <TextField
              fullWidth
              value={githubApiUrl}
              onChange={(e) => setGithubApiUrl(e.target.value)}
              placeholder="https://api.github.com"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              For GitHub.com use: <strong>https://api.github.com</strong>
              <br />
              For Enterprise use: <strong>https://github.company.com/api/v3</strong>
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              GitHub Personal Access Token *
            </Typography>
            <TextField
              fullWidth
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowToken(!showToken)}
                      edge="end"
                      size="small"
                    >
                      {showToken ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Required permissions: repo, workflow, read:org
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Organizations / Users
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Leave empty to show all accessible repositories
            </Typography>

            <Box display="flex" gap={1} mb={2}>
              <TextField
                fullWidth
                size="small"
                value={newOrg}
                onChange={(e) => setNewOrg(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add organization or username"
              />
              <Button
                variant="contained"
                onClick={handleAddOrg}
                disabled={!newOrg.trim()}
                startIcon={<Add />}
              >
                Add
              </Button>
            </Box>

            {orgs.length > 0 && (
              <Box display="flex" flexWrap="wrap" gap={1}>
                {orgs.map((org) => (
                  <Chip
                    key={org}
                    label={org}
                    onDelete={() => handleRemoveOrg(org)}
                    deleteIcon={<Delete />}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
          </Box>

          <Alert severity="warning">
            <Typography variant="body2">
              <strong>How to create a GitHub Token:</strong>
            </Typography>
            <Typography variant="caption" component="div" sx={{ mt: 1 }}>
              1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
              <br />
              2. Click "Generate new token (classic)"
              <br />
              3. Select scopes: <strong>repo</strong>, <strong>workflow</strong>, <strong>read:org</strong>
              <br />
              4. Copy the generated token and paste it above
            </Typography>
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!token.trim()}
        >
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};
