# Deployment

Deployment is not set up yet. The project runs locally only.

## Before the first deploy

- [ ] Make the GitHub repository private.
- [ ] Rotate the Cloudflare R2 keys. The current ones were once stored in a plaintext file.
- [ ] Decide the production domain. OAuth redirect URIs, CORS origins, cookies and the legal pages depend on it.
- [ ] Set `R2_PUBLIC_BASE_URL` to a public bucket URL (r2.dev or a custom domain). The S3 endpoint is private.
- [ ] Finish the "Before going public" steps in [Google sign-in setup](google-oauth-setup.md).
- [ ] Clear the licences for hymn lyrics, notation and scripture text before offering paid plans.
