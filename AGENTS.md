# SlotPoll Release Instructions

For every application release:

1. Bump the version in `app/package.json` and `app/package-lock.json`.
2. Add a dated entry to `CHANGELOG.md` describing the final changes and relevant validation.
3. Complete the build and deployment checks before reporting success.
4. Commit and push the release changes and the matching annotated `vX.Y.Z` tag.
5. Publish a GitHub Release for that tag with the matching changelog entry as its release notes. A pushed Git tag alone does not complete the release.
6. Verify that the published release is visible on GitHub, is not a draft, and points to the intended tag. Include the release URL in the completion message.

Documentation-only changes do not require an application version bump or a new release.
