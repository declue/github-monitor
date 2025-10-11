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
  Button,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Badge,
} from '@mui/material';
import {
  Refresh,
  GitHub,
  Settings as SettingsIcon,
  AccountTree,
  History,
  PlayCircleOutline,
  Assessment,
  Notifications,
} from '@mui/icons-material';
import { TreeView } from './components/TreeView';
import { RateLimitDisplay } from './components/RateLimitDisplay';
import { SettingsDialog } from './components/SettingsDialog';
import { SearchFilter, type SearchFilterState } from './components/SearchFilter';
import { ListView } from './components/ListView';
import { TabPanel } from './components/TabPanel';
import { NotificationsList } from './components/NotificationsList';
import { fetchTree, fetchRateLimit, fetchRepoDetails, fetchNotificationsCount } from './api';
import type { TreeNode, RateLimitInfo } from './types';
import { loadSettings, loadSettingsSync, saveSettings } from './utils/storage';
import { filterTreeNodes, countTreeNodes, filterEnabledNodes } from './utils/filterTree';
import { getVersionInfo, ENVIRONMENT } from './config/version';
import { getEnabledRepos, updateEnabledRepos, getConfig } from './api/config';

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
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [pendingDetailLoad, setPendingDetailLoad] = useState<() => void>(() => () => {});

  // Notifications state
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationRefreshInterval, setNotificationRefreshInterval] = useState(15);

  // Smart cache for repository details with loading state tracking
  interface CacheEntry {
    data: TreeNode[] | null;
    loading: boolean;
    promise?: Promise<TreeNode[]>;
    timestamp: number;
  }
  const repoDetailsCache = useRef<Map<string, CacheEntry>>(new Map());
  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track whether we've done the initial load
  const hasLoadedRef = useRef(false);

  const versionInfo = getVersionInfo();
  const isDevelopment = ENVIRONMENT === 'development';
  const isProduction = ENVIRONMENT === 'production';

  // Smart function to get or fetch repo details with proper caching and loading state
  const getOrFetchRepoDetails = useCallback(async (owner: string, repoName: string, authToken?: string, apiUrl?: string): Promise<TreeNode[]> => {
    const cacheKey = `${owner}/${repoName}`;
    const cacheEntry = repoDetailsCache.current.get(cacheKey);

    // If we have valid cached data, return it
    if (cacheEntry?.data && cacheEntry.data.length > 0) {
      console.log(`Cache hit for ${cacheKey}: ${cacheEntry.data.length} items`);
      return cacheEntry.data;
    }

    // If already loading, wait for the existing promise
    if (cacheEntry?.loading && cacheEntry.promise) {
      console.log(`Already loading ${cacheKey}, waiting for existing promise...`);
      return cacheEntry.promise;
    }

    // Use provided token/apiUrl or fall back to component state
    const tokenToUse = authToken || token;
    const apiUrlToUse = apiUrl || githubApiUrl;

    // Create a new fetch promise
    console.log(`Cache miss for ${cacheKey}, fetching from API with token: ${tokenToUse ? 'present' : 'missing'}`);
    const fetchPromise = fetchRepoDetails(owner, repoName, tokenToUse, apiUrlToUse)
      .then(children => {
        console.log(`Fetched ${children.length} items for ${cacheKey}`);

        // Only cache non-empty results
        if (children && children.length > 0) {
          repoDetailsCache.current.set(cacheKey, {
            data: children,
            loading: false,
            timestamp: Date.now()
          });
        } else {
          console.warn(`Empty response for ${cacheKey}, not caching`);
          // Remove any existing cache entry
          repoDetailsCache.current.delete(cacheKey);
        }

        return children;
      })
      .catch(error => {
        console.error(`Failed to fetch ${cacheKey}:`, error);
        // Remove the failed entry from cache
        repoDetailsCache.current.delete(cacheKey);
        return [];
      });

    // Mark as loading with the promise
    repoDetailsCache.current.set(cacheKey, {
      data: null,
      loading: true,
      promise: fetchPromise,
      timestamp: Date.now()
    });

    return fetchPromise;
  }, [token, githubApiUrl]);

  // Define loadRepoDetails first to avoid circular dependencies
  const loadRepoDetails = useCallback(async (repos: TreeNode[], authToken?: string, apiUrl?: string) => {
    console.log('loadRepoDetails called with repos:', repos, 'token:', authToken ? 'present' : 'missing');
    setLoadingDetails(true);
    setLoadingProgress({ current: 0, total: repos.length });

    const updatedNodes: Map<string, TreeNode[]> = new Map();

    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i];
      setLoadingProgress({ current: i + 1, total: repos.length });

      const owner = repo.metadata?.owner;
      const repoName = repo.name;
      console.log(`Processing repo ${i+1}/${repos.length}: ${owner}/${repoName}`);

      if (!owner || !repoName) {
        console.warn('Skipping repo without owner/name:', repo);
        continue;
      }

      // Use smart cache function with provided token
      const children = await getOrFetchRepoDetails(owner, repoName, authToken, apiUrl);
      updatedNodes.set(repo.id, children);

      // Small delay to avoid rate limiting
      if (i < repos.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('All repos processed. updatedNodes:', updatedNodes);

    // Update tree with loaded children using functional update
    const updateTreeWithDetails = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.type === 'repository' && updatedNodes.has(node.id)) {
          const newChildren = updatedNodes.get(node.id);
          console.log(`Updating node ${node.id} with ${newChildren?.length} children`);
          return {
            ...node,
            children: newChildren,
            isLoaded: true,
          };
        }
        if (node.children && node.children.length > 0) {
          return {
            ...node,
            children: updateTreeWithDetails(node.children),
          };
        }
        return node;
      });
    };

    // Use functional updates to ensure we're working with the latest state
    setTreeData(prevTree => {
      const updated = updateTreeWithDetails(prevTree);
      console.log('Updated treeData after background loading:', updated);
      // Log specific repos that were updated
      updated.forEach(org => {
        org.children?.forEach(repo => {
          if (updatedNodes.has(repo.id)) {
            console.log(`Repo ${repo.name} now has ${repo.children?.length || 0} children`);
          }
        });
      });
      return updated;
    });
    setFilteredTreeData(prevTree => {
      const updated = updateTreeWithDetails(prevTree);
      console.log('Updated filteredTreeData after background loading:', updated);
      return updated;
    });

    setLoadingDetails(false);
    setLoadingProgress({ current: 0, total: 0 });
    console.log('loadRepoDetails completed');
  }, [getOrFetchRepoDetails]);

  const loadDetailsForEnabledRepos = useCallback(async (tree: TreeNode[], authToken?: string, apiUrl?: string) => {
    // Collect all enabled repositories
    const enabledRepos: TreeNode[] = [];
    tree.forEach(org => {
      if (org.children) {
        org.children.forEach(repo => {
          if (repo.type === 'repository' && repo.enabled !== false) {
            enabledRepos.push(repo);
          }
        });
      }
    });

    console.log(`Found ${enabledRepos.length} enabled repos to load details for`);
    if (enabledRepos.length === 0) return;

    // Show warning dialog if more than 10 repos are enabled
    if (enabledRepos.length >= 10) {
      console.log('Too many repos, showing warning dialog');
      setWarningDialogOpen(true);
      setPendingDetailLoad(() => () => loadRepoDetails(enabledRepos, authToken, apiUrl));
      return;
    }

    console.log('Loading repo details...');
    await loadRepoDetails(enabledRepos, authToken, apiUrl);
  }, [loadRepoDetails]);

  // Load data with specific settings (used for initial load)
  const loadDataWithSettings = async (settingsToken: string, settingsOrgs: string[], settingsApiUrl: string) => {
    console.log('loadDataWithSettings called - token:', !!settingsToken, 'orgs:', settingsOrgs);

    if (!settingsToken) {
      setError('Please configure your GitHub token in settings');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [tree, rate, enabledRepos] = await Promise.all([
        fetchTree(settingsOrgs, settingsToken, settingsApiUrl),
        fetchRateLimit(settingsToken, settingsApiUrl),
        getEnabledRepos().catch(() => []),
      ]);

      // Debug logging
      console.log('Fetched tree data:', tree);
      console.log('Tree data length:', tree?.length);

      // Create a map of node_id to enabled status
      const enabledMap = new Map(enabledRepos.map(repo => [repo.node_id, repo.enabled]));

      // Initialize orgs and repos with saved enabled state
      // Make sure repository nodes don't have empty children array initially
      const treeWithEnabled = tree.map(org => ({
        ...org,
        enabled: enabledMap.has(org.id) ? enabledMap.get(org.id) : true,
        children: org.children.map(repo => ({
          ...repo,
          enabled: enabledMap.has(repo.id) ? enabledMap.get(repo.id) : true,
          // Don't set children to empty array for repos - leave it undefined
          // This allows proper detection of whether children need to be loaded
          children: repo.type === 'repository' ? undefined : repo.children,
        })),
      }));

      console.log('Setting tree data with enabled states:', treeWithEnabled);
      setTreeData(treeWithEnabled);
      setFilteredTreeData(treeWithEnabled); // Initialize filtered data
      setRateLimit(rate);

      // Load details for enabled repositories
      // The smart cache will handle all timing issues
      console.log('Auto-loading details for enabled repos...');
      await loadDetailsForEnabledRepos(treeWithEnabled, settingsToken, settingsApiUrl);
      console.log('Auto-load of details completed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Error loading data:', err);
    } finally {
      console.log('loadDataWithSettings finished, setting loading to false');
      setLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    console.log('loadData called - token:', !!token, 'orgs:', orgs);

    if (!token) {
      setError('Please configure your GitHub token in settings');
      setLoading(false);
      // Don't automatically open settings dialog
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [tree, rate, enabledRepos] = await Promise.all([
        fetchTree(orgs, token, githubApiUrl),
        fetchRateLimit(token, githubApiUrl),
        getEnabledRepos().catch(() => []),  // Get saved enabled repos, fallback to empty array
      ]);

      // Debug logging
      console.log('Fetched tree data:', tree);
      console.log('Tree data length:', tree?.length);
      console.log('Organization:', orgs);
      console.log('Token exists:', !!token);
      console.log('API URL:', githubApiUrl);

      // Create a map of node_id to enabled status
      const enabledMap = new Map(enabledRepos.map(repo => [repo.node_id, repo.enabled]));

      // Initialize orgs and repos with saved enabled state or default to true
      const treeWithEnabled = tree.map(org => ({
        ...org,
        enabled: enabledMap.has(org.id) ? enabledMap.get(org.id) : true,
        children: org.children.map(repo => ({
          ...repo,
          enabled: enabledMap.has(repo.id) ? enabledMap.get(repo.id) : true,
          // Don't set children to empty array for repos - leave it undefined
          children: repo.type === 'repository' ? undefined : repo.children,
        })),
      }));

      console.log('Setting tree data with enabled states:', treeWithEnabled);
      setTreeData(treeWithEnabled);
      setFilteredTreeData(treeWithEnabled); // Initialize filtered data
      setRateLimit(rate);

      // Load details for enabled repositories
      // The smart cache will handle all timing issues
      console.log('Auto-loading details for enabled repos...');
      await loadDetailsForEnabledRepos(treeWithEnabled, token, githubApiUrl);
      console.log('Auto-load of details completed');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Error loading data:', err);
      console.error('Error details:', {
        message: errorMessage,
        token: !!token,
        orgs: orgs,
        githubApiUrl: githubApiUrl,
        error: err
      });
    } finally {
      console.log('loadData finished, setting loading to false');
      setLoading(false);
    }
  }, [token, orgs, githubApiUrl, loadDetailsForEnabledRepos]);

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

  const handleToggleEnabled = useCallback(async (nodeId: string, enabled: boolean) => {
    let affectedRepos: TreeNode[] = [];

    const updateNodeEnabled = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          // If this is a repo being enabled, collect it for detail loading
          if (node.type === 'repository' && enabled && !node.isLoaded) {
            affectedRepos.push(node);
          }

          // If this is an org, collect all child repos being enabled
          if (node.type === 'organization' && enabled && node.children) {
            node.children.forEach(child => {
              if (child.type === 'repository' && !child.isLoaded) {
                affectedRepos.push(child);
              }
            });
          }

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

    // Save enabled state to backend
    const collectEnabledStates = (nodes: TreeNode[]): Array<{ node_id: string; enabled: boolean }> => {
      const states: Array<{ node_id: string; enabled: boolean }> = [];
      nodes.forEach(node => {
        // Only save org and repo states (not workflows, branches, etc.)
        if (node.type === 'organization' || node.type === 'repository') {
          states.push({ node_id: node.id, enabled: node.enabled !== false });
        }
        if (node.children) {
          states.push(...collectEnabledStates(node.children));
        }
      });
      return states;
    };

    try {
      const enabledStates = collectEnabledStates(updatedTree);
      await updateEnabledRepos(enabledStates);

      // Load details for newly enabled repos
      if (affectedRepos.length > 0) {
        if (affectedRepos.length >= 10) {
          setWarningDialogOpen(true);
          setPendingDetailLoad(() => () => loadRepoDetails(affectedRepos));
        } else {
          await loadRepoDetails(affectedRepos);
        }
      }
    } catch (error) {
      console.error('Failed to save enabled state:', error);
    }
  }, [treeData, loadRepoDetails]);

  const handleSaveSettings = async (newToken: string, newOrgs: string[], newGithubApiUrl: string) => {
    setToken(newToken);
    setOrgs(newOrgs);
    setGithubApiUrl(newGithubApiUrl);
    await saveSettings({ token: newToken, orgs: newOrgs, githubApiUrl: newGithubApiUrl });
    // Clear cache when settings change
    console.log('Clearing cache due to settings change');
    repoDetailsCache.current.clear();
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Check unread notifications count
  const checkNotifications = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetchNotificationsCount(token, githubApiUrl);
      setUnreadNotifications(response.unread_count);

      // Update rate limit if provided
      if (response.rate_limit) {
        setRateLimit(response.rate_limit);
      }
    } catch (error) {
      console.error('Failed to fetch notifications count:', error);
    }
  }, [token, githubApiUrl]);

  // Handle notification icon click
  const handleNotificationClick = () => {
    setShowNotifications(true);
  };

  // Handle back from notifications
  const handleNotificationBack = () => {
    setShowNotifications(false);
    // Refresh notifications count after viewing
    checkNotifications();
  };

  // Handle rate limit update from notifications list
  const handleRateLimitUpdate = (newRateLimit: RateLimitInfo) => {
    setRateLimit(newRateLimit);
  };

  // Load children for a single node (used by TreeView expansion)
  const handleLoadChildren = useCallback(async (node: TreeNode): Promise<TreeNode[]> => {
    console.log('handleLoadChildren called for:', node.id, node.type, node.name);

    // Only handle repository nodes for lazy loading
    if (node.type !== 'repository') {
      console.log('Not a repository node, returning existing children');
      return node.children || [];
    }

    const owner = node.metadata?.owner;
    const repo = node.name;

    if (!owner || !repo) {
      console.error('Missing owner or repo name for node:', node);
      return [];
    }

    // Use smart cache function
    const children = await getOrFetchRepoDetails(owner, repo);

    // Update treeData with loaded children using functional update
    const updateNodeChildren = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(n => {
        if (n.id === node.id) {
          console.log('Updating node with children:', n.id, 'Count:', children.length);
          return { ...n, children, isLoaded: true };
        }
        if (n.children && n.children.length > 0) {
          return { ...n, children: updateNodeChildren(n.children) };
        }
        return n;
      });
    };

    // Use functional updates to avoid stale closure issues
    setTreeData(prevTree => {
      const updated = updateNodeChildren(prevTree);
      console.log('Updated tree data:', updated);
      return updated;
    });
    setFilteredTreeData(prevTree => updateNodeChildren(prevTree));

    return children;
  }, [getOrFetchRepoDetails]);

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

    // Use smart cache function - it handles everything
    return getOrFetchRepoDetails(owner, repo);
  }, [getOrFetchRepoDetails]);

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

  // Initialize on mount - Load settings and data
  useEffect(() => {
    console.log('=== App component mounted - starting initialization ===');
    let mounted = true;

    const initializeApp = async () => {
      console.log('initializeApp called');
      try {
        // First try to load from backend config
        console.log('Loading config from backend...');
        const config = await getConfig();
        console.log('Backend config loaded:', config);
        if (config) {
          setNotificationRefreshInterval(config.notifications_refresh_interval || 15);
        }

        // First try to load from backend
        console.log('Loading settings from backend...');
        const settings = await loadSettings();
        console.log('Settings loaded:', settings);

        if (!mounted) return; // Component unmounted

        if (settings && settings.token) {
          console.log('Setting token and orgs from backend');
          console.log('Token length:', settings.token.length);
          console.log('Orgs:', settings.orgs);
          setToken(settings.token);
          setOrgs(settings.orgs);
          setGithubApiUrl(settings.githubApiUrl || 'https://api.github.com');

          // Immediately load data after setting token with the loaded values
          console.log('Settings loaded, immediately loading data with:', settings.token, settings.orgs);
          if (mounted && !hasLoadedRef.current) {
            hasLoadedRef.current = true;
            // Call loadData directly with the loaded settings
            loadDataWithSettings(settings.token, settings.orgs, settings.githubApiUrl || 'https://api.github.com');
          }
        } else {
          // Try localStorage as fallback
          console.log('No backend settings, trying localStorage...');
          const cachedSettings = loadSettingsSync();
          console.log('Cached settings:', cachedSettings);
          if (cachedSettings && cachedSettings.token) {
            console.log('Setting token and orgs from localStorage');
            setToken(cachedSettings.token);
            setOrgs(cachedSettings.orgs);
            setGithubApiUrl(cachedSettings.githubApiUrl || 'https://api.github.com');

            // Immediately load data after setting token with cached values
            console.log('Cached settings loaded, immediately loading data with:', cachedSettings.token, cachedSettings.orgs);
            if (mounted && !hasLoadedRef.current) {
              hasLoadedRef.current = true;
              loadDataWithSettings(cachedSettings.token, cachedSettings.orgs, cachedSettings.githubApiUrl || 'https://api.github.com');
            }
          } else {
            console.log('No settings found, showing empty state');
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        // Try cached settings as fallback
        const cachedSettings = loadSettingsSync();
        if (mounted && cachedSettings && cachedSettings.token) {
          console.log('Setting token and orgs from localStorage (error fallback)');
          setToken(cachedSettings.token);
          setOrgs(cachedSettings.orgs);
          setGithubApiUrl(cachedSettings.githubApiUrl || 'https://api.github.com');

          // Immediately load data after setting token with cached values
          console.log('Error fallback - immediately loading data with:', cachedSettings.token, cachedSettings.orgs);
          if (mounted && !hasLoadedRef.current) {
            hasLoadedRef.current = true;
            loadDataWithSettings(cachedSettings.token, cachedSettings.orgs, cachedSettings.githubApiUrl || 'https://api.github.com');
          }
        } else {
          console.log('No settings found (error), showing empty state');
          setLoading(false);
        }
      }
      console.log('initializeApp completed');
    };

    initializeApp();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - run only on mount

  // Separate effect for rate limit refresh
  useEffect(() => {
    if (token) {
      // Refresh rate limit every 30 seconds
      const interval = setInterval(() => {
        fetchRateLimit(token, githubApiUrl).then(setRateLimit).catch(console.error);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [token, githubApiUrl]);

  // Setup notification background refresh
  useEffect(() => {
    if (token && !showNotifications) {
      // Initial check
      checkNotifications();

      // Clear existing interval
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
      }

      // Setup new interval based on settings
      const intervalMs = notificationRefreshInterval * 1000;
      notificationIntervalRef.current = setInterval(() => {
        checkNotifications();
      }, intervalMs);

      return () => {
        if (notificationIntervalRef.current) {
          clearInterval(notificationIntervalRef.current);
        }
      };
    }
  }, [token, githubApiUrl, notificationRefreshInterval, showNotifications, checkNotifications]);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <AppBar position="relative" elevation={0} sx={{ flexShrink: 0 }}>
          <Toolbar variant="dense">
            <GitHub sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              JHL GitHub Desktop
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

            <Tooltip title={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}`}>
              <IconButton
                color="inherit"
                onClick={handleNotificationClick}
                sx={{ ml: 2 }}
              >
                <Badge
                  badgeContent={unreadNotifications}
                  color="error"
                  max={99}
                >
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="Settings">
              <IconButton
                color="inherit"
                onClick={() => setSettingsOpen(true)}
                sx={{ ml: 1 }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Refresh data">
              <IconButton
                color="inherit"
                onClick={() => {
                  console.log('Manual refresh clicked');
                  // Clear cache on manual refresh to force fresh data
                  console.log('Clearing all cached repo details');
                  repoDetailsCache.current.clear();
                  loadData();
                }}
                disabled={loading || !token}
                sx={{ ml: 1 }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Toolbar>
          {loadingDetails && (
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
              <LinearProgress
                variant="determinate"
                value={loadingProgress.total > 0 ? (loadingProgress.current / loadingProgress.total) * 100 : 0}
              />
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  right: 8,
                  bottom: 2,
                  color: 'primary.main',
                  fontSize: '0.7rem'
                }}
              >
                Loading details: {loadingProgress.current}/{loadingProgress.total}
              </Typography>
            </Box>
          )}
        </AppBar>

        {/* Warning Dialog for multiple repos */}
        <Dialog
          open={warningDialogOpen}
          onClose={() => setWarningDialogOpen(false)}
        >
          <DialogTitle>API 사용량 경고</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {(() => {
                const count = treeData.reduce((acc, org) => {
                  return acc + (org.children?.filter(repo => repo.enabled !== false).length || 0);
                }, 0);
                return `${count}개의 저장소에 대한 상세 정보를 가져오면 API 호출이 많아질 수 있습니다. 계속하시겠습니까?`;
              })()}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setWarningDialogOpen(false)}>취소</Button>
            <Button
              onClick={() => {
                setWarningDialogOpen(false);
                pendingDetailLoad();
              }}
              autoFocus
              variant="contained"
            >
              계속
            </Button>
          </DialogActions>
        </Dialog>

        <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Show Notifications List if showNotifications is true */}
          {showNotifications ? (
            <NotificationsList
              token={token}
              githubApiUrl={githubApiUrl}
              onBack={handleNotificationBack}
              onRateLimitUpdate={handleRateLimitUpdate}
            />
          ) : (
            <>
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
                    icon={<History />}
                    iconPosition="start"
                    label="Commits"
                    sx={{ minHeight: 48 }}
                  />
                  <Tab
                    icon={<PlayCircleOutline />}
                    iconPosition="start"
                    label="Actions"
                    sx={{ minHeight: 48 }}
                  />
                  <Tab
                    icon={<Assessment />}
                    iconPosition="start"
                    label="Analytics"
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

              {error && !token && (
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 400,
                  p: 3
                }}>
                  <GitHub sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    Welcome to JHL GitHub Desktop
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center', maxWidth: 600 }}>
                    GitHub 저장소를 모니터링하고 관리하기 위해 먼저 설정이 필요합니다.
                    상단 툴바의 설정 아이콘을 클릭하거나 아래 버튼을 눌러 GitHub 토큰을 설정해주세요.
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<SettingsIcon />}
                    onClick={() => setSettingsOpen(true)}
                  >
                    설정 시작하기
                  </Button>
                </Box>
              )}

              {error && token && (
                <Alert
                  severity="error"
                  sx={{ mb: 2 }}
                  action={
                    <IconButton
                      color="inherit"
                      size="small"
                      onClick={loadData}
                    >
                      <Refresh />
                    </IconButton>
                  }
                >
                  {error}
                </Alert>
              )}

              {!loading && !error && treeData.length === 0 && (
                <Alert severity="info">
                  No repositories found. Make sure your GitHub token is configured correctly.
                  {console.log('Render check - treeData:', treeData, 'loading:', loading, 'error:', error, 'token:', !!token)}
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

            {/* Commits Tab */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <History sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Commits
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  선택된 Repository에 대해 Commit 현황을 확인하고 AI Agent를 이용하여 Commit을 할 수 있습니다.
                </Typography>
              </Box>
            </TabPanel>

            {/* Actions Tab */}
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <PlayCircleOutline sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Actions
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  선택된 Repository에 대해 GitHub Actions 현황을 확인하고 AI Agent를 이용하여 Actions Run 을 분석할 수 있습니다. 
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
                  선택된 Repository에 대해 메인 컨트리뷰터별 PR, Commit, 리뷰 횟수를 모니터링하며 SE 관점에서 GitHub 활동을 분석할 수 있습니다.
                </Typography>
              </Box>
            </TabPanel>
          </Box>
            </>
          )}
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
            JHL GitHub Desktop v{versionInfo.version}
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
