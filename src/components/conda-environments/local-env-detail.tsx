import React, { useCallback, useContext, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import BuildIcon from '@mui/icons-material/Build';
import { NaaVREExternalService } from '@naavre/communicator-jupyterlab';

import {
  ILocalCondaEnv,
  getCondaExplicitList,
  packCondaEnvironment
} from '../../services/conda-server';
import { ICondaEnvironment } from '../../types/NaaVRECatalogue/conda-environments';
import { SettingsContext } from '../../settings';

async function addLocalEnvToCatalogue(
  catalogueServiceUrl: string,
  virtualLab: string | undefined,
  env: ILocalCondaEnv,
  andPack: boolean,
  onProgress: (msg: string) => void
): Promise<ICondaEnvironment> {
  // 1. Get explicit package list
  onProgress('Generating dependency list…');
  const { content } = await getCondaExplicitList(env.name);

  // 2. Presign and upload dependency list
  onProgress('Uploading dependency list…');
  const depFilename = `${env.name}-explicit.txt`;
  const depPresignResp = await NaaVREExternalService(
    'POST',
    `${catalogueServiceUrl}/conda-environments/presign/`,
    { accept: 'application/json' },
    { filename: depFilename, content_type: 'text/plain' }
  );
  if (depPresignResp.status_code !== 200) {
    throw `Presign failed: ${depPresignResp.status_code} ${depPresignResp.reason}`;
  }
  const { key: depKey, url: depUrl } = JSON.parse(depPresignResp.content);
  const depUpload = await fetch(depUrl, {
    method: 'PUT',
    body: content,
    headers: { 'Content-Type': 'text/plain' }
  });
  if (!depUpload.ok) {
    throw `Dependency list upload failed: ${depUpload.status}`;
  }

  let envFileKey: string | undefined;
  if (andPack) {
    // 3. Presign environment tar.gz
    onProgress('Requesting pack upload URL…');
    const envPresignResp = await NaaVREExternalService(
      'POST',
      `${catalogueServiceUrl}/conda-environments/presign/`,
      { accept: 'application/json' },
      { filename: `${env.name}.tar.gz`, content_type: 'application/gzip' }
    );
    if (envPresignResp.status_code !== 200) {
      throw `Presign failed: ${envPresignResp.status_code} ${envPresignResp.reason}`;
    }
    const { key, url: uploadUrl } = JSON.parse(envPresignResp.content);
    envFileKey = key;

    // 4. Pack and upload (server-side)
    onProgress('Packing environment — this may take a while…');
    await packCondaEnvironment({
      environment_name: env.name,
      upload_url: uploadUrl,
      ...(env.name === 'base' ? { environment_prefix: env.path } : {})
    });
  }

  // 5. Create catalogue entry
  onProgress('Creating catalogue entry…');
  const body: Record<string, unknown> = {
    title: env.name,
    environment_name: env.name,
    virtual_lab: virtualLab,
    dependency_list_key: depKey,
    ...(envFileKey ? { environment_file_key: envFileKey } : {})
  };
  const createResp = await NaaVREExternalService(
    'POST',
    `${catalogueServiceUrl}/conda-environments/`,
    { accept: 'application/json' },
    body
  );
  if (createResp.status_code !== 201) {
    throw `Create failed: ${createResp.status_code} ${createResp.reason}`;
  }
  return JSON.parse(createResp.content);
}

export function LocalEnvDetail({
  env,
  onClose,
  onAddedToCatalogue
}: {
  env: ILocalCondaEnv;
  onClose: () => void;
  onAddedToCatalogue: (created: ICondaEnvironment) => void;
}) {
  const settings = useContext(SettingsContext);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = useCallback(
    async (andPack: boolean) => {
      if (!settings.catalogueServiceUrl) {
        setError('Catalogue service URL is not configured');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const created = await addLocalEnvToCatalogue(
          settings.catalogueServiceUrl,
          settings.virtualLab,
          env,
          andPack,
          setProgress
        );
        onAddedToCatalogue(created);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
        setProgress('');
      }
    },
    [settings, env, onAddedToCatalogue]
  );

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      {loading && <LinearProgress sx={{ mb: 1 }} />}
      <Stack spacing={2}>
        {/* Header */}
        <Stack direction="row" alignItems="center">
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {env.name}
          </Typography>
          <IconButton size="small" onClick={onClose} disabled={loading}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Divider />

        {/* Details */}
        <Stack spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Local environment
          </Typography>
          <Stack direction="row" spacing={1}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ minWidth: 60 }}
            >
              Name
            </Typography>
            <Typography variant="body2">{env.name}</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ minWidth: 60 }}
            >
              Path
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
            >
              {env.path}
            </Typography>
          </Stack>
        </Stack>

        <Divider />

        {/* Actions */}
        <Stack spacing={1}>
          <Typography variant="subtitle2">Actions</Typography>

          {error && <Alert severity="error">{error}</Alert>}
          {loading && progress && (
            <Typography variant="body2" color="text.secondary">
              {progress}
            </Typography>
          )}

          <Button
            variant="outlined"
            size="small"
            startIcon={
              loading ? <CircularProgress size={14} /> : <AddIcon fontSize="small" />
            }
            onClick={() => handleAdd(false)}
            disabled={loading}
            sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
          >
            Add to catalogue
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={
              loading ? <CircularProgress size={14} /> : <BuildIcon fontSize="small" />
            }
            onClick={() => handleAdd(true)}
            disabled={loading}
            sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
          >
            Add and pack
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

