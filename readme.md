# @i/webpack-theme-plugin

Webpack plugin to run the Intouch Design System theme processor [@i/theme](https://intazdoweb.intouchsol.com/IntouchDesignSystem/IntouchDesignSystem/_git/theme)



### Getting Started

Initialize and pass the plugin to Webpack. The plugin will read the `.idsconfig.json` file in the project root.
<br>

```js
// webpack.config.js
const IntouchThemePlugin = require('@i/webpack-theme-plugin')

// ...
webpackPlugins.push(new IntouchThemePlugin())
```
<br>

```jsonc
// .idsconfig.json
{
    "values": "theme/values.json",
    "groups": "theme/groups.json",
    "components": "theme/components.json",
    "variants": "theme/variants.json",
    "output": "theme/theme.js"
}
```
<br>
