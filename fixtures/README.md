# Configuration fixtures

- `default-config.yaml`: public Quartz v5 default configuration from the official `jackyzha0/quartz` repository, `v5` branch, fetched on October 21, 2026. This public snapshot is bundled into `index.html`; it contains no personal configuration.
- `local/real-config.yaml`: read-only copy of the owner's configuration, created on October 21, 2026. It is excluded by `.gitignore` because it contains site-specific settings. Local acceptance tests skip this fixture when it is absent.

The local source was copied without running any commands inside the Quartz site. Its size (7,503 bytes), UTC modification timestamp (`2026-10-20T08:18:10.0033589Z`), and SHA-256 digest were unchanged before and after copying. The copy has 312 lines and 46 plugin entries. All subsequent tests read only fixtures in this repository.

Component catalog defaults are a snapshot of the installed Quartz plugin `package.json` manifests, not the priorities in the personal configuration. For example, Backlinks defaults to priority 30, Table of Contents to 50, and Spacer to 15. Explicit layout declarations override these defaults.
