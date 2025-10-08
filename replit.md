# Overview

WP-BOT is a WhatsApp bot built on Node.js using the Baileys library (@whiskeysockets/baileys). It provides a modular command system with support for custom commands, event handlers, role-based permissions, cooldowns, and an economy/leveling system. The bot supports multiple authentication methods (QR code, pairing code, and Cloud API) and offers flexible data storage options (JSON, SQLite, or MongoDB).

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Authentication & Connection Management

**Problem:** WhatsApp bots need reliable authentication and connection handling with multiple login methods.

**Solution:** Three authentication strategies are implemented:
- QR Code login (`whatsapp_qrcode.js`) - Default method with visual QR scanning
- Pairing code login (`whatsapp_paircode.js`) - Phone number-based pairing
- Cloud API login (`whatsapp_cloud.js`) - WhatsApp Business API integration

**Design Decision:** The system uses a restart-on-failure pattern where `index.js` spawns `nix.js` as a child process. If the process exits with code 2, it automatically restarts, ensuring high availability.

**Pros:** Fault tolerance, multiple auth options for different use cases
**Cons:** Requires manual configuration in config.json to select auth method

## Message Processing Pipeline

**Problem:** Need to handle different message types (commands, replies, reactions, events) efficiently.

**Solution:** A handler-based architecture in `bot/main.js` routes messages to specialized handlers:
- `command.js` - Processes prefixed/non-prefixed commands
- `reply.js` - Handles replies to bot messages
- `reaction.js` - Processes reactions to messages
- `event.js` - Manages group events (joins/leaves)
- `word.js` - Handles non-command messages and media detection

**Design Pattern:** Chain of responsibility pattern where each handler checks message type and processes accordingly.

**Pros:** Clean separation of concerns, easy to extend with new handlers
**Cons:** Sequential processing may add latency for complex message chains

## Command System

**Problem:** Need a flexible, modular command loading system with permissions and cooldowns.

**Solution:** Dynamic command loading from `scripts/cmds/` directory:
- Commands are JavaScript modules with a standard interface (`name`, `nix` function, `role`, etc.)
- Global command registry using Map (`global.teamnix.cmds`)
- Alias support for command variations
- Role-based access control (0=user, 1=moderator, 2=admin, 3=developer)
- Per-user cooldown system with developer bypass option

**Key Features:**
- Hot-reload capability via `cmd` command
- Installation from raw URLs or message attachments
- Prefix customization per group
- NoPrefix mode for natural language commands

**Pros:** Highly extensible, easy plugin development, granular permissions
**Cons:** No command versioning or dependency management

## Data Storage Abstraction

**Problem:** Different deployment environments may require different storage backends.

**Solution:** Storage abstraction layer (`database/storage.js`) supporting three backends:
- JSON files (default, simple file-based storage)
- SQLite (embedded database for better performance)
- MongoDB (scalable cloud database)

**Data Models:**
- `userMoney` - Economy system (balance, message count)
- `userData` - User preferences and data
- `prefixesData` - Per-group prefix customization
- `groupSettings` - Group-specific configurations

**Caching Strategy:** In-memory cache (`dataCache`) with periodic persistence via `saveData()`

**Pros:** Flexible deployment options, simple API, in-memory performance
**Cons:** Potential data loss if process crashes before save, no transaction support

## Reply/Reaction Handler System

**Problem:** Commands need to create interactive flows with follow-up messages.

**Solution:** Global reply/reaction registry (`global.teamnix.onReply`) maps message IDs to handler functions:
```javascript
nixReply(messageId, handlerFunction)  // Register handler
removeReply(messageId)                 // Cleanup handler
```

**Use Case:** Confirmation dialogs, multi-step commands, interactive menus

**Pros:** Simple API for interactive commands, automatic cleanup
**Cons:** Handlers persist only in memory (lost on restart)

## Message Economy System

**Problem:** Track user engagement and provide gamification.

**Solution:** Passive message counting system that increments counters on every message:
- Automatic money increment per message
- Level/rank calculation based on message count
- Daily reward system with 24-hour cooldown
- Visual rank cards using Canvas

**Design Decision:** Message counting happens in `bot/main.js` before any other processing, ensuring all messages are tracked regardless of type.

**Pros:** Zero user effort for participation, encourages engagement
**Cons:** May reward spam without additional rate limiting

## Update & Version Management

**Problem:** Bot needs to notify users of updates and support self-updating.

**Solution:** Two-tier update system:
1. `push.js` - Passive notification comparing local vs remote package.json versions
2. `update.js` command - Active Git-based update with backup/restore

**Update Process:**
- Fetch remote repository tree via GitHub API
- Compare file hashes to detect changes
- Backup modified files before update
- Pull latest changes via Git
- Restore backups if needed

**Pros:** Safe updates with rollback capability, automatic notifications
**Cons:** Requires Git installation, GitHub dependency

# External Dependencies

## WhatsApp Communication
- **@whiskeysockets/baileys** (v6.7.17) - Core WhatsApp Web API library providing socket connection, message handling, and protocol implementation

## Data Storage
- **sqlite3** (v5.1.7) - Embedded SQL database for local storage
- **mongodb** (v6.16.0) - NoSQL database driver for cloud storage
- **fs-extra** (v11.3.0) - Enhanced file system operations for JSON storage

## Media Processing
- **canvas** (v3.1.0) - Image generation for rank cards and visual elements
- **sharp** (v0.32.6) - High-performance image processing
- **puppeteer** (v24.9.0) - Headless browser for web scraping and screenshots
- **prism-media** (v1.3.5) - Media transcoding utilities

## Utilities
- **axios** (v1.9.0) - HTTP client for API requests and file downloads
- **moment-timezone** (v0.5.48) - Time zone handling and date formatting
- **qrcode-terminal** (v0.12.0) - QR code rendering in terminal
- **link-preview-js** (v3.0.15) - URL metadata extraction
- **soundcloud-downloader** (v1.0.0) - Audio download utility
- **check-disk-space** (v3.4.0) - Disk usage monitoring

## Logging & Development
- **pino** (v9.7.0) - High-performance JSON logger
- **pino-pretty** (v13.0.0) - Pretty printing for development logs

## Configuration Files
- `config.json` - Bot configuration with the following structure:
  - `prefix` - Command prefix (e.g., "/")
  - `loginMethod` - Authentication method: "qrcode" (QR code scan) or "paircode" (phone number pairing)
  - `paircode` - Phone number for pairing code login (required if loginMethod is "paircode")
  - `storeType` - Database type: "json", "sqlite", or "mongo"
  - `roles` - Role-based access control (1=moderator, 2=admin, 3=developer)
  - `vip` - Array of VIP user IDs
  - `CoolDownForDev` - Whether developers are subject to cooldowns
- `language/texts.txt` - Localization strings for error messages and responses
- `package.json` - Dependencies and version management

## External Services (Potential)
- GitHub API - Version checking and update distribution
- WhatsApp Cloud API - Alternative business API authentication
- Custom APIs referenced in commands (e.g., noobs-api.top for AI features)