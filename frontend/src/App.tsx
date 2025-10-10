import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Refresh, GitHub, Settings as SettingsIcon } from '@mui/icons-material';
import { TreeView } from './components/TreeView';
import { RateLimitDisplay } from './components/RateLimitDisplay';
import { SettingsDialog } from './components/SettingsDialog';
import { fetchTree, fetchRateLimit } from './api';
import type { TreeNode, RateLimitInfo } from './types';
import { loadSettings, saveSettings } from './utils/storage';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#0a1929',
      paper: '#1e293b',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

function App() {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [token, setToken] = useState('');
  const [orgs, setOrgs] = useState<string[]>([]);
  const [githubApiUrl, setGithubApiUrl] = useState('https://api.github.com');

  const loadData = async () => {
    if (!token) {
      setError('Please configure your GitHub token in settings');
      setLoading(false);
      setSettingsOpen(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [tree, rate] = await Promise.all([
        fetchTree(orgs, token, githubApiUrl),
        fetchRateLimit(token, githubApiUrl),
      ]);

      setTreeData(tree);
      setRateLimit(rate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = (newToken: string, newOrgs: string[], newGithubApiUrl: string) => {
    setToken(newToken);
    setOrgs(newOrgs);
    setGithubApiUrl(newGithubApiUrl);
    saveSettings({ token: newToken, orgs: newOrgs, githubApiUrl: newGithubApiUrl });
  };

  useEffect(() => {
    // Load settings from localStorage
    const settings = loadSettings();
    if (settings) {
      setToken(settings.token);
      setOrgs(settings.orgs);
      setGithubApiUrl(settings.githubApiUrl || 'https://api.github.com');
    } else {
      setLoading(false);
      setSettingsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadData();

      // Refresh rate limit every 30 seconds
      const interval = setInterval(() => {
        if (token) {
          fetchRateLimit(token, githubApiUrl).then(setRateLimit).catch(console.error);
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [token, orgs, githubApiUrl]);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <GitHub sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              GitHub Repository Explorer
            </Typography>

            {rateLimit && <RateLimitDisplay rateLimit={rateLimit} />}

            <Tooltip title="Settings">
              <IconButton
                color="inherit"
                onClick={() => setSettingsOpen(true)}
                sx={{ ml: 2 }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Refresh data">
              <IconButton
                color="inherit"
                onClick={loadData}
                disabled={loading || !token}
                sx={{ ml: 1 }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
          {loading && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 400,
              }}
            >
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                !token && (
                  <IconButton
                    color="inherit"
                    size="small"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <SettingsIcon />
                  </IconButton>
                )
              }
            >
              {error}
            </Alert>
          )}

          {!loading && !error && treeData.length === 0 && (
            <Alert severity="info">
              No repositories found. Make sure your GitHub token is configured correctly.
            </Alert>
          )}

          {!loading && !error && treeData.length > 0 && (
            <Paper
              elevation={2}
              sx={{
                p: 2,
                minHeight: 400,
                bgcolor: 'background.paper',
                borderRadius: 2,
              }}
            >
              <TreeView data={treeData} />
            </Paper>
          )}
        </Container>

        <Box
          component="footer"
          sx={{
            py: 2,
            px: 2,
            mt: 'auto',
            backgroundColor: 'background.paper',
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            GitHub Repository Explorer - Monitor your development status at a glance
          </Typography>
        </Box>
      </Box>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
        currentToken={token}
        currentOrgs={orgs}
        currentGithubApiUrl={githubApiUrl}
      />
    </ThemeProvider>
  );
}

export default App;
