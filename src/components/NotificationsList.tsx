import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Stack,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  Refresh,
  DoneAll,
  OpenInNew,
  Circle,
  CheckCircle,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItem,
  type NotificationsResponse,
} from '../api';

interface NotificationsListProps {
  token: string;
  githubApiUrl: string;
  onBack: () => void;
  onRateLimitUpdate?: (rateLimit: any) => void;
}

const getNotificationTypeColor = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'pullrequest':
      return 'success';
    case 'issue':
      return 'warning';
    case 'commit':
      return 'info';
    case 'release':
      return 'primary';
    default:
      return 'default';
  }
};

const getReasonLabel = (reason: string): string => {
  switch (reason) {
    case 'subscribed':
      return '구독';
    case 'manual':
      return '수동';
    case 'author':
      return '작성자';
    case 'comment':
      return '댓글';
    case 'mention':
      return '멘션';
    case 'team_mention':
      return '팀 멘션';
    case 'state_change':
      return '상태 변경';
    case 'assign':
      return '할당';
    case 'review_requested':
      return '리뷰 요청';
    default:
      return reason;
  }
};

export const NotificationsList: React.FC<NotificationsListProps> = ({
  token,
  githubApiUrl,
  onBack,
  onRateLimitUpdate,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [rowCount, setRowCount] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const loadNotifications = useCallback(async (pageNum: number = 0, all: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const response: NotificationsResponse = await fetchNotifications(
        token,
        githubApiUrl,
        pageNum + 1, // API uses 1-based pagination
        pageSize,
        all
      );

      setNotifications(response.notifications);

      // Estimate total count based on pagination info
      if (response.pagination.has_more) {
        setRowCount((pageNum + 2) * pageSize); // At least one more page
      } else {
        setRowCount(response.notifications.length + pageNum * pageSize);
      }

      // Update rate limit
      if (onRateLimitUpdate && response.rate_limit) {
        onRateLimitUpdate(response.rate_limit);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [token, githubApiUrl, pageSize, onRateLimitUpdate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(page, showAll);
    setRefreshing(false);
  };

  const handleMarkAsRead = async (threadId: string) => {
    try {
      await markNotificationAsRead(threadId, token, githubApiUrl);
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === threadId ? { ...notif, unread: false } : notif
        )
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(token, githubApiUrl);
      // Reload notifications
      await loadNotifications(page, showAll);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleMarkSelectedAsRead = async () => {
    for (const id of selectedRows) {
      await handleMarkAsRead(id);
    }
    setSelectedRows([]);
  };

  const handleShowAllToggle = () => {
    const newShowAll = !showAll;
    setShowAll(newShowAll);
    setPage(0);
    loadNotifications(0, newShowAll);
  };

  useEffect(() => {
    loadNotifications(page, showAll);
  }, [page, showAll, loadNotifications]);

  const columns: GridColDef[] = [
    {
      field: 'unread',
      headerName: '상태',
      width: 70,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title={params.value ? '읽지 않음' : '읽음'}>
          <span>
            <IconButton
              size="small"
              onClick={() => params.value && handleMarkAsRead(params.row.id)}
              disabled={!params.value}
            >
              {params.value ? (
                <Circle sx={{ fontSize: 12, color: 'primary.main' }} />
              ) : (
                <CheckCircle sx={{ fontSize: 12, color: 'text.disabled' }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
      ),
    },
    {
      field: 'repository',
      headerName: '저장소',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar
            src={params.value?.owner?.avatar_url}
            sx={{ width: 20, height: 20 }}
          />
          <Typography variant="body2" noWrap>
            {params.value?.full_name || params.value?.name}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'subject',
      headerName: '제목',
      flex: 1,
      minWidth: 300,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography variant="body2" noWrap sx={{ fontWeight: params.row.unread ? 'bold' : 'normal' }}>
            {params.value?.title}
          </Typography>
          <Chip
            label={params.value?.type}
            size="small"
            color={getNotificationTypeColor(params.value?.type || '')}
            sx={{ height: 18, fontSize: '0.7rem' }}
          />
        </Box>
      ),
    },
    {
      field: 'reason',
      headerName: '이유',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={getReasonLabel(params.value)}
          size="small"
          variant="outlined"
          sx={{ height: 20, fontSize: '0.75rem' }}
        />
      ),
    },
    {
      field: 'updated_at',
      headerName: '업데이트',
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        const date = new Date(params.value);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        let timeStr;
        if (days > 0) {
          timeStr = `${days}일 전`;
        } else if (hours > 0) {
          timeStr = `${hours}시간 전`;
        } else {
          const minutes = Math.floor(diff / (1000 * 60));
          timeStr = `${minutes}분 전`;
        }

        return (
          <Typography variant="caption" color="text.secondary">
            {timeStr}
          </Typography>
        );
      },
    },
    {
      field: 'actions',
      headerName: '작업',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={0.5}>
          {params.row.subject?.url && (
            <Tooltip title="GitHub에서 열기">
              <IconButton
                size="small"
                onClick={() => window.open(params.row.subject.url, '_blank')}
              >
                <OpenInNew sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
          {params.row.unread && (
            <Tooltip title="읽음으로 표시">
              <IconButton
                size="small"
                onClick={() => handleMarkAsRead(params.row.id)}
              >
                <CheckCircle sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={onBack}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h6">GitHub 알림</Typography>
            <Chip
              label={showAll ? '전체' : '읽지 않음'}
              color={showAll ? 'default' : 'primary'}
              onClick={handleShowAllToggle}
              clickable
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {selectedRows.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                onClick={handleMarkSelectedAsRead}
                startIcon={<CheckCircle />}
              >
                선택 항목 읽음 ({selectedRows.length})
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              onClick={handleMarkAllAsRead}
              startIcon={<DoneAll />}
              disabled={notifications.filter(n => n.unread).length === 0}
            >
              모두 읽음
            </Button>
            <IconButton
              onClick={handleRefresh}
              disabled={refreshing}
              color="primary"
            >
              {refreshing ? <CircularProgress size={24} /> : <Refresh />}
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Notifications Grid */}
      <Paper sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <DataGrid
          rows={notifications}
          columns={columns}
          loading={loading}
          pagination
          paginationMode="server"
          rowCount={rowCount}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
          pageSizeOptions={[25, 50, 100]}
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={(newSelection) => {
            setSelectedRows(newSelection as string[]);
          }}
          rowSelectionModel={selectedRows}
          sx={{
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
            },
            '& .MuiDataGrid-cell': {
              py: 1,
            },
          }}
          getRowHeight={() => 'auto'}
          localeText={{
            noRowsLabel: showAll ? '알림이 없습니다' : '읽지 않은 알림이 없습니다',
            MuiTablePagination: {
              labelRowsPerPage: '페이지당 행:',
            },
          }}
        />
      </Paper>
    </Box>
  );
};