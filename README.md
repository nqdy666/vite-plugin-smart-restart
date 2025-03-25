<h2 align='center'><samp>vite-plugin-smart-restart</samp></h2>

<p align='center'>Custom files/globs to restart the Vite server, allowing the checkContent parameter to trigger a restart when the content changes.</p>

<p align='center'>
<a href='https://www.npmjs.com/package/vite-plugin-smart-restart'>
<img src='https://img.shields.io/npm/v/vite-plugin-smart-restart?color=222&style=flat-square'>
</a>
</p>

<br>

## Usage

Install

```bash
npm i vite-plugin-smart-restart -D # yarn add vite-plugin-smart-restart -D
```

Add it to `vite.config.js`

```ts
// vite.config.js
import ViteRestart from 'vite-plugin-smart-restart'

export default {
  plugins: [
    ViteRestart({
      restart: [
        'my.config.[jt]s',
      ]
    })
  ],
}

Changes to `my.config.js` or `my.config.ts` will now restart the server automatically.

or

export default {
  plugins: [
    ViteRestart({
      restart: [
        { file: '.eslintrc-auto-import.json', checkContent: true },
      ]
    })
  ],
}
```

File content changes to `.eslintrc-auto-import.json` will now restart the server automatically.


## License

MIT License © 2025 [nianqin](https://github.com/nqdy666)

## Thanks

https://github.com/antfu/vite-plugin-restart
