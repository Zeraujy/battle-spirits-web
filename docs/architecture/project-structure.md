# Project Structure — v5.1.0

The project uses a Web-only architecture with feature-oriented frontend boundaries.

```text
src/
├─ app/                # Application shell and global configuration
├─ components/         # Truly shared presentation components only
│  ├─ cards/
│  ├─ common/
│  └─ layout/
├─ data/               # Frontend catalog and static application data
├─ features/           # Feature-owned UI and feature-only services
│  ├─ arena/
│  │  └─ components/
│  ├─ deck-builder/
│  │  └─ services/
│  ├─ home/
│  ├─ match-setup/
│  │  └─ components/
│  ├─ online/
│  │  └─ components/
│  ├─ profile/
│  ├─ settings/
│  │  └─ services/
│  ├─ shop/
│  │  └─ components/
│  └─ tutorial/
├─ game/               # Rules engine and gameplay domain
├─ interactions/       # Input and interaction policies
├─ localization/       # Language context and translations
├─ online/             # Shared client-side online domain and synchronization
├─ services/           # Cross-feature domain services and persistence adapters
│  ├─ cards/           # Card catalog validation and repository access
│  ├─ economy/         # Wallet, collection and shop economy services
│  ├─ platform/        # Storage, theme and external platform adapters
│  ├─ player/          # Social, ranked, mastery and match-history services
│  └─ tutorial/        # Shared tutorial progress persistence
└─ styles/             # Shared and feature presentation styles

server/                # Authoritative multiplayer server
public/                # Public runtime assets and card database
supabase/              # Database migrations and cloud policies
scripts/               # Audits, maintenance, migration and regression tools
data/                  # Development-time effect and validation datasets
docs/                  # Active project documentation
resources/             # Catalog maintenance source assets/data
```

Route-level screens and feature-owned UI live inside `src/features/`, grouped by domain. `src/components/` is reserved for components reused across multiple features. Feature-only services live beside their owning feature; `src/services/` is reserved for cross-feature services grouped by domain. Flat service files at the root of `src/services/` are not part of the active architecture.

Legacy folders such as `src/pages/`, `src/components/game/`, `src/components/online/`, `src/components/match/`, `src/components/economy/`, and `src/components/home/` are not part of the active architecture.

Folder and non-component file names use English naming. React component filenames remain PascalCase where appropriate.
