import json
import os
import subprocess
import tempfile
import urllib.request

import tornado
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join


def _conda_envs_dir() -> str:
    """Directory where conda environments are installed.

    When CONDA_PREFIX points at a named env (.../envs/<name>), reuse its
    envs directory. When it points at the base env (e.g. /opt/conda, the
    case in deployed Jupyter pods), use <base>/envs — naively walking two
    dirnames up from the base prefix yields '/envs', which is not writable.
    """
    conda_prefix = os.environ.get("CONDA_PREFIX", "")
    if not conda_prefix:
        return os.path.expanduser("~/conda/envs")
    parent = os.path.dirname(conda_prefix)
    if os.path.basename(parent) == "envs":
        return parent
    return os.path.join(conda_prefix, "envs")


class CondaPackHandler(APIHandler):
    """Pack a conda environment and upload it to a presigned S3 URL."""

    @tornado.web.authenticated
    def post(self):
        body = self.get_json_body()
        if body is None:
            self.set_status(400)
            self.finish(json.dumps({"message": "Request body is required"}))
            return

        environment_name = body.get("environment_name")
        environment_prefix = body.get("environment_prefix")
        upload_url = body.get("upload_url")

        if not environment_name and not environment_prefix:
            self.set_status(400)
            self.finish(json.dumps({"message": "environment_name or environment_prefix is required"}))
            return
        if not upload_url:
            self.set_status(400)
            self.finish(json.dumps({"message": "upload_url is required"}))
            return

        with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            if environment_prefix:
                pack_args = ["conda-pack", "--prefix", environment_prefix, "-o", tmp_path, "--force"]
            else:
                pack_args = ["conda-pack", "-n", environment_name, "-o", tmp_path, "--force"]
            result = subprocess.run(
                pack_args,
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                self.set_status(500)
                self.finish(json.dumps({
                    "message": f"conda-pack failed: {result.stderr}"
                }))
                return

            file_size = os.path.getsize(tmp_path)

            with open(tmp_path, "rb") as f:
                data = f.read()

            req = urllib.request.Request(
                upload_url,
                data=data,
                method="PUT",
                headers={"Content-Type": "application/gzip"},
            )
            with urllib.request.urlopen(req) as resp:
                if resp.status not in (200, 204):
                    self.set_status(502)
                    self.finish(json.dumps({
                        "message": f"S3 upload failed with status {resp.status}"
                    }))
                    return

        except Exception as e:
            self.set_status(500)
            self.finish(json.dumps({"message": str(e)}))
            return
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

        self.finish(json.dumps({"file_size": file_size}))


class CondaInstallHandler(APIHandler):
    """Download a packed conda environment from a URL and install it."""

    @tornado.web.authenticated
    def post(self):
        body = self.get_json_body()
        if body is None:
            self.set_status(400)
            self.finish(json.dumps({"message": "Request body is required"}))
            return

        download_url = body.get("download_url")
        environment_name = body.get("environment_name")
        install_method = body.get("install_method", "pack")  # "pack" | "explicit"

        if not download_url:
            self.set_status(400)
            self.finish(json.dumps({"message": "download_url is required"}))
            return
        if not environment_name:
            self.set_status(400)
            self.finish(json.dumps({"message": "environment_name is required"}))
            return
        if install_method not in ("pack", "explicit", "yaml"):
            self.set_status(400)
            self.finish(json.dumps({"message": "install_method must be 'pack', 'explicit', or 'yaml'"}))
            return

        # Use a neutral suffix; actual format is detected from file content below
        if install_method == "pack":
            suffix = ".tar.gz"
        else:
            suffix = ".txt"

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name

        try:
            urllib.request.urlretrieve(download_url, tmp_path)

            if install_method in ("explicit", "yaml"):
                # Detect format from content: conda explicit lists contain an
                # "@EXPLICIT" marker; anything else is treated as a YAML env file.
                with open(tmp_path, "r", errors="replace") as f:
                    header = f.read(4096)
                is_explicit = "@EXPLICIT" in header

                if is_explicit:
                    conda_cmd = ["conda", "create", "--name", environment_name,
                                 "--file", tmp_path, "--yes"]
                    cmd_label = "conda create"
                else:
                    # conda env create infers format from the file extension;
                    # rename to .yml so it is parsed as YAML, not as a spec list.
                    yml_path = tmp_path[:-4] + ".yml"
                    os.rename(tmp_path, yml_path)
                    tmp_path = yml_path
                    conda_cmd = ["conda", "env", "create", "--name", environment_name,
                                 "--file", tmp_path, "--yes"]
                    cmd_label = "conda env create"

                result = subprocess.run(
                    conda_cmd,
                    capture_output=True,
                    text=True,
                )
                if result.returncode != 0:
                    self.set_status(500)
                    self.finish(json.dumps({
                        "message": f"{cmd_label} failed: {result.stderr}"
                    }))
                    return

                install_path = os.path.join(
                    _conda_envs_dir(), environment_name
                )

            else:
                install_path = os.path.join(
                    _conda_envs_dir(), environment_name
                )
                os.makedirs(install_path, exist_ok=True)

                result = subprocess.run(
                    ["tar", "-xzf", tmp_path, "-C", install_path],
                    capture_output=True,
                    text=True,
                )
                if result.returncode != 0:
                    self.set_status(500)
                    self.finish(json.dumps({
                        "message": f"Unpack failed: {result.stderr}"
                    }))
                    return

                # Run conda-unpack to fix hardcoded paths baked in by conda-pack
                unpack_bin = os.path.join(install_path, "bin", "conda-unpack")
                if os.path.exists(unpack_bin):
                    unpack_result = subprocess.run(
                        [unpack_bin],
                        capture_output=True,
                        text=True,
                    )
                    if unpack_result.returncode != 0:
                        self.set_status(500)
                        self.finish(json.dumps({
                            "message": f"conda-unpack failed: {unpack_result.stderr}"
                        }))
                        return

        except Exception as e:
            self.set_status(500)
            self.finish(json.dumps({"message": str(e)}))
            return
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

        self.finish(json.dumps({
            "success": True,
            "message": f"Environment installed to {install_path}"
        }))


class CondaExplicitListHandler(APIHandler):
    """Return the explicit package list for a conda environment."""

    @tornado.web.authenticated
    def get(self):
        env_name = self.get_argument('name', None)
        if not env_name:
            self.set_status(400)
            self.finish(json.dumps({'message': 'name query parameter is required'}))
            return
        try:
            result = subprocess.run(
                ['conda', 'list', '-n', env_name, '--explicit'],
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                self.set_status(500)
                self.finish(json.dumps({
                    'message': f'conda list failed: {result.stderr}'
                }))
                return
            self.finish(json.dumps({'content': result.stdout}))
        except Exception as e:
            self.set_status(500)
            self.finish(json.dumps({'message': str(e)}))


class CondaEnvListHandler(APIHandler):
    """List conda environments available on the machine."""

    @tornado.web.authenticated
    def get(self):
        try:
            result = subprocess.run(
                ["conda", "env", "list", "--json"],
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                self.set_status(500)
                self.finish(json.dumps({"message": f"conda env list failed: {result.stderr}"}))
                return

            data = json.loads(result.stdout)
            envs = []
            for p in data.get("envs", []):
                # Paths under .../envs/<name> use the basename as name;
                # the root conda installation is the "base" environment.
                parts = p.replace("\\", "/").split("/")
                if len(parts) >= 2 and parts[-2] == "envs":
                    name = parts[-1]
                else:
                    name = "base"
                envs.append({"name": name, "path": p})
            self.log.info(f"Local conda envs: {[e['name'] for e in envs]}")
            self.finish(json.dumps({"envs": envs}))
        except Exception as e:
            self.set_status(500)
            self.finish(json.dumps({"message": str(e)}))


def setup_handlers(web_app):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]

    handlers = [
        (
            url_path_join(base_url, "naavre-catalogue", "conda", "pack"),
            CondaPackHandler,
        ),
        (
            url_path_join(base_url, "naavre-catalogue", "conda", "install"),
            CondaInstallHandler,
        ),
        (
            url_path_join(base_url, "naavre-catalogue", "conda", "explicit-list"),
            CondaExplicitListHandler,
        ),
        (
            url_path_join(base_url, "naavre-catalogue", "conda", "envs"),
            CondaEnvListHandler,
        ),
    ]
    web_app.add_handlers(host_pattern, handlers)
