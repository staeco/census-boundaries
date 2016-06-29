<p align='center'>
  <img src='https://i.imgur.com/JXSMT0k.png' width='400'/>
</p>

# census-boundaries [![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url]

Downloads and converts US Census TIGER data representing all boundaries in the United States.

You define the processing logic, so you can put it into any DB you like.

By default, this imports the boundaries of every state and incorporated place (~30K boundaries). Takes quite a bit of time depending on your internet speed.

## Install

```
npm install census-boundaries
```

## Example

```js
import census from 'census-boundaries'

// specify your own options if you want
const overrides = {
  objects: [
    'STATE',
    'PLACE'
  ]
}

census(overriders, {
  // this function is called every time a record is parsed
  onBoundary: (objectType, doc, cb) => {
    cb() // make sure to call the cb
  },

  // this function is called when all records are parsed and processed
  onFinish: (err) => {

  }
})
```

[downloads-image]: http://img.shields.io/npm/dm/census-boundaries.svg
[npm-url]: https://npmjs.org/package/census-boundaries
[npm-image]: http://img.shields.io/npm/v/census-boundaries.svg
