# Releasing

Releases are cut by [changesetter](https://github.com/Saturate/changesetter) and uploaded to the stores by `.github/workflows/release.yml`.

## What merging the Next Release pull request does

Every merge to `main` keeps a **Next Release** pull request up to date from the pending changesets. Merging it:

1. Bumps the version in `package.json` (WXT writes it into the manifest), writes `CHANGELOG.md`, tags the release and creates the GitHub release.
2. Builds the Chrome, Firefox and sources zips from the tag and attaches them to the GitHub release (job `build`).
3. Uploads those same zips to the Chrome Web Store (job `chrome`) and to addons.mozilla.org with the sources zip (job `firefox`). The two store jobs run side by side, so one failing does not stop the other.

Changesets made with `changesetter add --no-bump` release nothing and stay out of the changelog.

## Store secrets

Each store job runs only when its secrets are set in the repository. Without them the job passes with a warning and a line in the run summary naming the skipped store. The first upload to each store is made by hand; set the secrets once the listing exists.

| Store              | Secrets                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Chrome Web Store   | `CHROME_EXTENSION_ID`, `CHROME_PUBLISHER_ID`, `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL`, `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY` |
| addons.mozilla.org | `FIREFOX_JWT_ISSUER`, `FIREFOX_JWT_SECRET`                                                                                |

The release job also needs `CLIENT_ID` and `APP_PRIVATE_KEY` for the GitHub App that pushes the tag and the Next Release pull request.

## Retrying a failed store upload

Do not use **Re-run all jobs**: changesetter only reports a release from the run that pushed the tag, so a re-run skips the build and both stores.

Instead, run the workflow by hand with the release tag:

```bash
gh workflow run release.yml -f tag=v0.2.0
```

or **Actions → Release → Run workflow** and enter the tag. A manual run skips the release job, reuses the zips already attached to that GitHub release (it builds and attaches them from the tag only if they are missing) and runs both store jobs.

Each store job first asks its store whether it already has that version, using `scripts/store-version.mjs`:

- Chrome Web Store: the item's published version, or a submission that is pending review, staged or published, at this version or newer.
- addons.mozilla.org: any version with this number, in any channel or review state. AMO never accepts a version number twice, so a disabled or rejected version is reported with a warning and needs a new release.

A store that already has the version is skipped with a notice, so a retry only uploads where the last attempt failed. A Chrome submission that was rejected or cancelled is uploaded again.
