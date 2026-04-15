import React, { useCallback, useContext, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import BuildIcon from '@mui/icons-material/Build';
import PeopleIcon from '@mui/icons-material/People';
import { NaaVREExternalService } from '@naavre/communicator-jupyterlab';

import { ICondaEnvironment } from '../../types/NaaVRECatalogue/conda-environments';
import { CondaEnvironmentOverview } from './conda-environment-overview';
import { CondaEnvironmentSpec } from './conda-environment-spec';
import { CondaEnvironmentUsage } from './conda-environment-usage';
import { ShareDialog } from '../assets-browser/share-dialog';
import { DeleteDialog } from '../assets-browser/delete-dialog';
import { SettingsContext } from '../../settings';
import { UserInfoContext } from '../../contexts/UserInfoContext';
import { packCondaEnvironment } from '../../services/conda-server';
import { Asset, assetKinds } from '../assets-browser/asset-kinds';
import DeleteIcon from '@mui/icons-material/Delete';

async function presignConda(
  catalogueServiceUrl: string,
  filename: string,
  content_type: string
): Promise<{ key: string; url: string }> {
  const resp = await NaaVREExternalService(
    'POST',
    `${catalogueServiceUrl}/conda-environments/presign/`,
    { accept: 'application/json' },
    { filename, content_type }
  );
  if (resp.status_code !== 200) {
    throw `Presign failed: ${resp.status_code} ${resp.reason}`;
  }
  return JSON.parse(resp.content);
}

async function patchCondaEnv(
  url: string,
  patch: Partial<ICondaEnvironment>
): Promise<ICondaEnvironment> {
  const resp = await NaaVREExternalService(
    'PATCH',
    url,
    { accept: 'application/json' },
    patch
  );
  if (resp.status_code !== 200) {
    throw `PATCH failed: ${resp.status_code} ${resp.reason}`;
  }
  return JSON.parse(resp.content);
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  loading,
  tooltip
}: {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
}) {
  const btn = (
    <Button
      variant="outlined"
      size="small"
      startIcon={loading ? <CircularProgress size={14} /> : icon}
      onClick={onClick}
      disabled={disabled || loading}
      fullWidth
      sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
    >
      {label}
    </Button>
  );
  if (tooltip) {
    return <Tooltip title={tooltip}>{btn}</Tooltip>;
  }
  return btn;
}

const condaAssetKind = assetKinds.find(k => k.slug === 'conda-environments')!;

export function CondaEnvironmentDetail({
  environment,
  onClose,
  onUpdated
}: {
  environment: ICondaEnvironment;
  onClose: () => void;
  onUpdated: (env: ICondaEnvironment) => void;
}) {
  const settings = useContext(SettingsContext);
  const userInfo = useContext(UserInfoContext);

  const [tab, setTab] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [packLoading, setPackLoading] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);
  const [packSuccess, setPackSuccess] = useState<string | null>(null);

  const isOwner = userInfo.username === environment.owner;

  const handleGenerateArtifact = useCallback(async () => {
    if (!settings.catalogueServiceUrl) {
      setPackError('Catalogue service URL is not configured');
      return;
    }
    setPackLoading(true);
    setPackError(null);
    setPackSuccess(null);
    try {
      const filename = `${environment.environment_name || environment.title}.tar.gz`;
      const { key, url } = await presignConda(
        settings.catalogueServiceUrl,
        filename,
        'application/gzip'
      );

      const { file_size } = await packCondaEnvironment({
        environment_name: environment.environment_name || environment.title,
        upload_url: url
      });

      const updated = await patchCondaEnv(environment.url, {
        environment_file: key
      });

      onUpdated(updated);
      setPackSuccess(
        `Artifact generated successfully (${(file_size / 1024 / 1024).toFixed(1)} MB)`
      );
    } catch (e) {
      setPackError(String(e));
    } finally {
      setPackLoading(false);
    }
  }, [environment, settings.catalogueServiceUrl, onUpdated]);

  const handleDownload = useCallback(() => {
    if (!environment.environment_file) {
      return;
    }
    const a = document.createElement('a');
    a.href = environment.environment_file;
    a.download = `${environment.environment_name || environment.title}.tar.gz`;
    a.click();
  }, [environment]);

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, height: '100%', boxSizing: 'border-box' }}
    >
      <Stack spacing={2} sx={{ height: '100%' }}>
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">{environment.title}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Owner: {environment.owner ?? '—'}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ flexGrow: 1 }}>
          {/* Tabs + content */}
          <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}
            >
              <Tab label="Overview" />
              <Tab label="Spec" />
              <Tab label="Usage" />
            </Tabs>

            {tab === 0 && (
              <CondaEnvironmentOverview environment={environment} />
            )}
            {tab === 1 && <CondaEnvironmentSpec environment={environment} />}
            {tab === 2 && <CondaEnvironmentUsage />}

            {packError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {packError}
              </Alert>
            )}
            {packSuccess && (
              <Alert severity="success" sx={{ mt: 1 }}>
                {packSuccess}
              </Alert>
            )}
          </Stack>

          <Divider orientation="vertical" flexItem />

          {/* Actions sidebar */}
          <Stack spacing={1} sx={{ minWidth: 180 }}>
            <Typography variant="subtitle2">Actions</Typography>
            <ActionButton
              label="Generate artifact (conda-pack)"
              icon={<BuildIcon fontSize="small" />}
              onClick={handleGenerateArtifact}
              disabled={!isOwner}
              loading={packLoading}
              tooltip={
                !isOwner
                  ? 'Only the owner can generate an artifact'
                  : undefined
              }
            />
            <ActionButton
              label="Download artifact"
              icon={<CloudDownloadIcon fontSize="small" />}
              onClick={handleDownload}
              disabled={!environment.environment_file}
              tooltip={
                !environment.environment_file
                  ? 'No artifact available yet'
                  : undefined
              }
            />
            <ActionButton
              label="Share environment"
              icon={<PeopleIcon fontSize="small" />}
              onClick={() => setShareOpen(true)}
            />
            <ActionButton
              label="Delete"
              icon={<DeleteIcon fontSize="small" />}
              onClick={() => setDeleteOpen(true)}
              disabled={!isOwner}
              tooltip={
                !isOwner ? 'Only the owner can delete this environment' : undefined
              }
            />
            <Divider />
            <Tooltip title="Coming soon: scan cell imports to generate environment">
              <span>
                <ActionButton label="Add from cell" disabled />
              </span>
            </Tooltip>
            <Tooltip title="Coming soon: scan notebook imports to generate environment">
              <span>
                <ActionButton label="Add from notebook" disabled />
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Stack>

      {shareOpen && (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          onUpdated={() => {
            setShareOpen(false);
          }}
          asset={environment as unknown as Asset}
          readonly={!isOwner}
        />
      )}

      {deleteOpen && (
        <DeleteDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onUpdated={() => {
            setDeleteOpen(false);
            onClose();
          }}
          asset={environment as unknown as Asset}
          assetKind={condaAssetKind}
          readonly={!isOwner}
        />
      )}
    </Paper>
  );
}
