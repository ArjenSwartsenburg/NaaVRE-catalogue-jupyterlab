import { IBaseAsset } from './assets';

export interface ICondaEnvironment extends IBaseAsset {
  environment_name: string;
  python_version: string;
  package_count: number;
  created_date: string | null;
  /** S3 path / URL to the packed .tar.gz, null if not yet generated */
  environment_file: string | null;
  /** S3 path / URL to the requirements / environment.yml file */
  dependency_list: string | null;
}
