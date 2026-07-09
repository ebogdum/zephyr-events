# Contributing to Zephyr Events

Thank you for your interest in contributing to **Zephyr Events**. 

This guide will help you get started with contributing to our ultra-fast event emitter library.

## 🚀 Quick Start

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Create** a feature branch
4. **Make** your changes
5. **Test** your changes
6. **Submit** a pull request

## 📋 Development Setup

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 7.0.0
- **TypeScript** knowledge for core contributions

### Local Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/zephyr-events.git
cd zephyr-events

# Install dependencies
npm install

# Build the project
npm run build

# Run the test suite
npm test
```

## 🏗️ Project Structure

```
zephyr-events/
├── src/
│   └── index.ts          # Main source code
├── test/
│   └── index.js          # Test suite (run with `npm test`)
├── dist/                 # Built files (generated)
├── build.js              # Custom build script
├── benchmark.js          # Single-variant benchmark
├── benchmark-compare.js  # Safe vs Fast comparison benchmark
├── package.json          # Project configuration
├── tsconfig.json         # TypeScript configuration
├── README.md             # Documentation
└── CONTRIBUTING.md       # This file
```

## 🎯 Types of Contributions

### 🐛 Bug Reports

When reporting bugs, please include:
- **Clear description** of the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Environment details** (Node.js version, OS, etc.)
- **Minimal code example** demonstrating the issue

### 💡 Feature Requests

For new features, please provide:
- **Use case** description
- **Proposed API** design
- **Performance considerations**
- **Backward compatibility** impact

### 🔧 Code Contributions

#### Performance-Critical Guidelines

Since Zephyr Events is optimized for performance:

1. **Benchmark your changes** - Run performance tests
2. **Avoid breaking changes** to the core API
3. **Keep bundle size minimal** - Check output size
4. **Use ES2023 features** where beneficial
5. **Maintain type safety** - Full TypeScript support

#### Code Style

- **ES2023** syntax preferred
- **Minimal dependencies** - avoid external packages
- **Type safety** - use TypeScript properly
- **Performance first** - optimize for speed
- **Memory efficient** - avoid unnecessary allocations

## 🧪 Testing Guidelines

### Manual Testing

Create test files to verify your changes:

```javascript
const zephyrEvents = require('./dist/zephyr-events.js').default;

// Test your changes
const emitter = zephyrEvents();
// ... test logic
```

### Performance Testing

For performance-related changes:

```bash
# Single-variant benchmark
node benchmark.js

# Safe vs Fast comparison
node benchmark-compare.js
```

### Test Coverage Areas

- ✅ **Core functionality**: on/off/emit
- ✅ **Edge cases**: empty handlers, wildcard events
- ✅ **Memory management**: handler cleanup
- ✅ **TypeScript types**: type safety verification
- ✅ **Race conditions**: concurrent operations

## 📝 Pull Request Process

### Before Submitting

1. **Build successfully**: `npm run build`
2. **Test your changes** thoroughly
3. **Check bundle sizes** in `dist/` folder
4. **Update documentation** if needed
5. **Follow commit conventions**

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add support for async event handlers
fix: resolve memory leak in handler cleanup
perf: optimize event emission for single handlers
docs: update API examples in README
```

### Pull Request Template

When submitting a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Performance improvement
- [ ] Documentation update

## Testing
- [ ] Tested manually
- [ ] Performance benchmarked (if applicable)
- [ ] No breaking changes

## Checklist
- [ ] Code builds successfully
- [ ] Bundle size acceptable
- [ ] TypeScript types updated
- [ ] Documentation updated
```

## 🎨 Development Philosophy

### Core Principles

1. **Performance First**: Every change should maintain or improve performance
2. **Minimal Surface Area**: Keep the API small and focused  
3. **Zero Dependencies**: Avoid external dependencies
4. **Type Safety**: Full TypeScript support without compromises
5. **ES2023 Native**: Leverage modern JavaScript features

### Anti-Patterns to Avoid

- ❌ Adding unnecessary features
- ❌ Breaking backward compatibility
- ❌ Increasing bundle size significantly  
- ❌ Compromising performance for convenience
- ❌ Adding external dependencies

## 🔍 Review Process

### What We Look For

- **Performance impact** analysis
- **Code quality** and readability
- **Test coverage** adequacy
- **Documentation** completeness
- **Backward compatibility** preservation

### Review Timeline

- **Initial response**: Within 48 hours
- **Detailed review**: Within 1 week
- **Follow-up**: As needed for revisions

## 🌟 Recognition

Contributors will be:
- **Listed** in release notes
- **Acknowledged** in README credits
- **Invited** to be maintainers (for significant contributions)

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas
- **Email**: For security issues or private matters

## 📄 License

By contributing, you agree that your contributions will be licensed under the same **MIT License** that covers the project.

---

## 🙏 Acknowledgments

Special thanks to:
- **Jason Miller** for the original [mitt](https://github.com/developit/mitt) inspiration
- **All contributors** who help make Zephyr Events better

---

Ready to contribute? Start by forking the repo and making your first change!