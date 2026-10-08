# Google sign-in setup

EccleService signs users in with Google. The API runs the OAuth authorization code flow and keeps the session in an httpOnly cookie. Only emails registered in EccleService can sign in.

This guide sets up the Google side. The API reads the resulting credentials from `.env`; without them the sign-in endpoints answer 503.

## 1. Create the project

1. Open <https://console.cloud.google.com> with the `pison.gm.dev` account.
2. Create a project named `EccleService`.

## 2. Configure the consent screen

Open **Google Auth Platform** in the project.

| Section | Field | Value |
| --- | --- | --- |
| Branding | App name | `EccleService` |
| Branding | User support email | `pison.gm.dev@gmail.com` |
| Branding | Developer contact | `pison.gm.dev@gmail.com` |
| Branding | App logo | Leave empty for now. Adding a logo triggers brand verification |
| Branding | Home page, privacy policy, terms | Leave empty until a public domain exists |
| Audience | User type | External |
| Audience | Publishing status | Testing |
| Audience | Test users | Every email that must be able to sign in, starting with the Super Admins |
| Data access | Scopes | `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` |

These three scopes are non-sensitive, so Google asks for no verification. While the status is Testing, only the listed test users can sign in, up to 100.

## 3. Create the OAuth client

In **Clients**, create a client:

| Field | Value |
| --- | --- |
| Application type | Web application |
| Name | `EccleService API (local)` |
| Authorized JavaScript origins | none |
| Authorized redirect URIs | `http://localhost:4000/api/v1/auth/google/callback` |

## 4. Hand over the credentials

Put the two values in `.env` at the repository root. Do not commit them or paste them into chat.

```sh
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URL=http://localhost:4000/api/v1/auth/google/callback
```

Restart the API after changing them. A user can sign in once two things are true: their email is a test user in Google, and it exists in the `users` table.

## Before going public

- Add the production redirect URI, `https://<api-domain>/api/v1/auth/google/callback`, to the client or to a separate production client.
- Fill in the home page, privacy policy and terms URLs under Branding. They must be on a domain verified in Google Search Console. The pages already exist at `/`, `/privacy` and `/terms` of the public site.
- Set the publishing status to In production so sign-in is no longer limited to test users.
