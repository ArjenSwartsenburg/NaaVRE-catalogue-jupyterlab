import React, { useCallback, useContext, useRef, useState } from 'react';
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

async function presignEnvFile(
  catalogueServiceUrl: string,
  filename: string
): Promise<{ key: string; url: string }> {
  const resp = await NaaVREExternalService(
    'POST',
    `${catalogueServiceUrl}/conda-environments/presign/`,
    { accept: 'application/json' },
    { filename, content_type: 'application/gzip' }
  );
  if (resp.status_code !== 200) {
    throw `Presign failed: ${resp.status_code} ${resp.reason}`;
  }
  return JSON.parse(resp.content);
}

async function uploadFile(url: string, file: File): Promise<void> {
  const response = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': 'application/gzip' }
  });
  if (!response.ok) {
    throw `S3 upload failed: ${response.status} ${response.statusText}`;
  }
}

export function ImportEnvironmentDialog({
  open,
  onClose,
  onImported
}: {
  open: boolean;
  onClose: () => void;
  onImported: (env: ICondaEnvironment) => void;
}) {
  const settings = useContext(SettingsContext);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [environmentName, setEnvironmentName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      setSelectedFile(file);
      if (file && !title) {
        // Pre-fill title from filename
        setTitle(file.name.replace(/\.tar\.gz$/, ''));
      }
      if (file && !environmentName) {
        setEnvironmentName(file.name.replace(/\.tar\.gz$/, ''));
      }
    },
    [title, environmentName]
  );

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select a .tar.gz file');
      return;
    }
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!settings.catalogueServiceUrl) {
      setError('Catalogue service URL is not configured');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { key, url } = await presignEnvFile(
        settings.catalogueServiceUrl,
        selectedFile.name
      );
      await uploadFile(url, selectedFile);

      const body: Record<string, unknown> = {
        title: title.trim(),
        environment_name: environmentName.trim() || title.trim(),
        virtual_lab: settings.virtualLab,
        environment_file_key: key
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
      onImported(created);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedFile, title, environmentName, settings, onImported]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import environment</DialogTitle>
      {loading && <LinearProgress />}
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              Select a conda-pack archive (.tar.gz)
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                size="small"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                Choose file
              </Button>
              <Typography variant="body2">
                {selectedFile ? selectedFile.name : 'No file selected'}
              </Typography>
            </Stack>
            <input
              ref={fileInputRef}
              type="file"
              accept=".tar.gz"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </Stack>
          <TextField
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            disabled={loading}
            fullWidth
          />
          <TextField
            label="Environment name (conda)"
            value={environmentName}
            onChange={e => setEnvironmentName(e.target.value)}
            disabled={loading}
            fullWidth
            helperText="The conda environment name as it was created"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={loading || !selectedFile || !title.trim()}
          startIcon={loading ? <CircularProgress size={14} /> : undefined}
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
}
