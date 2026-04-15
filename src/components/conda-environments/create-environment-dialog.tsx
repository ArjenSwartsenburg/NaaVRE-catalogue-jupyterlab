import React, { useCallback, useContext, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { NaaVREExternalService } from '@naavre/communicator-jupyterlab';

import { SettingsContext } from '../../settings';
import { ICondaEnvironment } from '../../types/NaaVRECatalogue/conda-environments';

async function presignDependencyList(
  catalogueServiceUrl: string,
  filename: string
): Promise<{ key: string; url: string }> {
  const resp = await NaaVREExternalService(
    'POST',
    `${catalogueServiceUrl}/conda-environments/presign/`,
    { accept: 'application/json' },
    { filename, content_type: 'text/plain' }
  );
  if (resp.status_code !== 200) {
    throw `Presign failed: ${resp.status_code} ${resp.reason}`;
  }
  return JSON.parse(resp.content);
}

async function uploadText(url: string, text: string): Promise<void> {
  const response = await fetch(url, {
    method: 'PUT',
    body: text,
    headers: { 'Content-Type': 'text/plain' }
  });
  if (!response.ok) {
    throw `S3 upload failed: ${response.status} ${response.statusText}`;
  }
}

export function CreateEnvironmentDialog({
  open,
  onClose,
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (env: ICondaEnvironment) => void;
}) {
  const settings = useContext(SettingsContext);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dependencies, setDependencies] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError('Environment name is required');
      return;
    }
    if (!settings.catalogueServiceUrl) {
      setError('Catalogue service URL is not configured');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let dependencyKey: string | null = null;

      if (dependencies.trim()) {
        const filename = `${name.trim()}-environment.yml`;
        const { key, url } = await presignDependencyList(
          settings.catalogueServiceUrl,
          filename
        );
        await uploadText(url, dependencies.trim());
        dependencyKey = key;
      }

      const body: Partial<ICondaEnvironment> = {
        title: name.trim(),
        description: description.trim() || undefined,
        environment_name: name.trim(),
        python_version: '',
        package_count: 0,
        created_date: null,
        environment_file: null,
        dependency_list: dependencyKey
      };

      const resp = await NaaVREExternalService(
        'POST',
        `${settings.catalogueServiceUrl}/conda-environments/`,
        { accept: 'application/json' },
        body
      );
      if (resp.status_code !== 201) {
        throw `Create failed: ${resp.status_code} ${resp.reason}`;
      }
      const created: ICondaEnvironment = JSON.parse(resp.content);
      onCreated(created);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [name, description, dependencies, settings, onCreated]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create environment manually</DialogTitle>
      {loading && <LinearProgress />}
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Environment name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            disabled={loading}
            fullWidth
          />
          <TextField
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={loading}
            fullWidth
            multiline
            rows={2}
          />
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              Dependencies (environment.yml content)
            </Typography>
            <TextField
              value={dependencies}
              onChange={e => setDependencies(e.target.value)}
              disabled={loading}
              fullWidth
              multiline
              rows={8}
              placeholder={
                'name: my-env\nchannels:\n  - conda-forge\ndependencies:\n  - python=3.11\n  - numpy'
              }
              inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={loading || !name.trim()}
          startIcon={loading ? <CircularProgress size={14} /> : undefined}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
