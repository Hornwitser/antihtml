# AntiHTML

The simple stupid data structure oriented HTML serializer.

## Simple exaple

```js
import * as a from 'antihtml';

const title = "Hello world";
const document = a.htmlDocument(a.el('html',
    a.el('head',
        a.el('meta', {'charset': 'utf-8'}),
        a.el('title', title),
    ),
    a.el('body',
        a.el('h1', title),
        a.el('p', "This is a sample html document"),
    ),
));
```

Produces a string containing an html document roghly equivalent to the following, with the exception of there being no newlines or extra whitespace:

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <title>Hello world</title>
    </head>
    <body>
        <h1>Hello world</h1>
        <p>This is a sample html document</p>
    </body>
</html>
```
