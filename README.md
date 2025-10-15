# Three-CAD

A modern web-based 3D CAD application built with Vue.js and Three.js, featuring a professional interface and comprehensive modeling tools.

## Overview

Three-CAD is a browser-based Computer-Aided Design (CAD) application that provides powerful 3D modeling capabilities directly in your web browser. Built with Vue.js and Three.js, it offers a professional CAD interface with advanced features for creating, editing, and managing 3D models.

## Features

### Core Architecture
- **Observable Pattern**: Reactive property management with Vue.js integration
- **Command System**: Extensible command infrastructure with undo/redo support
- **Document Management**: Multi-document support with hierarchical node structure
- **History System**: Complete transaction-based undo/redo functionality

### 3D Modeling Tools
- **Basic Shapes**: Box, Sphere, Cylinder, Cone, Plane, Torus
- **Advanced Operations**: Move, Rotate, Scale transformations
- **Material System**: Comprehensive material and texture management
- **Visual Objects**: Three.js integration with geometry factories

### User Interface
- **Professional CAD Interface**: Office-style ribbon interface
- **Tool Palette**: Comprehensive tool organization
- **Object Hierarchy**: Tree-based object management
- **Keyboard Shortcuts**: Full keyboard support for efficient workflow

### Development Features
- **Modular Architecture**: Package-based organization (cad-core, cad-three, cad-ui, cad-commands)
- **TypeScript Support**: Full type safety and IntelliSense
- **Testing Framework**: Comprehensive unit and integration tests
- **Hot Reload**: Fast development with Vite

## Technology Stack

- **Frontend**: Vue.js 3, Vite
- **3D Engine**: Three.js
- **Build Tools**: Vite, ESLint
- **Testing**: Vitest, Playwright
- **Styling**: CSS3 with professional CAD theme

## Project Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

```sh
# Clone the repository
git clone <repository-url>
cd three-cad

# Install dependencies
npm install
```

### Development

```sh
# Start development server
npm run dev
# Application will be available at http://localhost:5173
```

### Building

```sh
# Build for production
npm run build
```

### Testing

```sh
# Run unit tests
npm run test:unit

# Run end-to-end tests
npm run test:e2e

# Run all tests
npm run test
```

### Code Quality

```sh
# Lint code
npm run lint

# Format code
npm run format
```

## Project Structure

```
src/
├── packages/
│   ├── cad-core/          # Core architecture (Observable, History, Commands)
│   ├── cad-three/         # Three.js integration (VisualObject, CameraController)
│   ├── cad-ui/            # Vue.js UI components
│   └── cad-commands/      # CAD command implementations
├── components/            # Vue components
├── assets/               # CSS themes and icons
└── utils/                # Utility functions
```

## Development Status

**Current Phase**: Phase 4.3 Complete - Professional CAD Interface Ready
**Next Phase**: Phase 5.1 - Command Infrastructure

The application is currently in active development with a stable core architecture and professional UI. Key features are being implemented following a structured 6-phase development plan.

## Contributing

We welcome contributions! Please see our development guidelines and ensure all code follows our standards:

- All code comments and documentation must be in English
- Follow Vue.js and Three.js best practices
- Maintain comprehensive test coverage
- Use TypeScript for type safety

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions, issues, or contributions, please:
- Open an issue on GitHub
- Follow our development guidelines
- Ensure all documentation is in English
