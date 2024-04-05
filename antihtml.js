"use strict";

class Node {
	childNodes = [];
}

// Represents a DOCTYPE
class DocumentType extends Node {
	name;
	constructor(name) {
		super();
		this.name = name;
	}
}

// Represents a Text node
class Text extends Node {
	data;
	constructor(data) {
		super();
		this.data = data;
	}
}

// Represents a comment
class Comment extends Node {
	data;
	constructor(data) {
		super();
		this.data = data;
	}
}

// Represents a fragment of HTML to insert verbatim
class _HTMLFragment extends Node {
	data;
	constructor(data) {
		super();
		this.data = data;
	}
}

// Represents an Element
class Element extends Node {
	attributes;
	name;
	constructor(name) {
		super();
		this.attributes = new Map();
		this.name = name;
	}
}


function _escapeAttribute(value) {
	value = value.replace(/&/g, '&amp;')
	value = value.replace(/\xA0/g, '&nbsp;') // NO-BREAK SPACE
	value = value.replace(/"/g, '&quot;')
	return value
}

function _escapeNode(value) {
	value = value.replace(/&/g, '&amp;')
	value = value.replace(/\xA0/g, '&nbsp;') // NO-BREAK SPACE
	value = value.replace(/</g, '&lt;')
	value = value.replace(/>/g, '&gt;')
	return value
}

function _serializeAttributes(attributes) {
	return [...attributes.entries()].map(([name, value]) => {
		return [' ', name, '="', _escapeAttribute(value), '"'].join('')
	}
	).join('');
}

function _serializesAsVoid(node) {
	return [
		// Void elements
		'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
		'meta', 'param', 'source', 'track', 'wbr',

		// Also serializes as void
		'basefont', 'bgsound', 'frame', 'keygen',
	].includes(node.name);
}

export function _serialize(node) {
	// Note: see https://html.spec.whatwg.org/#serialising-html-fragments
	//       for the reference algorithm for serializing HTML.  For
	//       simplicity some features are left out here.

	if (node instanceof Element && _serializesAsVoid(node)) {
		return '';
	}

	if (node instanceof DocumentType || node instanceof Text) {
		return '';
	}

	let s = [];

	for (let child of node.childNodes) {
		if (child instanceof Element) {
			let attrs = child.attributes;
			s.push('<', child.name, _serializeAttributes(attrs), '>');

			if (_serializesAsVoid(child)) {
				continue;
			}

			s.push(_serialize(child));
			s.push('</', child.name, '>');

		} else if (child instanceof Text) {
			if (node instanceof Element && [
				'style', 'script', 'xmp', 'iframe', 'noembed',
				'noframes', 'plaintext',
			].includes(node.name)) {
				// Dissalow pontentially bad things altogether.  This will not
				// catch all bad things unless adjecant text nodes are merged.

				if (child.data.indexOf('<!--') !== -1) {
					throw new Error("<!-- in text preserving element");
				}

				if (child.data.indexOf('<' + node.name) !== -1) {
					throw new Error("Opening tag in text preserving element");
				}

				if (child.data.indexOf('</' + node.name) !== -1) {
					throw new Error("Closing tag in text preserving element");
				}

				s.push(child.data);

			} else {
				s.push(_escapeNode(child.data));
			}

		} else if (child instanceof Comment) {
			if (child.data.indexOf('-->') !== -1) {
				throw Error("Comment containing -->");
			}

			s.push('<!--', child.data, '-->');

		} else if (child instanceof _HTMLFragment) {
			s.push(child.data);

		} else if (child instanceof DocumentType) {
			s.push('<!DOCTYPE ', child.name, '>');

		} else {
			throw Error("Unsupported node "+child);
		}
	}

	return s.join('');
}

export function tx(data) {
	return new Text(data);
}

export function comment(data) {
	return new Comment(data);
}

export function unsafeHTML(html) {
	return new _HTMLFragment(html);
}

function _appendChildren(element, children) {
	for (const item of children) {
		if (typeof item === 'string') {
			element.childNodes.push(new Text(item));

		} else if (typeof item !== 'object') {
			throw new TypeError(
				"Expected string or object as child to " +
				`<${element.name}> but got ${typeof item}`
			);

		} else if (item instanceof Node) {
			element.childNodes.push(item);

		} else if (item === null) {
			// ignore nulls for ease of conditinal objects

		} else if (Symbol.iterator in item) {
			_appendChildren(element, item);

		} else {
			let prototype = Object.getPrototypeOf(item);

			if (prototype === Object.prototype || prototype === null) {
				for (let key in item) {
					element.attributes.set(key, item[key]);
				}

			} else {
				const name = prototype?.constructor?.name;
				throw new TypeError(
					`Unsupported object type as child to <${element.name}>` +
					(typeof name === 'string' ? ": " + name : "")
				);
			}
		}
	}
}

export function el(type, ...children) {
	if (typeof type !== 'string') {
		throw new Error(`Element type must be a string, not ${type}`);
	}

	let element = new Element(type);
	_appendChildren(element, children);
	return element;
}

function _indentText(text, indent, level) {
	return text.replace(/\n(?!\n)/g, "\n" + indent.repeat(level))
}

export function htmlFragment(...children) {
	let root = new Element('root');
	_appendChildren(root, children);
	return _serialize(root);
}

export function htmlDocument(...children) {
	let root = new Element('root');
	root.childNodes.push(new DocumentType('html'));
	_appendChildren(root, children);
	return _serialize(root);
}
