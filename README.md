# AntiHTML

The simple stupid data structure oriented HTML serializer.

## Simple exaple

```js
import * as a from 'antihtml';

const title = "Hello world";
const document = a.el('html',
    a.el('head',
        a.el('meta', {'charset': 'utf-8'}),
        a.el('title', title),
    ),
    a.el('body',
        a.el('h1', title),
        a.el('p', "This is a sample html document"),
    ),
);
const html = a.htmlDocument(a.prettify(document, "    "));
```

The produced `html` string is the following:

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
