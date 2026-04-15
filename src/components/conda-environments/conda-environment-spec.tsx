import React, { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { ICondaEnvironment } from '../../types/NaaVRECatalogue/conda-environments';

export function CondaEnvironmentSpec({
  environment
}: {
  environment: ICondaEnvironment;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!environment.dependency_list) {
      setContent(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(environment.dependency_list)
      .then(r => {
        if (!r.ok) {
          throw new Error(`Failed to fetch spec: ${r.status} ${r.statusText}`);
        }
        return r.text();
      })
      .then(text => setContent(text))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [environment.dependency_list]);

  if (!environment.dependency_list) {
    return (
      <Alert severity="info" sx={{ mt: 1 }}>
        No dependency list available for this environment.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Stack spacing={1} sx={{ py: 1 }}>
      <Typography variant="caption" color="text.secondary">
        environment.yml preview
      </Typography>
      <Typography
        component="pre"
        variant="body2"
        sx={{
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          backgroundColor: 'action.hover',
          borderRadius: 1,
          p: 1,
          maxHeight: 320,
          overflowY: 'auto'
        }}
      >
        {content}
      </Typography>
    </Stack>
  );
}
