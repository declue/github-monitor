import { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Link,
  Collapse,
  CircularProgress,
} from '@mui/material';
import {
  ChevronRight,
  ExpandMore,
  FolderOpen,
  Folder,
  Code,
  Settings,
  PlayArrow,
  Speed,
  CallSplit,
  MergeType,
  BugReport,
  CheckCircle,
  Cancel,
  HourglassEmpty,
  AccountTree,
} from '@mui/icons-material';
import type { TreeNode as TreeNodeType } from '../types';

interface TreeNodeProps {
  node: TreeNodeType;
  level?: number;
  onLoadChildren?: (node: TreeNodeType) => Promise<TreeNodeType[]>;
}

const getNodeIcon = (type: string, expanded: boolean) => {
  const iconProps = { fontSize: 'small' as const };

  switch (type) {
    case 'organization':
      return expanded ? <FolderOpen {...iconProps} /> : <Folder {...iconProps} />;
    case 'repository':
      return <Code {...iconProps} />;
    case 'workflows':
    case 'workflow':
      return <Settings {...iconProps} />;
    case 'workflow_runs':
    case 'workflow_run':
      return <PlayArrow {...iconProps} />;
    case 'runners':
    case 'runner':
      return <Speed {...iconProps} />;
    case 'branches':
    case 'branch':
      return <CallSplit {...iconProps} />;
    case 'pull_requests':
    case 'pull_request':
      return <MergeType {...iconProps} />;
    case 'issues':
    case 'issue':
      return <BugReport {...iconProps} />;
    default:
      return <AccountTree {...iconProps} />;
  }
};

const getStatusIcon = (status?: string) => {
  if (!status) return null;

  const iconProps = { fontSize: 'small' as const };

  switch (status.toLowerCase()) {
    case 'success':
    case 'completed':
    case 'active':
    case 'open':
      return <CheckCircle {...iconProps} color="success" />;
    case 'failure':
    case 'failed':
    case 'cancelled':
    case 'closed':
      return <Cancel {...iconProps} color="error" />;
    case 'in_progress':
    case 'queued':
    case 'pending':
      return <HourglassEmpty {...iconProps} color="warning" />;
    default:
      return <HourglassEmpty {...iconProps} color="info" />;
  }
};

const getStatusColor = (status?: string) => {
  if (!status) return 'default';

  switch (status.toLowerCase()) {
    case 'success':
    case 'completed':
    case 'active':
    case 'open':
      return 'success';
    case 'failure':
    case 'failed':
    case 'cancelled':
      return 'error';
    case 'closed':
      return 'default';
    case 'in_progress':
    case 'queued':
    case 'pending':
      return 'warning';
    default:
      return 'info';
  }
};

export const TreeNodeComponent: React.FC<TreeNodeProps> = ({ node, level = 0, onLoadChildren }) => {
  const [expanded, setExpanded] = useState(level < 2);
  const [loading, setLoading] = useState(false);
  const [localChildren, setLocalChildren] = useState<TreeNodeType[]>(node.children || []);
  const [isChildrenLoaded, setIsChildrenLoaded] = useState(node.isLoaded || false);

  const hasChildren = (node.hasChildren || localChildren.length > 0) && !loading;
  const shouldShowChildren = localChildren.length > 0;

  const handleToggle = async () => {
    if (!hasChildren && !node.hasChildren) return;

    // If we're collapsing, just toggle
    if (expanded) {
      setExpanded(false);
      return;
    }

    // If expanding and children not loaded yet, fetch them
    if (!isChildrenLoaded && node.hasChildren && onLoadChildren) {
      setLoading(true);
      try {
        const children = await onLoadChildren(node);
        setLocalChildren(children);
        setIsChildrenLoaded(true);
        setExpanded(true);
      } catch (error) {
        console.error('Failed to load children:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setExpanded(true);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          py: 0.5,
          px: 1,
          pl: level * 3 + 1,
          '&:hover': {
            bgcolor: 'action.hover',
            borderRadius: 1,
          },
          cursor: hasChildren ? 'pointer' : 'default',
        }}
        onClick={handleToggle}
      >
        {(hasChildren || node.hasChildren) && (
          <Box sx={{ mr: 0.5, display: 'flex', alignItems: 'center', width: 28 }}>
            {loading ? (
              <CircularProgress size={16} />
            ) : expanded ? (
              <ExpandMore fontSize="small" />
            ) : (
              <ChevronRight fontSize="small" />
            )}
          </Box>
        )}
        {!hasChildren && !node.hasChildren && <Box sx={{ width: 28 }} />}

        <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
          {getNodeIcon(node.type, expanded)}
        </Box>

        {node.url ? (
          <Link
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{ mr: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="body2">{node.name}</Typography>
          </Link>
        ) : (
          <Typography variant="body2" sx={{ mr: 1 }}>
            {node.name}
          </Typography>
        )}

        {node.status && (
          <Chip
            label={node.status}
            size="small"
            color={getStatusColor(node.status) as any}
            icon={getStatusIcon(node.status) || undefined}
            sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
          />
        )}

        {node.metadata?.language && (
          <Chip
            label={node.metadata.language}
            size="small"
            variant="outlined"
            sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
          />
        )}

        {node.metadata?.private && (
          <Chip
            label="Private"
            size="small"
            color="warning"
            sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
          />
        )}
      </Box>

      {shouldShowChildren && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          {localChildren.map((child) => (
            <TreeNodeComponent key={child.id} node={child} level={level + 1} onLoadChildren={onLoadChildren} />
          ))}
        </Collapse>
      )}
    </Box>
  );
};

interface TreeViewProps {
  data: TreeNodeType[];
  onLoadChildren?: (node: TreeNodeType) => Promise<TreeNodeType[]>;
}

export const TreeView: React.FC<TreeViewProps> = ({ data, onLoadChildren }) => {
  return (
    <Box sx={{ width: '100%' }}>
      {data.map((node) => (
        <TreeNodeComponent key={node.id} node={node} onLoadChildren={onLoadChildren} />
      ))}
    </Box>
  );
};
