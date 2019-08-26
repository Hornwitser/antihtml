"use strict";

class Node { }

// Imaginary node for the serializer
class _HTMLRoot extends Node {
    constructor() {
        super();
        this.nodes = [];
    }
}

// Represents a DOCTYPE
class _HTMLDocumentType extends Node {
    constructor(name) {
        super();
        this.name = name;
    }
}

// Represents a Text node
class _HTMLText extends Node {
    constructor(data) {
        super();
        this.data = data;
    }
}

// Represents a comment
class _HTMLComment extends Node {
    constructor(data) {
        super();
        this.data = data;
    }
}

// Represents an Element
class _HTMLElement extends Node {
    constructor(name) {
        super();
        this.attributes = new Map();
        this.name = name;
        this.nodes = [];
    }
}


function _escape_attribute(value) {
    value = value.replace(/&/g, '&amp;')
    value = value.replace(/\xA0/g, '&nbsp;') // NO-BREAK SPACE
    value = value.replace(/"/g, '&quot;')
    return value
}

function _escape_node(value) {
    value = value.replace(/&/g, '&amp;')
    value = value.replace(/\xA0/g, '&nbsp;') // NO-BREAK SPACE
    value = value.replace(/</g, '&lt;')
    value = value.replace(/>/g, '&gt;')
    return value
}

function _serialize_attributes(attributes) {
    return [...attributes.entries()].map(([name, value]) => {
        return [' ', name, '="', _escape_attribute(value), '"'].join('')
    }
    ).join('');
}

function _serializes_as_void(node) {
    return [
        // Void elements
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
        'meta', 'param', 'source', 'track', 'wbr',

        // Also serializes as void
        'basefont', 'bgsound', 'frame', 'keygen',
    ].includes(node.name);
}

function _serialize(node) {
    // Note: see https://html.spec.whatwg.org/#serialising-html-fragments
    //       for the reference algorithm for serializing HTML.  For
    //       simplicity some features are left out here.

    if (node instanceof _HTMLElement && _serializes_as_void(node)) {
        return '';
    }

    if (node instanceof _HTMLDocumentType || node instanceof _HTMLText) {
        return '';
    }

    let s = [];

    for (let child of node.nodes) {
        if (child instanceof _HTMLElement) {
            let attrs = child.attributes;
            s.push('<', child.name, _serialize_attributes(attrs), '>');

            if (_serializes_as_void(child)) {
                continue;
            }

            s.push(_serialize(child));
            s.push('</', child.name, '>');

        } else if (child instanceof _HTMLText) {
            if (node instanceof _HTMLElement && [
                'style', 'script', 'xmp', 'iframe', 'noembed',
                'noframes', 'plaintext',
            ].includes(node.name)) {
                // Dissalow pontentially bad things altogether.  This will not
                // catch all bad things unless adjecant text nodes are merged.

                if (child.data.indexOf('<!--') !== -1) {
                    throw new Error("<!-- in text preserving element");
                }

                if (child.data.indexOf('<' + node.name) !== -1) {
                    throw new Error("opening tag in text preserving element");
                }

                if (child.data.indexOf('</' + node.name) !== -1) {
                    throw new Error("closing tag in text preserving element");
                }

                s.push(child.data);

            } else {
                s.push(_escape_node(child.data));
            }

        } else if (child instanceof _HTMLComment) {
            if (child.data.indexOf('-->') !== -1) {
                throw Error("Comment containing -->");
            }

            s.push('<!--', child.data, '-->');

        } else if (child instanceof _HTMLDocumentType) {
            s.push('<!DOCTYPE ', child.name, '>');

        } else {
            throw Error("unsupported node "+child);
        }
    }

    return s.join('');
}

function Text(content) {
    let text = Object.create(Text.prototype);
    text.content = content;
    return text;
}

function Comment(content) {
    let comment = Object.create(Comment.prototype);
    comment.content = content;
    return comment;
}

function _html(tag) {
    if (!(tag instanceof Array)) {
        throw new Error("tag must be an Array");
    }

    let type = tag[0];

    if (typeof type !== 'string') {
        throw new Error(`first element in tag must be a string, not ${type}`);
    }

    let element = new _HTMLElement(type);
    for (let index = 1; index < tag.length; index++) {
        let item = tag[index];

        if (typeof item === 'string') {
            let classAttr = element.attributes.get('class');
            if (classAttr !== undefined) {
                classAttr += " "+item;
            } else {
                classAttr = item;
            }

            element.attributes.set('class', classAttr);

        } else if (item instanceof Text) {
            element.nodes.push(new _HTMLText(item.content));

        } else if (item instanceof Comment) {
            element.nodes.push(new _HTMLComment(item.content));

        } else if (item instanceof Array) {
            try {
                element.nodes.push(_html(item));

            } catch (err) {
                let attrs = "";
                for (let [name, value] of element.attributes) {
                    attrs += ` ${name}="${value}"`;
                }

                err.message += `\n  in ${element.name}${attrs}:${index}`;
                throw err;
            }

        } else if (item === null) {
            // ignore nulls for ease of conditinal objects

        } else {
            let prototype = Object.getPrototypeOf(item);

            if (prototype === Object.prototype || prototype === null) {
                for (let key in item) {
                    element.attributes.set(key, item[key]);
                }

            } else {
                throw new Error("Unsupported content type "+typeof item);
            }
        }
    }

    return element;
}

function _root(item) {
    if (item instanceof Text) {
        return new _HTMLText(item.content);
    }

    if (item instanceof Comment) {
        return new _HTMLComment(item.content);
    }

    if (item instanceof Array) {
        return _html(item);
    }

    throw new Error("Unsupported root content type "+typeof item);
}

function htmlFragment(...tags) {
    let root = new _HTMLRoot();
    root.nodes = [...tags.map(_root)];
    return _serialize(root);
}

function htmlDocument(...tags) {
    let root = new _HTMLRoot();
    root.nodes = [new _HTMLDocumentType('html'), ...tags.map(_root)];
    return _serialize(root);
}

module.exports =  {
    Text,
    Comment,
    htmlFragment,
    htmlDocument,

    // For testing only
    _html,
    _serialize,
};
