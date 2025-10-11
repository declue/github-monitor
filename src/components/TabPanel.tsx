import { Box } from '@mui/material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  noPadding?: boolean;
}

export function TabPanel(props: TabPanelProps) {
  const { children, value, index, noPadding = false, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      style={{ height: '100%', display: value === index ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: noPadding ? 0 : 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </Box>
      )}
    </div>
  );
}