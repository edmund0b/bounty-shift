# Tag Run 2.0 deployment status

NOT DEPLOYED. Local verification passed: 309 automated tests, production build and two-client Chromium Tag Run verification. The GitHub integration rejected creation of the deployment tree with HTTP 403, Resource not accessible by integration. No commit was created or branch moved, and no Render deployment was triggered. No new hosting system was created.

Repository main was inspected before the attempt: c1636257854fb92d46cd9aeee645d34e4b8a1124, “Add files gun combat upgrade.” Its server/shared/src files match the supplied foundation; no unreviewed source changes were overwritten.

Existing game URL: https://bounty-shift.onrender.com
This is the existing deployment address, NOT a verified Tag Run 2.0 deployment. Publish the contents of the final verified ZIP to the existing repository and deploy through the existing Render service when write access is available. Use existing Node 22 build/start commands: npm ci && npm run build; npm start. No Render configuration was changed.

Public URL check returned HTTP 200. Its loaded client bundle is index--D_Zqr5P.js, matching Gun Upgrade 1; the locally verified Tag Run 2.0 client is index-DUKyiN1g.js. The live site has not received this release.
