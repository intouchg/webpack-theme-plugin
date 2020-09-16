# @i/webpack-theme-plugin

Webpack plugin to run the Intouch Design System theme processor [@i/theme](https://intazdoweb.intouchsol.com/IntouchDesignSystem/IntouchDesignSystem/_git/theme)



### Getting Started

Initialize and pass the plugin to Webpack. The plugin will read the `.idsconfig` file in the project root.
<br>

```js
// webpack.config.js
const IntouchThemePlugin = require('@i/webpack-theme-plugin')

// ...
webpackPlugins.push(new IntouchThemePlugin())
```
<br>

```shell
# .idsconfig
VALUES=theme/values.json
GROUPS=theme/groups.json
COMPONENTS=theme/components.json
SNIPPETS=theme/snippets.json
THEME_OUTPUT=theme/theme.js
```
<br>
