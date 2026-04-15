import {
  INotebookFile,
  IWorkflowCell,
  IWorkflowFile
} from '../../types/NaaVRECatalogue/assets';
import { ICondaEnvironment } from '../../types/NaaVRECatalogue/conda-environments';

export type Asset = INotebookFile | IWorkflowCell | IWorkflowFile;
export type CondaAsset = ICondaEnvironment;

export type AssetKind = {
  name: string;
  namePlural: string;
  slug: string;
  cataloguePath: string;
};

export const assetKinds: AssetKind[] = [
  {
    name: 'notebook file',
    namePlural: 'notebook file',
    slug: 'notebook-files',
    cataloguePath: 'notebook-files'
  },
  {
    name: 'workflow component',
    namePlural: 'workflow component',
    slug: 'workflow-cells',
    cataloguePath: 'workflow-cells'
  },
  {
    name: 'workflow file',
    namePlural: 'workflow file',
    slug: 'workflow-files',
    cataloguePath: 'workflow-files'
  },
  {
    name: 'conda environment',
    namePlural: 'conda environment',
    slug: 'conda-environments',
    cataloguePath: 'conda-environments'
  }
];
