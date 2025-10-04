# Contributing to Grid UI

Thank you for your interest in contributing to Grid UI! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues
- Use the [GitHub Issues](https://github.com/gridplatform/grid-ui/issues) to report bugs
- Provide detailed information about the issue
- Include steps to reproduce the problem
- Attach relevant screenshots and error messages

### Suggesting Features
- Use the [GitHub Discussions](https://github.com/gridplatform/grid-ui/discussions) for feature requests
- Describe the use case and expected behavior
- Consider the impact on existing functionality

### Code Contributions
1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** following our coding standards
4. **Add tests** for new functionality
5. **Update documentation** as needed
6. **Commit your changes**: `git commit -m "Add your feature"`
7. **Push to your fork**: `git push origin feature/your-feature-name`
8. **Create a Pull Request**

## 📋 Development Guidelines

### Code Style
- Follow [TypeScript best practices](https://typescript-eslint.io/rules/)
- Use [Prettier](https://prettier.io/) for code formatting
- Use [ESLint](https://eslint.org/) for linting
- Use meaningful component and variable names
- Add JSDoc comments for complex functions

### React Best Practices
- Use functional components with hooks
- Implement proper TypeScript typing
- Use React.memo for performance optimization
- Follow React naming conventions
- Keep components small and focused

### Testing
- Write unit tests for all new components
- Maintain test coverage above 80%
- Use [Vitest](https://vitest.dev/) for testing
- Include integration tests for complex workflows
- Test user interactions and edge cases

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📝 Commit Messages
Use clear, descriptive commit messages:
```
feat: add user dashboard component
fix: resolve layout issue in mobile view
docs: update component documentation
test: add unit tests for infrastructure list
refactor: improve performance of data table
```

## 🤔 Questions?
- **GitHub Discussions**: [Ask questions](https://github.com/gridplatform/grid-ui/discussions)
- **Discord**: [Join our community](https://discord.gg/gridplatform)
- **Email**: [Contact us](mailto:support@gridplatform.org)

Thank you for contributing to Grid UI! 🚀
