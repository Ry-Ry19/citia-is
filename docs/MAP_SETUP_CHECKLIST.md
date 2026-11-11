# Species Guide Map Setup Checklist

The public Species Guide currently shows a non-interactive placeholder for
“Distribution and Local Observations.” Do not add a live map until the
following decisions and data requirements are complete:

1. Select a map provider appropriate for CITIA-IS.
2. Create and configure the required API key or public map token, if the
   selected provider requires one.
3. Store credentials in the appropriate environment configuration and never
   commit secrets.
4. Configure permitted domains, usage restrictions, and billing requirements,
   if applicable.
5. Implement the map component and verify loading, responsive behavior,
   accessibility, and failure states.
6. Connect only valid, source-backed geographic records when the relevant
   backend data becomes available.

The map must remain optional so the rest of the Species Guide works without an
API key or map provider configuration.
