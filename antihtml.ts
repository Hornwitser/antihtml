"use strict";

export class Node {
	childNodes: Node[] = [];
}

// Represents a DOCTYPE
export class DocumentType extends Node {
	constructor(public name: string) {
		super();
	}
}

// Represents a Text node
export class Text extends Node {
	constructor(public data: string) {
		super();
	}
}

// Represents a comment
export class Comment extends Node {
	constructor(public data: string) {
		super();
	}
}

// Represents a fragment of HTML to insert verbatim
class _HTMLFragment extends Node {
	constructor(public data: string) {
		super();
	}
}

// Represents an Element
export class Element extends Node {
	attributes = new Map<string, string>();
	constructor(public name: string) {
		super();
	}
}


function _escapeAttribute(value: string) {
	value = value.replace(/&/g, '&amp;')
	value = value.replace(/\xA0/g, '&nbsp;') // NO-BREAK SPACE
	value = value.replace(/"/g, '&quot;')
	return value
}

function _escapeNode(value: string) {
	value = value.replace(/&/g, '&amp;')
	value = value.replace(/\xA0/g, '&nbsp;') // NO-BREAK SPACE
	value = value.replace(/</g, '&lt;')
	value = value.replace(/>/g, '&gt;')
	return value
}

function _serializeAttributes(attributes: Map<string, string>) {
	return [...attributes.entries()].map(([name, value]) => {
		return [' ', name, '="', _escapeAttribute(value), '"'].join('')
	}
	).join('');
}

function _serializesAsVoid(node: Element) {
	return [
		// Void elements
		'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
		'meta', 'param', 'source', 'track', 'wbr',

		// Also serializes as void
		'basefont', 'bgsound', 'frame', 'keygen',
	].includes(node.name);
}

export function _serialize(node: Node): string {
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

export function tx(data: string) {
	return new Text(data);
}

export function comment(data: string) {
	return new Comment(data);
}

export function unsafeHTML(html: string) {
	return new _HTMLFragment(html);
}

type ChildShorthand =
	| Node
	| Iterable<ChildShorthand>
	| null
	| string
	| Record<string, string>
;

function _appendChildren(element: Element, children: Iterable<ChildShorthand>) {
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

export function el(type: string, ...children: ChildShorthand[]) {
	if (typeof type !== 'string') {
		throw new Error(`Element type must be a string, not ${type}`);
	}

	let element = new Element(type);
	_appendChildren(element, children);
	return element;
}

function _indentText(text: string, indent: string, level: number) {
	return text.replace(/\n(?!\n)/g, "\n" + indent.repeat(level))
}

function _prettifyInline(element: Element) {
	if (element.childNodes.length === 0) {
		return true;
	}
	for (const node of element.childNodes) {
		if (node instanceof Text) {
			return true;
		}
	}
	return false;
}

function _prettify(nodes: Node[], indent: string, level: number) {
	const output = [];
	for (const node of nodes) {
		output.push(new Text(indent.repeat(level)));
		if (node instanceof Element) {
			if (!_prettifyInline(node)) {
				const prettyElement = new Element(node.name);
				prettyElement.attributes = node.attributes;
				prettyElement.childNodes = [
					new Text("\n"),
					...prettify(node.childNodes, indent, level + 1),
					new Text(indent.repeat(level)),
				];
				output.push(prettyElement);
			} else {
				output.push(node);
			}
		} else if (node instanceof Text) {
			output.push(new Text(_indentText(node.data, indent, level)));
		} else if (node instanceof Comment) {
			output.push(new Comment(_indentText(node.data, indent, level)));
		} else {
			output.push(node);
		}
		output.push(new Text("\n"));
	}
	return output;
}

export function prettify(nodes: Node | ChildShorthand[], indent = '\t', level = 0) {
	if (nodes instanceof Node) {
		return _prettify([nodes], indent, level);
	}

	const root = new Element('root');
	_appendChildren(root, nodes);
	return _prettify(root.childNodes, indent, level);
}

export function htmlFragment(...children: ChildShorthand[]) {
	let root = new Element('root');
	_appendChildren(root, children);
	return _serialize(root);
}

export function htmlDocument(...children: ChildShorthand[]) {
	let root = new Element('root');
	root.childNodes.push(new DocumentType('html'), new Text("\n"));
	_appendChildren(root, children);
	return _serialize(root);
}
