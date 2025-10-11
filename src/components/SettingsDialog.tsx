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
          <Typography variant="h6">설정</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              설정은 홈 디렉토리의 설정 파일에 저장됩니다.
              토큰은 GitHub API 외에 다른 서버로 전송되지 않습니다.
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
              GitHub.com 사용: <strong>https://api.github.com</strong>
              <br />
              GitHub Enterprise 사용: <strong>https://github.company.com/api/v3</strong>
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
              필수 권한: repo, workflow, read:org
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Organization / User
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              비워두면 접근 가능한 모든 저장소를 표시합니다
            </Typography>

            <Box display="flex" gap={1} mb={2}>
              <TextField
                fullWidth
                size="small"
                value={newOrg}
                onChange={(e) => setNewOrg(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Organization 또는 사용자명 추가"
              />
              <Button
                variant="contained"
                onClick={handleAddOrg}
                disabled={!newOrg.trim()}
                startIcon={<Add />}
              >
                추가
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
              <strong>GitHub Token 생성 방법:</strong>
            </Typography>
            <Typography variant="caption" component="div" sx={{ mt: 1 }}>
              1. GitHub 설정 → Developer settings → Personal access tokens → Tokens (classic) 이동
              <br />
              2. "Generate new token (classic)" 클릭
              <br />
              3. 권한 선택: <strong>repo</strong>, <strong>workflow</strong>, <strong>read:org</strong>
              <br />
              4. 생성된 토큰을 복사하여 위에 붙여넣기
            </Typography>
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>취소</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!token.trim()}
        >
          설정 저장
        </Button>
      </DialogActions>
    </Dialog>
  );
};
