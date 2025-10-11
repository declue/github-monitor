import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
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
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Refresh,
  GitHub,
  Settings as SettingsIcon,
  AccountTree,
  Dashboard,
  Timeline,
  Assessment,
  Notifications,
} from '@mui/icons-material';
import { TreeView } from './components/TreeView';
import { RateLimitDisplay } from './components/RateLimitDisplay';
import { SettingsDialog } from './components/SettingsDialog';
import { SearchFilter, type SearchFilterState } from './components/SearchFilter';
import { ListView } from './components/ListView';
import { TabPanel } from './components/TabPanel';
import { fetchTree, fetchRateLimit, fetchRepoDetails } from './api';
import type { TreeNode, RateLimitInfo } from './types';
import { loadSettings, loadSettingsSync, saveSettings } from './utils/storage';
import { filterTreeNodes, countTreeNodes, filterEnabledNodes } from './utils/filterTree';
import { getVersionInfo, ENVIRONMENT } from './config/version';

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
    MuiPaper: {
      defaultProps: {
        elevation: 1,
      },
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
  },
});

function App() {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [filteredTreeData, setFilteredTreeData] = useState<TreeNode[]>([]);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [token, setToken] = useState('');
  const [orgs, setOrgs] = useState<string[]>([]);
  const [githubApiUrl, setGithubApiUrl] = useState('https://api.github.com');
  const [tabValue, setTabValue] = useState(0);

  // Cache for repository details to avoid redundant API calls
  const repoDetailsCache = useRef<Map<string, TreeNode[]>>(new Map());

  const versionInfo = getVersionInfo();
  const isDevelopment = ENVIRONMENT === 'development';
  const isProduction = ENVIRONMENT === 'production';

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

      // Initialize all orgs and repos as enabled by default
      const treeWithEnabled = tree.map(org => ({
        ...org,
        enabled: true,
        children: org.children.map(repo => ({
          ...repo,
          enabled: true,
        })),
      }));

      setTreeData(treeWithEnabled);
      setFilteredTreeData(treeWithEnabled); // Initialize filtered data
      setRateLimit(rate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = useCallback(async (newFilters: SearchFilterState) => {
    const { searchText, selectedTypes } = newFilters;

    // If filters are applied and we need to search in lazy-loaded children (like runners, workflows, etc.)
    const needsDeepSearch = selectedTypes.length > 0 || searchText.trim().length > 0;

    if (needsDeepSearch) {
      // Only expand enabled repositories to avoid unnecessary API calls
      // This will fetch all data first, then update state once at the end
      const expandedData = await expandAllRepositories(treeData, true); // Pass true to only expand enabled

      // Update treeData with all loaded children
      setTreeData(expandedData);

      // Then apply filters
      const filtered = filterTreeNodes(expandedData, newFilters);
      setFilteredTreeData(filtered);
    } else {
      // No filters, just show original data
      setFilteredTreeData(treeData);
    }
  }, [treeData]);

  const handleToggleEnabled = useCallback((nodeId: string, enabled: boolean) => {
    const updateNodeEnabled = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          // Recursively update all children (repos under org, or workflows/runners under repo)
          const updateChildrenEnabled = (children: TreeNode[]): TreeNode[] => {
            return children.map(child => ({
              ...child,
              enabled,
              children: child.children ? updateChildrenEnabled(child.children) : [],
            }));
          };

          return {
            ...node,
            enabled,
            children: node.children ? updateChildrenEnabled(node.children) : [],
          };
        }
        if (node.children && node.children.length > 0) {
          return {
            ...node,
            children: updateNodeEnabled(node.children),
          };
        }
        return node;
      });
    };

    const updatedTree = updateNodeEnabled(treeData);
    setTreeData(updatedTree);
    setFilteredTreeData(updatedTree);
  }, [treeData]);

  const handleSaveSettings = async (newToken: string, newOrgs: string[], newGithubApiUrl: string) => {
    setToken(newToken);
    setOrgs(newOrgs);
    setGithubApiUrl(newGithubApiUrl);
    await saveSettings({ token: newToken, orgs: newOrgs, githubApiUrl: newGithubApiUrl });
    // Clear cache when settings change
    repoDetailsCache.current.clear();
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Load children for a single node (used by TreeView expansion)
  const handleLoadChildren = useCallback(async (node: TreeNode): Promise<TreeNode[]> => {
    // Only handle repository nodes for lazy loading
    if (node.type !== 'repository') {
      return node.children || [];
    }

    const owner = node.metadata?.owner;
    const repo = node.name;

    if (!owner || !repo) {
      console.error('Missing owner or repo name for node:', node);
      return [];
    }

    const cacheKey = `${owner}/${repo}`;

    // Check cache first
    if (repoDetailsCache.current.has(cacheKey)) {
      return repoDetailsCache.current.get(cacheKey)!;
    }

    try {
      const children = await fetchRepoDetails(owner, repo, token, githubApiUrl);
      // Cache the result
      repoDetailsCache.current.set(cacheKey, children);

      // Update treeData with loaded children
      const updateNodeChildren = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(n => {
          if (n.id === node.id) {
            return { ...n, children, isLoaded: true };
          }
          if (n.children && n.children.length > 0) {
            return { ...n, children: updateNodeChildren(n.children) };
          }
          return n;
        });
      };

      const updatedTree = updateNodeChildren(treeData);
      setTreeData(updatedTree);
      setFilteredTreeData(updatedTree);

      return children;
    } catch (error) {
      console.error(`Failed to load details for ${owner}/${repo}:`, error);
      return [];
    }
  }, [token, githubApiUrl, treeData]);

  // Load children without updating state (used for batch loading during filter)
  const loadChildrenForNode = useCallback(async (node: TreeNode): Promise<TreeNode[]> => {
    if (node.type !== 'repository') {
      return node.children || [];
    }

    const owner = node.metadata?.owner;
    const repo = node.name;

    if (!owner || !repo) {
      console.error('Missing owner or repo name for node:', node);
      return [];
    }

    const cacheKey = `${owner}/${repo}`;

    // Check cache first
    if (repoDetailsCache.current.has(cacheKey)) {
      return repoDetailsCache.current.get(cacheKey)!;
    }

    try {
      const children = await fetchRepoDetails(owner, repo, token, githubApiUrl);
      // Cache the result
      repoDetailsCache.current.set(cacheKey, children);
      return children;
    } catch (error) {
      console.error(`Failed to load details for ${owner}/${repo}:`, error);
      return [];
    }
  }, [token, githubApiUrl]);

  const expandAllRepositories = useCallback(async (nodes: TreeNode[], onlyEnabled: boolean = false): Promise<TreeNode[]> => {
    const expandedNodes: TreeNode[] = [];

    for (const node of nodes) {
      // Skip disabled nodes if onlyEnabled is true
      if (onlyEnabled && node.enabled === false) {
        expandedNodes.push(node);
        continue;
      }

      if (node.type === 'repository' && !node.isLoaded && node.hasChildren) {
        // Load repository details only if enabled (or if we're not filtering by enabled status)
        if (!onlyEnabled || node.enabled !== false) {
          const children = await loadChildrenForNode(node);
          expandedNodes.push({
            ...node,
            children,
            isLoaded: true,
          });
        } else {
          expandedNodes.push(node);
        }
      } else if (node.children && node.children.length > 0) {
        // Recursively expand children
        const expandedChildren = await expandAllRepositories(node.children, onlyEnabled);
        expandedNodes.push({
          ...node,
          children: expandedChildren,
        });
      } else {
        expandedNodes.push(node);
      }
    }

    return expandedNodes;
  }, [loadChildrenForNode]);

  useEffect(() => {
    // Load settings from backend and localStorage
    const initializeSettings = async () => {
      try {
        // First try to load from backend
        const settings = await loadSettings();
        if (settings && settings.token) {
          setToken(settings.token);
          setOrgs(settings.orgs);
          setGithubApiUrl(settings.githubApiUrl || 'https://api.github.com');
        } else {
          // Try localStorage as fallback
          const cachedSettings = loadSettingsSync();
          if (cachedSettings && cachedSettings.token) {
            setToken(cachedSettings.token);
            setOrgs(cachedSettings.orgs);
            setGithubApiUrl(cachedSettings.githubApiUrl || 'https://api.github.com');
          } else {
            setLoading(false);
            setSettingsOpen(true);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        // Try cached settings as fallback
        const cachedSettings = loadSettingsSync();
        if (cachedSettings && cachedSettings.token) {
          setToken(cachedSettings.token);
          setOrgs(cachedSettings.orgs);
          setGithubApiUrl(cachedSettings.githubApiUrl || 'https://api.github.com');
        } else {
          setLoading(false);
          setSettingsOpen(true);
        }
      }
    };

    initializeSettings();
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
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <AppBar position="static" elevation={0} sx={{ flexShrink: 0 }}>
          <Toolbar variant="dense">
            <GitHub sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              GitHub Actions Runner Monitor
            </Typography>

            {!isProduction && (
              <Chip
                label={ENVIRONMENT.toUpperCase()}
                size="small"
                color={isDevelopment ? 'warning' : 'info'}
                sx={{ mr: 2, fontWeight: 'bold' }}
              />
            )}

            <Tooltip title={`Version ${versionInfo.version}`}>
              <Chip
                label={`v${versionInfo.version}`}
                size="small"
                variant="outlined"
                sx={{ mr: 2, color: 'text.secondary', borderColor: 'text.secondary' }}
              />
            </Tooltip>

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

        <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Tabs Navigation */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="main navigation tabs"
              variant="fullWidth"
            >
              <Tab
                icon={<AccountTree />}
                iconPosition="start"
                label="Repositories"
                sx={{ minHeight: 48 }}
              />
              <Tab
                icon={<Dashboard />}
                iconPosition="start"
                label="Dashboard"
                sx={{ minHeight: 48 }}
              />
              <Tab
                icon={<Timeline />}
                iconPosition="start"
                label="Activity"
                sx={{ minHeight: 48 }}
              />
              <Tab
                icon={<Assessment />}
                iconPosition="start"
                label="Analytics"
                sx={{ minHeight: 48 }}
              />
              <Tab
                icon={<Notifications />}
                iconPosition="start"
                label="Notifications"
                sx={{ minHeight: 48 }}
              />
            </Tabs>
          </Box>

          {/* Tab Panels */}
          <Box sx={{ flexGrow: 1, overflow: 'hidden', p: 1 }}>
            {/* Repositories Tab */}
            <TabPanel value={tabValue} index={0} noPadding>
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
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                  <Box sx={{ flexShrink: 0, mb: 1 }}>
                    <SearchFilter onFilterChange={handleFilterChange} />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexGrow: 1, overflow: 'hidden' }}>
                    {/* Left side: Tree View */}
                    <Paper
                      elevation={2}
                      sx={{
                        flex: '1 1 35%',
                        minWidth: 250,
                        maxWidth: 500,
                        p: 1,
                        overflow: 'auto',
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                          Tree View ({countTreeNodes(filteredTreeData)} items)
                        </Typography>
                      </Box>
                      <TreeView
                        data={filteredTreeData}
                        onLoadChildren={handleLoadChildren}
                        onToggleEnabled={handleToggleEnabled}
                      />
                    </Paper>

                    {/* Right side: List View */}
                    <Box sx={{ flex: '1 1 65%', overflow: 'hidden' }}>
                      <ListView data={treeData} filteredData={filterEnabledNodes(filteredTreeData)} />
                    </Box>
                  </Box>
                </Box>
              )}
            </TabPanel>

            {/* Dashboard Tab */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Dashboard sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Dashboard
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Dashboard feature coming soon. View repository statistics and overview here.
                </Typography>
              </Box>
            </TabPanel>

            {/* Activity Tab */}
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Timeline sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Activity Timeline
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Activity timeline feature coming soon. Track recent activities across repositories.
                </Typography>
              </Box>
            </TabPanel>

            {/* Analytics Tab */}
            <TabPanel value={tabValue} index={3}>
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Analytics
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Analytics feature coming soon. Analyze repository metrics and trends.
                </Typography>
              </Box>
            </TabPanel>

            {/* Notifications Tab */}
            <TabPanel value={tabValue} index={4}>
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Notifications sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Notifications
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Notifications feature coming soon. Manage GitHub notifications and alerts.
                </Typography>
              </Box>
            </TabPanel>
          </Box>
        </Box>

        <Box
          component="footer"
          sx={{
            py: 1,
            px: 2,
            flexShrink: 0,
            backgroundColor: 'background.paper',
            textAlign: 'center',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            GitHub Actions Runner Monitor v{versionInfo.version} - Monitor your development status at a glance
          </Typography>
          {isDevelopment && (
            <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 0.5 }}>
              Development Mode | Build: {versionInfo.buildDate}
            </Typography>
          )}
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
