# Changelog

## v0.3.0

- Ported project to TypeScript

## v0.2.0

- Added the actual object encontered to the error reported when the first element in a tag is not a string.
- Fixed input structures being modified by AntiHTML.
- Added location information to errors reported in nested structures.
- Added support for specifying Comment and Text nodes at the top level to htmlDocument and htmlFragment.
- Added support for specifying multiple top level tags to htmlFragment.
- Added support for inserting raw fragments of HTML
- Migrated to ES Modules.
- Refactored the library to use Element instances instead of arrays to represent elements.
- Added newline after emitted \<!DOCTYPE html> declaration
- Added `prettify` function which inserts newlines and indents to prettify the markup.
