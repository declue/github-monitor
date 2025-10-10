import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Box, Alert, AlertTitle, Button, Typography, Paper } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            p: 3,
            bgcolor: 'background.default',
          }}
        >
          <Paper sx={{ p: 4, maxWidth: 600 }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle>Application Error</AlertTitle>
              Something went wrong. The application encountered an unexpected error.
            </Alert>

            {this.state.error && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Error Details:
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: 'grey.900',
                    overflow: 'auto',
                    maxHeight: 200,
                  }}
                >
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{ color: 'error.light', fontFamily: 'monospace', fontSize: '0.75rem' }}
                  >
                    {this.state.error.toString()}
                  </Typography>
                </Paper>
              </Box>
            )}

            {import.meta.env.DEV && this.state.errorInfo && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Component Stack:
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: 'grey.900',
                    overflow: 'auto',
                    maxHeight: 200,
                  }}
                >
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{ color: 'warning.light', fontFamily: 'monospace', fontSize: '0.75rem' }}
                  >
                    {this.state.errorInfo.componentStack}
                  </Typography>
                </Paper>
              </Box>
            )}

            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={this.handleReload}
              fullWidth
            >
              Reload Application
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
