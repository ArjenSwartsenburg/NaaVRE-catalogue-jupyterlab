import json
import os
import subprocess
import tempfile
import urllib.request

import tornado
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join


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
        upload_url = body.get("upload_url")

        if not environment_name:
            self.set_status(400)
            self.finish(json.dumps({"message": "environment_name is required"}))
            return
        if not upload_url:
            self.set_status(400)
            self.finish(json.dumps({"message": "upload_url is required"}))
            return

        with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            result = subprocess.run(
                ["conda-pack", "-n", environment_name, "-o", tmp_path, "--overwrite"],
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

        if not download_url:
            self.set_status(400)
            self.finish(json.dumps({"message": "download_url is required"}))
            return
        if not environment_name:
            self.set_status(400)
            self.finish(json.dumps({"message": "environment_name is required"}))
            return

        # Derive conda environments directory from CONDA_PREFIX or default
        conda_prefix = os.environ.get("CONDA_PREFIX", "")
        if conda_prefix:
            envs_dir = os.path.join(
                os.path.dirname(os.path.dirname(conda_prefix)), "envs"
            )
        else:
            envs_dir = os.path.expanduser("~/conda/envs")

        install_path = os.path.join(envs_dir, environment_name)

        with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            urllib.request.urlretrieve(download_url, tmp_path)

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

            # Run conda-unpack if available
            unpack_bin = os.path.join(install_path, "bin", "conda-unpack")
            if os.path.exists(unpack_bin):
                subprocess.run([unpack_bin], capture_output=True)

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
    ]
    web_app.add_handlers(host_pattern, handlers)
