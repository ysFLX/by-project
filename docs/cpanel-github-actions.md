# cPanel GitHub Actions Deploy

This project deploys the Vite frontend from `asd/` to cPanel automatically when `main` is pushed.

Add these repository secrets in GitHub:

- `FTP_SERVER`: FTP host, usually the domain or server host from cPanel
- `FTP_USERNAME`: FTP username
- `FTP_PASSWORD`: FTP password
- `FTP_PORT`: usually `21`
- `FTP_SERVER_DIR`: usually `/public_html/asd/`

GitHub path:

`Settings -> Secrets and variables -> Actions -> New repository secret`

After the secrets are added, push to `main`. The workflow builds `asd` and uploads `asd/dist` to cPanel.
