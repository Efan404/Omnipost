# Platform Markup Guide

Omnipost provides a powerful markup syntax to control which content appears on which platforms.

## Basic Syntax

### Include Specific Platforms

Use `[[platforms:]]` to mark content that should only appear on specific platforms:

```markdown
This content appears on all platforms.

[[platforms: dev.to, medium]]
This section only appears on Dev.to and Medium.
Perfect for content that works better on these platforms.
[[/platforms]]

Back to common content.
```

### Exclude Platforms

Use `[[exclude:]]` to mark content that should be excluded from specific platforms:

```markdown
This content appears on all platforms.

[[exclude: medium]]
This section appears on all platforms EXCEPT Medium.
Use this for content that doesn't work well on Medium.
[[/exclude]]

Back to common content.
```

## Platform Identifiers

| Platform | Identifiers |
|----------|------------|
| Dev.to | `dev.to`, `devto`, `dev` |
| Medium | `medium`, `med` |
| Juejin | `juejin`, `掘金` |
| Zhihu | `zhihu`, `知乎` |
| SSPAI | `sspai`, `少数派` |

## Examples

### Technical Content for Dev.to Only

```markdown
## Introduction

This article covers advanced TypeScript patterns.

[[platforms: dev.to]]
## Deep Technical Dive

Here's a complex code example that works great on Dev.to:

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

This pattern is incredibly useful for...
[[/platforms]]

## Conclusion

Thanks for reading!
```

### Avoiding Medium Limitations

```markdown
## My Tutorial

[[exclude: medium]]
Medium has issues with complex code blocks, so here's the full implementation:

```python
# Complex implementation
class AdvancedProcessor:
    # ... lots of code
```
[[/exclude]]

The concept is straightforward...
```

### Multi-Language Content

```markdown
[[platforms: juejin, zhihu]]
## 中文内容

这部分内容只会发布到中文平台（掘金和知乎）。
[[/platforms]]

[[exclude: juejin, zhihu]]
## English Content

This section only appears on English platforms.
[[/exclude]]
```

## Best Practices

1. **Keep Common Content First**: Write the main content that works for all platforms first.

2. **Use Sparingly**: Only use markup for truly platform-specific content. Too much markup makes content hard to maintain.

3. **Test Before Publishing**: Use the preview feature to check how content looks on each platform.

4. **Document Your Choices**: Add comments explaining why certain content is platform-specific.

5. **Consider Accessibility**: Don't hide critical information from certain platforms.

## Validation

Omnipost automatically validates your markup syntax and will warn you about:

- Unclosed markers
- Empty content blocks
- Invalid platform identifiers
- Overlapping markup blocks

## FAQ

**Q: Can I nest markup blocks?**
A: No, nested blocks are not currently supported. Keep blocks at the same level.

**Q: What happens to excluded content?**
A: It's completely removed from the platform variant. It won't appear in any form.

**Q: Can I manually edit platform variants?**
A: Yes! After AI processing, you can customize content for each platform individually.

**Q: Does this work with translations?**
A: Yes! The markup is preserved during translation, and you can add platform-specific content in the translated version too.
